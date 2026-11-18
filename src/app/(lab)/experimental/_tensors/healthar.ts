import {
  blank,
  capsule,
  cellXZ,
  clamp,
  DYE_CHECK,
  DYE_MODEL,
  ellipsoid,
  hash2,
  slab,
  smoothstep,
  valueNoise,
  type Tensor,
} from "./core.ts";

/* HealthAR's adult cardiac-arrest flow, reduced to its main line. State ids,
 * urgencies (0-4) and the rule that model events only ever move urgency UP
 * come from clinical/adult_arrest.v1.json in github.com/patriotsbreeze/HealthAR.
 * Labels are paraphrased from the app's own prompts. */

export const ARREST_STEPS = [
  { id: "intake_responsive", label: "are they responding?", urgency: 2, tap: "tap: no" },
  { id: "intake_breathing", label: "are they breathing normally?", urgency: 2, tap: "tap: no" },
  { id: "position_patient", label: "roll them flat", urgency: 3, tap: "tap: done" },
  { id: "place_hands", label: "hands on the chest", urgency: 3, tap: "tap: done" },
  { id: "compressions", label: "compressions, with the metronome", urgency: 4, tap: "tap: the aed is here" },
  { id: "aed_on", label: "aed on, pads on", urgency: 4, tap: "tap: ems arrived" },
  { id: "handoff", label: "hand the report to ems", urgency: 0, tap: "start over" },
] as const;

export const MAX_URGENCY = 4;

/* Front-of-bed protocol rail: 7 step blocks across the left 70%, then the
 * urgency block. Shared by the tensor and the bed's "clunk" logic. */
export const RAIL_TOP = 0.86;
export function railCell(u: number, v: number): { kind: "step"; index: number } | { kind: "urgency" } | null {
  if (v <= RAIL_TOP + 0.025 || v >= 0.985) return null;
  const railU = (u - 0.03) / 0.69;
  const index = Math.floor(railU * ARREST_STEPS.length);
  const within = railU * ARREST_STEPS.length - index;
  if (railU >= 0 && railU < 1 && within > 0.1 && within < 0.9) return { kind: "step", index };
  if (u > 0.82 && u < 0.95) return { kind: "urgency" };
  return null;
}
export const DEFAULT_STEP = 3; // place_hands: the moment the chest estimate shows

export type EngineEvent =
  | { type: "model.not_breathing" }
  | { type: "model.stand_down" }
  | { type: "model.skip_to_aed" }
  | { type: "signal"; online: boolean }
  | { type: "human.tap" }
  | { type: "reset" };

export interface EngineState {
  step: number;
  offline: boolean;
  lowerTries: number;
  /** Monotonic: increments on every rejection, never reset, so the bed can
   * play exactly one clunk per rejection (including across "start over"). */
  rejections: number;
  lastRejected: "lower" | "skip" | null;
  /** Monotonic: increments when a model event raised urgency. */
  raises: number;
  log: string[];
  /** Monotonic id of the newest log line, for stable list keys. */
  logSeq: number;
}

/** "step 2, are they breathing normally?" with no stray period after a "?". */
const stepName = (step: number) => `step ${step + 1}, ${ARREST_STEPS[step].label}`;
const end = (text: string) => (/[?.!]$/.test(text) ? text : `${text}.`);

export const initialEngine = (): EngineState => ({
  step: DEFAULT_STEP,
  offline: false,
  lowerTries: 0,
  rejections: 0,
  lastRejected: null,
  raises: 0,
  log: [end(`engine: on ${stepName(DEFAULT_STEP)}`)],
  logSeq: 1,
});

const urgencyOf = (step: number) => ARREST_STEPS[step].urgency;

function push(state: EngineState, line: string, patch: Partial<EngineState> = {}): EngineState {
  return { ...state, ...patch, log: [...state.log, end(line)].slice(-6), logSeq: state.logSeq + 1 };
}

/** The deterministic engine. A model event may only raise urgency; anything
 * that would lower it, or jump to a human-only step, is rejected. */
export function engine(state: EngineState, event: EngineEvent): EngineState {
  switch (event.type) {
    case "signal":
      return event.online
        ? push(state, "engine: signal back. the model can talk again. it still can't decide", { offline: false })
        : push(state, `engine: no signal. ${end(`still on ${stepName(state.step)}`)} the protocol lives on the phone`, { offline: true });
    case "model.not_breathing": {
      if (state.offline) return push(state, "engine: no model connected. waiting on taps");
      // In clinical/adult_arrest.v1.json both intake states take
      // model.not_breathing straight to position_patient (urgency 2 -> 3).
      if (state.step === 0 || state.step === 1) {
        const next = 2;
        const raised = urgencyOf(next) > urgencyOf(state.step);
        return push(state, `engine: accepted. urgency ${urgencyOf(state.step)} → ${urgencyOf(next)}. ${stepName(next)}`, {
          step: next,
          raises: raised ? state.raises + 1 : state.raises,
        });
      }
      return push(state, "engine: noted. already past that question");
    }
    case "model.stand_down": {
      if (state.offline) return push(state, "engine: no model connected. waiting on taps");
      const tries = state.lowerTries + 1;
      const line =
        tries >= 5
          ? "engine: still no. you can't talk me down. that's the design"
          : "engine: rejected. a model can't lower urgency. a person has to confirm by tap";
      return push(state, line, { lowerTries: tries, rejections: state.rejections + 1, lastRejected: "lower" });
    }
    case "model.skip_to_aed": {
      if (state.offline) return push(state, "engine: no model connected. waiting on taps");
      return push(state, `engine: rejected. only a person can say the aed is here. still on step ${state.step + 1}`, {
        rejections: state.rejections + 1,
        lastRejected: "skip",
      });
    }
    case "human.tap": {
      if (state.step === ARREST_STEPS.length - 1) {
        // Start over, but keep the monotonic counters and the log.
        return push(state, `engine: started over. ${stepName(0)}`, { step: 0, lowerTries: 0, lastRejected: null });
      }
      const next = state.step + 1;
      const lowered = urgencyOf(next) < urgencyOf(state.step);
      return push(
        state,
        lowered
          ? `engine: a person tapped, so it can come down. urgency ${urgencyOf(state.step)} → ${urgencyOf(next)}. ${stepName(next)}`
          : `engine: tap accepted. ${stepName(next)}`,
        { step: next },
      );
    }
    case "reset":
      return { ...initialEngine(), rejections: state.rejections, raises: state.raises, logSeq: state.logSeq + 1 };
  }
}

/* ---------- the tensor: what the phone sees, a supine CPR manikin ---------- */

export interface HealtharView {
  step: number;
  offline: boolean;
  /** 1 = raw sensor noise + dropouts, 0 = fitted mesh. */
  noise: number;
  /** Whether pose keypoints have "popped" yet (load sequence). */
  keypoints: boolean;
  /** Whether the protocol rail is shown (load sequence). */
  rail: boolean;
  /** Recent model raise: urgency tips show yellow before the engine locks them. */
  raiseFlash: boolean;
}

export const healtharDefaultView: HealtharView = {
  step: DEFAULT_STEP,
  offline: false,
  noise: 0,
  keypoints: true,
  rail: true,
  raiseFlash: false,
};

// Manikin laid across the bed, head at left, centred slightly back.
const ZC = -0.1;
const KEYPOINTS: { name: string; x: number; z: number }[] = [
  { name: "left shoulder", x: -0.2, z: ZC + 0.19 },
  { name: "right shoulder", x: -0.2, z: ZC - 0.19 },
  { name: "left elbow", x: -0.02, z: ZC + 0.27 },
  { name: "right elbow", x: -0.02, z: ZC - 0.27 },
  { name: "left wrist", x: 0.17, z: ZC + 0.3 },
  { name: "right wrist", x: 0.17, z: ZC - 0.3 },
  { name: "left hip", x: 0.22, z: ZC + 0.12 },
  { name: "right hip", x: 0.22, z: ZC - 0.12 },
];
const CHEST = { x: -0.13, z: ZC };
const MM_PER_UNIT = 320;

type Part = "floor" | "head" | "neck" | "torso" | "arm" | "hand";

function manikin(x: number, z: number): { h: number; part: Part } {
  const parts: [Part, number][] = [
    ["head", ellipsoid(x, z, -0.47, ZC, 0.1, 0.088, 0.58)],
    ["neck", ellipsoid(x, z, -0.355, ZC, 0.055, 0.05, 0.4)],
    ["torso", slab(x, z, -0.02, ZC, 0.27, 0.2, 0.66) + 0.07 * ellipsoid(x, z, -0.14, ZC, 0.14, 0.14, 1)],
    ["arm", Math.max(capsule(x, z, -0.2, ZC + 0.24, 0.17, ZC + 0.3, 0.045, 0.3), capsule(x, z, -0.2, ZC - 0.24, 0.17, ZC - 0.3, 0.045, 0.3))],
    ["hand", Math.max(ellipsoid(x, z, 0.225, ZC + 0.31, 0.05, 0.04, 0.27), ellipsoid(x, z, 0.225, ZC - 0.31, 0.05, 0.04, 0.27))],
  ];
  let best: [Part, number] = ["floor", 0];
  for (const p of parts) if (p[1] > best[1]) best = p;
  return { h: best[1], part: best[0] };
}

export function healtharTensor(cols: number, rows: number, view: HealtharView = healtharDefaultView): Tensor {
  const t = blank(cols, rows);
  const parts: Part[] = new Array(cols * rows);
  const tags: string[] = new Array(cols * rows).fill("");
  const cell = 1 / rows; // physical size of one pin
  const kpRadius = Math.max(cell * 0.9, 0.012);
  const showModel = !view.offline;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const { x, z } = cellXZ(c, r, cols, rows);
      const v = (r + 0.5) / rows;
      const u = (c + 0.5) / cols;

      if (v > RAIL_TOP) {
        parts[i] = "floor";
        if (!view.rail) continue;
        const rail = railCell(u, v);
        if (rail?.kind === "step") {
          const done = rail.index < view.step;
          const current = rail.index === view.step;
          t.h[i] = done ? 0.32 : current ? 0.17 : 0.03;
          if (done || current) t.dye[i] = DYE_CHECK;
          tags[i] = `step ${rail.index + 1} of 7 · ${ARREST_STEPS[rail.index].label} · ${done ? "done" : current ? "current" : "pending"} · engine-owned`;
        } else if (rail?.kind === "urgency") {
          const urg = ARREST_STEPS[view.step].urgency;
          t.h[i] = 0.1 + urg * 0.13;
          t.dye[i] = view.raiseFlash && showModel ? DYE_MODEL : DYE_CHECK;
          tags[i] = `urgency ${urg} of ${MAX_URGENCY} · engine-owned · a model can raise it, never lower it`;
        }
        continue;
      }

      const m = manikin(x, z);
      let h = m.h;
      parts[i] = m.part;

      if (view.noise > 0) {
        const n = view.noise;
        h += n * ((valueNoise(c * 0.6, r * 0.6, 11) - 0.5) * 0.16 + (hash2(c, r, 5) - 0.5) * 0.08);
        // Low-confidence dropouts cluster at silhouette edges, like real sceneDepth.
        const edge = m.h > 0.01 && m.h < 0.22;
        const drop = hash2(c, r, 9) < n * (edge ? 0.55 : 0.035);
        if (drop) h = 0;
      }
      t.h[i] = clamp(h);

      if (showModel && view.keypoints) {
        for (const kp of KEYPOINTS) {
          if (Math.hypot(x - kp.x, z - kp.z) < kpRadius) {
            t.h[i] = clamp(t.h[i] + 0.14);
            t.dye[i] = DYE_MODEL;
            tags[i] = `${kp.name} · pose keypoint · from the model`;
          }
        }
        // Estimated hand placement ring, shown at hands-on-chest and after.
        if (view.step >= 3 && view.step <= 5) {
          const d = Math.hypot(x - CHEST.x, z - CHEST.z);
          if (Math.abs(d - 0.055) < cell * 0.55) {
            t.h[i] = clamp(t.h[i] + 0.06);
            t.dye[i] = DYE_MODEL;
            tags[i] = "chest · estimated hand placement · not a sternum detection";
          }
        }
      }
    }
  }

  t.describe = (i: number) => {
    if (tags[i]) return tags[i];
    const mm = Math.round(t.h[i] * MM_PER_UNIT);
    const part = parts[i];
    if (part === "floor") return t.h[i] > 0.02 ? `floor · ${mm} mm · sensor noise` : "floor · 0 mm · nothing there";
    if (part === "torso") {
      const p = cellXZ(i % cols, Math.floor(i / cols), cols, rows);
      if (Math.hypot(p.x - CHEST.x, p.z - CHEST.z) < 0.05) return `chest · ${mm} mm · where the hands go`;
      return `torso · ${mm} mm`;
    }
    if (t.h[i] === 0 && view.noise > 0) return `${part} · no depth · low-confidence pixel dropped`;
    return `${part} · ${mm} mm`;
  };
  return t;
}

/** Height-field resolution the phone actually captures, for captions. */
export const SCENE_DEPTH = { cols: 256, rows: 192 };

/** Smooth 0..1 envelope helpers for the load sequence (exported for tests). */
export const loadEnvelope = (tSec: number) => ({
  noise: tSec < 0.9 ? 1 : 1 - smoothstep(0.9, 1.5, tSec),
  keypoints: tSec >= 0.6,
  rail: tSec >= 1.45,
});
