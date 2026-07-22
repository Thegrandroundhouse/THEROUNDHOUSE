"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatUkAddress,
  normalizeUkPostcode,
  parseUkAddress,
  type UkAddressParts,
} from "@/lib/uk-address";

type Props = {
  value: string;
  onChange: (formatted: string) => void;
  inputClassName?: string;
  /** Visual variant for booking quick-edit labels vs standard form labels. */
  variant?: "form" | "quick";
};

/**
 * Structured UK address (street, optional line 2, town, postcode).
 * Emits a multi-line string suitable for the hire contract PDF.
 */
export function ClientAddressFields({
  value,
  onChange,
  inputClassName = "admin-bk-simple-input",
  variant = "form",
}: Props) {
  const [parts, setParts] = useState<UkAddressParts>(() => parseUkAddress(value));
  const lastEmitted = useRef(formatUkAddress(parseUkAddress(value)));

  useEffect(() => {
    const incoming = (value || "").trim();
    if (incoming === lastEmitted.current.trim()) return;
    const next = parseUkAddress(value);
    setParts(next);
    lastEmitted.current = formatUkAddress(next);
  }, [value]);

  const emit = (next: UkAddressParts) => {
    setParts(next);
    const formatted = formatUkAddress(next);
    lastEmitted.current = formatted;
    onChange(formatted);
  };

  const patch = (key: keyof UkAddressParts, raw: string) => {
    emit({ ...parts, [key]: raw });
  };

  const wrapClass =
    variant === "quick" ? "admin-bkd-quick-address" : "admin-client-address-fields";

  if (variant === "quick") {
    return (
      <div className={wrapClass}>
        <p className="admin-client-address-hint">UK format for the hire contract PDF</p>
        <div className="admin-bkd-quick-grid admin-bkd-quick-grid--2">
          <label className="admin-bkd-quick-field admin-bkd-quick-field--full">
            <span>Address line 1</span>
            <input
              className={inputClassName}
              value={parts.line1}
              onChange={(e) => patch("line1", e.target.value)}
              placeholder="House number and street"
              autoComplete="address-line1"
            />
          </label>
          <label className="admin-bkd-quick-field admin-bkd-quick-field--full">
            <span>Address line 2</span>
            <input
              className={inputClassName}
              value={parts.line2}
              onChange={(e) => patch("line2", e.target.value)}
              placeholder="Flat, building, or locality (optional)"
              autoComplete="address-line2"
            />
          </label>
          <label className="admin-bkd-quick-field">
            <span>Town / city</span>
            <input
              className={inputClassName}
              value={parts.town}
              onChange={(e) => patch("town", e.target.value)}
              onBlur={() => {
                if (parts.town.trim()) emit({ ...parts, town: parts.town.trim().toUpperCase() });
              }}
              placeholder="DAGENHAM"
              autoComplete="address-level2"
            />
          </label>
          <label className="admin-bkd-quick-field">
            <span>Postcode</span>
            <input
              className={inputClassName}
              value={parts.postcode}
              onChange={(e) => patch("postcode", e.target.value.toUpperCase())}
              onBlur={() => {
                if (parts.postcode.trim()) {
                  emit({ ...parts, postcode: normalizeUkPostcode(parts.postcode) });
                }
              }}
              placeholder="RM8 2HY"
              autoComplete="postal-code"
              spellCheck={false}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapClass}>
      <p className="admin-client-address-hint">
        UK format — one line per field (appears on the hire contract PDF)
      </p>
      <div className="admin-form-grid">
        <div className="admin-form-group admin-form-full">
          <label>Address line 1</label>
          <input
            className={inputClassName}
            value={parts.line1}
            onChange={(e) => patch("line1", e.target.value)}
            placeholder="House number and street"
            autoComplete="address-line1"
          />
        </div>
        <div className="admin-form-group admin-form-full">
          <label>Address line 2</label>
          <input
            className={inputClassName}
            value={parts.line2}
            onChange={(e) => patch("line2", e.target.value)}
            placeholder="Flat, building, or locality (optional)"
            autoComplete="address-line2"
          />
        </div>
        <div className="admin-form-group">
          <label>Town / city</label>
          <input
            className={inputClassName}
            value={parts.town}
            onChange={(e) => patch("town", e.target.value)}
            onBlur={() => {
              if (parts.town.trim()) emit({ ...parts, town: parts.town.trim().toUpperCase() });
            }}
            placeholder="DAGENHAM"
            autoComplete="address-level2"
          />
        </div>
        <div className="admin-form-group">
          <label>Postcode</label>
          <input
            className={inputClassName}
            value={parts.postcode}
            onChange={(e) => patch("postcode", e.target.value.toUpperCase())}
            onBlur={() => {
              if (parts.postcode.trim()) {
                emit({ ...parts, postcode: normalizeUkPostcode(parts.postcode) });
              }
            }}
            placeholder="RM8 2HY"
            autoComplete="postal-code"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
