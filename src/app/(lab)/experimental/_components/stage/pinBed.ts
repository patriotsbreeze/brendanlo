import * as THREE from "three";
import { BFS_MS, lab, type LabState } from "../store.ts";
import { bedResolution, heightScale, tensorFor, type BedId, type LabViews, type TensorKind, type Tier } from "../../_tensors/beds.ts";
import { ARREST_STEPS, loadEnvelope, railCell } from "../../_tensors/healthar.ts";
import { rlvrDefaultView } from "../../_tensors/rlvr.ts";
import { cellAtUV, clamp, hash2, type Tensor } from "../../_tensors/core.ts";
import { NIGHT } from "../night.ts";
import { buildPinGeometry, buildTrayGeometry } from "./pinGeometry.ts";
import { createContactMaterial, createHeightTexture, createPinMaterial, createTrayMaterial, FLOOR_COLOR } from "./pinMaterial.ts";

/* One shape display, imperatively. Plain three (no React renderer): the React
 * wrapper only creates it, feeds it size/visibility, and disposes it. All
 * per-frame mutation lives inside this class.
 *
 * Motion model: every pin is a damped spring (stiffness 220, damping ratio
 * 0.72, fixed 120 Hz substeps). A re-press staggers each pin's new target
 * along the key light's direction, back-left to front-right, so motion and
 * light come from the same side. The canvas only draws while something moves
 * (an idle page renders zero frames). */

export interface PinBedOptions {
  bed: BedId;
  tier: Tier;
  reduced: boolean;
  playLoad: boolean;
  onFirstFrame?: () => void;
  onLost?: () => void;
}

const K = 220;
const SUBSTEP = 1 / 120;
const CAM_EL = (42 * Math.PI) / 180;
const CAM_YAW = (-12 * Math.PI) / 180;
const FOV = 18;
const MARGIN = 1.6;
const TRAY_DEPTH = 3;
const SWEEP_MS = 550;
const LOAD_MS = 1900;

export class PinBed {
  private readonly canvas: HTMLCanvasElement;
  private readonly opts: PinBedOptions;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FOV, 1, 1, 4000);
  private readonly cols: number;
  private readonly rows: number;
  private readonly n: number;

  private readonly pinGeo: THREE.InstancedBufferGeometry;
  private readonly pinMat: THREE.ShaderMaterial;
  private readonly trayGeo: THREE.BufferGeometry;
  private readonly trayMat: THREE.ShaderMaterial;
  private readonly floorGeo: THREE.PlaneGeometry;
  private readonly floorMat: THREE.MeshBasicMaterial;
  private readonly contactGeo: THREE.PlaneGeometry;
  private readonly contactMat: THREE.ShaderMaterial;
  private readonly heightTex: THREE.DataTexture;

  // Spring state, in world units (pin widths).
  private readonly x: Float32Array;
  private readonly v: Float32Array;
  private readonly target: Float32Array;
  private readonly pending: Float32Array;
  private readonly applyAt: Float64Array;
  private readonly dye: Float32Array;
  private readonly pendingDye: Float32Array;
  private readonly dip: Float32Array;
  private readonly kickUntil: Float64Array;

  private tensor: Tensor | null = null;
  private kind: TensorKind | null = null;
  private signature = "";
  private raf = 0;
  private timer = 0;
  private visible = true;
  private disposed = false;
  private lastT = 0;
  private acc = 0;
  private moving = false;
  private loadStart = -1;
  private loading: boolean;
  private seenRejections: number;
  private seenRaises: number;
  private flashUntil = 0;
  private probeKey = "";
  private firstFrame = false;
  private dpr: number;
  private steps: number;
  private slow = 0;
  private sampled = 0;

  constructor(canvas: HTMLCanvasElement, opts: PinBedOptions) {
    this.canvas = canvas;
    this.opts = opts;
    [this.cols, this.rows] = bedResolution(opts.bed, opts.tier);
    this.n = this.cols * this.rows;
    this.dpr = Math.min(window.devicePixelRatio || 1, opts.tier === "high" ? 1.5 : opts.tier === "mid" ? 1.25 : 1);
    this.steps = opts.tier === "high" ? 24 : opts.tier === "mid" ? 12 : 0;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      stencil: false,
    });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setClearColor(0x000000, 0);
    // The shaders tone-map and encode sRGB themselves.
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    canvas.addEventListener("webglcontextlost", this.handleLost, false);

    const { cols, rows, n } = this;
    this.x = new Float32Array(n);
    this.v = new Float32Array(n);
    this.target = new Float32Array(n);
    this.pending = new Float32Array(n);
    this.applyAt = new Float64Array(n).fill(Infinity);
    this.dye = new Float32Array(n);
    this.pendingDye = new Float32Array(n);
    this.dip = new Float32Array(n);
    this.kickUntil = new Float64Array(n);

    const shaft = rows * 0.32 + 4;
    this.heightTex = createHeightTexture(cols, rows);
    this.pinGeo = buildPinGeometry(cols, rows, shaft);
    this.pinMat = createPinMaterial(this.heightTex, cols, rows, this.steps);
    const pins = new THREE.Mesh(this.pinGeo, this.pinMat);
    pins.frustumCulled = false;

    this.trayGeo = buildTrayGeometry(cols, rows, MARGIN, TRAY_DEPTH);
    this.trayMat = createTrayMaterial(this.heightTex, cols, rows, this.steps);
    const tray = new THREE.Mesh(this.trayGeo, this.trayMat);

    // Dark well under the field, seen through the 0.1 gaps between pins.
    this.floorGeo = new THREE.PlaneGeometry(cols, rows);
    this.floorGeo.rotateX(-Math.PI / 2);
    this.floorGeo.translate(0, -2.2, 0);
    this.floorMat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHex(FLOOR_COLOR, THREE.NoColorSpace) });
    const floor = new THREE.Mesh(this.floorGeo, this.floorMat);

    // Soft contact shadow of the tray on the page.
    const hw = cols / 2 + MARGIN;
    const hd = rows / 2 + MARGIN;
    this.contactGeo = new THREE.PlaneGeometry(hw * 2 + 14, hd * 2 + 14);
    this.contactGeo.rotateX(-Math.PI / 2);
    this.contactGeo.translate(1.2, -TRAY_DEPTH - 0.02, 1.6);
    this.contactMat = createContactMaterial(hw, hd, 4.5);
    const contact = new THREE.Mesh(this.contactGeo, this.contactMat);
    contact.renderOrder = -1;

    this.scene.add(contact, floor, tray, pins);

    const s = lab.get();
    this.seenRejections = s.health.rejections;
    this.seenRaises = s.health.raises;
    this.loading = opts.playLoad && !opts.reduced && opts.bed === "healthar";
    if (!this.loading) {
      // Beds below the hero are already at rest when they arrive.
      this.sync(performance.now(), true);
      this.target.set(this.pending);
      this.dye.set(this.pendingDye);
      this.applyAt.fill(Infinity);
      this.x.set(this.target);
    }
  }

  /* ---------------- lifecycle ---------------- */

  resize(width: number, height: number) {
    if (this.disposed || width < 2 || height < 2) return;
    this.renderer.setSize(width, height, false);
    this.syncViewport();
    this.camera.aspect = width / height;
    this.fitCamera();
    // setSize clears the drawing buffer; redraw now rather than painting a
    // blank frame until the next rAF.
    if (this.firstFrame) this.renderer.render(this.scene, this.camera);
    this.invalidate();
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    if (visible) this.invalidate();
  }

  /** Called on every store change. */
  onStore = () => {
    if (this.disposed) return;
    this.sync(performance.now(), false);
    this.invalidate();
  };

  invalidate = () => {
    if (this.raf || !this.visible || this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.clearTimeout(this.timer);
    this.canvas.removeEventListener("webglcontextlost", this.handleLost, false);
    this.pinGeo.dispose();
    this.pinMat.dispose();
    this.trayGeo.dispose();
    this.trayMat.dispose();
    this.floorGeo.dispose();
    this.floorMat.dispose();
    this.contactGeo.dispose();
    this.contactMat.dispose();
    this.heightTex.dispose();
    this.renderer.dispose();
    // Free the context now; iOS caps live WebGL contexts per page.
    this.renderer.forceContextLoss();
  }

  private handleLost = (e: Event) => {
    e.preventDefault();
    this.opts.onLost?.();
  };

  /* ---------------- state -> targets ---------------- */

  private kindFor(s: LabState): TensorKind {
    if (this.opts.bed !== "healthar") return this.opts.bed;
    return s.preview ?? (s.swag ? "swag" : "healthar");
  }

  private sync(now: number, initial: boolean) {
    const s = lab.get();
    const kind = this.kindFor(s);

    // Engine events on the hero: a model raise flashes yellow, a rejection clunks.
    // Counters are monotonic; react only to increases.
    if (s.health.raises > this.seenRaises) {
      this.flashUntil = now + 700;
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(this.onStore, 720);
    }
    this.seenRaises = s.health.raises;

    let loadT = -1;
    if (this.loading && kind === "healthar") {
      if (this.loadStart < 0) this.loadStart = now;
      loadT = Math.max(0, (now - this.loadStart) / 1000);
      if (now - this.loadStart > LOAD_MS) this.loading = false;
    }
    const env = loadT >= 0 ? loadEnvelope(loadT) : null;

    const progress = this.opts.reduced || !s.sidewalk.startedAt ? 1 : clamp((now - s.sidewalk.startedAt) / BFS_MS);
    const views: LabViews = {
      healthar: {
        step: s.health.step,
        offline: s.health.offline,
        noise: env ? env.noise : 0,
        keypoints: env ? env.keypoints : true,
        rail: env ? env.rail : true,
        raiseFlash: now < this.flashUntil,
      },
      sidewalk: { rule: s.sidewalk.rule, progress },
      // The hero's pass@k preview always shows the captioned k = 256 field.
      rlvr: this.opts.bed === "healthar" ? rlvrDefaultView : s.rlvr,
      meal: s.meal,
    };

    const h = views.healthar;
    const sig =
      kind === "healthar"
        ? `h|${h.step}|${h.offline}|${h.noise.toFixed(2)}|${h.keypoints}|${h.rail}|${h.raiseFlash}`
        : kind === "sidewalk"
          ? `s|${views.sidewalk.rule}|${progress.toFixed(2)}`
          : kind === "rlvr"
            ? `r|${views.rlvr.log2k.toFixed(3)}|${views.rlvr.grader}`
            : kind === "meal"
              ? `m|${s.meal.food}`
              : kind;

    if (sig !== this.signature) {
      const kindChanged = kind !== this.kind;
      const firstLoadPress = loadT >= 0 && this.kind === null;
      this.signature = sig;
      this.kind = kind;
      this.tensor = tensorFor(kind, this.cols, this.rows, views, NIGHT);
      this.retarget(this.tensor, kind, now, !initial && !this.opts.reduced && (kindChanged || firstLoadPress));
    }

    const rejected = s.health.rejections > this.seenRejections;
    this.seenRejections = s.health.rejections;
    if (rejected && kind === "healthar" && !this.opts.reduced && s.health.lastRejected) {
      this.clunk(s.health.lastRejected, s.health.step, now);
    }

    this.syncProbe(s);
  }

  private retarget(t: Tensor, kind: TensorKind, now: number, sweep: boolean) {
    const scale = heightScale(kind, this.rows);
    const { cols, rows } = this;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        this.pending[i] = t.h[i] * scale;
        this.pendingDye[i] = t.dye[i];
        const delay = sweep ? ((c + 0.5) / cols * 0.5 + (r + 0.5) / rows * 0.5) * SWEEP_MS + hash2(c, r, 1) * 35 : 0;
        this.applyAt[i] = now + delay;
      }
    }
    if (this.opts.reduced) {
      // Instant cut: no travel, no overshoot.
      for (let i = 0; i < this.n; i++) {
        this.target[i] = this.pending[i];
        this.x[i] = this.pending[i] + this.dip[i];
        this.v[i] = 0;
        this.dye[i] = this.pendingDye[i];
        this.applyAt[i] = Infinity;
      }
    }
    this.moving = true;
  }

  /** A rejected model event: the urgency block (stand down) or the current
   * step's block (skip ahead) gets knocked and returns on an overdamped spring. */
  private clunk(kind: "lower" | "skip", step: number, now: number) {
    const { cols, rows } = this;
    const scale = heightScale("healthar", rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rail = railCell((c + 0.5) / cols, (r + 0.5) / rows);
        if (!rail) continue;
        const hit = kind === "lower" ? rail.kind === "urgency" : rail.kind === "step" && rail.index === Math.min(step + 1, ARREST_STEPS.length - 1);
        if (!hit) continue;
        const i = r * cols + c;
        this.v[i] = kind === "lower" ? -2.6 * scale : 2.2 * scale;
        this.kickUntil[i] = now + 650;
      }
    }
    this.moving = true;
  }

  private syncProbe(s: LabState) {
    const probe = s.probe[this.opts.bed];
    const key = probe ? `${probe.u.toFixed(4)}|${probe.v.toFixed(4)}|${probe.pressed}` : "";
    if (key === this.probeKey) return;
    this.probeKey = key;
    const { cols, rows } = this;
    this.dip.fill(0);
    const uProbe = this.pinMat.uniforms.uProbe.value as THREE.Vector2;
    if (!probe) {
      uProbe.set(-10, -10);
    } else {
      const cell = cellAtUV(probe.u, probe.v, cols, rows);
      const pc = cell % cols;
      const pr = Math.floor(cell / cols);
      uProbe.set(pc, pr);
      if (probe.pressed) {
        const R = 3.2;
        const depth = heightScale("healthar", rows) * 0.1;
        for (let r = Math.max(0, pr - 4); r <= Math.min(rows - 1, pr + 4); r++) {
          for (let c = Math.max(0, pc - 4); c <= Math.min(cols - 1, pc + 4); c++) {
            const d = Math.hypot(c - pc, r - pr);
            if (d < R) this.dip[r * cols + c] = -depth * (1 - d / R) * (1 - d / R);
          }
        }
      }
    }
    if (this.opts.reduced) for (let i = 0; i < this.n; i++) this.x[i] = this.target[i] + this.dip[i];
    this.moving = true;
  }

  /* ---------------- simulation + render ---------------- */

  private step(dt: number, now: number) {
    let active = false;
    const { x, v, target, pending, applyAt, dye, pendingDye, dip, kickUntil } = this;
    const c72 = 2 * 0.72 * Math.sqrt(K);
    const c140 = 2 * 1.4 * Math.sqrt(K);
    for (let i = 0; i < this.n; i++) {
      if (applyAt[i] <= now) {
        target[i] = pending[i];
        dye[i] = pendingDye[i];
        applyAt[i] = Infinity;
      } else if (applyAt[i] !== Infinity) {
        active = true;
      }
      const goal = target[i] + dip[i];
      const damp = now < kickUntil[i] ? c140 : c72;
      v[i] += (K * (goal - x[i]) - damp * v[i]) * dt;
      x[i] += v[i] * dt;
      if (Math.abs(v[i]) > 1e-3 || Math.abs(goal - x[i]) > 1e-3) active = true;
      else {
        x[i] = goal;
        v[i] = 0;
      }
    }
    return active;
  }

  private frame = (now: number) => {
    this.raf = 0;
    if (this.disposed) return;
    const dtReal = this.lastT ? Math.min(0.05, (now - this.lastT) / 1000) : 1 / 60;
    this.lastT = now;

    this.sync(now, false);
    let active = false;
    if (this.opts.reduced) {
      active = false;
    } else {
      this.acc += dtReal;
      let n = 0;
      while (this.acc >= SUBSTEP && n < 12) {
        active = this.step(SUBSTEP, now) || active;
        this.acc -= SUBSTEP;
        n++;
      }
      if (n === 0) active = true;
    }

    if (this.moving) this.monitor(dtReal);

    const hAttr = this.pinGeo.getAttribute("aHeight") as THREE.InstancedBufferAttribute;
    (hAttr.array as Float32Array).set(this.x);
    hAttr.needsUpdate = true;
    const dAttr = this.pinGeo.getAttribute("aDye") as THREE.InstancedBufferAttribute;
    (dAttr.array as Float32Array).set(this.dye);
    dAttr.needsUpdate = true;
    (this.heightTex.image.data as Float32Array).set(this.x);
    this.heightTex.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
    if (!this.firstFrame) {
      this.firstFrame = true;
      this.opts.onFirstFrame?.();
    }

    const s = lab.get();
    const bfsRunning = !this.opts.reduced && this.kind === "sidewalk" && s.sidewalk.startedAt > 0 && now - s.sidewalk.startedAt < BFS_MS + 100;
    this.moving = active || (this.loading && this.kind === "healthar") || bfsRunning;
    if (this.moving) {
      this.invalidate();
    } else {
      this.lastT = 0;
      this.acc = 0;
    }
  };

  /** Only ever steps quality DOWN, so it cannot oscillate. The threshold is
   * ~22 fps sustained: a 30 fps cap (iOS Low Power Mode, throttled panes) is
   * not a reason to drop the shadows. */
  private monitor(dt: number) {
    this.sampled++;
    if (dt > 0.045) this.slow++;
    if (this.sampled < 45) return;
    if (this.slow > 36) {
      if (this.dpr > 1) {
        this.dpr = Math.max(1, this.dpr - 0.25);
        this.renderer.setPixelRatio(this.dpr);
        const size = this.renderer.getSize(new THREE.Vector2());
        this.renderer.setSize(size.x, size.y, false);
        this.syncViewport();
      } else if (this.steps > 0) {
        this.steps = this.steps > 12 ? 12 : 0;
        this.pinMat.uniforms.uSteps.value = this.steps;
        this.trayMat.uniforms.uSteps.value = this.steps;
      }
    }
    this.sampled = 0;
    this.slow = 0;
  }

  /** The contact shadow fades out at the canvas edge instead of being cut. */
  private syncViewport() {
    const v = this.contactMat.uniforms.uViewport.value as THREE.Vector2;
    this.renderer.getDrawingBufferSize(v);
    this.contactMat.uniforms.uEdge.value = 28 * this.dpr;
  }

  /* ---------------- camera + picking ---------------- */

  private fitCamera() {
    const cam = this.camera;
    const hw = this.cols / 2 + MARGIN;
    const hd = this.rows / 2 + MARGIN;
    const top = this.rows * 0.18;
    const corners: THREE.Vector3[] = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [-TRAY_DEPTH * 0.4, top]) corners.push(new THREE.Vector3(sx * hw, y, sz * hd));
    const dir = new THREE.Vector3(Math.sin(CAM_YAW) * Math.cos(CAM_EL), Math.sin(CAM_EL), Math.cos(CAM_YAW) * Math.cos(CAM_EL));
    const target = new THREE.Vector3(0, top * 0.2, 0);
    const p = new THREE.Vector3();
    const place = (dist: number) => {
      cam.position.copy(target).addScaledVector(dir, dist);
      cam.lookAt(target);
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
    };
    const extent = () => {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const c of corners) {
        p.copy(c).project(cam);
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
      return { minX, maxX, minY, maxY };
    };
    for (let pass = 0; pass < 3; pass++) {
      let lo = 10;
      let hi = 8000;
      for (let k = 0; k < 30; k++) {
        const mid = (lo + hi) / 2;
        place(mid);
        const e = extent();
        if (Math.max(-e.minX, e.maxX, -e.minY, e.maxY) > 0.96) lo = mid;
        else hi = mid;
      }
      place(hi);
      const e = extent();
      const cx = (e.minX + e.maxX) / 2;
      const cy = (e.minY + e.maxY) / 2;
      const dist = cam.position.distanceTo(target);
      const halfH = dist * Math.tan((FOV * Math.PI) / 360);
      const halfW = halfH * cam.aspect;
      const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
      target.addScaledVector(right, cx * halfW).addScaledVector(up, cy * halfH);
    }
  }

  private readonly ray = new THREE.Raycaster();

  /** Screen point -> (u, v) on the bed, by marching the ray through the pin
   * heights, so tall pins are picked where they stand. */
  pointerToUV(clientX: number, clientY: number): { u: number; v: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -(((clientY - rect.top) / rect.height) * 2 - 1));
    this.ray.setFromCamera(ndc, this.camera);
    const o = this.ray.ray.origin;
    const d = this.ray.ray.direction;
    if (d.y >= 0) return null;
    const maxH = this.rows * 0.33;
    const t0 = (maxH - o.y) / d.y;
    const t1 = (0 - o.y) / d.y;
    const { cols, rows } = this;
    let px = 0;
    let pz = 0;
    for (let s = 0; s <= 240; s++) {
      const t = t0 + ((t1 - t0) * s) / 240;
      px = o.x + d.x * t;
      const py = o.y + d.y * t;
      pz = o.z + d.z * t;
      const c = Math.floor(px + cols / 2);
      const r = Math.floor(pz + rows / 2);
      if (c >= 0 && c < cols && r >= 0 && r < rows && py <= this.x[r * cols + c]) break;
    }
    const u = (px + cols / 2) / cols;
    const v = (pz + rows / 2) / rows;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    return { u, v };
  }
}
