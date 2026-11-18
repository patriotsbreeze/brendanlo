import * as THREE from "three";

/* One pin: a square prism with a chamfered top edge, built non-indexed so
 * every face keeps a flat normal (the chamfer is what catches the thin
 * specular line along each pin). Pin footprint is 0.9 of a cell, leaving a
 * 0.1 gap. The top face sits at y = 0; the shaft runs `shaft` units down so a
 * raised pin never shows its bottom. No bottom face. */

const HALF = 0.45;
const CHAMFER = 0.06;

export function buildPinGeometry(cols: number, rows: number, shaft: number) {
  const pos: number[] = [];
  const nrm: number[] = [];
  const quad = (a: number[], b: number[], c: number[], d: number[], n: number[]) => {
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let k = 0; k < 6; k++) nrm.push(...n);
  };
  const i = HALF - CHAMFER;
  const o = HALF;
  const y0 = 0;
  const y1 = -CHAMFER;
  const yb = -shaft;
  const s = Math.SQRT1_2;
  // Top (counter-clockwise seen from +y).
  quad([-i, y0, i], [i, y0, i], [i, y0, -i], [-i, y0, -i], [0, 1, 0]);
  // Chamfers.
  quad([i, y0, i], [o, y1, o], [o, y1, -o], [i, y0, -i], [s, s, 0]); // +x
  quad([-i, y0, -i], [-o, y1, -o], [-o, y1, o], [-i, y0, i], [-s, s, 0]); // -x
  quad([-i, y0, i], [-o, y1, o], [o, y1, o], [i, y0, i], [0, s, s]); // +z
  quad([i, y0, -i], [o, y1, -o], [-o, y1, -o], [-i, y0, -i], [0, s, -s]); // -z
  // Sides.
  quad([o, y1, o], [o, yb, o], [o, yb, -o], [o, y1, -o], [1, 0, 0]);
  quad([-o, y1, -o], [-o, yb, -o], [-o, yb, o], [-o, y1, o], [-1, 0, 0]);
  quad([-o, y1, o], [-o, yb, o], [o, yb, o], [o, y1, o], [0, 0, 1]);
  quad([o, y1, -o], [o, yb, -o], [-o, yb, -o], [-o, y1, -o], [0, 0, -1]);

  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));

  const n = cols * rows;
  const cell = new Float32Array(n * 2);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = r * cols + c;
      cell[k * 2] = c;
      cell[k * 2 + 1] = r;
    }
  }
  g.setAttribute("aCell", new THREE.InstancedBufferAttribute(cell, 2));
  const height = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
  height.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute("aHeight", height);
  const dye = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
  dye.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute("aDye", dye);
  g.instanceCount = n;
  // Bounds for the whole field, so the mesh is never wrongly culled.
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), Math.hypot(cols, rows, shaft));
  return g;
}

/** The tray around the field: a frame flush with resting pin tops. */
export function buildTrayGeometry(cols: number, rows: number, margin: number, depth: number) {
  const W = cols / 2;
  const D = rows / 2;
  const parts: THREE.BufferGeometry[] = [];
  const box = (w: number, d: number, x: number, z: number) => {
    const b = new THREE.BoxGeometry(w, depth, d);
    b.translate(x, -depth / 2, z);
    parts.push(b.toNonIndexed());
  };
  box(cols + margin * 2, margin, 0, -D - margin / 2); // back
  box(cols + margin * 2, margin, 0, D + margin / 2); // front
  box(margin, rows, -W - margin / 2, 0); // left
  box(margin, rows, W + margin / 2, 0); // right
  const total = parts.reduce((n, p) => n + p.attributes.position.count, 0);
  const pos = new Float32Array(total * 3);
  const nrm = new Float32Array(total * 3);
  let off = 0;
  for (const p of parts) {
    pos.set(p.attributes.position.array as Float32Array, off * 3);
    nrm.set(p.attributes.normal.array as Float32Array, off * 3);
    off += p.attributes.position.count;
    p.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  return g;
}
