/**
 * Shared mutable input state between the DOM control surface and the WebGL
 * scene.
 *
 * A module-scoped singleton rather than React state: pointer motion must not
 * re-render the tree, and the scene reads this inside useFrame. Same discipline
 * the old scroll hook used, hoisted to module scope so both the eager control
 * chunk and the lazy canvas chunk share one object.
 *
 * Deliberately three-free — this module is imported by a component that ships
 * in the initial bundle.
 */

export type DragMode = "idle" | "pending" | "orbit" | "scrub";

export interface HeroInput {
  /** Pointer position in client px, and whether it is over the plate. */
  pointerX: number;
  pointerY: number;
  inside: boolean;
  down: boolean;
  mode: DragMode;
  /** Movement accumulated since the scene last consumed it. Scene zeroes these. */
  dxPx: number;
  dyPx: number;
  /** Coarse pointer — touch never scrubs, which is what keeps pan-y safe. */
  touch: boolean;
  /** Set once the user takes over; cancels autoplay permanently. */
  everDragged: boolean;
  /** Keyboard nudges, consumed and zeroed by the scene. */
  keyEps: number;
  keyYaw: number;
  keyPitch: number;
  /** Escape: clear the manual epsilon override and return to rest. */
  resetRequested: boolean;
  /**
   * Set by the canvas to R3F's invalidate(). Under frameloop "demand" — which
   * is what a reduced-motion visitor gets — writing a uniform paints nothing
   * until a frame is requested, so every input must ask for one.
   *
   * Held as a callback rather than imported so the control surface never has to
   * import @react-three/fiber, which would drag it into the initial bundle.
   */
  requestFrame: (() => void) | null;
}

export const heroInput: HeroInput = {
  pointerX: 0,
  pointerY: 0,
  inside: false,
  down: false,
  mode: "idle",
  dxPx: 0,
  dyPx: 0,
  touch: false,
  everDragged: false,
  keyEps: 0,
  keyYaw: 0,
  keyPitch: 0,
  resetRequested: false,
  requestFrame: null,
};

export function resetHeroInput(): void {
  heroInput.inside = false;
  heroInput.down = false;
  heroInput.mode = "idle";
  heroInput.dxPx = 0;
  heroInput.dyPx = 0;
  heroInput.keyEps = 0;
  heroInput.keyYaw = 0;
  heroInput.keyPitch = 0;
}

/* A duplicated module would split the singleton silently: the control surface
 * would write to one object and the scene would read another, and every input
 * would simply do nothing with no error anywhere. */
if (process.env.NODE_ENV !== "production") {
  const g = globalThis as { __heroInputInstances?: number };
  g.__heroInputInstances = (g.__heroInputInstances ?? 0) + 1;
  if (g.__heroInputInstances > 1) {
    console.warn(
      `[heroInput] module instantiated ${g.__heroInputInstances} times — the input ` +
        `singleton is split across chunks and the figure will not respond.`
    );
  }
}
