"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch, parseAdminError } from "@/lib/admin-api-client";
import {
  ContractLineItemsEditor,
  newContractLine,
} from "@/components/admin/ContractLineItemsEditor";
import {
  applyLineItemTotalsToContract,
  calcLineItems,
  normalizeContractLineItems,
} from "@/lib/build-banqueting-contract";
import type { ContractLineItem, RoundhouseContractData } from "@/lib/roundhouse-contract-types";

type Props = {
  bookingId: string;
  /** Keep booking header / money strip in sync with line totals. */
  onSumChange?: (contractSumCents: number) => void;
  /** After line/discount changes, offer to update the 4-instalment plan. */
  onOfferPaymentResync?: (contractSumCents: number) => void;
};

/**
 * Edit hire-contract line items (qty, unit, discount) on the booking overview.
 * Saves into hire_contract_draft and updates bookings.total_cents.
 */
export function BookingLineItemsPanel({ bookingId, onSumChange, onOfferPaymentResync }: Props) {
  const [lines, setLines] = useState<ContractLineItem[] | null>(null);
  const draftRef = useRef<RoundhouseContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const skipSaveRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSumChangeRef = useRef(onSumChange);
  onSumChangeRef.current = onSumChange;
  const onOfferPaymentResyncRef = useRef(onOfferPaymentResync);
  onOfferPaymentResyncRef.current = onOfferPaymentResync;
  const initialSumRef = useRef<number | null>(null);

  const setDraftBoth = (d: RoundhouseContractData | null) => {
    draftRef.current = d;
  };

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    skipSaveRef.current = true;
    adminFetch(`/api/admin/bookings/${bookingId}/contract-draft`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await parseAdminError(r, "Couldn’t load line items"));
        return r.json();
      })
      .then((d: { draft?: RoundhouseContractData }) => {
        if (!d?.draft) {
          setDraftBoth(null);
          setLines([newContractLine()]);
          return;
        }
        const normalized = applyLineItemTotalsToContract(d.draft);
        setDraftBoth(normalized);
        setLines(
          normalized.lineItems?.length
            ? normalizeContractLineItems(normalized.lineItems)
            : [newContractLine({ unitCostCents: normalized.contractSumCents || 0 })],
        );
        onSumChangeRef.current?.(normalized.contractSumCents);
        if (initialSumRef.current == null) initialSumRef.current = normalized.contractSumCents;
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Couldn’t load line items");
        setLines([newContractLine()]);
      })
      .finally(() => {
        setLoading(false);
        setTimeout(() => {
          skipSaveRef.current = false;
        }, 0);
      });
  }, [bookingId]);

  useEffect(() => {
    load();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [load]);

  const persist = useCallback(async (nextLines: ContractLineItem[]) => {
    let baseDraft = draftRef.current;
    if (!baseDraft) {
      const r = await adminFetch(`/api/admin/bookings/${bookingId}/contract-draft`);
      if (!r.ok) throw new Error(await parseAdminError(r, "Couldn’t load contract"));
      const d = (await r.json()) as { draft?: RoundhouseContractData };
      if (!d.draft) throw new Error("No contract draft available");
      baseDraft = d.draft;
    }
    const merged = applyLineItemTotalsToContract({ ...baseDraft, lineItems: nextLines });
    const put = await adminFetch(`/api/admin/bookings/${bookingId}/contract-draft`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contract: merged }),
    });
    if (!put.ok) throw new Error(await parseAdminError(put, "Couldn’t save line items"));
    const saved = (await put.json()) as { draft?: RoundhouseContractData };
    const out = saved.draft ? applyLineItemTotalsToContract(saved.draft) : merged;
    setDraftBoth(out);
    onSumChangeRef.current?.(out.contractSumCents);
    if (
      initialSumRef.current != null &&
      out.contractSumCents !== initialSumRef.current &&
      onOfferPaymentResyncRef.current
    ) {
      onOfferPaymentResyncRef.current(out.contractSumCents);
      initialSumRef.current = out.contractSumCents;
    }
  }, [bookingId]);

  const onChangeLines = (next: ContractLineItem[]) => {
    const normalized = normalizeContractLineItems(next);
    setLines(normalized);
    onSumChangeRef.current?.(calcLineItems(normalized).contractSumCents);
    if (skipSaveRef.current) return;
    setSaveStatus("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void persist(normalized)
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    }, 600);
  };

  return (
    <section className="admin-bks-block admin-bks-block--lines">
      <div className="admin-bks-block-head">
        <h3 className="admin-bks-block-title" style={{ margin: 0 }}>
          Line items &amp; contract sum
        </h3>
        <span className="admin-bks-lines-status" aria-live="polite">
          {loading ? "Loading…" : null}
          {!loading && saveStatus === "saving" ? "Saving…" : null}
          {!loading && saveStatus === "saved" ? "Saved" : null}
          {!loading && saveStatus === "error" ? "Couldn’t save" : null}
        </span>
      </div>
      <p className="admin-bks-hint" style={{ marginTop: 0 }}>
        Add lines and discounts here — same totals appear on the hire contract PDF.
      </p>
      {error ? (
        <p className="admin-bk-slot-error" role="alert">
          {error}
        </p>
      ) : null}
      {loading && !lines ? (
        <p className="admin-bks-hint">Loading line items…</p>
      ) : (
        <ContractLineItemsEditor lines={lines ?? [newContractLine()]} onChange={onChangeLines} />
      )}
    </section>
  );
}
