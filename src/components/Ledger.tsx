import React from "react";
import styles from "./Ledger.module.css";

/* Replaces the animated four-up stat band. Numbers that count up are a
 * growth-marketing gesture; a PI reads them as noise. This is a CV header:
 * denser, faster to scan, publications first, no follower count. */
const ROWS: { key: string; value: string; note?: string }[] = [
  { key: "Research", value: "4 papers, 2026", note: "J. Cell Biol. · ICML ×3" },
  { key: "Labs", value: "4 positions", note: "Columbia · NYU · Weill Cornell ×2" },
  { key: "Engineering", value: "20+ sites shipped", note: "club of 70, co-founded" },
  { key: "Now", value: "Open to research and engineering internships" },
];

export const Ledger: React.FC = () => (
  <dl className={styles.ledger}>
    {ROWS.map((row) => (
      <div key={row.key} className={styles.row}>
        <dt className={styles.key}>{row.key}</dt>
        <dd className={styles.val}>
          <span className={styles.value}>{row.value}</span>
          {row.note && <span className={styles.note}>{row.note}</span>}
        </dd>
      </div>
    ))}
  </dl>
);
