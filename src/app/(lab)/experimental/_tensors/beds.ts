import { blank, DYE_NONE, type Tensor } from "./core.ts";
import { healtharTensor, type HealtharView } from "./healthar.ts";
import { mealTensor, type MealView } from "./meal.ts";
import { rlvrTensor, type RlvrView } from "./rlvr.ts";
import { sidewalkTensor, type SidewalkView } from "./sidewalk.ts";
import { nightTensor, swagTensor, type NightCommit } from "./extras.ts";

export type BedId = "healthar" | "sidewalk" | "rlvr" | "meal";
export type TensorKind = BedId | "resource" | "swag";
export type Tier = "high" | "mid" | "low";

export const BEDS: BedId[] = ["healthar", "sidewalk", "rlvr", "meal"];

/** Pins per bed at each quality tier. Tensors are regenerated at the tier's
 * resolution, never upscaled. The pass@k field is always 25 x 20: one pin per
 * toy problem. */
export function bedResolution(bed: BedId, tier: Tier): [number, number] {
  if (bed === "rlvr") return [25, 20];
  return tier === "high" ? [64, 48] : tier === "mid" ? [48, 36] : [32, 24];
}

/** World height (in pin widths) of h = 1 for each kind of tensor. */
export function heightScale(kind: TensorKind, rows: number) {
  switch (kind) {
    case "healthar":
      return rows * 0.22;
    case "sidewalk":
      return rows * 0.15;
    case "rlvr":
      // h = 1 is common here (solved problems), so keep it inside the
      // camera's framed height (rows * 0.18, see pinBed.fitCamera).
      return rows * 0.18;
    case "meal":
      return rows * 0.26;
    case "resource":
      return rows * 0.2;
    case "swag":
      return rows * 0.4;
  }
}

export interface LabViews {
  healthar: HealtharView;
  sidewalk: SidewalkView;
  rlvr: RlvrView;
  meal: MealView;
}

export function tensorFor(kind: TensorKind, cols: number, rows: number, views: LabViews, night: NightCommit[]): Tensor {
  switch (kind) {
    case "healthar":
      return healtharTensor(cols, rows, views.healthar);
    case "sidewalk":
      return sidewalkTensor(cols, rows, views.sidewalk);
    case "rlvr":
      return resample(rlvrTensor(views.rlvr), cols, rows);
    case "meal":
      return mealTensor(cols, rows, views.meal);
    case "resource":
      return nightTensor(cols, rows, night);
    case "swag":
      return swagTensor(cols, rows);
  }
}

/** Nearest-neighbour resample, so a fixed-size tensor can be pressed into a
 * bed of a different resolution (the pass@k field previewed on the hero). */
export function resample(src: Tensor, cols: number, rows: number): Tensor {
  if (src.cols === cols && src.rows === rows) return src;
  const t = blank(cols, rows);
  const map = new Int32Array(cols * rows);
  // Keep a one-pin gutter around the resampled field so it reads as blocks.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const sc = Math.floor(((c + 0.5) / cols) * src.cols);
      const sr = Math.floor(((r + 0.5) / rows) * src.rows);
      const j = sr * src.cols + sc;
      map[i] = j;
      t.h[i] = src.h[j];
      t.dye[i] = src.dye[j];
    }
  }
  t.describe = (i) => src.describe(map[i]);
  return t;
}

export const isDyed = (t: Tensor, i: number) => t.dye[i] !== DYE_NONE;
