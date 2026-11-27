import { FIRST_DAY, isDay, LAST_DAY } from "../../_lib/runs";
import { call, Refused, respond } from "../../_server/db";
import { token } from "../../_server/session";

const inRange = (day: string | null): day is string => isDay(day) && day >= FIRST_DAY && day <= LAST_DAY;

/** The answers of the logged-in account's runs from one day to another, both
 * included, by run id. Apart from the runs, because only the stats tab uses
 * them, and only for the days it shows. */
export async function GET(request: Request) {
  return respond(async () => {
    const q = new URL(request.url).searchParams;
    const [from, to] = [q.get("from"), q.get("to")];
    if (!inRange(from) || !inRange(to) || from > to) throw new Refused("bad_range");
    return call<Record<string, unknown>>("answers", { p_token: await token(), p_from: from, p_to: to });
  });
}
