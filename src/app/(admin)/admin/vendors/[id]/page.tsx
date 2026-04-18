"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminFetch } from "@/lib/admin-api-client";
import { labelForVendorType } from "@/lib/vendor-types";

type VendorRow = {
  id: string;
  name: string;
  vendor_type: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  preferred?: boolean;
  commission_notes?: string | null;
  trade_price_cents?: number | null;
  customer_price_cents?: number | null;
  custom_fields?: Record<string, string>;
};

type BookingLite = {
  id: string;
  event_date: string | null;
  grand_total?: number | null;
  balance_due?: number | null;
  payment_terms?: string | null;
  role?: string | null;
  booking_code?: string | null;
  status?: string | null;
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtMoneyPounds(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtCents(c: number | null | undefined) {
  if (c == null || !Number.isFinite(c)) return "—";
  return fmtMoneyPounds(c / 100);
}

export default function VendorDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [vendor, setVendor] = useState<VendorRow | null>(null);
  const [bookings, setBookings] = useState<BookingLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const [rv, rb] = await Promise.all([
        adminFetch(`/api/admin/vendors/${id}`),
        adminFetch(`/api/admin/vendors/${id}/bookings`),
      ]);
      if (!rv.ok) {
        const t = await rv.text();
        let msg = t || "Could not load vendor";
        try {
          const j = JSON.parse(t);
          if (j.error) msg = j.error;
        } catch {
          /* keep msg */
        }
        throw new Error(msg);
      }
      const v = await rv.json();
      if (v?.error) throw new Error(v.error);

      let list: BookingLite[] = [];
      if (rb.ok) {
        const j = await rb.json();
        list = Array.isArray(j) ? j : [];
      }
      setVendor(v);
      setBookings(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
      setVendor(null);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !vendor) {
    return (
      <div className="admin-vnd-pro admin-crm-wide">
        <div className="admin-vnd-pro-hero" style={{ minHeight: "8rem" }} />
        <p className="admin-page-desc">Loading supplier…</p>
      </div>
    );
  }

  if (err || !vendor) {
    return (
      <div className="admin-vnd-pro admin-crm-wide">
        <p className="admin-page-desc" style={{ color: "#c00" }}>
          {err || "Supplier not found"}
        </p>
        <Link href="/admin/vendors" className="admin-btn admin-btn-secondary">
          ← All suppliers
        </Link>
      </div>
    );
  }

  const initial = (vendor.name || "V").trim().slice(0, 1).toUpperCase();
  const typeLabel = labelForVendorType(vendor.vendor_type || "other");
  const customEntries = Object.entries(vendor.custom_fields || {}).filter(
    ([k]) => k.trim()
  );

  return (
    <div className="admin-vnd-pro admin-crm-wide">
      <div className="admin-vnd-pro-hero">
        <div className="admin-vnd-pro-avatar" aria-hidden>
          {initial}
        </div>
        <div className="admin-vnd-pro-hero-text">
          <div className="admin-vnd-pro-badges">
            <span className="admin-vnd-pro-badge">{typeLabel}</span>
            {vendor.preferred && (
              <span className="admin-vnd-pro-badge admin-vnd-pro-badge--pref">
                Preferred
              </span>
            )}
          </div>
          <h1>{vendor.name}</h1>
          <div className="admin-vnd-pro-contact">
            {vendor.email && (
              <a href={`mailto:${vendor.email}`}>{vendor.email}</a>
            )}
            {vendor.phone && (
              <a href={`tel:${vendor.phone.replace(/\s/g, "")}`}>
                {vendor.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="admin-vnd-pro-grid">
        <aside className="admin-vnd-pro-aside">
          <h2>Pricing &amp; notes</h2>
          <dl>
            <dt>Trade (guide)</dt>
            <dd>{fmtCents(vendor.trade_price_cents)}</dd>
            <dt>Customer (guide)</dt>
            <dd>{fmtCents(vendor.customer_price_cents)}</dd>
            <dt>Commission / terms</dt>
            <dd style={{ whiteSpace: "pre-wrap" }}>
              {vendor.commission_notes || "—"}
            </dd>
            <dt>Internal notes</dt>
            <dd style={{ whiteSpace: "pre-wrap" }}>{vendor.notes || "—"}</dd>
            {customEntries.length > 0 && (
              <>
                <dt style={{ marginTop: "1rem" }}>Custom fields</dt>
                {customEntries.map(([k, v]) => (
                  <dd key={k} style={{ marginTop: "0.35rem" }}>
                    <strong>{k}:</strong> {v || "—"}
                  </dd>
                ))}
              </>
            )}
          </dl>
        </aside>

        <main className="admin-vnd-pro-main">
          <section className="admin-vnd-pro-section">
            <h2>Bookings using this supplier</h2>
            {bookings.length === 0 ? (
              <p className="admin-page-desc" style={{ marginBottom: 0 }}>
                No bookings linked yet. Attach this supplier from a booking
                workspace.
              </p>
            ) : (
              <div className="admin-pay-table-wrap">
                <table className="admin-table admin-pay-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Ref</th>
                      <th>Role</th>
                      <th>Total</th>
                      <th>Balance</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id}>
                        <td>{fmtDate(b.event_date)}</td>
                        <td>
                          {b.booking_code ? (
                            <span className="admin-table-mono">
                              {b.booking_code}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{b.role || "—"}</td>
                        <td>{fmtMoneyPounds(b.grand_total)}</td>
                        <td>{fmtMoneyPounds(b.balance_due)}</td>
                        <td>
                          <Link href={`/admin/bookings/${b.id}`} className="admin-btn admin-btn-sm admin-btn-primary">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="admin-vnd-pro-actions">
            <Link href="/admin/vendors/new" className="admin-btn admin-btn-secondary">
              Add another supplier
            </Link>
            <Link href="/admin/vendors" className="admin-btn admin-btn-secondary">
              All suppliers
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
