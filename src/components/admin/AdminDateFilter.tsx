"use client";

import { useState } from "react";

export type DateFilterPreset = "all" | "this_month" | "next_3_months" | "this_year" | "last_year" | "custom";

export type DateFilterValue = {
  preset: DateFilterPreset;
  from: string;
  to: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function lastDayOfMonth(d: Date) {
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return next.toISOString().slice(0, 10);
}

function addMonths(d: Date, n: number) {
  const out = new Date(d);
  out.setMonth(out.getMonth() + n);
  return out;
}

export function getDateRangeFromValue(value: DateFilterValue): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  switch (value.preset) {
    case "all":
      return { from: "", to: "" };
    case "this_month": {
      const from = firstDayOfMonth(now);
      const to = lastDayOfMonth(now);
      return { from, to };
    }
    case "next_3_months": {
      const from = todayISO();
      const to = addMonths(now, 3).toISOString().slice(0, 10);
      return { from, to };
    }
    case "this_year":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "last_year":
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    case "custom":
      return { from: value.from || "", to: value.to || "" };
    default:
      return { from: "", to: "" };
  }
}

const PRESET_LABELS: Record<DateFilterPreset, string> = {
  all: "All dates",
  this_month: "This month",
  next_3_months: "Next 3 months",
  this_year: "This year",
  last_year: "Last year",
  custom: "Custom range",
};

type AdminDateFilterProps = {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  id?: string;
  label?: string;
  "aria-label"?: string;
};

export function AdminDateFilter({ value, onChange, id = "admin-date-filter", label = "Date", "aria-label": ariaLabel }: AdminDateFilterProps) {
  const [showCustom, setShowCustom] = useState(value.preset === "custom");
  const presets: DateFilterPreset[] = ["all", "this_month", "next_3_months", "this_year", "last_year", "custom"];

  const customFrom = value.preset === "custom" ? value.from : todayISO();
  const customTo = value.preset === "custom" ? value.to : todayISO();

  const handlePreset = (preset: DateFilterPreset) => {
    if (preset === "custom") {
      setShowCustom(true);
      onChange({ preset: "custom", from: customFrom, to: customTo });
    } else {
      setShowCustom(false);
      onChange({ preset, from: "", to: "" });
    }
  };

  const handleCustomFrom = (from: string) => {
    onChange({ ...value, preset: "custom", from, to: value.to || from });
  };
  const handleCustomTo = (to: string) => {
    onChange({ ...value, preset: "custom", to, from: value.from || to });
  };

  return (
    <div className="admin-date-filter" role="group" aria-label={ariaLabel || `${label} filter`}>
      {label ? (
        <span id={`${id}-label`} className="admin-date-filter-label">
          {label}
        </span>
      ) : null}
      <div className="admin-date-filter-presets">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            className={value.preset === preset ? "admin-date-filter-btn admin-date-filter-btn--on" : "admin-date-filter-btn"}
            onClick={() => handlePreset(preset)}
            aria-pressed={value.preset === preset}
          >
            {PRESET_LABELS[preset]}
          </button>
        ))}
      </div>
      {(value.preset === "custom" || showCustom) && (
        <div className="admin-date-filter-custom">
          <label htmlFor={`${id}-from`} className="admin-date-filter-custom-label">
            From
          </label>
          <input
            id={`${id}-from`}
            type="date"
            value={customFrom}
            onChange={(e) => handleCustomFrom(e.target.value)}
            className="admin-date-filter-input"
          />
          <label htmlFor={`${id}-to`} className="admin-date-filter-custom-label">
            To
          </label>
          <input
            id={`${id}-to`}
            type="date"
            value={customTo}
            onChange={(e) => handleCustomTo(e.target.value)}
            className="admin-date-filter-input"
          />
        </div>
      )}
    </div>
  );
}

export function useDateFilterState(initialPreset: DateFilterPreset = "all"): [DateFilterValue, (v: DateFilterValue) => void] {
  const [value, setValue] = useState<DateFilterValue>({ preset: initialPreset, from: "", to: "" });
  return [value, setValue];
}
