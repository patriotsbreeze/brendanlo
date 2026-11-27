"use client";

import { useEffect, useRef, useState } from "react";
import { GOOGLE_CLIENT_ID, newProof, nonceFor, type GoogleProof } from "../_lib/google";

/* The "sign in with Google" button, which Google's own script draws in a frame.
 * It hands back an ID token, which means nothing until the server checks it. */

type Reply = { credential?: string };

type Gis = {
  initialize(config: {
    client_id: string;
    callback: (reply: Reply) => void;
    nonce: string;
    ux_mode: "popup";
    auto_select: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type: "standard";
      theme: "outline";
      size: "medium";
      text: Words;
      shape: "rectangular";
      logo_alignment: "left";
      click_listener: () => void;
    },
  ): void;
};

type Words = "signin_with" | "signup_with" | "continue_with";

declare global {
  interface Window {
    google?: { accounts?: { id?: Gis } };
  }
}

const SCRIPT = "https://accounts.google.com/gsi/client";

/** Google's script, set up once a page: one nonce and one answer for every button,
 * which goes to whichever button was pressed last. */
let ready: Promise<Gis> | null = null;
let pressed: ((google: GoogleProof) => void) | null = null;

function start(): Promise<Gis> {
  ready ??= (async () => {
    const proof = newProof();
    const nonce = await nonceFor(proof);
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("google's script didn't load"));
      document.head.append(script);
    });
    const gis = window.google?.accounts?.id;
    if (!gis) throw new Error("google's script didn't load");
    gis.initialize({
      client_id: GOOGLE_CLIENT_ID,
      nonce,
      ux_mode: "popup",
      auto_select: false,
      callback: ({ credential }) => {
        if (credential) pressed?.({ credential, proof });
      },
    });
    return gis;
  })();
  // So that the next button tries again.
  ready.catch(() => (ready = null));
  return ready;
}

/** Nothing at all on a copy of the site with no Google client. */
export function GoogleButton({ words, onSignIn }: { words: Words; onSignIn: (google: GoogleProof) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const latest = useRef(onSignIn);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    latest.current = onSignIn;
  });

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let live = true;
    start().then(
      (gis) => {
        if (!live || !box.current) return;
        box.current.replaceChildren();
        gis.renderButton(box.current, {
          type: "standard",
          theme: "outline",
          size: "medium",
          text: words,
          shape: "rectangular",
          logo_alignment: "left",
          click_listener: () => {
            pressed = (google) => latest.current(google);
          },
        });
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [words]);

  if (!GOOGLE_CLIENT_ID) return null;
  if (failed) return <p className="note">couldn&rsquo;t load google sign-in.</p>;
  return <div ref={box} className="googleButton" />;
}

export const googleOn = GOOGLE_CLIENT_ID !== "";

/** The address a token is for, to show. Unchecked, so never for anything else. */
export function emailIn(credential: string): string | null {
  try {
    const part = credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { email } = JSON.parse(atob(part)) as { email?: unknown };
    return typeof email === "string" ? email : null;
  } catch {
    return null;
  }
}
