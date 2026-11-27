import type { Metadata } from "next";
import { Suspense } from "react";
import { Stats } from "../_components/Stats";

export const metadata: Metadata = {
  title: "stats",
  description: "where your zetamath time goes: each operation, each kind of problem and each problem, by day, week, month and all time.",
  alternates: { canonical: "/zetamath/stats" },
  robots: { index: false, follow: true },
};

export default function Page() {
  // The view is in the address, which is only known in the browser.
  return (
    <Suspense fallback={<p className="lede holding">loading runs…</p>}>
      <Stats />
    </Suspense>
  );
}
