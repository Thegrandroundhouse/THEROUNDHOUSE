"use client";

import { useEffect, useState } from "react";

function formatCents(cents: number): string {
  const n = Number.isFinite(cents) ? cents : 0;
  return (n / 100).toFixed(2);
}

function parsePoundsToCents(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const n = parseFloat(trimmed.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100)) : 0;
}

/** Allow empty / partial typing; commit to cents on blur. */
export function MoneyInput({
  cents,
  onCentsChange,
  className,
  style,
  id,
  "aria-label": ariaLabel,
  disabled,
}: {
  cents: number;
  onCentsChange: (cents: number) => void;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  "aria-label"?: string;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() => formatCents(cents));

  useEffect(() => {
    if (!focused) setText(formatCents(cents));
  }, [cents, focused]);

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      disabled={disabled}
      aria-label={ariaLabel}
      className={className}
      style={style}
      value={focused ? text : formatCents(cents)}
      onFocus={() => {
        setFocused(true);
        setText(formatCents(cents));
      }}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setText(v);
      }}
      onBlur={() => {
        const next = parsePoundsToCents(text);
        setFocused(false);
        onCentsChange(next);
        setText(formatCents(next));
      }}
    />
  );
}

/** Pound string field (not cents) — same empty-while-typing behaviour. */
export function PoundsInput({
  value,
  onChange,
  className,
  style,
  id,
  "aria-label": ariaLabel,
  disabled,
}: {
  value: number;
  onChange: (pounds: number) => void;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  "aria-label"?: string;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const display = Number.isFinite(value) ? value.toFixed(2) : "0.00";
  const [text, setText] = useState(display);

  useEffect(() => {
    if (!focused) setText(Number.isFinite(value) ? value.toFixed(2) : "0.00");
  }, [value, focused]);

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      disabled={disabled}
      aria-label={ariaLabel}
      className={className}
      style={style}
      value={focused ? text : Number.isFinite(value) ? value.toFixed(2) : "0.00"}
      onFocus={() => {
        setFocused(true);
        setText(Number.isFinite(value) ? value.toFixed(2) : "0.00");
      }}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setText(v);
      }}
      onBlur={() => {
        const trimmed = text.trim();
        const n = trimmed === "" ? 0 : parseFloat(trimmed);
        const next = Number.isFinite(n) ? Math.max(0, n) : 0;
        setFocused(false);
        onChange(next);
        setText(next.toFixed(2));
      }}
    />
  );
}

/** Integer field that can be cleared while typing; commits on blur. */
export function IntegerInput({
  value,
  onChange,
  min = 0,
  max,
  className,
  style,
  id,
  "aria-label": ariaLabel,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  "aria-label"?: string;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() => String(value));

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      disabled={disabled}
      aria-label={ariaLabel}
      className={className}
      style={style}
      value={focused ? text : String(value)}
      onFocus={() => {
        setFocused(true);
        setText(String(value));
      }}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "" || /^\d+$/.test(v)) setText(v);
      }}
      onBlur={() => {
        let n = text.trim() === "" ? min : parseInt(text, 10);
        if (!Number.isFinite(n)) n = min;
        n = Math.max(min, n);
        if (max != null) n = Math.min(max, n);
        setFocused(false);
        onChange(n);
        setText(String(n));
      }}
    />
  );
}
