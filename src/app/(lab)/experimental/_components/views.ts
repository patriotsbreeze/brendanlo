import { tensorFor, type BedId, type LabViews, type TensorKind } from "../_tensors/beds.ts";
import type { Tensor } from "../_tensors/core.ts";
import type { Food } from "../_tensors/meal.ts";
import { rlvrDefaultView, type Grader } from "../_tensors/rlvr.ts";
import { NIGHT } from "./night.ts";
import type { LabState } from "./store.ts";

/* The resting (non-animated) tensor a bed shows for a given state. Used by
 * the SVG poster and the DOM probe readout; the WebGL bed computes the same
 * thing plus its animations, so all three agree. */

export interface Picks {
  preview: TensorKind | null;
  swag: boolean;
  step: number;
  offline: boolean;
  rule: number;
  log2k: number;
  grader: Grader;
  food: Food | null;
}

export const picksOf = (s: LabState): Picks => ({
  preview: s.preview,
  swag: s.swag,
  step: s.health.step,
  offline: s.health.offline,
  rule: s.sidewalk.rule,
  log2k: s.rlvr.log2k,
  grader: s.rlvr.grader,
  food: s.meal.food,
});

export function kindOf(bed: BedId, p: Pick<Picks, "preview" | "swag">): TensorKind {
  if (bed !== "healthar") return bed;
  return p.preview ?? (p.swag ? "swag" : "healthar");
}

export function restingTensor(bed: BedId, cols: number, rows: number, p: Picks): Tensor {
  const views: LabViews = {
    healthar: { step: p.step, offline: p.offline, noise: 0, keypoints: true, rail: true, raiseFlash: false },
    sidewalk: { rule: p.rule, progress: 1 },
    // The hero's pass@k preview is captioned "k = 256", so it ignores the dial.
    rlvr: bed === "healthar" ? rlvrDefaultView : { log2k: p.log2k, grader: p.grader },
    meal: { food: p.food },
  };
  return tensorFor(kindOf(bed, p), cols, rows, views, NIGHT);
}
