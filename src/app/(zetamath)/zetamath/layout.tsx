import { AccountLine } from "./_components/Account";
import { RunsProvider } from "./_components/RunsProvider";
import { Tabs } from "./_components/Tabs";
import { HomeLink } from "./_components/ZLink";

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
          <HomeLink>brendan lo</HomeLink>
          <AccountLine />
        </footer>
      </div>
    </RunsProvider>
  );
}
