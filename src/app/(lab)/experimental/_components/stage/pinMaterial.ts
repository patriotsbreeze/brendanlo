import * as THREE from "three";

/* One rendering process for the whole page: a lit, anodized-aluminum shape
 * display. All shading comes from the heights themselves:
 *   - a warm raking key light from the back-left, 24 degrees up
 *   - GGX specular, so every chamfer catches a thin highlight
 *   - soft shadows marched through the height field (an R32F texture)
 *   - crevice occlusion where a pin face sits below its neighbour
 *   - an analytic studio environment (sky gradient + one softbox), no HDRs
 * Colors go in as linear RGB; the shader tone-maps (Khronos PBR Neutral) and
 * encodes sRGB itself, and the canvas is created `flat linear` so three does
 * not touch them again. GLSL lives in template strings (no loader config). */

const srgbToLinear = (hex: number) => {
  const c = new THREE.Color().setHex(hex, THREE.NoColorSpace);
  return new THREE.Vector3(Math.pow(c.r, 2.2), Math.pow(c.g, 2.2), Math.pow(c.b, 2.2));
};

export const PALETTE = {
  anodize: 0xc2c7c1,
  tray: 0xd6d9d3,
  yellow: 0xffd60a,
  green: 0x00a050,
  floor: 0x2b2f2d,
};

// Light from the back-left (-x, -z), 24 degrees above the horizon.
const EL = (24 * Math.PI) / 180;
export const LIGHT_DIR = new THREE.Vector3(-Math.cos(EL) * Math.SQRT1_2, Math.sin(EL), -Math.cos(EL) * Math.SQRT1_2).normalize();

const LIGHTING = /* glsl */ `
uniform sampler2D uHeights;
uniform vec2 uGrid;
uniform vec3 uLightDir;
uniform vec3 uKey;
uniform vec3 uSky;
uniform vec3 uGround;
uniform vec3 uSoftbox;
uniform vec3 uSoftDir;
uniform float uSteps;
uniform float uExposure;

float hAt(vec2 cell) {
  if (cell.x < 0.0 || cell.y < 0.0 || cell.x >= uGrid.x || cell.y >= uGrid.y) return -1e3;
  return texture2D(uHeights, (cell + 0.5) / uGrid).r;
}

// Soft shadow: march from the fragment toward the light across pin tops.
float marchShadow(vec3 p) {
  if (uSteps < 0.5) return 1.0;
  vec2 dir = normalize(uLightDir.xz);
  float rise = uLightDir.y / length(uLightDir.xz);
  float res = 1.0;
  for (int i = 1; i <= 24; i++) {
    if (float(i) > uSteps) break;
    float t = float(i) * 0.55;
    vec2 q = p.xz + dir * t;
    float h = hAt(floor(q + uGrid * 0.5));
    float ray = p.y + rise * t;
    res = min(res, smoothstep(-0.25, 0.9, (ray - h) * 3.0 / (0.6 + t * 0.35)));
  }
  return res;
}

vec3 neutralTonemap(vec3 color) {
  const float startCompression = 0.8 - 0.04;
  const float desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b));
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < startCompression) return color;
  float d = 1.0 - startCompression;
  float newPeak = 1.0 - d * d / (peak + d - startCompression);
  color *= newPeak / peak;
  float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
  return mix(color, vec3(newPeak), g);
}

vec3 shade(vec3 p, vec3 N, vec3 albedo, float rough, float metal, float occlusion, float shadow) {
  vec3 V = normalize(cameraPosition - p);
  vec3 L = normalize(uLightDir);
  vec3 H = normalize(L + V);
  float NdL = max(dot(N, L), 0.0);
  float NdV = max(dot(N, V), 1e-3);
  float NdH = max(dot(N, H), 0.0);
  float a = rough * rough;
  float a2 = a * a;
  float dd = NdH * NdH * (a2 - 1.0) + 1.0;
  float D = a2 / (3.14159 * dd * dd);
  float k = (rough + 1.0) * (rough + 1.0) / 8.0;
  float G = (NdL / (NdL * (1.0 - k) + k)) * (NdV / (NdV * (1.0 - k) + k));
  vec3 F0 = mix(vec3(0.04), albedo, metal);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);
  vec3 spec = D * G * F / (4.0 * NdL * NdV + 1e-3);
  vec3 diffuse = (1.0 - metal * 0.75) * albedo;
  vec3 direct = (diffuse + spec * 3.14159) * uKey * NdL * shadow;

  vec3 hemi = mix(uGround, uSky, N.y * 0.5 + 0.5);
  vec3 ambient = diffuse * hemi;

  vec3 R = reflect(-V, N);
  vec3 env = mix(uGround, uSky, smoothstep(-0.2, 0.7, R.y));
  env += uSoftbox * smoothstep(0.82, 0.97, dot(R, normalize(uSoftDir)));
  vec3 Fenv = F0 + (max(vec3(1.0 - rough), F0) - F0) * pow(1.0 - NdV, 5.0);
  vec3 reflection = env * Fenv * (metal * 0.85 + 0.15);

  vec3 color = (direct + ambient + reflection) * occlusion * uExposure;
  color = neutralTonemap(color);
  return pow(max(color, 0.0), vec3(1.0 / 2.2));
}
`;

const PIN_VERT = /* glsl */ `
attribute vec2 aCell;
attribute float aHeight;
attribute float aDye;
uniform vec2 uGrid;
varying vec3 vPos;
varying vec3 vN;
varying float vDye;
varying vec2 vCell;
void main() {
  vec3 p = position + vec3(aCell.x - (uGrid.x - 1.0) * 0.5, aHeight, aCell.y - (uGrid.y - 1.0) * 0.5);
  vPos = p;
  vN = normal;
  vDye = aDye;
  vCell = aCell;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const PIN_FRAG = /* glsl */ `
${LIGHTING}
uniform vec3 uAlbedo;
uniform vec3 uYellow;
uniform vec3 uGreen;
uniform vec2 uProbe;
varying vec3 vPos;
varying vec3 vN;
varying float vDye;
varying vec2 vCell;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  // Shafts below the well floor are never meant to be seen (the tray wall is
  // shallower than a fully raised pin's shaft).
  if (vPos.y < -2.2) discard;
  vec3 N = normalize(vN);
  bool top = N.y > 0.9;
  vec3 albedo = uAlbedo;
  float rough = 0.38;
  float metal = 0.8;
  if (top && vDye > 0.5) {
    albedo = vDye < 1.5 ? uYellow : uGreen;
    rough = 0.5;
    metal = 0.05;
  } else if (top) {
    // Faint brushed streaks along x.
    albedo *= 0.965 + 0.05 * hash(vec2(floor(vPos.z * 46.0), vCell.x));
  }

  // Crevice occlusion: a face below the neighbour it looks at sits in a slot.
  float occlusion = 1.0;
  if (!top) {
    vec2 facing = vCell + (abs(N.x) > 0.5 ? vec2(sign(N.x), 0.0) : abs(N.z) > 0.5 ? vec2(0.0, sign(N.z)) : vec2(0.0));
    float below = max(0.0, hAt(facing) - vPos.y);
    occlusion = mix(1.0, 0.18, smoothstep(0.0, 2.2, below));
    occlusion *= smoothstep(-3.0, -0.05, vPos.y) * 0.85 + 0.15;
  }

  float shadow = marchShadow(vPos);
  vec3 color = shade(vPos, N, albedo, rough, metal, occlusion, shadow);

  // Probe: a dark square outline on the probed pin's top.
  if (top && abs(vCell.x - uProbe.x) < 0.5 && abs(vCell.y - uProbe.y) < 0.5) {
    vec2 local = abs(fract(vPos.xz + uGrid * 0.5) - 0.5);
    if (max(local.x, local.y) > 0.27) color *= 0.35;
  }
  gl_FragColor = vec4(color, 1.0);
}
`;

const TRAY_VERT = /* glsl */ `
varying vec3 vPos;
varying vec3 vN;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vPos = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const TRAY_FRAG = /* glsl */ `
${LIGHTING}
uniform vec3 uAlbedo;
varying vec3 vPos;
varying vec3 vN;
void main() {
  vec3 N = normalize(vN);
  float shadow = N.y > 0.9 ? marchShadow(vPos) : 1.0;
  // Bead-blasted: rougher and less metallic than the pins.
  gl_FragColor = vec4(shade(vPos, N, uAlbedo, 0.62, 0.35, 1.0, shadow), 1.0);
}
`;

const CONTACT_FRAG = /* glsl */ `
uniform vec2 uHalf;
uniform float uSoft;
uniform vec2 uViewport;
uniform float uEdge;
varying vec2 vUv2;
float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
void main() {
  float d = sdBox(vUv2, uHalf);
  float a = 1.0 - smoothstep(-uSoft * 0.4, uSoft, d);
  // Fade to nothing near the canvas border so the shadow is never clipped
  // into a hard edge against the page.
  vec2 f = gl_FragCoord.xy;
  a *= smoothstep(0.0, uEdge, min(min(f.x, uViewport.x - f.x), min(f.y, uViewport.y - f.y)));
  gl_FragColor = vec4(vec3(0.106, 0.118, 0.114) * a * 0.3, a * 0.3);
}
`;

const CONTACT_VERT = /* glsl */ `
uniform vec2 uOffset;
varying vec2 vUv2;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vUv2 = w.xz - uOffset;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

function lightingUniforms(heights: THREE.DataTexture, cols: number, rows: number, steps: number) {
  return {
    uHeights: { value: heights },
    uGrid: { value: new THREE.Vector2(cols, rows) },
    uLightDir: { value: LIGHT_DIR.clone() },
    uKey: { value: new THREE.Vector3(1.0, 0.93, 0.84).multiplyScalar(2.6) },
    uSky: { value: new THREE.Vector3(0.72, 0.78, 0.84) },
    uGround: { value: new THREE.Vector3(0.38, 0.4, 0.38) },
    uSoftbox: { value: new THREE.Vector3(1.4, 1.38, 1.32) },
    uSoftDir: { value: new THREE.Vector3(0.35, 0.9, 0.25).normalize() },
    uSteps: { value: steps },
    uExposure: { value: 1.0 },
  };
}

export function createHeightTexture(cols: number, rows: number) {
  const tex = new THREE.DataTexture(new Float32Array(cols * rows), cols, rows, THREE.RedFormat, THREE.FloatType);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export function createPinMaterial(heights: THREE.DataTexture, cols: number, rows: number, steps: number) {
  return new THREE.ShaderMaterial({
    vertexShader: PIN_VERT,
    fragmentShader: PIN_FRAG,
    uniforms: {
      ...lightingUniforms(heights, cols, rows, steps),
      uAlbedo: { value: srgbToLinear(PALETTE.anodize) },
      uYellow: { value: srgbToLinear(PALETTE.yellow) },
      uGreen: { value: srgbToLinear(PALETTE.green) },
      uProbe: { value: new THREE.Vector2(-10, -10) },
    },
  });
}

export function createTrayMaterial(heights: THREE.DataTexture, cols: number, rows: number, steps: number) {
  return new THREE.ShaderMaterial({
    vertexShader: TRAY_VERT,
    fragmentShader: TRAY_FRAG,
    uniforms: {
      ...lightingUniforms(heights, cols, rows, steps),
      uAlbedo: { value: srgbToLinear(PALETTE.tray) },
    },
  });
}

export function createContactMaterial(halfW: number, halfD: number, soft: number) {
  return new THREE.ShaderMaterial({
    vertexShader: CONTACT_VERT,
    fragmentShader: CONTACT_FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uHalf: { value: new THREE.Vector2(halfW, halfD) },
      uSoft: { value: soft },
      uViewport: { value: new THREE.Vector2(1, 1) },
      uEdge: { value: 28 },
      // The tray's shadow falls away from the back-left light.
      uOffset: { value: new THREE.Vector2(1.2, 1.6) },
    },
  });
}

export const FLOOR_COLOR = PALETTE.floor;
