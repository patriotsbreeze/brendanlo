import { PGlite, type Transaction } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";

/* Postgres inside the process, running the real migrations, so `next dev` and
 * scripts/test-db.mts need no account and no network. Development only. */

const MIGRATIONS = path.join(process.cwd(), "supabase", "migrations");
const DATA = path.join(process.cwd(), ".data", "zetamath");

/** What a Supabase project has before the first migration. */
const SUPABASE = `
  create schema if not exists extensions;
  create schema if not exists dev;
  create table if not exists dev.migrations (name text primary key);
  do $$ begin
    create role anon; create role authenticated;
  exception when duplicate_object then null; end $$;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`;

/** In memory unless given a directory. */
export async function open(dir?: string): Promise<PGlite> {
  const db = await PGlite.create({ dataDir: dir, extensions: { pgcrypto } });
  await db.exec(SUPABASE);
  for (const name of (await readdir(MIGRATIONS)).filter((f) => f.endsWith(".sql")).sort()) {
    const done = await db.query("select 1 from dev.migrations where name = $1", [name]);
    if (done.rows.length > 0) continue;
    const sql = await readFile(path.join(MIGRATIONS, name), "utf8");
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query("insert into dev.migrations (name) values ($1)", [name]);
    });
  }
  return db;
}

/** Call a function the way the API does: by name, as the anonymous role. */
export async function callAsAnon(db: PGlite, fn: string, args: Record<string, unknown>) {
  const names = Object.keys(args);
  const list = names.map((name, i) => `${name} => $${i + 1}`).join(", ");
  return db.transaction(async (tx: Transaction) => {
    await tx.exec("set local role anon");
    const { rows } = await tx.query<{ out: unknown }>(
      `select public.${fn}(${list}) as out`,
      names.map((name) => args[name]),
    );
    return rows[0].out;
  });
}

// Only one process can have the directory open, and a hot reload must not try.
const shared = globalThis as { zetamathDevDb?: Promise<PGlite> };

async function start(): Promise<PGlite> {
  await mkdir(DATA, { recursive: true });
  const db = await open(DATA);
  await db.exec(`
    insert into zetamath.accounts (username, password_hash, owner)
    values ('blo', zetamath.hash_password('localhost'), true) on conflict do nothing`);
  return db;
}

export async function callDev(fn: string, args: Record<string, unknown>) {
  shared.zetamathDevDb ??= start().catch((e: unknown) => {
    shared.zetamathDevDb = undefined;
    throw e;
  });
  return callAsAnon(await shared.zetamathDevDb, fn, args);
}
