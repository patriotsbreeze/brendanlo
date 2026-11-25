import type { Metadata } from "next";
import { AccountPage } from "../_components/Account";

export const metadata: Metadata = {
  title: "account",
  description: "log in or sign up to keep your zetamath runs and graph them.",
  alternates: { canonical: "/zetamath/account" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <AccountPage />;
}
