import { call, respond } from "../../_server/db";

/** Once a day from the cron in vercel.json. Supabase pauses a free database that
 * gets fewer than "a few" requests a day for a week, so make a few. Harmless if
 * anyone else calls it. */
export const dynamic = "force-dynamic";

export async function GET() {
  return respond(async () => {
    for (let i = 0; i < 5; i++) await call("keep_awake");
    return { ok: true };
  });
}
