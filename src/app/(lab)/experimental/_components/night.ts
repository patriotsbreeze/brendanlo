import data from "../_content/resourceCommits.json";
import type { NightCommit } from "../_tensors/extras.ts";

/* ReSource's real commit log (HooHacks 2026, UVA), as minutes since the first
 * commit. Source: github.com/patriotsbreeze/hoohacksv2, author dates in EDT. */

const t0 = Date.parse(data.commits[0].iso);

export const NIGHT: NightCommit[] = data.commits.map((c) => ({
  minutes: (Date.parse(c.iso) - t0) / 60000,
  local: c.local,
  message: c.message,
}));

export const NIGHT_COMMITS = data.commits;
