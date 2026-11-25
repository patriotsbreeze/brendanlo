import type { Metadata } from "next";
import { Graphs } from "../_components/Graphs";

export const metadata: Metadata = {
  title: "graphs",
  description: "your zetamath runs: the best of each day, and every attempt.",
  alternates: { canonical: "/zetamath/graphs" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <Graphs />;
}
