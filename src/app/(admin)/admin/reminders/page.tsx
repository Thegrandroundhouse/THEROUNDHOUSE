"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";

type ReminderRow = {
  id: string;
  title: string;
  body: string | null;
  remind_at: string;
  done: boolean;
  booking_id: string | null;
  invoice_id: string | null;
  enquiry_id: string | null;
  created_at: string;
};

function formatDateTime(s: string) {
  return new Date(s).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0") +
    "T" +
    String(d.getHours()).padStart(2, "0") +
    ":" +
    String(d.getMinutes()).padStart(2, "0")
  );
}

export default function RemindersPage() {
  const { alert, confirm } = useAdminDialog();
  const [rows, setRows] = useState<ReminderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "done" | "all">("upcoming");
  const [linkFilter, setLinkFilter] = useState<"all" | "booking" | "invoice" | "enquiry" | "standalone">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formRemindAt, setFormRemindAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [counts, setCounts] = useState({ upcoming: 0, done: 0, total: 0 });

  const [viewReminder, setViewReminder] = useState<ReminderRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editRemindAt, setEditRemindAt] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadCounts = useCallback(() => {
    Promise.all([
      adminFetch("/api/admin/reminders?done=false&limit=1&page=1").then((r) => (r.ok ? r.json() : { total: 0 })),
      adminFetch("/api/admin/reminders?done=true&limit=1&page=1").then((r) => (r.ok ? r.json() : { total: 0 })),
      adminFetch("/api/admin/reminders?limit=1&page=1").then((r) => (r.ok ? r.json() : { total: 0 })),
    ]).then(([a, b, c]: { total?: number }[]) => {
      setCounts({
        upcoming: a?.total ?? 0,
        done: b?.total ?? 0,
        total: c?.total ?? 0,
      });
    });
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (filter === "done") params.set("done", "true");
    if (filter === "upcoming") params.set("done", "false");
    if (dateFrom) params.set("remind_from", dateFrom);
    if (dateTo) params.set("remind_to", dateTo);
    if (searchQ.trim().length >= 2) params.set("q", searchQ.trim());
    if (linkFilter !== "all") params.set("link", linkFilter);

    adminFetch(`/api/admin/reminders?${params}`)
      .then((r) => (r.ok ? r.json() : { rows: [], totalPages: 1, total: 0 }))
      .then((d: { rows?: ReminderRow[]; totalPages?: number; total?: number }) => {
        setRows(d.rows ?? []);
        setTotalPages(d.totalPages ?? 1);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page, filter, dateFrom, dateTo, searchQ, linkFilter]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    adminFetch("/api/admin/reminders/sync-event-days", { method: "POST" })
      .catch(() => {})
      .finally(() => {
        loadCounts();
        loadRef.current();
      });
  }, [loadCounts]);

  useEffect(() => {
    setPage(1);
  }, [filter, dateFrom, dateTo, searchQ, linkFilter]);

  const setDone = async (r: ReminderRow, done: boolean) => {
    if (!done) {
      const res = await adminFetch(`/api/admin/reminders/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: false }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        await alert(j.error || "Failed");
        return;
      }
      load();
      loadCounts();
      return;
    }

    const ok = await confirm(
      "Mark this reminder as done?",
      { title: "Complete reminder", confirmLabel: "Mark done", cancelLabel: "Cancel" },
    );
    if (!ok) return;

    const res = await adminFetch(`/api/admin/reminders/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: true }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      await alert(j.error || "Failed");
      return;
    }

    if (r.booking_id) {
      const complete = await confirm(
        "Set the linked booking to **Completed**? Choose Cancel if you only wanted to clear the reminder.",
        { title: "Booking status", confirmLabel: "Yes, mark completed", cancelLabel: "No, keep booking as is" },
      );
      if (complete) {
        const br = await adminFetch(`/api/admin/bookings/${r.booking_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        });
        if (!br.ok) {
          const raw = await br.text().catch(() => "Could not update booking");
          let msg = raw;
          try {
            const j = JSON.parse(raw) as { error?: string };
            if (j.error) msg = j.error;
          } catch {
            /* keep */
          }
          await alert(msg, { title: "Booking not updated" });
        }
      }
    }

    load();
    loadCounts();
  };

  const deleteReminder = async (id: string) => {
    const ok = await confirm("Delete this reminder?", { variant: "danger" });
    if (!ok) return;
    const res = await adminFetch(`/api/admin/reminders/${id}`, { method: "DELETE" });
    if (!res.ok) {
      await alert("Failed to delete");
      return;
    }
    load();
    loadCounts();
  };

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = formTitle.trim();
    if (!title) {
      await alert("Title is required");
      return;
    }
    const remindAt = formRemindAt.trim();
    if (!remindAt) {
      await alert("Date & time is required");
      return;
    }
    const dt = new Date(remindAt);
    if (Number.isNaN(dt.getTime())) {
      await alert("Invalid date/time");
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body: formBody.trim() || null,
          remind_at: dt.toISOString(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        await alert(j.error || "Failed to create");
        return;
      }
      setFormTitle("");
      setFormBody("");
      setFormRemindAt("");
      setShowForm(false);
      load();
      loadCounts();
    } finally {
      setSaving(false);
    }
  };

  const now = new Date();
  const defaultDatetime =
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0") +
    "T" +
    String(now.getHours()).padStart(2, "0") +
    ":" +
    String(now.getMinutes()).padStart(2, "0");

  const clearDates = () => {
    setDateFrom("");
    setDateTo("");
  };

  const openReminderModal = (r: ReminderRow) => {
    setViewReminder(r);
    setEditTitle(r.title);
    setEditBody(r.body || "");
    setEditRemindAt(toDatetimeLocalValue(r.remind_at));
    setEditError(null);
  };

  const closeReminderModal = () => {
    setViewReminder(null);
    setEditError(null);
  };

  const saveReminderEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewReminder) return;
    const title = editTitle.trim();
    if (!title) {
      setEditError("Title is required");
      return;
    }
    const remindAt = editRemindAt.trim();
    if (!remindAt) {
      setEditError("Date & time is required");
      return;
    }
    const dt = new Date(remindAt);
    if (Number.isNaN(dt.getTime())) {
      setEditError("Invalid date/time");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await adminFetch(`/api/admin/reminders/${viewReminder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body: editBody.trim() || null,
          remind_at: dt.toISOString(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setEditError((j as { error?: string }).error || "Failed to save");
        return;
      }
      closeReminderModal();
      load();
      loadCounts();
    } finally {
      setEditSaving(false);
    }
  };

  const linkedHref = (r: ReminderRow) =>
    r.booking_id
      ? `/admin/bookings/${r.booking_id}`
      : r.invoice_id
        ? `/admin/invoices/${r.invoice_id}`
        : r.enquiry_id
          ? `/admin/enquiries/${r.enquiry_id}`
          : "";

  return (
    <div className="admin-rem-v2 admin-crm-wide">
      <div className="admin-page-banner">
        <header className="admin-bk-hero">
          <div className="admin-bk-hero-text">
            <p className="admin-dash-kicker">Operations</p>
            <h1 className="admin-page-title admin-bk-title">Reminders</h1>
            <p className="admin-lead admin-bk-lead">
              Follow-ups for bookings, invoices, and enquiries. <strong>Event-day</strong> rows appear automatically when a
              booking&apos;s date is today (UK). Mark done — optionally set the booking to <strong>Completed</strong>.
            </p>
          </div>
          <div className="admin-bk-hero-actions">
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => {
                setShowForm(true);
                if (!formRemindAt) setFormRemindAt(defaultDatetime);
              }}
            >
              + Add reminder
            </button>
          </div>
        </header>
      </div>

      <div className="admin-stats-unified-wrap">
        <AdminStatsCards
          ariaLabel="Reminders summary"
          items={[
            { label: "Upcoming", value: counts.upcoming, hint: "Due", variant: "accent" },
            { label: "Done", value: counts.done, hint: "Cleared", variant: "ok" },
            { label: "Total", value: counts.total, hint: "All time" },
            { label: "This page", value: rows.length, hint: `${total} match filters` },
          ]}
        />
      </div>

      <div className="admin-rem-v2-toolbar admin-crm-filters">
        <div className="admin-rem-v2-filters-row admin-crm-filters-row">
          <div className="admin-rem-v2-seg admin-crm-filters-seg">
            {(["upcoming", "done", "all"] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={
                  "admin-rem-v2-seg-btn admin-crm-filters-seg-btn" +
                  (filter === f ? " admin-rem-v2-seg-btn--on admin-crm-filters-seg-btn--on" : "")
                }
                onClick={() => setFilter(f)}
              >
                {f === "upcoming" ? "Upcoming" : f === "done" ? "Done" : "All"}
              </button>
            ))}
          </div>
          <select
            className="admin-rem-v2-select admin-crm-filters-select"
            value={linkFilter}
            onChange={(e) => setLinkFilter(e.target.value as typeof linkFilter)}
            aria-label="Linked record"
          >
            <option value="all">Any link</option>
            <option value="booking">Booking</option>
            <option value="invoice">Invoice</option>
            <option value="enquiry">Enquiry</option>
            <option value="standalone">Standalone</option>
          </select>
        </div>
        <div className="admin-rem-v2-dates admin-crm-filters-dates">
          <label className="admin-rem-v2-date-label admin-crm-filters-date-label">
            <span>Remind from</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="admin-rem-v2-date admin-crm-filters-date" />
          </label>
          <label className="admin-rem-v2-date-label admin-crm-filters-date-label">
            <span>Remind to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="admin-rem-v2-date admin-crm-filters-date" />
          </label>
          {(dateFrom || dateTo) && (
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={clearDates}>
              Clear dates
            </button>
          )}
          <input
            type="search"
            className="admin-rem-v2-search admin-crm-filters-search"
            placeholder="Search title or note…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            aria-label="Search reminders"
          />
        </div>
      </div>

      {viewReminder && (
        <div
          className="admin-bko-export-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reminder-view-title"
          onClick={(e) => e.target === e.currentTarget && closeReminderModal()}
        >
          <div className="admin-bko-export-modal admin-rem-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-bko-export-head">
              <h2 id="reminder-view-title">Reminder</h2>
              <button type="button" className="admin-inv-modal-x" onClick={closeReminderModal} aria-label="Close">
                ×
              </button>
            </div>
            <p className="admin-bko-export-desc">
              {viewReminder.done ? "This reminder is marked done." : "Edit the reminder below and save your changes."}
              {linkedHref(viewReminder) ? (
                <>
                  {" "}
                  <Link href={linkedHref(viewReminder)} className="admin-rem-v2-modal-link">
                    Open linked record →
                  </Link>
                </>
              ) : null}
            </p>
            <form onSubmit={saveReminderEdit}>
              <div className="admin-form-group">
                <label>
                  Title <span className="admin-rem-required">*</span>
                </label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
              </div>
              <div className="admin-form-group">
                <label>
                  Date & time <span className="admin-rem-required">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={editRemindAt}
                  onChange={(e) => setEditRemindAt(e.target.value)}
                  required
                />
              </div>
              <div className="admin-form-group">
                <label>Note</label>
                <textarea rows={4} value={editBody} onChange={(e) => setEditBody(e.target.value)} placeholder="Notes for this reminder" />
              </div>
              {editError ? (
                <p className="admin-bk-error-msg" role="alert">
                  {editError}
                </p>
              ) : null}
              <div className="admin-inv-modal-actions">
                <button type="button" className="admin-btn admin-btn-ghost" onClick={closeReminderModal}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={editSaving}>
                  {editSaving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showForm && (
        <div className="admin-rem-v2-form-card">
          <form onSubmit={submitNew} className="admin-rem-v2-form">
            <h2 className="admin-rem-v2-form-title">New reminder</h2>
            <div className="admin-rem-v2-form-grid">
              <div className="admin-form-group">
                <label>
                  Title <span className="admin-rem-required">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Chase deposit"
                  required
                />
              </div>
              <div className="admin-form-group">
                <label>
                  Date & time <span className="admin-rem-required">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formRemindAt}
                  onChange={(e) => setFormRemindAt(e.target.value)}
                  required
                />
              </div>
              <div className="admin-form-group admin-form-full">
                <label>Note (optional)</label>
                <textarea rows={2} value={formBody} onChange={(e) => setFormBody(e.target.value)} placeholder="Details" />
              </div>
            </div>
            <div className="admin-rem-v2-form-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="admin-rem-v2-skel">
          <div className="admin-bk-skeleton-line admin-bk-skeleton-line--lg" />
          <div className="admin-bk-skeleton-line" />
          <div className="admin-bk-skeleton-line" />
        </div>
      ) : rows.length === 0 ? (
        <div className="admin-rem-v2-empty">
          <p className="admin-rem-v2-empty-title">No reminders match</p>
          <p className="admin-rem-v2-empty-desc">Try another filter, date range, or search. Event-day items sync when you open this page.</p>
        </div>
      ) : (
        <>
          <div className="admin-card admin-unified-layout">
            <h2 className="admin-section-title">Reminders</h2>
            <div className="admin-pay-table-wrap admin-rem-v2-table-mobile">
              <table className="admin-pay-table admin-rem-v2-reminder-rows">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Title</th>
                    <th>Note</th>
                    <th>Linked</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const viewHref = linkedHref(r);
                    return (
                      <tr key={r.id} className={r.done ? "admin-rem-v2-row--done" : ""}>
                        <td className="admin-rem-v2-when">{formatDateTime(r.remind_at)}</td>
                        <td className="admin-rem-v2-td-title">
                          <button
                            type="button"
                            className="admin-rem-v2-title admin-rem-v2-title-btn"
                            onClick={() => openReminderModal(r)}
                          >
                            {r.title}
                          </button>
                          {r.title.startsWith("Event day") ? (
                            <span className="admin-rem-v2-badge admin-rem-v2-badge--event">Event day</span>
                          ) : null}
                        </td>
                        <td className="admin-rem-v2-note">
                          {r.body ? (
                            <button type="button" className="admin-rem-v2-note-btn" onClick={() => openReminderModal(r)}>
                              {r.body.length > 80 ? `${r.body.slice(0, 80)}…` : r.body}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="admin-rem-v2-links">
                          {r.booking_id ? <span className="admin-pay-sub">Booking</span> : null}
                          {r.invoice_id ? <span className="admin-pay-sub">Invoice</span> : null}
                          {r.enquiry_id ? <span className="admin-pay-sub">Enquiry</span> : null}
                          {!r.booking_id && !r.invoice_id && !r.enquiry_id ? "—" : null}
                        </td>
                        <td className="admin-rem-v2-td-status">
                          {r.done ? (
                            <span className="admin-badge admin-badge-confirmed">Done</span>
                          ) : (
                            <span className="admin-badge admin-badge-pending">Pending</span>
                          )}
                        </td>
                        <td className="admin-rem-v2-td-actions">
                          <div className="admin-rem-v2-actions admin-rem-v2-actions--inline">
                            <button type="button" className="admin-btn admin-btn-sm admin-btn-primary" onClick={() => openReminderModal(r)}>
                              View
                            </button>
                            {viewHref ? (
                              <Link href={viewHref} className="admin-btn admin-btn-sm admin-btn-ghost">
                                Open
                              </Link>
                            ) : null}
                            {!r.done ? (
                              <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setDone(r, true)}>
                                Done
                              </button>
                            ) : (
                              <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setDone(r, false)}>
                                Reopen
                              </button>
                            )}
                            <button
                              type="button"
                              className="admin-btn admin-btn-ghost admin-btn-sm admin-btn-danger"
                              onClick={() => deleteReminder(r.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <nav className="admin-rem-v2-pagination" aria-label="Pages">
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="admin-rem-v2-page-info">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
