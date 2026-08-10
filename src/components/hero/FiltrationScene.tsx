"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { buildCloud, buildEdges, h0Barcode } from "./filtration";
import { buildRefBox } from "./refBox";
import { pickNearest } from "./picking";
import { heroInput } from "./heroInput";
import { epsilonCurve, P_REST } from "./epsilonCurve";

/* Colours are passed as literal sRGB values with NoColorSpace.
 *
 * ColorManagement is enabled by default in three 0.185, so `new Color('#14120f')`
 * ALREADY converts sRGB -> linear. The previous code then called
 * convertSRGBToLinear() on top of that, linearising twice: 0.00700 -> 0.00054,
 * which lands on sRGB byte 2 — the figure was drawing near-black, not warm ink.
 *
 * A ShaderMaterial never includes <colorspace_fragment>, so nothing converts on
 * output either. Feeding sRGB values straight through is therefore correct, and
 * it means the box hairlines composite to EXACTLY the CSS token values. */
const INK = new THREE.Color().setHex(0x14120f, THREE.NoColorSpace);
const RULE = new THREE.Color().setHex(0xdbd6cc, THREE.NoColorSpace);
const RULE_STRONG = new THREE.Color().setHex(0xc0bab0, THREE.NoColorSpace);

/** Depth window, matched to the reframed camera (box spans view-z ~1.4..3.8). */
const DEPTH = "clamp((-mv.z - 1.40) / 2.40, 0.0, 1.0)";

const POINT_VERT = /* glsl */ `
  attribute float aPhase;
  uniform float uSize, uTime, uDpr, uEpsilon, uMaxLen, uHoverActive, uHoverGain;
  uniform vec3 uHoverPos;
  varying float vDepth, vRole;   // 0 ambient · 1 inside B(x,eps) · 2 the sample itself
  void main() {
    // Small enough that the CPU picker need not replicate it (sub-pixel).
    vec3 p = position + 0.002 * vec3(
      sin(uTime * 0.7 + aPhase * 6.2831),
      cos(uTime * 0.6 + aPhase * 5.1),
      sin(uTime * 0.5 + aPhase * 4.3)
    );

    // The epsilon-ball is exactly this test. Verified against the kept edge set
    // at 7 values of eps over 420 samples: 0 mismatches. It holds because
    // buildEdges keeps the shortest maxEdges pairs and maxLen is the longest of
    // them, so every pair below maxLen is present. No texture, no adjacency
    // index, no per-hover upload — three ALU ops against one vec3 uniform.
    float dh = distance(position, uHoverPos);
    float inB = step(dh, uEpsilon * uMaxLen) * step(0.5, uHoverActive);
    float self = step(dh, 1e-5) * step(0.5, uHoverActive);
    vRole = max(inB, 2.0 * self);

    float sel = step(1.5, vRole);
    float nbr = step(0.5, vRole) * (1.0 - sel);
    float grow = 1.0 + uHoverGain * (1.60 * sel + 0.45 * nbr);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * grow * uDpr / max(0.001, -mv.z);
    gl_Position = projectionMatrix * mv;
    vDepth = ${DEPTH};
  }
`;

const POINT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity, uHoverGain;
  varying float vDepth, vRole;
  void main() {
    // The disc is cut in the fragment shader, so 2400 points cost one draw call.
    float d = length(gl_PointCoord - vec2(0.5));
    float disc = smoothstep(0.5, 0.36, d);
    float ring = smoothstep(0.5, 0.40, d) * smoothstep(0.20, 0.30, d);

    float sel = step(1.5, vRole);
    float nbr = step(0.5, vRole) * (1.0 - sel);

    // The called-out sample opens into an outline — how a figure marks a point,
    // not how a UI highlights a row.
    float a = mix(disc, max(disc * 0.30, ring), sel);
    if (a < 0.01) discard;

    // Exponential, because extinction is multiplicative. The floor matters:
    // without it the far half of the complex vanishes and the topology stops
    // being readable.
    float fade = 0.14 + 0.80 * exp(-2.40 * vDepth);
    // A figure greys its context; it does not spotlight. Members are never
    // boosted above their own ink.
    float w = mix(mix(1.0, 0.55, uHoverGain), 1.0, max(sel, nbr));
    gl_FragColor = vec4(uColor, a * fade * w * uOpacity);
  }
`;

const EDGE_VERT = /* glsl */ `
  attribute float aBirth;
  attribute vec2 aEnds;
  uniform float uEpsilon, uHoverId;
  varying float vAlpha, vDepth, vInc;
  void main() {
    // The entire filtration is this comparison: one uniform write per frame,
    // zero CPU geometry work. An edge exists at eps iff its birth <= eps.
    vAlpha = smoothstep(aBirth, aBirth + 0.035, uEpsilon);
    // aEnds carries the same (i,j) on BOTH vertices, so this stays constant
    // along the segment instead of interpolating.
    vInc = step(min(abs(aEnds.x - uHoverId), abs(aEnds.y - uHoverId)), 0.5)
         * step(0.0, uHoverId);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vDepth = ${DEPTH};
  }
`;

const EDGE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity, uHoverGain;
  varying float vAlpha, vDepth, vInc;
  void main() {
    if (vAlpha < 0.01) discard;
    float fade = 0.13 + 0.53 * exp(-1.75 * vDepth);
    float w = mix(mix(1.0, 0.50, uHoverGain), 1.0, vInc);
    gl_FragColor = vec4(uColor, clamp(vAlpha * fade * w, 0.0, 1.0) * uOpacity);
  }
`;

const BOX_VERT = /* glsl */ `
  attribute vec3 aMid;
  attribute float aStyle;
  uniform vec3 uRule, uRuleStrong;
  varying vec3 vColor;
  varying float vBack, vDepth;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec4 mvMid = modelViewMatrix * vec4(aMid, 1.0);
    // The box is centred on the origin, so column 3 of the modelView matrix is
    // the box centre in view space. Farther from the camera is more negative z.
    float cz = modelViewMatrix[3].z;
    vBack = smoothstep(-0.05, 0.35, cz - mvMid.z);
    vColor = mix(uRule, uRuleStrong, aStyle);
    vDepth = ${DEPTH};
    gl_Position = projectionMatrix * mv;
  }
`;

const BOX_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vBack, vDepth;
  void main() {
    // At alpha 1 a fragment of #c0bab0 over the plate composites to exactly
    // --rule-strong: the same hairline weight as the typographic rules. Raising
    // these "so you can see it" is what would turn a printed figure into a HUD.
    float a = vBack * mix(1.0, 0.62, vDepth) * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

/* One vertex, sized in the vertex shader, annulus cut by SDF in the fragment.
 * Crisp at any radius — a wireframe sphere at 7px is a smudge, and a
 * 128-segment line loop is 0.33px per segment with beaded joints. */
const RING_VERT = /* glsl */ `
  uniform vec3 uCenter;
  uniform float uRadius, uHalfH;
  varying float vPx;
  void main() {
    vec4 mv = modelViewMatrix * vec4(uCenter, 1.0);
    // World-to-pixel for a perspective camera: projectionMatrix[1][1] is
    // 1/tan(fov/2), so this is the true projected diameter.
    // Carried to the fragment stage as a varying: gl_PointSize is a
    // vertex-only builtin, and three compiles ShaderMaterial as GLSL ES 3.00,
    // where reading it in a fragment shader is a compile error.
    vPx = max(4.0, 2.0 * uRadius * projectionMatrix[1][1] * uHalfH / max(0.001, -mv.z));
    gl_PointSize = vPx;
    gl_Position = projectionMatrix * mv;
  }
`;

const RING_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vPx;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
    float w = 2.4 / max(vPx, 4.0);   // constant-pixel stroke
    float a = (1.0 - smoothstep(w, w * 2.0, abs(d - 0.94))) * 0.55;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a * uOpacity);
  }
`;

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeIO = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

function autoplayP(t: number): number {
  if (t < 1.2) return easeOut(t / 1.2) * 0.28;
  if (t < 3.1) return 0.28 + easeOut((t - 1.2) / 1.9) * (0.95 - 0.28);
  if (t < 4.0) return 0.95 + easeIO((t - 3.1) / 0.9) * (P_REST - 0.95);
  return P_REST;
}

/* Orbit model. Spherical, not trackball: with no ground plane a trackball
 * tumbles into orientations the user cannot recover from. */
const RAD_PER_PX = 0.0075;   // a 400px drag is about 172 degrees
const POLAR_PER_PX = 0.0045;
const POLAR_CLAMP = 0.35;    // +/-20deg about the base tilt; keeps the box in frame
const IDLE_RATE = 0.055;     // rad/s, identical to the previous autonomous spin
const FRICTION = 0.12;       // v *= FRICTION^dt -> 12% after 1s
const VEL_MAX = 6.0;
const SCRUB_PX = 420;
const R_ENTER = 12;
const R_EXIT = 20;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface Props {
  pointCount: number;
  edgeCount: number;
  reduced: boolean;
  mobile: boolean;
  play: boolean;
  onReadout?: (r: { eps: number; h0: number; ball: number | null }) => void;
}

export const FiltrationScene: React.FC<Props> = ({
  pointCount,
  edgeCount,
  reduced,
  mobile,
  play,
  onReadout,
}) => {
  const group = useRef<THREE.Group>(null);
  const pointMat = useRef<THREE.ShaderMaterial>(null);
  const edgeMat = useRef<THREE.ShaderMaterial>(null);
  const boxMat = useRef<THREE.ShaderMaterial>(null);
  const ringMat = useRef<THREE.ShaderMaterial>(null);
  const ringObj = useRef<THREE.Points>(null);
  const { viewport, camera, gl, size } = useThree();

  const { cloud, edges, deaths } = useMemo(() => {
    const c = buildCloud(pointCount);
    const e = buildEdges(c, edgeCount);
    return { cloud: c, edges: e, deaths: h0Barcode(e, pointCount) };
  }, [pointCount, edgeCount]);

  const box = useMemo(() => buildRefBox(1.15), []);

  const phases = useMemo(() => {
    const a = new Float32Array(pointCount);
    for (let i = 0; i < pointCount; i++) a[i] = (i * 0.6180339887) % 1;
    return a;
  }, [pointCount]);

  const dpr = Math.min(viewport.dpr || 1, mobile ? 1.25 : 1.5);

  const pointUniforms = useMemo(
    () => ({
      // gl_PointSize = uSize * dpr / -z. At z 2.6 and dpr 1.5, uSize 5.5 gives
      // 3.17 fb px at the centre — the same apparent size as before the reframe.
      uSize: { value: mobile ? 4.5 : 5.5 },
      uTime: { value: 0 },
      uDpr: { value: dpr },
      uColor: { value: INK },
      uOpacity: { value: reduced ? 1 : 0 },
      uEpsilon: { value: reduced ? epsilonCurve(P_REST) : 0 },
      // Threaded as data: maxLen differs between the point tiers, so a literal
      // would scale the ball wrong on every degraded device.
      uMaxLen: { value: edges.maxLen },
      uHoverActive: { value: 0 },
      uHoverGain: { value: 0 },
      uHoverPos: { value: new THREE.Vector3(1e9, 1e9, 1e9) },
    }),
    [mobile, dpr, reduced, edges.maxLen]
  );

  const edgeUniforms = useMemo(
    () => ({
      uEpsilon: { value: reduced ? epsilonCurve(P_REST) : 0 },
      uColor: { value: INK },
      uOpacity: { value: reduced ? 1 : 0 },
      uHoverId: { value: -1 },
      uHoverGain: { value: 0 },
    }),
    [reduced]
  );

  const boxUniforms = useMemo(
    () => ({
      uRule: { value: RULE },
      uRuleStrong: { value: RULE_STRONG },
      uOpacity: { value: reduced ? 1 : 0 },
    }),
    [reduced]
  );

  const ringUniforms = useMemo(
    () => ({
      uCenter: { value: new THREE.Vector3() },
      uRadius: { value: 0 },
      uHalfH: { value: 1 },
      uColor: { value: INK },
      uOpacity: { value: 0 },
    }),
    []
  );

  // R3F never disposes geometry passed via the `geometry` prop — it only owns
  // what it constructs. Cleanup is idempotent so StrictMode's dev double-invoke
  // is harmless (dispose leaves .attributes intact and three re-uploads).
  const pointGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(cloud.positions, 3));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    return g;
  }, [cloud, phases]);

  const edgeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(edges.positions, 3));
    g.setAttribute("aBirth", new THREE.BufferAttribute(edges.births, 1));
    g.setAttribute("aEnds", new THREE.BufferAttribute(edges.aEnds, 2));
    return g;
  }, [edges]);

  const boxGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(box.positions, 3));
    g.setAttribute("aMid", new THREE.BufferAttribute(box.mids, 3));
    g.setAttribute("aStyle", new THREE.BufferAttribute(box.styles, 1));
    return g;
  }, [box]);

  const ringGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3), 3));
    return g;
  }, []);

  useEffect(() => () => pointGeo.dispose(), [pointGeo]);
  useEffect(() => () => edgeGeo.dispose(), [edgeGeo]);
  useEffect(() => () => boxGeo.dispose(), [boxGeo]);
  useEffect(() => () => ringGeo.dispose(), [ringGeo]);

  // Own clock. setFrameloop() zeroes clock.elapsedTime on EVERY transition, so
  // deriving rotation from state.clock would snap the object back to its start
  // pose each time the plate re-enters the viewport.
  const tRef = useRef(0);
  const playT = useRef(0);
  const eased = useRef(reduced ? epsilonCurve(P_REST) : 0);
  const lastReport = useRef(-1);

  // Orbit state, all in refs — no React state on the hot path.
  const az = useRef(0);
  const azVel = useRef(0);
  const idleGain = useRef(1);
  const idleDir = useRef(1);
  const polar = useRef(0);
  const pBias = useRef(0);
  const holdUntil = useRef(0);
  const hoverId = useRef(-1);
  const hoverGain = useRef(0);
  const ballCount = useRef<number | null>(null);
  const mvp = useMemo(() => new THREE.Matrix4(), []);
  const hoverVec = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const g = group.current;
    if (process.env.NODE_ENV !== "production") {
      const w = window as unknown as { __figFrames?: number; __figInfo?: unknown };
      w.__figFrames = (w.__figFrames ?? 0) + 1;
      w.__figInfo = gl.info.render;
    }
    if (!g) return;

    // Clamping absorbs both the resume spike and a backgrounded-tab delta, and
    // it must feed every filter, not just the accumulator.
    const dt = Math.min(delta, 0.05);
    const k = 1 - Math.pow(0.001, dt);
    const now = performance.now();

    if (!reduced) {
      tRef.current += dt;
      if (play && !heroInput.everDragged) playT.current += dt;
    }
    const t = tRef.current;

    const targetOpacity = reduced || play || heroInput.everDragged ? 1 : 0;
    for (const m of [pointMat.current, edgeMat.current, boxMat.current]) {
      if (m) {
        m.uniforms.uOpacity.value +=
          (targetOpacity - m.uniforms.uOpacity.value) * Math.min(1, k * 1.2);
      }
    }

    if (heroInput.resetRequested) {
      heroInput.resetRequested = false;
      pBias.current = 0;
      polar.current = 0;
      azVel.current = 0;
      holdUntil.current = 0;
    }

    /* ── Orbit ─────────────────────────────────────────────────────────────
     * Reduced motion still gets drag and keyboard: the preference is about
     * unrequested autonomous motion, not about removing agency. */
    const dx = heroInput.dxPx;
    const dy = heroInput.dyPx;
    heroInput.dxPx = 0;
    heroInput.dyPx = 0;

    if (heroInput.mode === "orbit") {
      az.current += dx * RAD_PER_PX;
      polar.current = clamp(
        polar.current + dy * POLAR_PER_PX,
        -POLAR_CLAMP,
        POLAR_CLAMP
      );
      const inst = (dx * RAD_PER_PX) / Math.max(dt, 1 / 240);
      azVel.current += (inst - azVel.current) * Math.min(1, k * 3.5);
      idleGain.current += (0 - idleGain.current) * Math.min(1, k * 2.5);
    } else {
      az.current += azVel.current * dt;
      azVel.current *= Math.pow(FRICTION, dt);
      if (Math.abs(azVel.current) < 0.004) azVel.current = 0;
      else idleDir.current = Math.sign(azVel.current);
      // Idle only returns once the flick has spent itself, so the two never
      // fight and the object never reverses under its own momentum.
      const canIdle = Math.abs(azVel.current) < IDLE_RATE && !reduced;
      idleGain.current +=
        ((canIdle ? 1 : 0) - idleGain.current) * Math.min(1, k * 0.058);
      polar.current += (0 - polar.current) * Math.min(1, k * 0.12);
    }
    azVel.current = clamp(azVel.current, -VEL_MAX, VEL_MAX);
    az.current += heroInput.keyYaw;
    polar.current = clamp(polar.current + heroInput.keyPitch, -POLAR_CLAMP, POLAR_CLAMP);
    heroInput.keyYaw = 0;
    heroInput.keyPitch = 0;

    if (!reduced) az.current += IDLE_RATE * idleDir.current * idleGain.current * dt;

    // Must be the accumulator, not `t * 0.055` — an absolute expression would
    // overwrite the user's drag on the very next frame.
    g.rotation.y = az.current;
    g.rotation.x =
      -0.3 + (reduced ? 0 : Math.sin(t * 0.19) * 0.09) + polar.current;

    /* ── Epsilon: scrub the CURVE PARAMETER, not eps ────────────────────────
     * Births are skewed, and epsilonCurve exists to spend travel where things
     * happen — so drag, keyboard and autoplay all share one nonlinearity. */
    if (heroInput.mode === "scrub" && dy !== 0) {
      pBias.current = clamp(pBias.current + dy / SCRUB_PX, -1, 1);
      holdUntil.current = now + 700;
    }
    if (heroInput.keyEps !== 0) {
      pBias.current = clamp(pBias.current + heroInput.keyEps, -1, 1);
      heroInput.keyEps = 0;
      holdUntil.current = now + 700;
    }
    const pAuto = reduced || heroInput.everDragged ? P_REST : autoplayP(playT.current);
    // After the hold, the manual offset glides back so scroll-free rest is a
    // single canonical state rather than wherever the user let go.
    if (now > holdUntil.current) {
      pBias.current += (0 - pBias.current) * Math.min(1, k * 0.28);
    }
    const target = epsilonCurve(clamp(pAuto + pBias.current, 0, 1));
    eased.current += (target - eased.current) * Math.min(1, k * 1.6);

    /* ── Picking ───────────────────────────────────────────────────────────
     * Per frame, not per pointermove: the group rotates under a stationary
     * cursor, so a move-driven pick goes stale during idle rotation. */
    const dragging = heroInput.mode === "orbit" || heroInput.mode === "scrub";
    if (!heroInput.inside || dragging) {
      hoverId.current = -1;
    } else {
      // The plate scrolls, so the rect must be read fresh — but only while the
      // pointer is actually over it, which bounds the layout reads.
      const rect = gl.domElement.getBoundingClientRect();
      const cx = heroInput.pointerX - rect.left;
      const cy = heroInput.pointerY - rect.top;
      g.updateMatrixWorld();
      // matrixWorldInverse is refreshed inside gl.render, which runs AFTER
      // useFrame subscribers — so it must be updated explicitly here.
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();
      mvp
        .copy(camera.projectionMatrix)
        .multiply(camera.matrixWorldInverse)
        .multiply(g.matrixWorld);
      const radius = hoverId.current >= 0 ? R_EXIT : R_ENTER;
      const hit = pickNearest(
        cloud.positions,
        pointCount,
        mvp.elements,
        cx,
        cy,
        size.width,
        size.height,
        radius
      );
      hoverId.current = hit.id;
    }

    const wantHover = hoverId.current >= 0 ? 1 : 0;
    hoverGain.current +=
      (wantHover - hoverGain.current) * Math.min(1, k * (wantHover ? 1.45 : 0.8));

    if (hoverId.current >= 0) {
      hoverVec.set(
        cloud.positions[hoverId.current * 3],
        cloud.positions[hoverId.current * 3 + 1],
        cloud.positions[hoverId.current * 3 + 2]
      );
      // Count the ball on the CPU for the readout, using the identical rule the
      // shader uses, so the number and the picture can never disagree.
      const r = eased.current * edges.maxLen;
      let n = 0;
      for (let i = 0; i < pointCount; i++) {
        if (i === hoverId.current) continue;
        const ddx = cloud.positions[i * 3] - hoverVec.x;
        const ddy = cloud.positions[i * 3 + 1] - hoverVec.y;
        const ddz = cloud.positions[i * 3 + 2] - hoverVec.z;
        if (ddx * ddx + ddy * ddy + ddz * ddz <= r * r) n++;
      }
      ballCount.current = n;
    } else {
      ballCount.current = null;
    }

    /* ── Uniform writes: one place, so nothing can drift a frame ─────────── */
    const eps = eased.current;
    if (edgeMat.current) {
      edgeMat.current.uniforms.uEpsilon.value = eps;
      edgeMat.current.uniforms.uHoverId.value = hoverId.current;
      edgeMat.current.uniforms.uHoverGain.value = hoverGain.current;
    }
    if (pointMat.current) {
      pointMat.current.uniforms.uTime.value = t;
      pointMat.current.uniforms.uEpsilon.value = eps;
      pointMat.current.uniforms.uHoverGain.value = hoverGain.current;
      pointMat.current.uniforms.uHoverActive.value = hoverId.current >= 0 ? 1 : 0;
      if (hoverId.current >= 0) pointMat.current.uniforms.uHoverPos.value.copy(hoverVec);
    }
    if (ringMat.current && ringObj.current) {
      const visible = hoverGain.current > 0.001 && hoverId.current >= 0;
      ringObj.current.visible = visible;
      if (visible) {
        ringMat.current.uniforms.uCenter.value.copy(hoverVec);
        // True radius, from data. Never inflated: an inflated ball would make
        // the figure lie about what eps is.
        ringMat.current.uniforms.uRadius.value = eps * edges.maxLen;
        ringMat.current.uniforms.uHalfH.value = (size.height * dpr) / 2;
        ringMat.current.uniforms.uOpacity.value = hoverGain.current;
      }
    }

    if (onReadout) {
      if (
        Math.abs(eps - lastReport.current) > 0.004 ||
        ballCount.current !== null ||
        hoverGain.current > 0
      ) {
        lastReport.current = eps;
        let merged = 0;
        for (const d of deaths) {
          if (d <= eps) merged++;
          else break;
        }
        onReadout({ eps, h0: pointCount - merged, ball: ballCount.current });
      }
    }
  });

  return (
    // Visible half-height at z 2.6, fov 48 is 2.6*tan(24deg) = 1.158. At scale
    // 0.66 the padded box half-extent is 0.759 world, whose worst-case vertical
    // silhouette across the yaw sweep is ~1.07 — filling the plate without ever
    // clipping a corner.
    <group ref={group} scale={0.66}>
      {/* Behind the ink. The box is INSIDE the rotating group: a static box
        * around a spinning cloud reads as a 3D-preview widget, a co-rotating
        * one reads as an object. */}
      <lineSegments geometry={boxGeo} renderOrder={0} raycast={() => null}>
        <shaderMaterial
          ref={boxMat}
          vertexShader={BOX_VERT}
          fragmentShader={BOX_FRAG}
          uniforms={boxUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
        />
      </lineSegments>

      {/* LineBasicMaterial ignores linewidth on essentially every platform and
       * always renders 1px. Normally a complaint; here hairlines are the point. */}
      <lineSegments geometry={edgeGeo} renderOrder={1} raycast={() => null}>
        <shaderMaterial
          ref={edgeMat}
          vertexShader={EDGE_VERT}
          fragmentShader={EDGE_FRAG}
          uniforms={edgeUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
        />
      </lineSegments>

      <points geometry={pointGeo} renderOrder={2} raycast={() => null}>
        <shaderMaterial
          ref={pointMat}
          vertexShader={POINT_VERT}
          fragmentShader={POINT_FRAG}
          uniforms={pointUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
        />
      </points>

      <points ref={ringObj} geometry={ringGeo} renderOrder={3} raycast={() => null} visible={false}>
        <shaderMaterial
          ref={ringMat}
          vertexShader={RING_VERT}
          fragmentShader={RING_FRAG}
          uniforms={ringUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
        />
      </points>
    </group>
  );
};
