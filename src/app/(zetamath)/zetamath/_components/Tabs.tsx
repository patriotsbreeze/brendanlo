"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRuns } from "./RunsProvider";

const TABS = [
  ["/zetamath", "play"],
  ["/zetamath/graphs", "graphs"],
  ["/zetamath/stats", "stats"],
  ["/zetamath/tricks", "tricks"],
  ["/zetamath/account", "account"],
] as const;

export function Tabs() {
  const path = usePathname();
  const { status, account } = useRuns();
  return (
    <nav className="tabs" aria-label="zetamath">
      {TABS.map(([href, name]) => (
        <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>
          {name === "account" && status !== "loading" && !account ? "log in" : name}
        </Link>
      ))}
    </nav>
  );
}
