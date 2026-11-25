import type { Metadata } from "next";
import { Play } from "./_components/Play";

export const metadata: Metadata = { alternates: { canonical: "/zetamath" } };

export default function Page() {
  return <Play />;
}
