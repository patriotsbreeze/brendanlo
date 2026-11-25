"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["/zetamath", "play"],
  ["/zetamath/graphs", "graphs"],
  ["/zetamath/tricks", "tricks"],
] as const;

export function Tabs() {
  const path = usePathname();
  return (
    <nav className="tabs" aria-label="zetamath">
      {TABS.map(([href, name]) => (
        <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>
          {name}
        </Link>
      ))}
    </nav>
  );
}
