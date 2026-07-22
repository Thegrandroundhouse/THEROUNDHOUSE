"use client";

import { MoneyInput, IntegerInput } from "@/components/admin/MoneyInput";
import { calcLineItems, formatGbp, normalizeContractLineItems } from "@/lib/build-banqueting-contract";
import type { ContractLineItem } from "@/lib/roundhouse-contract-types";

export function newContractLine(partial?: Partial<ContractLineItem>): ContractLineItem {
  return {
    id: partial?.id || `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    description: partial?.description ?? "Venue hire",
    qty: partial?.qty ?? 1,
    unitCostCents: partial?.unitCostCents ?? 0,
    discountCents: partial?.discountCents ?? 0,
    included: partial?.included ?? true,
  };
}

export function ContractLineItemsEditor({
  lines,
  onChange,
  showRemove = true,
}: {
  lines: ContractLineItem[];
  onChange: (lines: ContractLineItem[]) => void;
  showRemove?: boolean;
}) {
  const normalized = normalizeContractLineItems(lines);
  const totals = calcLineItems(normalized);

  const updateLine = (id: string, patch: Partial<ContractLineItem>) => {
    onChange(normalized.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addLine = () => {
    onChange([
      ...normalized,
      newContractLine({ description: "Additional item", unitCostCents: 0 }),
    ]);
  };

  const removeLine = (id: string) => {
    if (normalized.length <= 1) {
      onChange([newContractLine({ description: "Venue hire", unitCostCents: 0 })]);
      return;
    }
    onChange(normalized.filter((r) => r.id !== id));
  };

  return (
    <div className="admin-bk-line-items">
      <div className="admin-pay-table-wrap" style={{ marginBottom: "0.75rem" }}>
        <table className="admin-pay-table admin-bkd-contract-lines">
          <thead>
            <tr>
              <th>Include</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit £</th>
              <th>Discount £</th>
              <th>Line total</th>
              {showRemove ? <th /> : null}
            </tr>
          </thead>
          <tbody>
            {normalized.map((row) => {
              const lineTotal = row.included ? row.qty * row.unitCostCents - row.discountCents : 0;
              return (
                <tr key={row.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.included}
                      onChange={(e) => updateLine(row.id, { included: e.target.checked })}
                      aria-label={`Include ${row.description || "line"}`}
                    />
                  </td>
                  <td>
                    <input
                      className="admin-table-inline-input"
                      value={row.description}
                      onChange={(e) => updateLine(row.id, { description: e.target.value })}
                      placeholder="Description"
                    />
                  </td>
                  <td>
                    <IntegerInput
                      min={1}
                      className="admin-table-inline-input"
                      style={{ width: "3.5rem" }}
                      value={row.qty}
                      onChange={(qty) => updateLine(row.id, { qty })}
                      aria-label="Quantity"
                    />
                  </td>
                  <td>
                    <MoneyInput
                      className="admin-table-inline-input"
                      style={{ width: "5.5rem" }}
                      cents={row.unitCostCents}
                      onCentsChange={(unitCostCents) => updateLine(row.id, { unitCostCents })}
                      aria-label="Unit amount"
                    />
                  </td>
                  <td>
                    <MoneyInput
                      className="admin-table-inline-input"
                      style={{ width: "5.5rem" }}
                      cents={row.discountCents}
                      onCentsChange={(discountCents) => updateLine(row.id, { discountCents })}
                      aria-label="Discount"
                    />
                  </td>
                  <td>{formatGbp(lineTotal)}</td>
                  {showRemove ? (
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost admin-btn-sm"
                        onClick={() => removeLine(row.id)}
                        aria-label={`Remove ${row.description || "line"}`}
                      >
                        Remove
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={addLine}>
        + Line item
      </button>
      <p style={{ marginTop: "0.75rem", fontWeight: 700 }}>
        Contract sum: {formatGbp(totals.contractSumCents)}
        {totals.discountTotalCents > 0 ? (
          <span style={{ fontWeight: 400, color: "var(--color-text-muted)", marginLeft: "0.5rem" }}>
            (discounts −{formatGbp(totals.discountTotalCents)})
          </span>
        ) : null}
      </p>
    </div>
  );
}
