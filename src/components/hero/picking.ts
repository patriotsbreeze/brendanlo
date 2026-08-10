/**
 * Nearest-point-to-cursor picking, in screen space.
 *
 * Deliberately not THREE.Raycaster — not mainly for speed, but for semantics.
 * A raycaster sorts hits by distance ALONG THE RAY, so a point directly behind
 * the cursor but far away beats one two pixels off it; and its `threshold` is a
 * world radius, so the grab tolerance in pixels would change with depth. For a
 * flat, order-independent figure the right question is "which point is nearest
 * the cursor on screen", which is exactly this.
 *
 * Pure and allocation-free in the hot loop.
 */

/** Column-major 4x4 (three's Matrix4.elements layout). */
export type Mat4 = ArrayLike<number>;

export interface PickResult {
  /** Index of the nearest point, or -1. */
  id: number;
  /** Its screen distance from the cursor in CSS px. */
  distPx: number;
}

/**
 * @param positions flat xyz, length n*3, in the same object space as `mvp`
 * @param mvp       projection * view * model, column-major
 * @param cx, cy    cursor position in CSS px, relative to the canvas rect
 * @param w, h      canvas CSS size
 * @param radiusPx  only points within this screen radius are candidates
 */
export function pickNearest(
  positions: Float32Array,
  count: number,
  mvp: Mat4,
  cx: number,
  cy: number,
  w: number,
  h: number,
  radiusPx: number
): PickResult {
  const e = mvp;
  const halfW = w * 0.5;
  const halfH = h * 0.5;
  const r2 = radiusPx * radiusPx;

  let bestId = -1;
  let bestD2 = r2;
  // Tie-break by nearer-to-camera only when two candidates are within a pixel.
  let bestW = Infinity;

  for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];

    const cw = e[3] * x + e[7] * y + e[11] * z + e[15];
    if (cw <= 0) continue; // behind the camera

    const cxp = e[0] * x + e[4] * y + e[8] * z + e[12];
    const cyp = e[1] * x + e[5] * y + e[9] * z + e[13];

    const inv = 1 / cw;
    // NDC -> CSS px, y flipped.
    const sx = (cxp * inv + 1) * halfW;
    const sy = (1 - cyp * inv) * halfH;

    const dx = sx - cx;
    const dy = sy - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 > bestD2) continue;
    if (d2 === bestD2 && cw >= bestW) continue;

    bestD2 = d2;
    bestW = cw;
    bestId = i;
  }

  return { id: bestId, distPx: bestId === -1 ? Infinity : Math.sqrt(bestD2) };
}
