"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TensorKind } from "../_tensors/beds.ts";
import { ARREST_STEPS, MAX_URGENCY } from "../_tensors/healthar.ts";
import { estimate, FOODS, type Food } from "../_tensors/meal.ts";
import { rlvrSummary, type Grader } from "../_tensors/rlvr.ts";
import { RULES, walk } from "../_tensors/sidewalk.ts";
import { lab, useLab } from "./store.ts";
import styles from "./controls.module.css";

/* Every 3D verb has a plain DOM control: buttons, radios, ranges and
 * <output>s. The beds only ever read the store these write to. */

/* ---------------- hero index: hover/focus re-presses the hero bed ---------------- */

export interface IndexRow {
  id: TensorKind;
  href: string;
  name: string;
  shape: string;
}

export function IndexNav({ rows }: { rows: IndexRow[] }) {
  const preview = useLab((s) => s.preview);
  const show = (id: TensorKind | null) => {
    if (lab.get().preview !== id) lab.set({ preview: id, swag: false });
  };
  return (
    <nav
      aria-label="projects"
      className={styles.index}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") show(null);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) show(null);
      }}
    >
      <ol>
        {rows.map((r) => (
          <li key={r.id}>
            <a
              href={r.href}
              data-active={preview === r.id ? "" : undefined}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") show(r.id);
              }}
              onFocus={() => show(r.id)}
            >
              <span className={styles.indexName}>{r.name}</span>
              <span className={styles.indexShape}>{r.shape}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ---------------- healthar: you play the model ---------------- */

export function HealthControls() {
  const h = useLab((s) => s.health);
  const urgency = ARREST_STEPS[h.step].urgency;
  return (
    <div className={styles.panel}>
      <p className={styles.panelLead}>you&apos;re gemini. try it.</p>
      <div className={styles.keys} role="group" aria-label="model events">
        <button type="button" className={styles.key} data-dye="model" onClick={() => lab.dispatch({ type: "model.not_breathing" })}>
          say &ldquo;they&apos;re not breathing&rdquo;
        </button>
        <button type="button" className={styles.key} data-dye="model" onClick={() => lab.dispatch({ type: "model.stand_down" })}>
          say &ldquo;they&apos;re fine, stand down&rdquo;
        </button>
        <button type="button" className={styles.key} data-dye="model" onClick={() => lab.dispatch({ type: "model.skip_to_aed" })}>
          say &ldquo;skip to the aed&rdquo;
        </button>
        <button
          type="button"
          className={styles.key}
          aria-pressed={h.offline}
          onClick={() => lab.dispatch({ type: "signal", online: h.offline })}
        >
          drop the signal
        </button>
      </div>
      <p className={styles.panelLead}>
        and you&apos;re the rescuer:{" "}
        <button type="button" className={styles.key} data-dye="check" onClick={() => lab.dispatch({ type: "human.tap" })}>
          {ARREST_STEPS[h.step].tap}
        </button>
      </p>
      <ol className={styles.steps}>
        {ARREST_STEPS.map((s, i) => (
          <li key={s.id} aria-current={i === h.step ? "step" : undefined} data-state={i < h.step ? "done" : i === h.step ? "current" : "pending"}>
            {s.label}
          </li>
        ))}
      </ol>
      <p className={styles.value}>
        urgency <output>{urgency}</output> of {MAX_URGENCY}
        {h.offline ? " · offline" : ""}
      </p>
      <div className={styles.log} role="log" aria-live="polite" aria-label="engine log">
        {h.log.map((line, i) => (
          <p key={h.logSeq - h.log.length + i}>{line}</p>
        ))}
      </div>
    </div>
  );
}

/* ---------------- sidewalk: walk a rule ---------------- */

export function RuleWalk() {
  const rule = useLab((s) => s.sidewalk.rule);
  const w = useMemo(() => walk(RULES[rule]), [rule]);
  return (
    <div className={styles.panel}>
      <fieldset className={styles.radios}>
        <legend>pick a rule</legend>
        {RULES.map((r, i) => (
          <label key={r.text}>
            <input
              type="radio"
              name="sidewalk-rule"
              checked={rule === i}
              onChange={() => lab.set({ sidewalk: { rule: i, startedAt: performance.now() } })}
            />
            <span>{r.text}</span>
          </label>
        ))}
      </fieldset>
      <p className={styles.value}>
        <output>
          bfs: {w.order.length} intersections visited · {w.faces.length} block faces resolved
        </output>
      </p>
      <ol className={styles.faces} aria-label="resolved block faces">
        {w.faces.map((f) => (
          <li key={f.label}>{f.label}</li>
        ))}
      </ol>
    </div>
  );
}

/* ---------------- rlvr: turn k ---------------- */

const fmt = (x: number) => x.toFixed(2);

export function KDial() {
  const rlvr = useLab((s) => s.rlvr);
  const sum = useMemo(() => rlvrSummary(rlvr), [rlvr]);
  const k = Math.round(sum.k);
  const luck =
    rlvr.grader === "released" ? `${sum.lucky} problems counted only by luck` : `the released grader would count ${sum.lucky} more by luck`;
  const summary = `k = ${k} · strict ${fmt(sum.strict)} · released ${fmt(sum.released)} · ${luck} · toy`;
  const table = useMemo(() => [0, 4, 8, 10].map((l) => rlvrSummary({ log2k: l, grader: "released" })), []);
  const setGrader = (grader: Grader) => lab.set((s) => ({ rlvr: { ...s.rlvr, grader } }));
  return (
    <div className={styles.panel}>
      <label className={styles.range}>
        <span>
          k = <span className={styles.mono}>{k}</span>
        </span>
        <input
          type="range"
          min={0}
          max={10}
          step={0.01}
          value={rlvr.log2k}
          aria-label="k, on a log scale"
          aria-valuetext={summary}
          onChange={(e) => lab.set((s) => ({ rlvr: { ...s.rlvr, log2k: Number(e.target.value) } }))}
        />
      </label>
      <fieldset className={styles.radios} data-inline="">
        <legend>grader</legend>
        <label>
          <input type="radio" name="rlvr-grader" checked={rlvr.grader === "released"} onChange={() => setGrader("released")} />
          <span>released (last number anywhere)</span>
        </label>
        <label>
          <input type="radio" name="rlvr-grader" checked={rlvr.grader === "strict"} onChange={() => setGrader("strict")} />
          <span>strict (the final answer)</span>
        </label>
      </fieldset>
      {/* Not a live region: the slider's aria-valuetext already speaks this
        * once per value, and a drag would otherwise queue dozens of updates. */}
      <p className={styles.value}>{summary}</p>
      <table className={styles.table}>
        <caption>toy mean pass@k, 500 made-up problems</caption>
        <thead>
          <tr>
            <th scope="col">k</th>
            <th scope="col">strict</th>
            <th scope="col">released</th>
            <th scope="col">gap</th>
          </tr>
        </thead>
        <tbody>
          {table.map((row) => (
            <tr key={row.k}>
              <th scope="row">{row.k}</th>
              <td>{fmt(row.strict)}</td>
              <td>{fmt(row.released)}</td>
              <td>{fmt(row.released - row.strict)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- meal: pick a food ---------------- */

function gauss(x: number, mu: number, sd: number) {
  return Math.exp(-0.5 * ((x - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
}

function Posterior({ food }: { food: Food }) {
  const e = estimate(food);
  const W = 320;
  const H = 110;
  const max = Math.max(e.prior.mu + 3 * e.prior.sd, e.likelihood.mu + 3 * e.likelihood.sd);
  const peak = gauss(e.posterior.mu, e.posterior.mu, e.posterior.sd);
  const path = (mu: number, sd: number, close: boolean) => {
    const pts: string[] = [];
    for (let i = 0; i <= 80; i++) {
      const g = (i / 80) * max;
      pts.push(`${((g / max) * W).toFixed(1)},${(H - 14 - (gauss(g, mu, sd) / peak) * (H - 22)).toFixed(1)}`);
    }
    return close ? `M0,${H - 14} L${pts.join(" L")} L${W},${H - 14} Z` : `M${pts.join(" L")}`;
  };
  const mapX = (e.posterior.mu / max) * W;
  return (
    <svg className={styles.plot} viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`plot-${food}-t plot-${food}-d`}>
      <title id={`plot-${food}-t`}>portion estimate for {food}</title>
      <desc id={`plot-${food}-d`}>
        prior from the vision label centred at {Math.round(e.prior.mu)} g, likelihood from the depth volume centred at {Math.round(e.likelihood.mu)} g,
        posterior centred at {Math.round(e.posterior.mu)} g.
      </desc>
      <path d={path(e.prior.mu, e.prior.sd, true)} fill="var(--yellow)" fillOpacity="0.55" stroke="var(--ink)" strokeDasharray="3 3" strokeWidth="1" />
      <path d={path(e.likelihood.mu, e.likelihood.sd, true)} fill="var(--green)" fillOpacity="0.4" stroke="var(--ink)" strokeWidth="1" />
      <path d={path(e.posterior.mu, e.posterior.sd, false)} fill="none" stroke="var(--ink)" strokeWidth="2" />
      <line x1={mapX} x2={mapX} y1={4} y2={H - 14} stroke="var(--ink)" strokeWidth="1" />
      <line x1={0} x2={W} y1={H - 14} y2={H - 14} stroke="var(--lead)" strokeWidth="1" />
      <text x={Math.min(W - 70, mapX + 4)} y={14} className={styles.plotLabel}>
        map {Math.round(e.posterior.mu)} g
      </text>
      <text x={0} y={H - 2} className={styles.plotLabel}>
        0 g
      </text>
      <text x={W} y={H - 2} textAnchor="end" className={styles.plotLabel}>
        {Math.round(max)} g
      </text>
    </svg>
  );
}

export function MealControls() {
  const food = useLab((s) => s.meal.food);
  const e = food ? estimate(food) : null;
  return (
    <div className={styles.panel}>
      <div className={styles.keys} role="group" aria-label="pick a food">
        {FOODS.map((f) => (
          <button
            key={f}
            type="button"
            className={styles.key}
            data-dye="model"
            aria-pressed={food === f}
            onClick={() => lab.set({ meal: { food: food === f ? null : f } })}
          >
            {f}
          </button>
        ))}
      </div>
      <p className={styles.value}>
        <output>
          {e
            ? `${e.food} · vision: "${e.vision}" · depth: ${Math.round(e.volume)} ml · map: ${Math.round(e.posterior.mu)} g · about ${Math.round(e.kcal)} kcal · demo meal`
            : "pick a food, or tap one on the plate."}
        </output>
      </p>
      {food ? <Posterior food={food} /> : null}
      {food ? (
        <p className={styles.legendLine}>
          <span className={styles.swatch} data-dye="model" /> prior: what the label says a portion usually is{" "}
          <span className={styles.swatch} data-dye="check" /> likelihood: what the depth mesh measured{" "}
          <span className={styles.swatch} data-dye="ink" /> posterior
        </p>
      ) : null}
    </div>
  );
}

/* ---------------- grader view + swag: keyboard eggs ---------------- */

const NUMBER = /\d[\d,]*(?:\.\d+)?/g;

/** Wrap the last number inside each [data-gv] block in a <mark>, the way the
 * released grader reads a completion. Only static, server-rendered prose is
 * marked, so React never has to reconcile these nodes. Returns an undo. */
function applyGraderView(): () => void {
  const marks: HTMLElement[] = [];
  document.querySelectorAll<HTMLElement>("[data-gv]").forEach((block) => {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let last: { node: Text; index: number; length: number } | null = null;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent ?? "";
      for (const m of text.matchAll(NUMBER)) last = { node: n as Text, index: m.index ?? 0, length: m[0].length };
    }
    if (!last) return;
    const middle = last.node.splitText(last.index);
    middle.splitText(last.length);
    const mark = document.createElement("mark");
    mark.className = "gv-num";
    middle.replaceWith(mark);
    mark.appendChild(middle);
    marks.push(mark);
  });
  return () => {
    for (const mark of marks) {
      const parent = mark.parentNode;
      mark.replaceWith(...Array.from(mark.childNodes));
      parent?.normalize();
    }
  };
}

export function Shortcuts() {
  const graderView = useLab((s) => s.graderView);
  const shortcuts = useLab((s) => s.shortcuts);

  useEffect(() => {
    if (!graderView) return;
    document.documentElement.dataset.grader = "";
    const undo = applyGraderView();
    return () => {
      undo();
      delete document.documentElement.dataset.grader;
    };
  }, [graderView]);

  useEffect(() => {
    if (!shortcuts) return;
    let typed = "";
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || e.isComposing) return;
      if (e.key === "Escape") {
        lab.set({ swag: false, graderView: false });
        return;
      }
      // Only text entry swallows letters; radios, ranges and buttons don't.
      const t = e.target as HTMLElement | null;
      const textual =
        t instanceof HTMLInputElement
          ? !/^(radio|checkbox|range|button|submit|reset|color)$/.test(t.type)
          : !!t && (t.isContentEditable || /^(TEXTAREA|SELECT)$/.test(t.tagName));
      if (textual) return;
      if (e.key.length !== 1) return;
      typed = (typed + e.key.toLowerCase()).slice(-4);
      if (typed === "swag") {
        lab.set({ swag: true, preview: null });
        typed = "";
        return;
      }
      if (e.key.toLowerCase() === "g") lab.set((s) => ({ graderView: !s.graderView }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcuts]);

  return (
    <p className={styles.toggles}>
      <button type="button" className={styles.textButton} aria-pressed={graderView} onClick={() => lab.set((s) => ({ graderView: !s.graderView }))}>
        grader view{shortcuts ? " (g)" : ""}
      </button>
      <button type="button" className={styles.textButton} aria-pressed={shortcuts} onClick={() => lab.set((s) => ({ shortcuts: !s.shortcuts }))}>
        single-key shortcuts: {shortcuts ? "on" : "off"}
      </button>
    </p>
  );
}

/* ---------------- a click-to-load video (no iframe, no tracking until asked) ---------------- */

export function VideoFacade({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  // The button that had focus is replaced; hand focus to the player.
  useEffect(() => {
    if (open) frame.current?.focus();
  }, [open]);
  if (open) {
    return (
      <div className={styles.video}>
        <iframe
          ref={frame}
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <button type="button" className={styles.key} onClick={() => setOpen(true)}>
      watch the demo (loads youtube)
    </button>
  );
}
