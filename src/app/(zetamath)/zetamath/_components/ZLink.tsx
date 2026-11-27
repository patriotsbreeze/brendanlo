"use client";

import Link from "next/link";
import { useSyncExternalStore, type ComponentProps } from "react";
import { isShortHost, shorten } from "../_lib/hosts";

const never = () => () => {};

/** Whether this is one of the short names, z.brendanlo.dev and the like. The
 * pages are built ahead for brendanlo.dev/zetamath, so this is false until the
 * page has hydrated, and links change to the short address after. */
export function useShortHost(): boolean {
  return useSyncExternalStore(never, () => isShortHost(location.hostname), () => false);
}

/** A link to a zetamath page, written "/zetamath/…", that says the short
 * address on a short name. */
export function ZLink({ href, ...rest }: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const short = useShortHost();
  return <Link href={short ? shorten(href) : href} {...rest} />;
}

/** Where the home page is from here: "/", or on a short name, where "/" is
 * zetamath, the bare domain. Built ahead as the site's own, so the link goes
 * home before the page hydrates, or without scripts, on any name. */
function home(): string {
  if (!isShortHost(location.hostname)) return "/";
  // z.brendanlo.dev to brendanlo.dev, z.localhost:3000 to localhost:3000.
  const bare = location.hostname.replace(/^[^.]+\./, "");
  return `${location.protocol}//${bare}${location.port ? `:${location.port}` : ""}/`;
}

/** The home page, which on a short name is on the bare domain. */
export function HomeLink({ children }: { children: React.ReactNode }) {
  const href = useSyncExternalStore(never, home, () => "https://brendanlo.dev/");
  return (
    // A different root layout, so this is a full page load either way.
    <Link href={href} prefetch={false}>
      {children}
    </Link>
  );
}
