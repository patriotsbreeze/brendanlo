import { useSyncExternalStore } from "react";
import type { Tier } from "../_tensors/beds.ts";

/* Capability ladder (ported from archive/v2-editorial-webgl's
 * HeroCanvasMount): a ladder, not a binary kill. Only genuinely incapable
 * devices fall back to the SVG posters; the middle of the range gets fewer
 * pins and no marched shadows. Probed once, after idle, never during render.
 *
 * Testing overrides: ?gl=off forces the poster fallback, ?tier=low|mid|high
 * pins a tier. */

export interface Capability {
  ok: boolean;
  tier: Tier;
}

let cap: Capability | null = null;
let scheduled = false;
const listeners = new Set<() => void>();

function probe(): Capability {
  const params = new URLSearchParams(window.location.search);
  if (params.get("gl") === "off") return { ok: false, tier: "low" };
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return { ok: false, tier: "low" };
  let webgl2 = false;
  try {
    webgl2 = Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    webgl2 = false;
  }
  const mem = nav.deviceMemory;
  if (!webgl2 || (typeof mem === "number" && mem <= 2)) return { ok: false, tier: "low" };

  const forced = params.get("tier");
  if (forced === "low" || forced === "mid" || forced === "high") return { ok: true, tier: forced };

  const cores = nav.hardwareConcurrency;
  const narrow = window.matchMedia("(max-width: 768px)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const weak = (typeof mem === "number" && mem <= 4) || (typeof cores === "number" && cores <= 4);
  const tier: Tier = weak && (narrow || coarse) ? "low" : weak || narrow || coarse ? "mid" : "high";
  return { ok: true, tier };
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  if (!scheduled) {
    scheduled = true;
    const run = () => {
      cap = probe();
      listeners.forEach((l) => l());
    };
    if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 1500 });
    else setTimeout(run, 300);
  }
  return () => {
    listeners.delete(fn);
  };
}

/** null on the server and until the idle probe has run. */
export function useCapability(): Capability | null {
  return useSyncExternalStore(subscribe, () => cap, () => null);
}

function subscribeReduced(fn: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}
