/**
 * The reference frame the eye reads perspective against.
 *
 * A monochrome point cloud on a flat ground is genuinely ambiguous — a viewer
 * cannot tell "near dot" from "big dot". Converging parallel grid lines cannot
 * be misread, which is why this box is the highest depth-cue-per-byte element
 * in the figure.
 *
 * Pure: no `three` import, returns typed arrays only.
 */

export interface RefBox {
  /** Non-indexed line segment vertices, xyz. */
  positions: Float32Array;
  /**
   * Midpoint of the segment's OWNING feature — the edge's own midpoint for a
   * cube edge, the pane's centre for a grid line. The shader compares this
   * against the box centre to decide "backness", so a whole pane fades as one
   * rather than each line fading independently.
   */
  mids: Float32Array;
  /** 0 = pane grid (--rule), 1 = cube edge (--rule-strong). */
  styles: Float32Array;
  count: number;
}

/**
 * Twelve cube edges plus six pane grids, half-extent `h`.
 *
 * Only the three edges meeting the far corner ever survive the shader's
 * backness gate — that is the mplot3d convention, not a bug. The front half
 * never draws, so the box never becomes a second frame around the plate's own
 * border.
 */
export function buildRefBox(h = 1.15): RefBox {
  const pos: number[] = [];
  const mid: number[] = [];
  const sty: number[] = [];

  const seg = (
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    mx: number, my: number, mz: number,
    style: number
  ) => {
    pos.push(ax, ay, az, bx, by, bz);
    mid.push(mx, my, mz, mx, my, mz);
    sty.push(style, style);
  };

  /* 12 cube edges — 24 verts. aMid is the edge's own midpoint. */
  const c: [number, number, number][] = [];
  for (const sx of [-h, h]) for (const sy of [-h, h]) for (const sz of [-h, h]) c.push([sx, sy, sz]);
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      // Adjacent corners differ in exactly one coordinate.
      let diff = 0;
      for (let k = 0; k < 3; k++) if (c[i][k] !== c[j][k]) diff++;
      if (diff !== 1) continue;
      seg(
        c[i][0], c[i][1], c[i][2],
        c[j][0], c[j][1], c[j][2],
        (c[i][0] + c[j][0]) / 2, (c[i][1] + c[j][1]) / 2, (c[i][2] + c[j][2]) / 2,
        1
      );
    }
  }

  /* 6 pane grids — 72 verts. 3 lines per in-plane direction, at -h/2, 0, +h/2.
   * aMid is the PANE centre so the pane switches together. */
  const ticks = [-h / 2, 0, h / 2];
  // axis = the pane's normal (0 = x, 1 = y, 2 = z); side = which wall.
  for (let axis = 0; axis < 3; axis++) {
    for (const side of [-h, h]) {
      const u = (axis + 1) % 3;
      const v = (axis + 2) % 3;
      const paneMid: [number, number, number] = [0, 0, 0];
      paneMid[axis] = side;

      for (const t of ticks) {
        // A line spanning v, held at u = t.
        const a: [number, number, number] = [0, 0, 0];
        const b: [number, number, number] = [0, 0, 0];
        a[axis] = side; b[axis] = side;
        a[u] = t; b[u] = t;
        a[v] = -h; b[v] = h;
        seg(a[0], a[1], a[2], b[0], b[1], b[2], paneMid[0], paneMid[1], paneMid[2], 0);

        // A line spanning u, held at v = t.
        const p: [number, number, number] = [0, 0, 0];
        const q: [number, number, number] = [0, 0, 0];
        p[axis] = side; q[axis] = side;
        p[v] = t; q[v] = t;
        p[u] = -h; q[u] = h;
        seg(p[0], p[1], p[2], q[0], q[1], q[2], paneMid[0], paneMid[1], paneMid[2], 0);
      }
    }
  }

  return {
    positions: new Float32Array(pos),
    mids: new Float32Array(mid),
    styles: new Float32Array(sty),
    count: sty.length,
  };
}
