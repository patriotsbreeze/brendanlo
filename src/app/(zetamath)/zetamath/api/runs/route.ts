import { parseRun } from "../../_lib/runs";
import { isOwner } from "../../_server/owner";
import { readRuns, storageKind, writeRuns } from "../../_server/store";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_RUNS = 200;

/** Anyone may look at the graphs. */
export async function GET() {
  const owner = await isOwner();
  try {
    return Response.json({ owner, storage: storageKind(), runs: await readRuns() }, { headers: NO_STORE });
  } catch (e) {
    console.error("zetamath: reading runs failed", e);
    return Response.json({ owner, error: "could not read runs" }, { status: 503, headers: NO_STORE });
  }
}

/** Only the owner may record. A retry or a changed exclude box is the same
 * request. There is no delete and no editing a score: excluding covers it, and
 * can be undone. */
export async function POST(request: Request) {
  if (!(await isOwner())) {
    return Response.json({ error: "not signed in" }, { status: 401, headers: NO_STORE });
  }
  if (storageKind() === "none") {
    return Response.json({ error: "no storage connected" }, { status: 503, headers: NO_STORE });
  }
  const body = (await request.json().catch(() => null)) as { runs?: unknown } | null;
  const list = body?.runs;
  if (!Array.isArray(list) || list.length > MAX_RUNS) {
    return Response.json({ error: "expected a list of runs" }, { status: 400, headers: NO_STORE });
  }
  const runs = list.map(parseRun);
  if (runs.some((r) => r === null)) {
    return Response.json({ error: "a run is malformed" }, { status: 400, headers: NO_STORE });
  }
  try {
    await writeRuns(runs.filter((r) => r !== null));
    return Response.json({ saved: runs.length }, { headers: NO_STORE });
  } catch (e) {
    console.error("zetamath: saving runs failed", e);
    return Response.json({ error: "could not save" }, { status: 503, headers: NO_STORE });
  }
}
