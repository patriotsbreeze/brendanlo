"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canonical, shorten } from "../_lib/hosts";
import { useRuns } from "./RunsProvider";
import { useShortHost } from "./ZLink";

const TABS = [
  ["/zetamath", "play"],
  ["/zetamath/graphs", "graphs"],
  ["/zetamath/stats", "stats"],
  ["/zetamath/tricks", "tricks"],
  ["/zetamath/account", "account"],
] as const;

export function Tabs() {
  // On a short name the address is "/stats" for "/zetamath/stats", and the page
  // was built for the second, so compare them the long way, or hydrating would
  // find a different tab marked than the one built.
  const here = canonical(usePathname());
  const short = useShortHost();
  const { status, account } = useRuns();
  return (
    <nav className="tabs" aria-label="zetamath">
      {TABS.map(([href, name]) => (
        <Link key={href} href={short ? shorten(href) : href} aria-current={here === href ? "page" : undefined}>
          {name === "account" && status !== "loading" && !account ? "log in" : name}
        </Link>
      ))}
    </nav>
  );
}
