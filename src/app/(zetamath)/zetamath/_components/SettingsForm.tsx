"use client";

import { DURATIONS, OP_NAME, type Op, type Range, type Settings } from "../_lib/problems";

type Props = { settings: Settings; onChange: (next: Settings) => void };

export function SettingsForm({ settings, onChange }: Props) {
  const toggle = (op: Op) =>
    onChange({ ...settings, on: { ...settings.on, [op]: !settings.on[op] } });

  const setRange = (which: "add" | "mul", side: 0 | 1, next: Range) => {
    const pair: [Range, Range] = [settings[which][0], settings[which][1]];
    pair[side] = next;
    onChange({ ...settings, [which]: pair });
  };

  const ranges = (which: "add" | "mul", sign: string) => (
    <span className="ranges">
      <RangeInput
        label={`first number, ${which === "add" ? "addition" : "multiplication"}`}
        value={settings[which][0]}
        onChange={(r) => setRange(which, 0, r)}
      />
      <span aria-hidden="true">{sign}</span>
      <RangeInput
        label={`second number, ${which === "add" ? "addition" : "multiplication"}`}
        value={settings[which][1]}
        onChange={(r) => setRange(which, 1, r)}
      />
    </span>
  );

  return (
    <div className="settings">
      <OpRow op="add" on={settings.on.add} onToggle={toggle}>
        {ranges("add", "+")}
      </OpRow>
      <OpRow op="sub" on={settings.on.sub} onToggle={toggle}>
        <span className="hint">the same sums, run backwards</span>
      </OpRow>
      <OpRow op="mul" on={settings.on.mul} onToggle={toggle}>
        {ranges("mul", "×")}
      </OpRow>
      <OpRow op="div" on={settings.on.div} onToggle={toggle}>
        <span className="hint">the same products, run backwards</span>
      </OpRow>
      <div className="opRow">
        <label htmlFor="seconds">time</label>
        <select
          id="seconds"
          value={settings.seconds}
          onChange={(e) => onChange({ ...settings, seconds: Number(e.target.value) })}
        >
          {DURATIONS.map((s) => (
            <option key={s} value={s}>
              {s} seconds
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function OpRow({
  op,
  on,
  onToggle,
  children,
}: {
  op: Op;
  on: boolean;
  onToggle: (op: Op) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="opRow">
      <label className="check">
        <input type="checkbox" checked={on} onChange={() => onToggle(op)} />
        {OP_NAME[op]}
      </label>
      {children}
    </div>
  );
}

/** Blank while being retyped is NaN, which settingsError() turns into a reason
 * the start button is off. */
function RangeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Range;
  onChange: (next: Range) => void;
}) {
  const field = (side: 0 | 1, name: string) => (
    <input
      className="num"
      type="text"
      inputMode="numeric"
      maxLength={4}
      aria-label={`${label}, ${name}`}
      value={Number.isNaN(value[side]) ? "" : value[side]}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "");
        const n = digits === "" ? NaN : Number(digits);
        onChange(side === 0 ? [n, value[1]] : [value[0], n]);
      }}
    />
  );
  return (
    <span className="range">
      {field(0, "from")} to {field(1, "up to")}
    </span>
  );
}
