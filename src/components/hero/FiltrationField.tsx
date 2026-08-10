"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, invalidate } from "@react-three/fiber";
import { FiltrationScene } from "./FiltrationScene";
import { heroInput } from "./heroInput";
import { TIERS } from "./tiers";
import styles from "./HeroCanvas.module.css";

interface Props {
  reduced: boolean;
  /** Live: drives point size, the dpr cap, and the control surface. */
  mobile: boolean;
  /** Latched at first mount — changing it would rebuild the geometry. */
  tier: "full" | "reduced";
}

const FiltrationField: React.FC<Props> = ({ reduced, mobile, tier: tierName }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const tier = TIERS[tierName];
  const lastAria = useRef({ t: 0, eps: -1, h0: -1 });

  // Under frameloop "demand" — what a reduced-motion visitor gets — writing a
  // uniform paints nothing until a frame is requested. The control surface
  // cannot import this itself without pulling fiber into the initial bundle.
  useEffect(() => {
    heroInput.requestFrame = invalidate;
    return () => {
      heroInput.requestFrame = null;
    };
  }, []);

  // Writes straight to the DOM: the readout must not re-render React on every
  // frame. The <dl> lives in HeroFigure (server-rendered) so it is in the
  // prerendered HTML and reachable by assistive tech.
  const onReadout = useCallback(
    (r: { eps: number; h0: number; ball: number | null }) => {
      const el = document.getElementById("fig1-readout");
      if (!el) return;
      const eps = el.querySelector<HTMLElement>("[data-eps]");
      const h0 = el.querySelector<HTMLElement>("[data-h0]");
      const ball = el.querySelector<HTMLElement>("[data-ball]");
      if (eps) eps.textContent = r.eps.toFixed(3);
      if (h0) h0.textContent = String(r.h0);
      if (ball) {
        // An isolated point draws a correct but empty ball; without saying so it
        // reads as a bug. It is also the visible reason H0 never reaches 1.
        ball.textContent =
          r.ball === null ? "—" : r.ball === 0 ? "0 · isolated" : String(r.ball);
      }

      // ARIA is throttled far harder than the visual readout: this is assistive
      // technology verbosity, not frame rate. No aria-live — role="slider"
      // announces its own value changes when focused, and a live region would
      // narrate continuously while the figure autoplays.
      const now = performance.now();
      const moved = Math.abs(r.eps - lastAria.current.eps) > 0.02;
      if ((moved || r.h0 !== lastAria.current.h0) && now - lastAria.current.t > 150) {
        lastAria.current = { t: now, eps: r.eps, h0: r.h0 };
        const ctrl = document.getElementById("fig1-control");
        if (ctrl) {
          ctrl.setAttribute("aria-valuenow", r.eps.toFixed(2));
          ctrl.setAttribute(
            "aria-valuetext",
            `ε = ${r.eps.toFixed(3)}, ${r.h0} connected components`
          );
        }
      }
    },
    []
  );

  // R3F measures its container on mount; mounting in the same commit as the
  // container can hand it a stale box, leaving the canvas at its 300x150
  // default. One tick lets layout settle first.
  //
  // Deliberately setTimeout and not requestAnimationFrame: rAF does not fire in
  // a background tab, which would leave the canvas permanently unmounted for
  // anyone who opens the page in a new tab and switches to it later.
  const [laidOut, setLaidOut] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setLaidOut(true), 0);
    return () => clearTimeout(id);
  }, []);

  // A page loaded in a background tab has no usable layout box, so R3F's
  // initial measurement comes back as the 300x150 default and never changes.
  useEffect(() => {
    const onShow = () => {
      if (!document.hidden) window.dispatchEvent(new Event("resize"));
    };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, []);

  /* ── Render gate ──────────────────────────────────────────────────────────
   * The plate now scrolls away with the hero, so the canvas can stop rendering
   * entirely once it leaves. Previously frameloop="always" ran for the whole
   * page. Two observers, because intersectionRatio is measured against the
   * EXPANDED root — one rootMargin cannot serve both a pre-roll gate and an
   * "actually visible" trigger. */
  const [active, setActive] = useState(false);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    // Seed from a direct measurement. IntersectionObserver delivery is tied to
    // the rendering steps, so a plate that is already on screen in a page loaded
    // in a background tab can wait indefinitely for its first callback — and
    // until then the canvas is parked on "demand" and paints nothing.
    const measure = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 0;
      const visible = r.bottom > -200 && r.top < vh + 200;
      setActive(visible);
      if (r.top < vh * 0.5 && r.bottom > vh * 0.5) setSeen(true);
    };
    measure();

    const gate = new IntersectionObserver(([e]) => setActive(e.isIntersecting), {
      threshold: 0,
      rootMargin: "200px 0px",
    });
    const trigger = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setSeen(true);
      },
      { threshold: 0.5, rootMargin: "0px" }
    );
    gate.observe(el);
    trigger.observe(el);

    // Deliberately NOT gating on document.hidden: browsers already suspend
    // requestAnimationFrame in a background tab, so it would buy nothing.
    //
    // But a page LOADED in a background tab renders zero frames and gets no
    // IntersectionObserver delivery either (intersections are computed during
    // the rendering steps, which do not run while hidden). Without this the
    // plate stays blank after the user switches to the tab.
    const onShown = () => {
      if (!document.hidden) {
        measure();
        invalidate();
      }
    };
    document.addEventListener("visibilitychange", onShown);

    return () => {
      gate.disconnect();
      trigger.disconnect();
      document.removeEventListener("visibilitychange", onShown);
    };
  }, []);

  // Setting the frameloop prop only writes zustand state — the rAF loop is
  // restarted by invalidate(). Without this the canvas resumes blank.
  useEffect(() => {
    if (active) invalidate();
  }, [active]);

  return (
    <div ref={hostRef} className={styles.field}>
      {laidOut && (
        <Canvas
          // Output only. The interactive surface is a sibling DOM element, so
          // the canvas itself never needs to receive pointer events. R3F sets
          // pointerEvents:'auto' inline and spreads `style` last, so this wins.
          style={{ pointerEvents: "none" }}
          // aria-hidden belongs HERE, not on the wrapper: the wrapper used to
          // enclose the readout too, which hid the numbers from assistive tech.
          aria-hidden="true"
          // 1.5, not 2 — MSAA on hairlines is worth more than raw resolution.
          dpr={[1, mobile ? 1.25 : 1.5]}
          // "demand", never "never": invalidate() is a no-op under "never".
          frameloop={reduced ? "demand" : active ? "always" : "demand"}
          camera={{ fov: 48, position: [0, 0, 2.6], near: 0.6, far: 8 }}
          gl={{
            antialias: true,
            // Required: the field composites over the plate's paper.
            alpha: true,
            powerPreference: "high-performance",
            stencil: false,
          }}
        >
          <FiltrationScene
            pointCount={tier.points}
            edgeCount={tier.edges}
            reduced={reduced}
            mobile={mobile}
            play={seen}
            onReadout={onReadout}
          />
        </Canvas>
      )}
    </div>
  );
};

export default FiltrationField;
