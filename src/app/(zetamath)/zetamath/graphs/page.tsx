import type { Metadata } from "next";
import { Graphs } from "../_components/Graphs";

export const metadata: Metadata = {
  title: "graphs",
  description: "every zetamath run brendan lo has played, and the best of each day.",
  alternates: { canonical: "/zetamath/graphs" },
};

export default function Page() {
  return <Graphs />;
}
