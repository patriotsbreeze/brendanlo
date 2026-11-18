import { blank, cellXZ, clamp, DYE_MODEL, ellipsoid, slab, valueNoise, type Tensor } from "./core.ts";

/* A DEMO meal (procedural, not lab data) as the depth mesh the LiDAR calorie
 * app reasons over. Vision names each food; the depth mesh measures its
 * volume; a Bayesian MAP estimate reconciles "a normal portion of rice looks
 * like this" with "the mesh says this much is here".
 *
 * Scale: at the canonical 64 x 48 bed one pin is 6.5 mm and h = 1 is 100 mm. */

export type Food = "rice" | "chicken" | "broccoli";
export const FOODS: Food[] = ["rice", "chicken", "broccoli"];
type Region = "table" | "plate" | Food;

export const MEAL_CANON = { cols: 64, rows: 48 };
const MM_PER_PHYS = 6.5 * MEAL_CANON.rows; // 312 mm across the bed's depth
const MM_PER_H = 100;

const FOOD_INFO: Record<Food, { vision: string; density: number; prior: { mu: number; sd: number }; kcalPerG: number }> = {
  // density = bulk g/ml of the heap; priors = a typical plated portion for that label.
  rice: { vision: "white rice", density: 0.78, prior: { mu: 180, sd: 60 }, kcalPerG: 1.3 },
  chicken: { vision: "grilled chicken", density: 1.05, prior: { mu: 120, sd: 40 }, kcalPerG: 1.65 },
  broccoli: { vision: "broccoli", density: 0.37, prior: { mu: 85, sd: 35 }, kcalPerG: 0.35 },
};

const PLATE_R = 0.43;
const RIM_IN = 0.37;
const PLATE_FLOOR = 0.06;

function sample(x: number, z: number): { h: number; region: Region } {
  const r = Math.hypot(x, z);
  if (r > PLATE_R) return { h: 0, region: "table" };
  const rim = r > RIM_IN ? 0.06 + 0.07 * Math.sin(((r - RIM_IN) / (PLATE_R - RIM_IN)) * Math.PI) : 0;
  let best: { h: number; region: Region } = { h: PLATE_FLOOR + rim, region: "plate" };

  const rice = ellipsoid(x, z, -0.14, -0.03, 0.18, 0.15, 0.4);
  if (rice > 0) {
    const h = PLATE_FLOOR + rice + (valueNoise(x * 60, z * 60, 4) - 0.5) * 0.05 * Math.min(1, rice * 6);
    if (h > best.h) best = { h, region: "rice" };
  }

  // Chicken: a rotated rounded slab.
  const a = (20 * Math.PI) / 180;
  const cx = x - 0.15;
  const cz = z + 0.11;
  const rx = cx * Math.cos(a) + cz * Math.sin(a);
  const rz = -cx * Math.sin(a) + cz * Math.cos(a);
  const chicken = slab(rx, rz, 0, 0, 0.13, 0.075, 0.28, 3, 0.5);
  if (chicken > 0) {
    const h = PLATE_FLOOR + chicken + (valueNoise(x * 25, z * 25, 8) - 0.5) * 0.04;
    if (h > best.h) best = { h, region: "chicken" };
  }

  const florets: [number, number][] = [
    [0.06, 0.16],
    [0.15, 0.13],
    [0.1, 0.24],
    [0.2, 0.21],
  ];
  for (const [fx, fz] of florets) {
    const f = ellipsoid(x, z, fx, fz, 0.058, 0.058, 0.34);
    if (f > 0) {
      const bumps = (valueNoise(x * 90, z * 90, 2) - 0.5) * 0.09 + (valueNoise(x * 40, z * 40, 6) - 0.5) * 0.06;
      const h = PLATE_FLOOR + f + bumps * Math.min(1, f * 5);
      if (h > best.h) best = { h, region: "broccoli" };
    }
  }
  return { h: clamp(best.h), region: best.region };
}

/** What sits at a (u, v) point on the bed, for tap-to-select. */
export function regionAtUV(u: number, v: number): Region {
  const aspect = MEAL_CANON.cols / MEAL_CANON.rows;
  return sample((u - 0.5) * aspect, v - 0.5).region;
}

export interface MealView {
  food: Food | null;
}
export const mealDefaultView: MealView = { food: null };

export function mealTensor(cols: number, rows: number, view: MealView = mealDefaultView): Tensor {
  const t = blank(cols, rows);
  const regions: Region[] = new Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const { x, z } = cellXZ(c, r, cols, rows);
      const s = sample(x, z);
      t.h[i] = s.h;
      regions[i] = s.region;
      if (view.food && s.region === view.food) t.dye[i] = DYE_MODEL;
    }
  }
  t.describe = (i) => {
    const region = regions[i];
    const mm = Math.round(t.h[i] * MM_PER_H);
    if (region === "table") return "table · 0 mm";
    if (region === "plate") return "plate. 0 kcal. i checked.";
    return `${region} · vision says "${FOOD_INFO[region].vision}" · ${mm - PLATE_FLOOR * MM_PER_H} mm above the plate here`;
  };
  return t;
}

/** Volume of one food in ml, integrated from pin heights above the plate. */
export function volumeMl(food: Food, cols = MEAL_CANON.cols, rows = MEAL_CANON.rows) {
  const pinMm = MM_PER_PHYS / rows;
  let mm3 = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const { x, z } = cellXZ(c, r, cols, rows);
      const s = sample(x, z);
      if (s.region === food) mm3 += Math.max(0, (s.h - PLATE_FLOOR) * MM_PER_H) * pinMm * pinMm;
    }
  }
  return mm3 / 1000;
}

export interface Estimate {
  food: Food;
  vision: string;
  volume: number;
  prior: { mu: number; sd: number };
  likelihood: { mu: number; sd: number };
  posterior: { mu: number; sd: number };
  kcal: number;
}

/** Gaussian prior x Gaussian likelihood -> Gaussian posterior (MAP = mean). */
export function estimate(food: Food): Estimate {
  const info = FOOD_INFO[food];
  const volume = volumeMl(food);
  const lmu = volume * info.density;
  const likelihood = { mu: lmu, sd: Math.max(8, lmu * 0.18) };
  const vp = info.prior.sd ** 2;
  const vl = likelihood.sd ** 2;
  const mu = (vl * info.prior.mu + vp * likelihood.mu) / (vp + vl);
  const sd = Math.sqrt((vp * vl) / (vp + vl));
  return {
    food,
    vision: info.vision,
    volume,
    prior: info.prior,
    likelihood,
    posterior: { mu, sd },
    kcal: mu * info.kcalPerG,
  };
}
