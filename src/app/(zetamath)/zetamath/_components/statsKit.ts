/* Words and numbers the stats sections share, so every one says a time, a
 * share or a period the same way. */

import { OP_NAME, show, type Op, type Problem } from "../_lib/problems";
import { dayToMs } from "../_lib/runs";
import type { Period } from "../_lib/stats";
import { longDay, shortDay } from "./chartKit";

/** Seconds to two places, the way the graphs tab writes them: "2.41". */
export const secs = (ms: number | null) => (ms === null ? "–" : (ms / 1000).toFixed(2));

/** "8%", "under 1%", or a dash when nothing is known. */
export function pct(rate: number | null): string {
  if (rate === null) return "–";
  if (rate > 0 && rate < 0.01) return "under 1%";
  return `${Math.round(rate * 100)}%`;
}

/** "0.21 s faster", "0.05 s slower", "same pace". Empty with nothing to compare. */
export function pace(now: number | null, before: number | null): string {
  if (now === null || before === null) return "";
  const d = (now - before) / 1000;
  if (Math.abs(d) < 0.005) return "same pace";
  return `${Math.abs(d).toFixed(2)} s ${d < 0 ? "faster" : "slower"}`;
}

/** "0.21 s faster than nov 24", "same pace as october". Empty with nothing to compare. */
export function paceNote(now: number | null, before: number | null, than: string): string {
  const said = pace(now, before);
  if (!said) return "";
  return said === "same pace" ? `same pace as ${than}` : `${said} than ${than}`;
}

/** "7 × 64 = 448" */
export const solvedText = (p: Problem) => `${show(p)} = ${p.answer}`;

/** "carries" says nothing on its own, so say which operation it is. */
export const opWord = (op: Op) => OP_NAME[op];

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** "today", "thu, nov 26, 2026", "nov 23 – 29, 2026", "november 2026", "all time". */
export function periodLabel(p: Period, today: string): string {
  if (p.span === "all") return "all time";
  if (p.span === "day") return p.from === today ? `today, ${longDay(p.from)}` : longDay(p.from);
  const from = new Date(dayToMs(p.from));
  if (p.span === "month") return `${MONTHS[from.getUTCMonth()]} ${from.getUTCFullYear()}`;
  const to = new Date(dayToMs(p.to));
  const end = from.getUTCMonth() === to.getUTCMonth() ? String(to.getUTCDate()) : shortDay(p.to);
  return `${shortDay(p.from)} – ${end}, ${to.getUTCFullYear()}`;
}

/** What a figure is being compared with: "nov 24", "the week of nov 9",
 * "october". With the year when it is not the year of `now`, the period being
 * looked at, or "november" could be either. */
export function versusLabel(p: Period, now: Period): string {
  const year = (day: string) => new Date(dayToMs(day)).getUTCFullYear();
  const tail = year(p.from) === year(now.from) ? "" : ` ${year(p.from)}`;
  if (p.span === "day") return `${shortDay(p.from)}${tail && `,${tail}`}`;
  if (p.span === "week") return `the week of ${shortDay(p.from)}${tail && `,${tail}`}`;
  if (p.span === "month") return `${MONTHS[new Date(dayToMs(p.from)).getUTCMonth()]}${tail}`;
  return "before";
}
