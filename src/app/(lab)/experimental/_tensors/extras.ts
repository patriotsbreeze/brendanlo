import { blank, cellXZ, clamp, slab, type Tensor } from "./core.ts";

/* Two tensors that only ever appear on the hero bed:
 * - swag: a folded free hackathon t-shirt (the "swag" easter egg)
 * - night: ReSource's commit log as a skyline, 2:41 pm to 11:20 am */

const GLYPHS: Record<string, string[]> = {
  f: ["..##.", ".#...", "####.", ".#...", ".#...", ".#...", ".#..."],
  r: [".....", ".....", "#.##.", "##..#", "#....", "#....", "#...."],
  e: [".....", ".....", ".###.", "#...#", "#####", "#....", ".###."],
};

export function swagTensor(cols: number, rows: number): Tensor {
  const t = blank(cols, rows);
  const word = "free";
  const glyphW = 6;
  const textCells = word.length * glyphW - 1;
  const textW = 0.5;
  const px = textW / textCells;
  const x0 = -textW / 2;
  const z0 = -0.06;
  const tags: string[] = new Array(cols * rows).fill("");
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const { x, z } = cellXZ(c, r, cols, rows);
      let h = slab(x, z, 0, 0.02, 0.4, 0.38, 0.17, 6, 0.25);
      if (h <= 0) continue;
      // Sleeve folds: two soft ridges where the sleeves were folded back.
      h += 0.05 * Math.max(0, 1 - Math.abs(Math.abs(x) - 0.27) / 0.03);
      // Collar band at the back edge.
      const collar = Math.hypot(x, (z + 0.36) * 1.3);
      if (collar < 0.12 && collar > 0.08) h += 0.06;
      if (collar <= 0.08) h -= 0.07;
      // Embossed print.
      const gx = Math.floor((x - x0) / px);
      const gz = Math.floor((z - z0) / px);
      if (gx >= 0 && gx < textCells && gz >= 0 && gz < 7) {
        const ch = word[Math.floor(gx / glyphW)];
        const col = gx % glyphW;
        if (col < 5 && GLYPHS[ch][gz][col] === "#") h += 0.09;
      }
      t.h[i] = clamp(h);
      tags[i] = "1 t-shirt. free. this is why i go to hackathons.";
    }
  }
  t.describe = (i) => tags[i] || "table";
  return t;
}

export interface NightCommit {
  minutes: number; // since the first commit
  local: string;
  message: string;
}

export function nightTensor(cols: number, rows: number, commits: NightCommit[]): Tensor {
  const t = blank(cols, rows);
  const span = commits.length ? commits[commits.length - 1].minutes : 1;
  const total = commits.length;
  const tags: string[] = new Array(cols * rows).fill("");
  const left = 0.06;
  const right = 0.94;
  for (let c = 0; c < cols; c++) {
    const u = (c + 0.5) / cols;
    const f = (u - left) / (right - left);
    if (f < 0 || f > 1) continue;
    const minute = f * span;
    let count = 0;
    let last: NightCommit | null = null;
    for (const cm of commits) {
      if (cm.minutes <= minute) {
        count++;
        last = cm;
      }
    }
    const hourTick = Math.abs(((minute + 19) % 60) - 30) > 28; // first commit was :41
    for (let r = 0; r < rows; r++) {
      const v = (r + 0.5) / rows;
      const i = r * cols + c;
      if (v > 0.3 && v < 0.7) {
        t.h[i] = 0.05 + 0.85 * (count / total);
        tags[i] = last ? `${last.local} · ${count} of ${total} commits · "${last.message}"` : "before the first commit";
      } else if (v >= 0.76 && v < 0.8 && hourTick) {
        t.h[i] = 0.12;
        tags[i] = "an hour";
      }
    }
  }
  t.describe = (i) => tags[i] || "table";
  return t;
}
