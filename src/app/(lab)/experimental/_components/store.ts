import { useSyncExternalStore } from "react";
import { engine, initialEngine, type EngineEvent, type EngineState } from "../_tensors/healthar.ts";
import type { MealView } from "../_tensors/meal.ts";
import type { RlvrView } from "../_tensors/rlvr.ts";
import { rlvrDefaultView } from "../_tensors/rlvr.ts";
import type { BedId, TensorKind } from "../_tensors/beds.ts";

/* One tiny module store for the whole page. DOM controls write to it; the
 * DOM reads it through useSyncExternalStore; the WebGL beds read it from
 * inside useFrame (lab.get()) and subscribe to wake their demand frameloop.
 * Nothing here imports three, so it stays in the small eager bundle. */

export interface Probe {
  u: number;
  v: number;
  pressed: boolean;
}

export interface LabState {
  /** Hero bed preview from hovering/focusing an index row. */
  preview: TensorKind | null;
  swag: boolean;
  health: EngineState;
  sidewalk: { rule: number; startedAt: number };
  rlvr: RlvrView;
  meal: MealView;
  probe: Record<BedId, Probe | null>;
  graderView: boolean;
  shortcuts: boolean;
}

const initial: LabState = {
  preview: null,
  swag: false,
  health: initialEngine(),
  // startedAt = 0 means "already resolved", so SSR and first paint show the result.
  sidewalk: { rule: 0, startedAt: 0 },
  rlvr: rlvrDefaultView,
  meal: { food: null },
  probe: { healthar: null, sidewalk: null, rlvr: null, meal: null },
  graderView: false,
  shortcuts: true,
};

let state = initial;
const listeners = new Set<() => void>();

export const lab = {
  get: () => state,
  initial: () => initial,
  set(patch: Partial<LabState> | ((s: LabState) => Partial<LabState>)) {
    const next = typeof patch === "function" ? patch(state) : patch;
    state = { ...state, ...next };
    listeners.forEach((l) => l());
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  dispatch(event: EngineEvent) {
    lab.set((s) => ({ health: engine(s.health, event) }));
  },
  setProbe(bed: BedId, probe: Probe | null) {
    lab.set((s) => ({ probe: { ...s.probe, [bed]: probe } }));
  },
};

export function useLab<T>(select: (s: LabState) => T): T {
  return useSyncExternalStore(
    lab.subscribe,
    () => select(state),
    () => select(initial),
  );
}

/** Duration of the BFS flood animation for a rule, in ms. */
export const BFS_MS = 1400;
