"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { AdminDateFilter, getDateRangeFromValue, useDateFilterState } from "@/components/admin/AdminDateFilter";

type Inv = {
  id: string;
  invoice_number: string;
  booking_id: string | null;
  amount_cents: number;
  subtotal_cents: number | null;
  tax_cents: number | null;
  due_date: string | null;
  status: string;
  client_name: string | null;
  client_email: string | null;
  issued_date: string | null;
  created_at: string;
  booking?: { client_name: string | null; client_email: string; client_phone?: string | null; event_date: string; booking_code?: string | null } | null;
};

const STATUS = ["draft", "sent", "paid", "cancelled"] as const;

const INV_STATUS_LABEL: Record<(typeof STATUS)[number] | "all", string> = {
  all: "All",
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  cancelled: "Cancelled",
};

function gbp(c: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(c / 100);
}

export default function InvoicesPage() {
  const { alert } = useAdminDialog();
  const [list, setList] = useState<Inv[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateFilter, setDateFilter] = useDateFilterState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | (typeof STATUS)[number]>("all");
  const [dueFilter, setDueFilter] = useState<"all" | "overdue" | "due_soon">("all");

  const load = () => {
    const { from: dateFrom, to: dateTo } = getDateRangeFromValue(dateFilter);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "25");
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (dueFilter === "overdue") params.set("due", "overdue");
    if (dueFilter === "due_soon") params.set("due", "due_soon");
    adminFetch(`/api/admin/invoices?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setList(Array.isArray(d.rows) ? d.rows : []);
        setTotalPages(d.totalPages ?? 1);
      });
  };

  useEffect(() => {
    load();
    setLoading(false);
  }, [dateFilter, page, statusFilter, dueFilter]);

  useEffect(() => {
    adminFetch("/api/admin/reminders/sync-due-invoices", { method: "POST" }).catch(() => {});
  }, []);

  const downloadPdf = (id: string) => {
    adminFetch(`/api/admin/invoices/${id}/pdf`).then((r) => {
      if (!r.ok) return alert("PDF failed");
      return r.blob().then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `invoice-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
    });
  };

  const setStatus = async (id: string, status: string) => {
    await adminFetch(`/api/admin/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  return (
    <div className="admin-inv">
      <div className="admin-page-banner">
        <header className="admin-bk-hero">
          <div className="admin-bk-hero-text">
            <p className="admin-dash-kicker">Finance</p>
            <h1 className="admin-page-title admin-bk-title">Invoices</h1>
            <p className="admin-lead admin-bk-lead">
              Professional PDFs tied to bookings. Overdue / due-soon sent invoices sync to{" "}
              <Link href="/admin/reminders" className="admin-link">
                Reminders
              </Link>{" "}
              when you open this page.
            </p>
          </div>
          <div className="admin-bk-hero-actions">
            <Link href="/admin/bookings" className="admin-btn admin-btn-ghost">
              Bookings
            </Link>
            <Link href="/admin/reminders" className="admin-btn admin-btn-ghost">
              Reminders
            </Link>
            <Link href="/admin/invoices/new" className="admin-btn admin-btn-primary">
              + New invoice
            </Link>
          </div>
        </header>
      </div>

      <div className="admin-stats-unified-wrap">
        <AdminStatsCards
          ariaLabel="Invoices summary"
          items={[
            { label: "Total invoices", value: list.length },
            { label: "Draft", value: list.filter((i) => i.status === "draft").length, variant: "accent" },
            { label: "Paid", value: list.filter((i) => i.status === "paid").length, variant: "ok" },
            { label: "Sent", value: list.filter((i) => i.status === "sent").length, hint: "Awaiting payment" },
            { label: "Value (ex. cancelled)", value: gbp(list.filter((i) => i.status !== "cancelled").reduce((s, i) => s + i.amount_cents, 0)), variant: "gold" },
          ]}
        />
      </div>

      <section className="admin-crm-filters admin-crm-filters--invoices" aria-label="Invoices filters">
        <div className="admin-crm-filters-dates admin-crm-filters-dates--invoices">
          <div className="admin-inv-filter-block">
            <span className="admin-date-filter-label" id="inv-status-filter-label">
              Status
            </span>
            <div
              className="admin-date-filter-presets"
              role="group"
              aria-labelledby="inv-status-filter-label"
            >
              {(["all", ...STATUS] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={
                    statusFilter === s ? "admin-date-filter-btn admin-date-filter-btn--on" : "admin-date-filter-btn"
                  }
                  aria-pressed={statusFilter === s}
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(1);
                  }}
                >
                  {INV_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
          <div className="admin-inv-filter-block">
            <span className="admin-date-filter-label" id="inv-due-filter-label">
              Due
            </span>
            <div className="admin-date-filter-presets" role="group" aria-labelledby="inv-due-filter-label">
              {(
                [
                  ["all", "All"],
                  ["overdue", "Overdue"],
                  ["due_soon", "Due ≤7d"],
                ] as const
              ).map(([k, lab]) => (
                <button
                  key={k}
                  type="button"
                  className={dueFilter === k ? "admin-date-filter-btn admin-date-filter-btn--on" : "admin-date-filter-btn"}
                  aria-pressed={dueFilter === k}
                  onClick={() => {
                    setDueFilter(k);
                    setPage(1);
                  }}
                >
                  {lab}
                </button>
              ))}
            </div>
          </div>
          <AdminDateFilter
            value={dateFilter}
            onChange={setDateFilter}
            id="inv-date-filter"
            label="Issued date"
          />
        </div>
      </section>

      <div className="admin-card admin-unified-layout">
        <div className="admin-inv-table-wrap">
          <table className="admin-inv-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Client</th>
              <th>Phone</th>
              <th>Booking</th>
              <th>Due</th>
              <th>Amount</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <Link href={`/admin/invoices/${inv.id}`} className="admin-inv-num">
                    {inv.invoice_number}
                  </Link>
                  <span className="admin-inv-date">{inv.issued_date || inv.created_at.slice(0, 10)}</span>
                </td>
                <td>
                  <span className="admin-inv-client">{inv.client_name || inv.client_email || inv.booking?.client_email || "—"}</span>
                  <span className="admin-inv-email">{inv.client_email || inv.booking?.client_email}</span>
                </td>
                <td className="admin-table-phone">
                  {(inv.booking as { client_phone?: string | null } | null)?.client_phone || "—"}
                </td>
                <td>
                  {inv.booking_id ? (
                    <Link href={`/admin/bookings/${inv.booking_id}`} className="admin-inv-link">
                      {(inv.booking as { booking_code?: string | null } | null)?.booking_code
                        ? `${(inv.booking as { booking_code?: string | null }).booking_code} · `
                        : ""}
                      {inv.booking?.event_date || "—"}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{inv.due_date || "—"}</td>
                <td className="admin-inv-amt">{gbp(inv.amount_cents)}</td>
                <td>
                  <select
                    className="admin-inv-status-select"
                    value={inv.status}
                    onChange={(e) => setStatus(inv.id, e.target.value)}
                  >
                    {STATUS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <Link href={`/admin/invoices/${inv.id}`} className="admin-btn admin-btn-sm admin-btn-ghost" style={{ marginRight: "0.35rem" }}>
                    View
                  </Link>
                  <button type="button" className="admin-inv-pdf" onClick={() => downloadPdf(inv.id)}>
                    PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
        {list.length === 0 && !loading && (
          <p className="admin-inv-empty">No invoices yet. Create one from a booking or custom lines.</p>
        )}
      </div>
      <nav className="admin-pay-pager" aria-label="Invoice pages">
        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </nav>
    </div>
  );
}
