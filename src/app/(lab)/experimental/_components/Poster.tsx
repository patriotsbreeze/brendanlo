"use client";

import { useMemo } from "react";
import { bedResolution, heightScale, type BedId } from "../_tensors/beds.ts";
import { posterOf } from "../_tensors/poster.ts";
import { useLab } from "./store.ts";
import { kindOf, restingTensor } from "./views.ts";
import styles from "./bed.module.css";

/* Top-down SVG of the bed. Server-rendered from the default state (so the
 * first paint already shows the work), redrawn from the store when there is no
 * WebGL, and faded out once the live canvas has drawn its first frame. */

export const POSTER_PAD = 14;
const PAD = POSTER_PAD;

export function Poster({ bed }: { bed: BedId }) {
  const preview = useLab((s) => s.preview);
  const swag = useLab((s) => s.swag);
  const step = useLab((s) => s.health.step);
  const offline = useLab((s) => s.health.offline);
  const rule = useLab((s) => s.sidewalk.rule);
  const log2k = useLab((s) => s.rlvr.log2k);
  const grader = useLab((s) => s.rlvr.grader);
  const food = useLab((s) => s.meal.food);

  const poster = useMemo(() => {
    const [cols, rows] = bedResolution(bed, "low");
    const picks = { preview, swag, step, offline, rule, log2k, grader, food };
    const t = restingTensor(bed, cols, rows, picks);
    return posterOf(t, heightScale(kindOf(bed, picks), t.rows));
  }, [bed, preview, swag, step, offline, rule, log2k, grader, food]);

  return (
    <svg
      className={styles.poster}
      viewBox={`${-PAD} ${-PAD} ${poster.width + PAD * 2} ${poster.height + PAD * 2}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <rect x={-PAD} y={-PAD} width={poster.width + PAD * 2} height={poster.height + PAD * 2} fill="#d6d9d3" />
      <rect width={poster.width} height={poster.height} fill="#2b2f2d" />
      {poster.layers.map((l) => (
        <path key={l.fill} fill={l.fill} d={l.d} />
      ))}
    </svg>
  );
}
