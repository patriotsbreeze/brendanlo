"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { heroInput, resetHeroInput } from "./heroInput";
import styles from "./FigureControl.module.css";

/**
 * The interactive surface over Fig. 1.
 *
 * HARD RULE: this must not import three, @react-three/fiber, or ./filtration.
 * It is a Client Component rendered from a Server Component, so anything it
 * imports joins the initial bundle — and the whole point of the ssr:false
 * canvas is that three.js does not.
 *
 * Separating input from rendering is also what lets the canvas keep
 * pointer-events: none: this element receives the gestures, the canvas only
 * draws.
 */

/** Below this, nothing moves; past it, the gesture axis is locked for its life. */
const AXIS_LOCK_PX = 8;
const CAPTURE_PX = 4;

export const FigureControl: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef({ x: 0, y: 0, id: -1 });

  const release = useCallback((id: number) => {
    const el = ref.current;
    if (el && id >= 0) {
      // Throws if the pointer id is already gone.
      try {
        el.releasePointerCapture(id);
      } catch {
        /* already released */
      }
    }
    heroInput.down = false;
    heroInput.mode = "idle";
    start.current.id = -1;
    document.documentElement.removeAttribute("data-hero-drag");
  }, []);

  useEffect(() => () => resetHeroInput(), []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Not preventDefault here — it would break focus. Only past the threshold.
    ref.current?.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    heroInput.down = true;
    heroInput.mode = "pending";
    heroInput.touch = e.pointerType !== "mouse";
    heroInput.everDragged = true;
    heroInput.pointerX = e.clientX;
    heroInput.pointerY = e.clientY;
    heroInput.requestFrame?.();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    heroInput.pointerX = e.clientX;
    heroInput.pointerY = e.clientY;
    heroInput.inside = true;
    heroInput.requestFrame?.();

    if (!heroInput.down) return;

    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;

    if (heroInput.mode === "pending") {
      if (Math.hypot(dx, dy) < AXIS_LOCK_PX) return;
      // Committed once per gesture. Touch never scrubs, so a vertical swipe
      // stays available to the page scroller.
      const wantsScrub = Math.abs(dy) > Math.abs(dx) && !heroInput.touch;
      heroInput.mode = wantsScrub ? "scrub" : "orbit";
      document.documentElement.setAttribute("data-hero-drag", heroInput.mode);
    }

    if (Math.hypot(dx, dy) > CAPTURE_PX) e.preventDefault();

    heroInput.dxPx += e.movementX || 0;
    heroInput.dyPx += e.movementY || 0;
    heroInput.requestFrame?.();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // WAI-ARIA slider pattern. aria-orientation is vertical, so the bare
    // horizontal arrows must also move the value; Shift is the orbit modifier.
    let handled = true;
    if (e.shiftKey) {
      switch (e.key) {
        case "ArrowLeft": heroInput.keyYaw -= 0.08; break;
        case "ArrowRight": heroInput.keyYaw += 0.08; break;
        case "ArrowUp": heroInput.keyPitch += 0.08; break;
        case "ArrowDown": heroInput.keyPitch -= 0.08; break;
        default: handled = false;
      }
    } else {
      switch (e.key) {
        case "ArrowUp":
        case "ArrowRight": heroInput.keyEps += 0.02; break;
        case "ArrowDown":
        case "ArrowLeft": heroInput.keyEps -= 0.02; break;
        case "PageUp": heroInput.keyEps += 0.1; break;
        case "PageDown": heroInput.keyEps -= 0.1; break;
        case "Home": heroInput.keyEps = -2; break;
        case "End": heroInput.keyEps = 2; break;
        case "Escape": heroInput.resetRequested = true; break;
        default: handled = false;
      }
    }
    if (handled) {
      heroInput.everDragged = true;
      heroInput.requestFrame?.();
      e.preventDefault();
    }
  };

  return (
    <>
      <div
        ref={ref}
        className={styles.surface}
        role="slider"
        tabIndex={0}
        aria-label="Vietoris–Rips filtration scale"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={1}
        // Identical on both render passes; only ever updated via setAttribute
        // from the scene, so there is no hydration mismatch.
        aria-valuenow={0}
        aria-valuetext="ε = 0.000"
        aria-describedby="fig1-help"
        id="fig1-control"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => release(e.pointerId)}
        onPointerCancel={(e) => release(e.pointerId)}
        // Mandatory: pointercancel/lostpointercapture is what fires when pan-y
        // claims a vertical swipe. Without it the state machine latches in
        // "orbit" forever and the figure spins on every subsequent move.
        onLostPointerCapture={(e) => release(e.pointerId)}
        onPointerEnter={() => (heroInput.inside = true)}
        onPointerLeave={() => (heroInput.inside = false)}
        onKeyDown={onKeyDown}
        onDoubleClick={() => (heroInput.resetRequested = true)}
      />
      <p id="fig1-help" className={styles.srOnly}>
        Arrow keys change the filtration scale ε; hold Shift with the arrow keys to
        rotate the view. Drag to rotate, or drag vertically to change ε. The current ε
        and component count are listed in the figure.
      </p>
    </>
  );
};
