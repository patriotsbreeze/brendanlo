import { parseRun, type Run } from "../../_lib/runs";
import { call, readBody, Refused, respond, text } from "../../_server/db";
import { token } from "../../_server/session";
import type { Account } from "../../_lib/accounts";

const MAX_RUNS = 200;

/** Who is logged in, and their runs. */
export async function GET() {
  return respond(async () =>
    call<{ account: Account | null; runs: Run[] }>("read", { p_token: await token() }),
  );
}

/** Record runs. A retry or a changed exclude box is the same request. There is
 * no delete and no editing a score: excluding covers it, and can be undone. */
export async function POST(request: Request) {
  return respond(async () => {
    const { account, runs: list } = await readBody(request);
    // A tab from before accounts. This is the answer that makes it keep its runs.
    if (account === undefined) throw new Refused("unreachable");
    if (!Array.isArray(list) || list.length > MAX_RUNS) throw new Refused("bad_runs");
    const runs = list.map(parseRun);
    if (runs.some((r) => r === null)) throw new Refused("bad_runs");
    return call<{ replaced: string[] }>("save", {
      p_token: await token(),
      p_username: text(account),
      p_runs: runs,
    });
  });
}
