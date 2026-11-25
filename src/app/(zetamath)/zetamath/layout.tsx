import Link from "next/link";
import { AccountLine } from "./_components/Account";
import { RunsProvider } from "./_components/RunsProvider";
import { Tabs } from "./_components/Tabs";

export default function ZetamathLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <RunsProvider>
      <div className="page">
        <header className="top">
          <span className="mark">zetamath</span>
          <Tabs />
        </header>
        <main>{children}</main>
        <footer className="footer">
          {/* A different root layout, so this is a full page load. */}
          <Link href="/" prefetch={false}>
            brendan lo
          </Link>
          <AccountLine />
        </footer>
      </div>
    </RunsProvider>
  );
}
