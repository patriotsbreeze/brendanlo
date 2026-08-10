"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

/* This file exists because of a hard Next 16 rule, documented in
 * node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md:
 *
 *   "`ssr: false` is not allowed with `next/dynamic` in Server Components.
 *    Please move it into a Client Component."
 *
 * page.tsx is a Server Component, so the dynamic() call has to live here.
 * ssr: false also keeps three.js out of the SSR HTML and the initial bundle,
 * so the LCP element — the server-rendered <h1> — is untouched by it. */
const FiltrationField = dynamic(() => import("./FiltrationField"), {
  ssr: false,
  loading: () => null,
});

interface Capability {
  ok: boolean;
  reduced: boolean;
  mobile: boolean;
  /** Latched on the first probe — see below. */
  tier: "full" | "reduced";
}

/**
 * A ladder, not a binary kill.
 *
 * The previous `deviceMemory <= 4` gate blanked the figure on 4 GB Chromebooks
 * and Windows laptops that run the reduced tier fine, and caught nothing at all
 * on iOS, where navigator.deviceMemory does not exist. Only genuinely incapable
 * devices drop the figure now; the middle of the range gets a smaller build.
 */
function probe(): Capability {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrow = window.matchMedia("(max-width: 768px)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;

  const nav = navigator as Navigator & { deviceMemory?: number };
  const mem = nav.deviceMemory;
  const cores = nav.hardwareConcurrency;

  let webgl2 = false;
  try {
    webgl2 = Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    webgl2 = false;
  }

  // No WebGL2, or genuinely tiny memory: drop the figure. HeroFigure collapses
  // the whole column rather than framing an empty box under a caption that
  // describes a figure which is not there.
  if (!webgl2 || (typeof mem === "number" && mem <= 2)) {
    return { ok: false, reduced, mobile: narrow || coarse, tier: "reduced" };
  }

  // Degrade rather than disable: the reduced tier is 900 points / 5000 edges.
  const weak =
    (typeof mem === "number" && mem <= 4) ||
    (typeof cores === "number" && cores <= 4);

  const mobile = narrow || coarse || weak;
  return { ok: true, reduced, mobile, tier: mobile ? "reduced" : "full" };
}

export const HeroCanvasMount: React.FC = () => {
  // Null on the server AND on the first client render. That second gate is what
  // actually prevents a hydration mismatch, because probe() reads matchMedia,
  // which does not exist on the server. Never branch on window during render.
  const [cap, setCap] = useState<Capability | null>(null);

  useEffect(() => {
    let cancelled = false;
    const start = () => {
      if (cancelled) return;
      const c = probe();
      // The geometry tier is latched on the FIRST probe and never changes.
      //
      // Re-probing on a resize looks harmless but would introduce a bug that
      // does not exist today: crossing 768px — a phone rotation — would re-run
      // the geometry useMemo, a measured ~33ms main-thread block, right in the
      // middle of an interaction. `mobile` may still change (it drives point
      // size, the dpr cap and whether the control surface renders); the point
      // and edge counts may not.
      setCap((prev) => (prev ? { ...c, tier: prev.tier } : c));
    };

    // Mount on idle so the three.js chunk does not contend with fonts and CSS
    // during first paint.
    const ric = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      }
    ).requestIdleCallback;

    let idleId = 0;
    let timerId = 0;
    if (ric) idleId = ric(start, { timeout: 1200 });
    else timerId = window.setTimeout(start, 300);

    // The probe used to run exactly once, so a visitor who turned on reduced
    // motion, rotated a phone or moved the window to another display kept
    // whatever was true at load. WebGL2 support and deviceMemory are never
    // re-probed: they cannot change, and churning throwaway contexts against a
    // driver's live-context cap can force-lose the real one.
    const queries = [
      "(prefers-reduced-motion: reduce)",
      "(max-width: 768px)",
      "(pointer: coarse)",
    ].map((q) => window.matchMedia(q));
    const onChange = () => {
      if (!cancelled) start();
    };
    queries.forEach((m) => m.addEventListener("change", onChange));

    return () => {
      cancelled = true;
      const cic = (
        window as Window & { cancelIdleCallback?: (id: number) => void }
      ).cancelIdleCallback;
      if (idleId && cic) cic(idleId);
      if (timerId) clearTimeout(timerId);
      queries.forEach((m) => m.removeEventListener("change", onChange));
    };
  }, []);

  if (!cap || !cap.ok) return null;
  return <FiltrationField reduced={cap.reduced} mobile={cap.mobile} tier={cap.tier} />;
};
