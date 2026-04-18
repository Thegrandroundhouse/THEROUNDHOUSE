"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Booking, BookingStatus } from "@/types/crm";
import { adminFetch } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { BookingWorkspacePanel } from "@/components/admin/BookingWorkspacePanel";
import { SetReminderModal } from "@/components/admin/SetReminderModal";
import { AdminDateAvailabilityAdvisory } from "@/components/admin/AdminDateAvailabilityAdvisory";
import { AgreementLivePreview } from "@/components/admin/AgreementLivePreview";
import { minSelectableEventDateYYYYMMDD } from "@/lib/min-event-date";
import {
  BOOKING_COMPLETED_FUTURE_EVENT_MESSAGE,
  isEventDateInFutureLondon,
} from "@/lib/booking-status-rules";

const STATUS_OPTIONS: BookingStatus[] = ["pending", "confirmed", "cancelled", "completed"];
const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

type WsSummary = {
  wedding: Record<string, unknown> | null;
  milestones: { label: string; status: string }[];
  tasks: { title: string; done: boolean }[];
  documents: { name: string }[];
  communications: { sent_at: string }[];
  bookingVendors: { vendors: { name: string } | null }[];
};

type PackageDetail = {
  id: string;
  name: string;
  description: string | null;
  base_price_cents: number | null;
  line_items: { label: string; description: string; amount_cents: number }[] | null;
  includes: string[] | null;
};

type PaymentsSummary = {
  totals: { customer_received: number; milestone_pending: number };
  milestones: { id: string; label: string; amount_cents: number | null; status: string; due_date: string | null }[];
};

const MILESTONE_STATUS_OPTS: { value: string; label: string }[] = [
  { value: "pending", label: "Not paid" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
  { value: "waived", label: "Waived" },
];

export type ExportSections = {
  client: boolean;
  event: boolean;
  money: boolean;
  notes: boolean;
  wedding: boolean;
  payments: boolean;
  tasks: boolean;
  vendors: boolean;
  documents: boolean;
  comms: boolean;
  record: boolean;
};

const EXPORT_LABELS: { key: keyof ExportSections; label: string; hint: string }[] = [
  { key: "client", label: "Client", hint: "Name, email, phone" },
  { key: "event", label: "Event", hint: "Date, type, package, status" },
  { key: "money", label: "Money", hint: "Total, deposit, balance" },
  { key: "notes", label: "Notes", hint: "Special requirements & internal" },
  { key: "wedding", label: "Wedding details", hint: "Guests, space, menu, timeline…" },
  { key: "payments", label: "Payment schedule", hint: "Milestones" },
  { key: "tasks", label: "Tasks", hint: "Checklist items" },
  { key: "vendors", label: "Vendors", hint: "Linked suppliers" },
  { key: "documents", label: "Documents", hint: "Doc names & links" },
  { key: "comms", label: "Communications", hint: "Logged messages" },
  { key: "record", label: "Record", hint: "IDs, created, updated" },
];

function formatPounds(cents: number | null) {
  if (cents == null) return "—";
  return "£" + (cents / 100).toFixed(2);
}

function centsToPoundsInput(cents: number | null | undefined): string {
  if (cents == null || cents === undefined) return "";
  return (cents / 100).toFixed(2);
}

function poundsInputToCents(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = parseFloat(t.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

function statusPillClass(s: BookingStatus) {
  switch (s) {
    case "pending":
      return "admin-bkd-pill--pending";
    case "confirmed":
      return "admin-bkd-pill--confirmed";
    case "completed":
      return "admin-bkd-pill--completed";
    case "cancelled":
      return "admin-bkd-pill--cancelled";
    default:
      return "";
  }
}

const DEFAULT_EXPORT: ExportSections = {
  client: true,
  event: true,
  money: true,
  notes: true,
  wedding: true,
  payments: true,
  tasks: true,
  vendors: true,
  documents: true,
  comms: true,
  record: true,
};

export default function BookingDetailPage() {
  const { confirm, alert } = useAdminDialog();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [ws, setWs] = useState<WsSummary | null>(null);
  const [wsErr, setWsErr] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Booking>>({});
  const [totalPounds, setTotalPounds] = useState("");
  const [depositPounds, setDepositPounds] = useState("");
  const [balancePounds, setBalancePounds] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [exportSections, setExportSections] = useState<ExportSections>({ ...DEFAULT_EXPORT });
  const [exporting, setExporting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [bookingInvoices, setBookingInvoices] = useState<{ id: string; invoice_number: string; status: string; amount_cents: number }[]>([]);
  const [packageDetail, setPackageDetail] = useState<PackageDetail | null>(null);
  const [paymentsSummary, setPaymentsSummary] = useState<PaymentsSummary | null>(null);
  const [milestoneDraft, setMilestoneDraft] = useState<Record<string, string>>({});
  const [milestoneAmt, setMilestoneAmt] = useState<Record<string, string>>({});
  const [milestoneDue, setMilestoneDue] = useState<Record<string, string>>({});
  const [milestoneUpdating, setMilestoneUpdating] = useState<string | null>(null);
  const [packagesList, setPackagesList] = useState<{ id: string; name: string; base_price_cents: number | null }[]>([]);
  const [slotDefs, setSlotDefs] = useState<{ key: string; label: string; timeLabel: string }[]>([]);
  const [sameDate, setSameDate] = useState<{
    event_date: string;
    this_booking: { slot_label: string; reserves: string; booking_code?: string | null };
    others_on_date: { id: string; booking_code: string | null; client_name: string | null; slot_label: string; same_slot_or_overlap: boolean }[];
  } | null>(null);
  const [agreementTemplates, setAgreementTemplates] = useState<{ id: string; name: string; is_preferred: boolean }[]>([]);
  const [bookingAgreements, setBookingAgreements] = useState<
    {
      id: string;
      title: string | null;
      rendered_body: string;
      client_signed_at: string | null;
      venue_signed_at: string | null;
      created_at?: string;
    }[]
  >([]);
  const [agreementTemplateId, setAgreementTemplateId] = useState("");
  const [agreementsMigration, setAgreementsMigration] = useState(false);
  const [agreementVenue, setAgreementVenue] = useState({ name: "", tagline: "" });
  const [agreementPreview, setAgreementPreview] = useState<(typeof bookingAgreements)[0] | null>(null);

  useEffect(() => {
    adminFetch("/api/admin/settings/invoice-business")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { venueName?: string; venueTagline?: string } | null) => {
        setAgreementVenue({ name: d?.venueName || "", tagline: d?.venueTagline || "" });
      })
      .catch(() => setAgreementVenue({ name: "", tagline: "" }));
  }, []);

  const loadPayments = useCallback(() => {
    adminFetch(`/api/admin/payments/booking/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { totals?: PaymentsSummary["totals"]; milestones?: PaymentsSummary["milestones"] } | null) => {
        if (d?.totals) {
          setPaymentsSummary({ totals: d.totals, milestones: d.milestones ?? [] });
          const next: Record<string, string> = {};
          const am: Record<string, string> = {};
          const du: Record<string, string> = {};
          for (const m of d.milestones ?? []) {
            next[m.id] = m.status;
            am[m.id] =
              m.amount_cents != null && Number.isFinite(m.amount_cents) ? (m.amount_cents / 100).toFixed(2) : "";
            du[m.id] = m.due_date || "";
          }
          setMilestoneDraft(next);
          setMilestoneAmt(am);
          setMilestoneDue(du);
        } else setPaymentsSummary(null);
      })
      .catch(() => setPaymentsSummary(null));
  }, [id]);

  const loadWorkspace = useCallback(() => {
    setWsErr(false);
    adminFetch(`/api/admin/bookings/${id}/workspace`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setWs(data);
        else setWsErr(true);
      })
      .catch(() => setWsErr(true));
  }, [id]);

  const saveMilestoneRow = async (m: PaymentsSummary["milestones"][0]) => {
    const status = milestoneDraft[m.id] ?? m.status;
    const curA = milestoneAmt[m.id]?.trim() || "";
    const amt_cents = curA ? Math.round(parseFloat(curA.replace(/[^0-9.]/g, "")) * 100) : null;
    if (curA && (Number.isNaN(amt_cents!) || amt_cents! < 0)) {
      await alert("Enter a valid amount or leave blank.");
      return;
    }
    const due = milestoneDue[m.id]?.trim() || null;
    setMilestoneUpdating(m.id);
    try {
      const r = await adminFetch(`/api/admin/payment-milestones/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, amount_cents: amt_cents, due_date: due }),
      });
      if (!r.ok) {
        const t = await r.text();
        await alert(t || "Could not update milestone");
        return;
      }
      loadPayments();
      loadWorkspace();
    } finally {
      setMilestoneUpdating(null);
    }
  };

  useEffect(() => {
    adminFetch(`/api/admin/bookings/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Not found"))))
      .then((data: Booking) => {
        setBooking(data);
        setForm({
          client_name: data.client_name ?? "",
          client_email: data.client_email ?? "",
          client_phone: data.client_phone ?? "",
          event_date: data.event_date ?? "",
          event_type: data.event_type ?? "",
          package_name: data.package_name ?? "",
          package_id: data.package_id ?? undefined,
          status: data.status,
          special_requirements: data.special_requirements ?? "",
          notes: data.notes ?? "",
          extras: data.extras ?? "",
          event_slot_key: data.event_slot_key ?? null,
        });
        setTotalPounds(centsToPoundsInput(data.total_cents));
        setDepositPounds(centsToPoundsInput(data.deposit_cents));
        setBalancePounds(centsToPoundsInput(data.balance_cents));
        const pkgId = (data as Booking & { package_id?: string | null }).package_id;
        if (pkgId) {
          adminFetch(`/api/admin/packages/${pkgId}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((pkg: PackageDetail | null) => setPackageDetail(pkg));
        } else {
          setPackageDetail(null);
        }
      })
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));
    loadWorkspace();
    adminFetch(`/api/admin/invoices?booking_id=${id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { id: string; invoice_number: string; status: string; amount_cents: number }[]) => setBookingInvoices(Array.isArray(list) ? list : []))
      .catch(() => setBookingInvoices([]));
    loadPayments();
    adminFetch("/api/admin/packages?limit=100")
      .then((r) => r.json())
      .then((d: { rows?: { id: string; name: string; base_price_cents: number | null }[] } | unknown) => {
        const rows = Array.isArray(d) ? d : (d as { rows?: unknown }).rows;
        const list = Array.isArray(rows)
          ? rows.map((p: { id: string; name: string; base_price_cents?: number | null }) => ({
              id: p.id,
              name: p.name,
              base_price_cents: p.base_price_cents ?? null,
            }))
          : [];
        setPackagesList(list.filter((p) => p.id && p.name));
      })
      .catch(() => setPackagesList([]));
    adminFetch("/api/admin/settings/booking-slots")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { slots?: { key: string; label: string; timeLabel: string }[] } | null) => {
        const slots = d?.slots?.length ? d.slots : [];
        setSlotDefs(
          slots.length
            ? slots
            : [
                { key: "morning", label: "Morning", timeLabel: "9:00 – 12:00" },
                { key: "afternoon", label: "Afternoon", timeLabel: "12:00 – 17:00" },
                { key: "evening", label: "Evening", timeLabel: "17:00 – 22:00" },
                { key: "night", label: "Night", timeLabel: "22:00 – 02:00" },
              ],
        );
      })
      .catch(() => {
        setSlotDefs([
          { key: "morning", label: "Morning", timeLabel: "9:00 – 12:00" },
          { key: "afternoon", label: "Afternoon", timeLabel: "12:00 – 17:00" },
          { key: "evening", label: "Evening", timeLabel: "17:00 – 22:00" },
          { key: "night", label: "Night", timeLabel: "22:00 – 02:00" },
        ]);
      });
    adminFetch(`/api/admin/bookings/${id}/same-date`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setSameDate)
      .catch(() => setSameDate(null));
    adminFetch("/api/admin/agreement-templates")
      .then((r) => r.json())
      .then((d: { rows?: { id: string; name: string; is_preferred: boolean }[]; needsMigration?: boolean }) => {
        if (d.needsMigration) setAgreementsMigration(true);
        const rows = d.rows || [];
        setAgreementTemplates(rows);
        const pref = rows.find((x) => x.is_preferred) || rows[0];
        if (pref) setAgreementTemplateId(pref.id);
      })
      .catch(() => setAgreementTemplates([]));
    adminFetch(`/api/admin/bookings/${id}/agreements`)
      .then((r) => r.json())
      .then((d: { rows?: typeof bookingAgreements; needsMigration?: boolean }) => {
        if (d.needsMigration) setAgreementsMigration(true);
        setBookingAgreements(d.rows || []);
      })
      .catch(() => setBookingAgreements([]));
  }, [id, loadWorkspace]);

  const eventDateLabel = useMemo(() => {
    if (!form.event_date) return "";
    const d = new Date(form.event_date + "T12:00:00");
    return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, [form.event_date]);

  const minEventDateForInput = useMemo(() => {
    const today = minSelectableEventDateYYYYMMDD();
    const saved = booking?.event_date;
    if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved) && saved < today) return saved;
    return today;
  }, [booking?.event_date]);

  /** For overview + availability: whole day vs named slot */
  const thisBookingHolds = useMemo(() => {
    const k = form.event_slot_key;
    if (k == null || String(k).trim() === "") {
      return { mode: "whole_day" as const, label: "Full venue" };
    }
    const def = slotDefs.find((s) => s.key === k);
    return {
      mode: "slot" as const,
      slotKey: k,
      label: def?.label || String(k).replace(/_/g, " "),
      timeLabel: def?.timeLabel,
    };
  }, [form.event_slot_key, slotDefs]);

  const overviewStats = useMemo(() => {
    if (!ws) return null;
    const tasksDone = ws.tasks.filter((t) => t.done).length;
    const w = ws.wedding || {};
    return {
      guests: w.guest_count != null ? String(w.guest_count) : "—",
      milestones: ws.milestones.length,
      tasks: ws.tasks.length,
      tasksDone,
      vendors: ws.bookingVendors.length,
      docs: ws.documents.length,
      comms: ws.communications.length,
    };
  }, [ws]);

  const setStatusAtTop = useCallback(
    async (newStatus: BookingStatus) => {
      if (form.status === newStatus) return;
      const eventD = String(form.event_date || booking?.event_date || "").slice(0, 10);
      if (newStatus === "completed" && isEventDateInFutureLondon(eventD)) {
        await alert(BOOKING_COMPLETED_FUTURE_EVENT_MESSAGE, { title: "Can’t mark as completed yet" });
        return;
      }
      setStatusUpdating(true);
      setSaveError(null);
      try {
        const res = await adminFetch(`/api/admin/bookings/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        const raw = await res.text();
        if (!res.ok) {
          let msg = raw;
          try {
            const j = JSON.parse(raw) as { error?: string };
            if (j.error) msg = j.error;
          } catch {
            /* keep raw */
          }
          throw new Error(msg);
        }
        const data = JSON.parse(raw) as Booking;
        setBooking(data);
        setForm((f) => ({ ...f, status: data.status }));
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2500);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Couldn’t update status.");
      } finally {
        setStatusUpdating(false);
      }
    },
    [id, form.status, form.event_date, booking?.event_date, alert],
  );

  const handleSave = useCallback(async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault();
    if (form.status === "completed" && isEventDateInFutureLondon(form.event_date || "")) {
      setSaveError(
        "Completed is only for events on today’s date or in the past. This date is still in the future — use Cancelled if it won’t go ahead, or pick another status until after the event.",
      );
      return false;
    }
    setSaving(true);
    setSavedFlash(false);
    setSaveError(null);
    try {
      const res = await adminFetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          event_date: form.event_date || null,
          event_slot_key: form.event_slot_key === "" || form.event_slot_key == null ? null : form.event_slot_key,
          extras: form.extras ?? null,
          package_id: form.package_id || null,
          total_cents: poundsInputToCents(totalPounds),
          deposit_cents: poundsInputToCents(depositPounds),
          balance_cents: poundsInputToCents(balancePounds),
        }),
      });
      const raw = await res.text();
      if (!res.ok) {
        let msg = raw;
        try {
          const j = JSON.parse(raw) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* keep */
        }
        throw new Error(msg);
      }
      const data = JSON.parse(raw) as Booking;
      setBooking(data);
      setForm((f) => ({
        ...f,
        event_date: data.event_date ?? f.event_date ?? "",
        extras: data.extras ?? "",
        package_id: data.package_id ?? undefined,
        event_slot_key: data.event_slot_key ?? null,
      }));
      setTotalPounds(centsToPoundsInput(data.total_cents));
      setDepositPounds(centsToPoundsInput(data.deposit_cents));
      setBalancePounds(centsToPoundsInput(data.balance_cents));
      const pkgId = data.package_id;
      if (pkgId) {
        adminFetch(`/api/admin/packages/${pkgId}`).then((r) => (r.ok ? r.json() : null)).then((pkg: PackageDetail | null) => setPackageDetail(pkg));
      } else {
        setPackageDetail(null);
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn’t save booking.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [id, form, totalPounds, depositPounds, balancePounds]);

  const handleDelete = async () => {
    if (
      !(await confirm(
        "Delete this booking permanently? Invoices will be unlinked (not deleted). This cannot be undone.",
        { title: "Delete booking", variant: "danger", confirmLabel: "Delete booking" },
      ))
    )
      return;
    try {
      const res = await adminFetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const t = await res.text();
        let msg = t;
        try {
          const j = JSON.parse(t) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* keep msg */
        }
        throw new Error(msg);
      }
      setEditModalOpen(false);
      router.replace("/admin/bookings");
      router.refresh();
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const downloadExportPdf = async () => {
    setExporting(true);
    try {
      const res = await adminFetch(`/api/admin/bookings/${id}/export-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: exportSections }),
      });
      if (!res.ok) {
        await alert(await res.text());
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `booking-${id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      setExportOpen(false);
    } catch {
      await alert("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const agreementPreviewSlotLabel = useMemo(() => {
    if (thisBookingHolds.mode === "whole_day") return "Full venue (whole day)";
    return `${thisBookingHolds.label}${thisBookingHolds.timeLabel ? ` · ${thisBookingHolds.timeLabel}` : ""}`;
  }, [thisBookingHolds]);

  const agreementPreviewEventDate = useMemo(() => {
    if (!form.event_date || !/^\d{4}-\d{2}-\d{2}$/.test(form.event_date)) return "—";
    return new Date(form.event_date + "T12:00:00").toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [form.event_date]);

  const fetchAgreementPdfBlob = async (agreementId: string): Promise<Blob | null> => {
    const res = await adminFetch(`/api/admin/bookings/${id}/agreements/${agreementId}/pdf`);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      await alert(typeof j.error === "string" ? j.error : "PDF failed");
      return null;
    }
    return res.blob();
  };

  const downloadAgreementPdf = async (agreementId: string, titleSlug: string) => {
    try {
      const blob = await fetchAgreementPdfBlob(agreementId);
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${titleSlug.replace(/[^a-z0-9-_]/gi, "-").slice(0, 48) || "agreement"}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      await alert("Download failed");
    }
  };

  /** Opens the same PDF as download — print dialog matches the PDF output. */
  const printAgreementPdf = async (agreementId: string) => {
    try {
      const blob = await fetchAgreementPdfBlob(agreementId);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => {
        try {
          w?.print();
        } catch {
          /* Built-in PDF viewer: use File → Print in the new tab if needed */
        }
      }, 600);
      window.setTimeout(() => URL.revokeObjectURL(url), 180000);
    } catch {
      await alert("Could not open PDF for printing");
    }
  };

  const deleteAgreement = async (agreementId: string, title: string) => {
    if (
      !(await confirm(`Delete “${title.trim() || "this agreement"}”? This removes the copy from this booking only.`, {
        title: "Delete agreement",
        variant: "danger",
        confirmLabel: "Delete",
      }))
    )
      return;
    const r = await adminFetch(`/api/admin/bookings/${id}/agreements/${agreementId}`, { method: "DELETE" });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      await alert(typeof j.error === "string" ? j.error : "Could not delete");
      return;
    }
    setBookingAgreements((prev) => prev.filter((x) => x.id !== agreementId));
    setAgreementPreview((p) => (p?.id === agreementId ? null : p));
  };

  if (loading) {
    return (
      <div className="admin-bkd">
        <div className="admin-bkd-skeleton">
          <div className="admin-bkd-skeleton-hero" />
          <div className="admin-bkd-skeleton-grid">
            <div className="admin-bkd-skeleton-col" />
            <div className="admin-bkd-skeleton-col" />
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="admin-bkd">
        <div className="admin-bkd-missing">
          <h1 className="admin-page-title">Booking not found</h1>
          <p className="admin-lead">This ID may be wrong or the booking was removed.</p>
          <Link href="/admin/bookings" className="admin-btn admin-btn-primary">
            ← All bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-bkd admin-crm-wide">
      <SetReminderModal
        open={reminderOpen}
        onClose={() => setReminderOpen(false)}
        bookingId={id}
        onCreated={() => setReminderOpen(false)}
      />

      <div className="admin-bkd-banner">
        <div className="admin-bkd-top-actions">
          <Link href="/admin/bookings" className="admin-bkd-back">
            ← Bookings
          </Link>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => {
              setSaveError(null);
              setEditModalOpen(true);
            }}
          >
            Edit booking
          </button>
          <button type="button" className="admin-btn admin-btn-danger admin-btn-ghost" onClick={handleDelete}>
            Delete booking
          </button>
          <button type="button" className="admin-btn admin-btn-ghost admin-bkd-export-btn" onClick={() => setReminderOpen(true)}>
            Set reminder
          </button>
          <button type="button" className="admin-btn admin-btn-ghost admin-bkd-export-btn" onClick={() => setExportOpen(true)}>
            Export PDF…
          </button>
        </div>
        <header className="admin-bkd-hero">
          <div className="admin-bkd-hero-datebox" aria-hidden>
            <span className="admin-bkd-hero-dow">{new Date((form.event_date || booking.event_date) + "T12:00:00").toLocaleDateString(undefined, { weekday: "short" })}</span>
            <span className="admin-bkd-hero-day">{new Date((form.event_date || booking.event_date) + "T12:00:00").getDate()}</span>
            <span className="admin-bkd-hero-mon">{new Date((form.event_date || booking.event_date) + "T12:00:00").toLocaleDateString(undefined, { month: "short" })}</span>
          </div>
          <div className="admin-bkd-hero-text">
            {(booking as Booking & { booking_code?: string | null }).booking_code && (
              <p className="admin-bkd-code">
                <code className="admin-bk-code">{(booking as Booking & { booking_code?: string | null }).booking_code}</code>
                <span className="admin-bkd-code-hint">Booking code — use on invoices, payments, vendors</span>
              </p>
            )}
            <div className="admin-bkd-hero-row">
              <h1 className="admin-bkd-title">{form.client_name || form.client_email || "Booking"}</h1>
              <label className="admin-bkd-status-wrap">
                <span className="visually-hidden">Change status</span>
                <select
                  value={form.status ?? "pending"}
                  onChange={(e) => setStatusAtTop(e.target.value as BookingStatus)}
                  disabled={statusUpdating}
                  className={`admin-bkd-pill admin-bkd-pill--select ${statusPillClass(form.status!)}`}
                  aria-label="Booking status"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="admin-bkd-sub">{eventDateLabel}</p>
            {form.client_email ? <p className="admin-bkd-email">{form.client_email}</p> : null}
          </div>
        </header>

        {paymentsSummary ? (
          <div className="admin-bkd-banner-payments" aria-label="Payment milestone status">
            <div className="admin-bkd-banner-payments-top">
              <span className="admin-bkd-banner-payments-title">Payments</span>
              <div className="admin-bkd-banner-payments-totals">
                <span>
                  <strong>{formatPounds(paymentsSummary.totals.customer_received)}</strong> collected
                </span>
                <span className="admin-bkd-banner-payments-dot">·</span>
                <span>
                  <strong>{formatPounds(paymentsSummary.totals.milestone_pending)}</strong> outstanding (schedule)
                </span>
              </div>
              <Link href={`/admin/payments/booking/${id}`} className="admin-bkd-banner-payments-link">
                Ledger →
              </Link>
            </div>
            {paymentsSummary.milestones.length > 0 ? (
              <ul className="admin-bkd-banner-payments-chips">
                {paymentsSummary.milestones.map((m) => {
                  const label = MILESTONE_STATUS_OPTS.find((o) => o.value === m.status)?.label ?? m.status;
                  return (
                    <li key={m.id} className={`admin-bkd-pay-chip admin-bkd-pay-chip--${m.status}`}>
                      <span className="admin-bkd-pay-chip-label">{m.label}</span>
                      <span className="admin-bkd-pay-chip-amt">{formatPounds(m.amount_cents)}</span>
                      <span className="admin-bkd-pay-chip-status">{label}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="admin-bkd-banner-payments-empty">No milestones on file — add in workspace or payment page.</p>
            )}
          </div>
        ) : null}
      </div>

      {savedFlash && (
        <div className="admin-bkd-flash" role="status">
          Saved
        </div>
      )}
      {saveError && (
        <div className="admin-bkd-flash admin-bkd-flash--err" role="alert">
          {saveError}
        </div>
      )}

      {sameDate && (
        <div
          className="admin-card"
          style={{
            marginBottom: "1rem",
            padding: "1rem 1.25rem",
            background: sameDate.this_booking.reserves === "whole_day" ? "rgba(199, 162, 89, 0.12)" : "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <h3 className="admin-section-title" style={{ marginTop: 0 }}>
            This date &amp; slot
          </h3>
          <p className="admin-page-desc" style={{ marginBottom: "0.5rem" }}>
            <strong>This booking</strong> holds{" "}
            {sameDate.this_booking.reserves === "whole_day" ? (
              <>the <strong>full venue</strong> on {sameDate.event_date} — no other events can use that day.</>
            ) : (
              <>
                the <strong>{sameDate.this_booking.slot_label}</strong> slot on {sameDate.event_date}.
              </>
            )}
          </p>
          {sameDate.others_on_date.length > 0 ? (
            <>
              <p className="admin-page-desc" style={{ fontWeight: 600, marginBottom: "0.35rem" }}>
                Other bookings on the same day (different slots or overlap)
              </p>
              <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                {sameDate.others_on_date.map((o) => (
                  <li key={o.id} style={{ marginBottom: "0.35rem" }}>
                    <Link href={`/admin/bookings/${o.id}`} className="admin-link">
                      {o.booking_code || o.id.slice(0, 8)}
                    </Link>
                    {" · "}
                    {o.client_name || "Client"}
                    {" · "}
                    <span style={{ color: "var(--color-text-muted)" }}>{o.slot_label}</span>
                    {o.same_slot_or_overlap ? (
                      <span style={{ color: "#b45309", fontWeight: 600 }}> (overlaps your hold)</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          ) : sameDate.this_booking.reserves !== "whole_day" ? (
            <p className="admin-vnd-new-hint">No other bookings on this date — only this time slot is taken by you.</p>
          ) : null}
        </div>
      )}

      {agreementPreview ? (
        <div
          className="admin-bko-export-backdrop admin-bko-export-backdrop--wide"
          role="dialog"
          aria-modal
          aria-labelledby="agreement-preview-title"
        >
          <div className="admin-bko-export-modal admin-bko-export-modal--wide admin-bkd-agreement-preview-modal">
            <div className="admin-bko-export-head admin-bkd-agreement-preview-head">
              <h2 id="agreement-preview-title">Agreement preview</h2>
              <button type="button" className="admin-inv-modal-x" onClick={() => setAgreementPreview(null)} aria-label="Close">
                ×
              </button>
            </div>
            <p className="admin-bko-export-desc admin-bkd-agreement-preview-desc">
              Matches the <strong>downloadable PDF</strong> layout (venue strip, hire agreement header, client meta, body). Use <strong>PDF</strong> in the table for the final file.
            </p>
            <div className="admin-bkd-agreement-preview-body">
            <AgreementLivePreview
              venueName={agreementVenue.name || "Venue"}
              venueTagline={agreementVenue.tagline}
              agreementTitle={agreementPreview.title || "Agreement"}
              clientName={form.client_name || booking?.client_name || "—"}
              clientEmail={form.client_email || booking?.client_email || ""}
              eventDate={agreementPreviewEventDate}
              eventSlotLabel={agreementPreviewSlotLabel}
              bookingCode={booking?.booking_code || id.slice(0, 8).toUpperCase()}
              totalGbp={
                booking?.total_cents != null ? `£${(booking.total_cents / 100).toFixed(2)}` : "—"
              }
              bodyText={agreementPreview.rendered_body || ""}
            />
            </div>
            <div className="admin-inv-modal-actions admin-bkd-agreement-preview-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setAgreementPreview(null)}>
                Close
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => downloadAgreementPdf(agreementPreview.id, agreementPreview.title || "agreement")}
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <BookingWorkspacePanel
        bookingId={id}
        overviewSlot={
          <div className="admin-bko-grid">
            <div className="admin-bko-card admin-bko-card--wide admin-bko-reservation-hero">
              <div className="admin-bko-reservation-hero-visual" aria-hidden>
                {thisBookingHolds.mode === "whole_day" ? (
                  <span className="admin-bko-reservation-icon admin-bko-reservation-icon--whole">◎</span>
                ) : (
                  <span className="admin-bko-reservation-icon admin-bko-reservation-icon--slot">◷</span>
                )}
              </div>
              <div className="admin-bko-reservation-hero-body">
                <p className="admin-bko-reservation-hero-kicker">Venue reservation</p>
                {thisBookingHolds.mode === "whole_day" ? (
                  <>
                    <p className="admin-bko-reservation-hero-title">Full venue · whole day</p>
                    <p className="admin-bko-reservation-hero-desc">
                      This booking uses the <strong>entire venue</strong> for {eventDateLabel || form.event_date}. No other time slots can be sold on this date.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="admin-bko-reservation-hero-title">{thisBookingHolds.label}</p>
                    {thisBookingHolds.timeLabel ? (
                      <p className="admin-bko-reservation-hero-time">{thisBookingHolds.timeLabel}</p>
                    ) : null}
                    <p className="admin-bko-reservation-hero-desc">
                      Time band only — other slots on this date may still be available for separate bookings.
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="admin-bko-card">
              <h3 className="admin-bko-card-title">Client</h3>
              <p className="admin-bko-card-main">{form.client_name || "—"}</p>
              <p className="admin-bko-card-meta">{form.client_email}</p>
              <p className="admin-bko-card-meta">{form.client_phone || "No phone"}</p>
            </div>
            <div className="admin-bko-card">
              <h3 className="admin-bko-card-title">Event</h3>
              <p className="admin-bko-card-main">{eventDateLabel || form.event_date}</p>
              <p className="admin-bko-card-meta">{form.event_type || "Type TBD"}</p>
              <p className="admin-bko-card-meta">Package: {form.package_name || "—"}</p>
            </div>
            {packageDetail ? (
              <div className="admin-bko-card admin-bko-card--wide admin-bko-card--package">
                <h3 className="admin-bko-card-title">Package in depth</h3>
                <p className="admin-bko-card-main">{packageDetail.name}</p>
                {packageDetail.description ? <p className="admin-bko-card-meta admin-bko-pkg-desc">{packageDetail.description}</p> : null}
                {Array.isArray(packageDetail.line_items) && packageDetail.line_items.length > 0 && (
                  <dl className="admin-bko-dl admin-bko-pkg-lines">
                    {packageDetail.line_items.map((line, i) => (
                      <div key={i}>
                        <dt>{line.label}</dt>
                        <dd>{line.description ? `${line.description} · ` : ""}{formatPounds(line.amount_cents)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {Array.isArray(packageDetail.includes) && packageDetail.includes.length > 0 && (
                  <ul className="admin-bko-pkg-includes">
                    {packageDetail.includes.map((inc, i) => (
                      <li key={i}>{inc}</li>
                    ))}
                  </ul>
                )}
                {packageDetail.base_price_cents != null && (
                  <p className="admin-bko-card-meta"><strong>Package total</strong> {formatPounds(packageDetail.base_price_cents)}</p>
                )}
                <Link href={`/admin/packages/${packageDetail.id}`} className="admin-bko-link" style={{ display: "inline-block", marginTop: "0.5rem" }}>
                  Edit package →
                </Link>
              </div>
            ) : (form.package_name || (booking as Booking & { package_id?: string | null }).package_id) ? (
              <div className="admin-bko-card admin-bko-card--package">
                <h3 className="admin-bko-card-title">Package</h3>
                <p className="admin-bko-card-meta">{form.package_name || "Linked package"}</p>
                <Link href="/admin/packages" className="admin-bko-link">Link a package for full details →</Link>
              </div>
            ) : null}
            {form.event_date ? (
              <div className="admin-bko-card admin-bko-card--wide">
                <h3 className="admin-bko-card-title">Date &amp; slot availability</h3>
                <AdminDateAvailabilityAdvisory
                  date={form.event_date}
                  excludeBookingId={id}
                  selectedSlotKey={form.event_slot_key}
                  thisBookingHolds={thisBookingHolds}
                />
              </div>
            ) : null}
            <div className="admin-bko-card admin-bko-card--money">
              <h3 className="admin-bko-card-title">Money</h3>
              <dl className="admin-bko-dl">
                <div>
                  <dt>Total</dt>
                  <dd>{formatPounds(totalPounds.trim() ? poundsInputToCents(totalPounds) : booking.total_cents)}</dd>
                </div>
                <div>
                  <dt>Deposit</dt>
                  <dd>{formatPounds(depositPounds.trim() ? poundsInputToCents(depositPounds) : booking.deposit_cents)}</dd>
                </div>
                <div>
                  <dt>Balance</dt>
                  <dd className="admin-bko-balance">{formatPounds(balancePounds.trim() ? poundsInputToCents(balancePounds) : booking.balance_cents)}</dd>
                </div>
              </dl>
            </div>
            {overviewStats ? (
              <div className="admin-bko-card admin-bko-card--wide">
                <h3 className="admin-bko-card-title">Wedding ops</h3>
                <div className="admin-bko-chips">
                  <span className="admin-bko-chip">Guests {overviewStats.guests}</span>
                  <span className="admin-bko-chip">{overviewStats.milestones} payments</span>
                  <span className="admin-bko-chip">
                    Tasks {overviewStats.tasksDone}/{overviewStats.tasks}
                  </span>
                  <span className="admin-bko-chip">{overviewStats.vendors} vendors</span>
                  <span className="admin-bko-chip">{overviewStats.docs} docs</span>
                  <span className="admin-bko-chip">{overviewStats.comms} comms</span>
                </div>
              </div>
            ) : wsErr ? (
              <div className="admin-bko-card admin-bko-card--wide admin-bko-card--muted">
                <p className="admin-bko-card-meta">Workspace summary couldn’t load. Try Refresh below — tabs may be limited.</p>
                <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" style={{ marginTop: "0.35rem" }} onClick={() => loadWorkspace()}>
                  Refresh
                </button>
              </div>
            ) : (
              <div className="admin-bko-card admin-bko-card--wide admin-bko-card--muted">
                <p className="admin-bko-card-meta">Loading…</p>
              </div>
            )}
            {(form.special_requirements || form.notes) && (
              <div className="admin-bko-card admin-bko-card--wide">
                <h3 className="admin-bko-card-title">Notes</h3>
                {form.special_requirements ? (
                  <p className="admin-bko-note">
                    <strong>Special requirements</strong> — {form.special_requirements}
                  </p>
                ) : null}
                {form.notes ? (
                  <p className="admin-bko-note">
                    <strong>Internal</strong> — {form.notes}
                  </p>
                ) : null}
              </div>
            )}
            <div className="admin-bko-card">
              <h3 className="admin-bko-card-title">Invoices</h3>
              {bookingInvoices.length === 0 ? (
                <p className="admin-bko-card-meta">No invoices linked</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                  {bookingInvoices.map((inv) => (
                    <li key={inv.id} style={{ marginBottom: "0.35rem" }}>
                      <Link href={`/admin/invoices/${inv.id}`} className="admin-bko-link">
                        {inv.invoice_number}
                      </Link>
                      <span className="admin-bko-card-meta" style={{ marginLeft: "0.35rem" }}>
                        {inv.status} · {formatPounds(inv.amount_cents)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/admin/invoices" className="admin-bko-link" style={{ display: "inline-block", marginTop: "0.5rem" }}>
                {bookingInvoices.length ? "View all / New invoice" : "Create invoice"}
              </Link>
            </div>
            <div
              className={`admin-bko-card ${paymentsSummary && paymentsSummary.milestones.length > 0 ? "admin-bko-card--wide" : ""}`}
            >
              <h3 className="admin-bko-card-title">Payments</h3>
              {paymentsSummary ? (
                <>
                  <dl className="admin-bko-dl">
                    <div>
                      <dt>Client received</dt>
                      <dd>{formatPounds(paymentsSummary.totals.customer_received)}</dd>
                    </div>
                    <div>
                      <dt>Outstanding schedule</dt>
                      <dd>{formatPounds(paymentsSummary.totals.milestone_pending)}</dd>
                    </div>
                  </dl>
                  <p className="admin-bko-card-meta admin-bko-pay-mile-hint">
                    Deposit, balance &amp; refunds — set status per milestone (including partial payments).
                  </p>
                  {paymentsSummary.milestones.length > 0 ? (
                    <div className="admin-bko-pay-mile-table-wrap">
                      <table className="admin-bko-pay-mile-table">
                        <thead>
                          <tr>
                            <th>Milestone</th>
                            <th>Amount (£)</th>
                            <th>Due</th>
                            <th>Status</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {paymentsSummary.milestones.map((m) => {
                            const cur = milestoneDraft[m.id] ?? m.status;
                            const curA = milestoneAmt[m.id]?.trim() || "";
                            const amtCents = curA ? Math.round(parseFloat(curA.replace(/[^0-9.]/g, "")) * 100) : null;
                            const dirty =
                              cur !== m.status ||
                              amtCents !== m.amount_cents ||
                              (milestoneDue[m.id] || "") !== (m.due_date || "");
                            return (
                              <tr key={m.id}>
                                <td>{m.label}</td>
                                <td>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    className="admin-bko-pay-mile-input"
                                    placeholder="0.00"
                                    value={milestoneAmt[m.id] ?? ""}
                                    onChange={(e) => setMilestoneAmt((x) => ({ ...x, [m.id]: e.target.value }))}
                                    aria-label={`Amount ${m.label}`}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="date"
                                    className="admin-bko-pay-mile-input"
                                    value={milestoneDue[m.id] ?? ""}
                                    onChange={(e) => setMilestoneDue((x) => ({ ...x, [m.id]: e.target.value }))}
                                    aria-label={`Due ${m.label}`}
                                  />
                                </td>
                                <td>
                                  <select
                                    className="admin-bko-pay-mile-select"
                                    value={cur}
                                    onChange={(e) => setMilestoneDraft((d) => ({ ...d, [m.id]: e.target.value }))}
                                    aria-label={`Status for ${m.label}`}
                                  >
                                    {MILESTONE_STATUS_OPTS.map((o) => (
                                      <option key={o.value} value={o.value}>
                                        {o.label}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="admin-btn admin-btn-primary admin-btn-sm"
                                    disabled={!dirty || milestoneUpdating === m.id}
                                    onClick={() => saveMilestoneRow(m)}
                                  >
                                    {milestoneUpdating === m.id ? "…" : "Save"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="admin-bko-card-meta">No milestones yet — add in workspace.</p>
                  )}
                  <Link href={`/admin/payments/booking/${id}`} className="admin-bko-link" style={{ display: "inline-block", marginTop: "0.65rem" }}>
                    Full ledger &amp; record payments →
                  </Link>
                </>
              ) : (
                <>
                  <p className="admin-bko-card-meta">Payment schedule couldn’t load. Open the ledger or try again.</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                    <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => loadPayments()}>
                      Refresh
                    </button>
                    <Link href={`/admin/payments/booking/${id}`} className="admin-bko-link">
                      Payments →
                    </Link>
                  </div>
                </>
              )}
            </div>
            {(form.extras ?? "").trim() ? (
              <div className="admin-bko-card admin-bko-card--wide">
                <h3 className="admin-bko-card-title">Extras / add-ons</h3>
                <p className="admin-bko-note" style={{ whiteSpace: "pre-wrap" }}>{form.extras}</p>
              </div>
            ) : null}
            <div className="admin-bko-card admin-bko-card--record">
              <h3 className="admin-bko-card-title">Record</h3>
              <dl className="admin-bko-dl admin-bko-record-fields">
                <div>
                  <dt>Booking code</dt>
                  <dd>
                    <code className="admin-bko-record-code">{booking.booking_code || "—"}</code>
                  </dd>
                </div>
                <div>
                  <dt>Client name</dt>
                  <dd>{form.client_name || "—"}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{new Date(booking.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</dd>
                </div>
                <div>
                  <dt>Last updated</dt>
                  <dd>{new Date(booking.updated_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</dd>
                </div>
              </dl>
              {booking.enquiry_id ? (
                <Link href={`/admin/enquiries/${booking.enquiry_id}`} className="admin-bko-link" style={{ display: "inline-block", marginTop: "0.65rem" }}>
                  Linked enquiry →
                </Link>
              ) : null}
              <div className="admin-bko-record-cal-links">
                <Link
                  href={`/admin/calendar?date=${new Date().toISOString().slice(0, 10)}`}
                  className="admin-bko-link"
                >
                  Calendar — today (highlighted) →
                </Link>
                {(form.event_date || booking.event_date) && /^\d{4}-\d{2}-\d{2}$/.test(String(form.event_date || booking.event_date)) ? (
                  <Link
                    href={`/admin/calendar?date=${form.event_date || booking.event_date}`}
                    className="admin-bko-link"
                  >
                    Event date on calendar →
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        }
        agreementsSlot={
          <div className="admin-bws-agreements-panel">
            <div className="admin-card admin-unified-layout admin-bws-agreements-card">
              <div className="admin-bws-agreements-card-head">
                <h3 className="admin-section-title" style={{ marginTop: 0 }}>
                  Hire agreements
                </h3>
                <p className="admin-bws-lead admin-bws-lead--compact" style={{ marginBottom: 0 }}>
                  Printable PDFs (venue header, merged booking data). Manage{" "}
                  <Link href="/admin/agreements" className="admin-link">
                    templates
                  </Link>
                  .
                  {agreementsMigration ? (
                    <span className="admin-bws-agreements-mig"> Agreements aren’t available until templates are set up in the database.</span>
                  ) : null}
                </p>
              </div>
              {!agreementsMigration && agreementTemplates.length > 0 ? (
                <div className="admin-bkd-agreements-generate admin-bws-agreements-generate">
                  <select
                    className="admin-bk-search"
                    value={agreementTemplateId}
                    onChange={(e) => setAgreementTemplateId(e.target.value)}
                    aria-label="Agreement template"
                  >
                    {agreementTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.is_preferred ? " ★" : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary admin-btn-sm"
                    onClick={async () => {
                      const r = await adminFetch(`/api/admin/bookings/${id}/agreements`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ template_id: agreementTemplateId }),
                      });
                      const d = await r.json();
                      if (!r.ok) await alert(d.error || "Failed");
                      else setBookingAgreements((prev) => [d, ...prev]);
                    }}
                  >
                    Generate from template
                  </button>
                </div>
              ) : null}
              {bookingAgreements.length > 0 ? (
                <div className="admin-pay-table-wrap admin-bws-agreements-table-wrap">
                  <table className="admin-pay-table">
                    <thead>
                      <tr>
                        <th>Agreement</th>
                        <th>Client signed</th>
                        <th>Venue signed</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookingAgreements.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <span className="admin-pay-client">{a.title || "Agreement"}</span>
                          </td>
                          <td>{a.client_signed_at ? <span className="admin-badge admin-badge-confirmed">Yes</span> : "—"}</td>
                          <td>{a.venue_signed_at ? <span className="admin-badge admin-badge-confirmed">Yes</span> : "—"}</td>
                          <td className="admin-table-phone">
                            {a.created_at ? new Date(a.created_at).toLocaleDateString("en-GB") : "—"}
                          </td>
                          <td>
                            <div className="admin-bkd-agreement-actions admin-bws-agreement-actions">
                              <button
                                type="button"
                                className="admin-btn admin-btn-primary admin-btn-sm"
                                onClick={() => downloadAgreementPdf(a.id, a.title || "agreement")}
                              >
                                PDF
                              </button>
                              <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setAgreementPreview(a)}>
                                View
                              </button>
                              <button
                                type="button"
                                className="admin-btn admin-btn-ghost admin-btn-sm"
                                onClick={() => printAgreementPdf(a.id)}
                              >
                                Print
                              </button>
                              <button
                                type="button"
                                className="admin-btn admin-btn-ghost admin-btn-sm"
                                onClick={async () => {
                                  await adminFetch(`/api/admin/bookings/${id}/agreements/${a.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ client_signed: true }),
                                  });
                                  setBookingAgreements((prev) =>
                                    prev.map((x) => (x.id === a.id ? { ...x, client_signed_at: new Date().toISOString() } : x)),
                                  );
                                }}
                              >
                                Client ✓
                              </button>
                              <button
                                type="button"
                                className="admin-btn admin-btn-ghost admin-btn-sm"
                                onClick={async () => {
                                  await adminFetch(`/api/admin/bookings/${id}/agreements/${a.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ venue_signed: true }),
                                  });
                                  setBookingAgreements((prev) =>
                                    prev.map((x) => (x.id === a.id ? { ...x, venue_signed_at: new Date().toISOString() } : x)),
                                  );
                                }}
                              >
                                Venue ✓
                              </button>
                              <button
                                type="button"
                                className="admin-btn admin-btn-ghost admin-btn-sm admin-btn-danger"
                                onClick={() => deleteAgreement(a.id, a.title || "Agreement")}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                !agreementsMigration && <p className="admin-vnd-new-hint">No agreements yet — pick a template and generate.</p>
              )}
            </div>
          </div>
        }
      />

      {editModalOpen && (
        <div className="admin-bko-export-backdrop" role="dialog" aria-modal aria-labelledby="edit-booking-title">
          <div className="admin-bko-export-modal admin-bkd-edit-modal">
            <div className="admin-bko-export-head">
              <h2 id="edit-booking-title">Edit booking</h2>
              <button type="button" className="admin-inv-modal-x" onClick={() => setEditModalOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <form
              className="admin-bkd-form-wrap"
              onSubmit={async (e) => {
                const ok = await handleSave(e);
                if (ok) setEditModalOpen(false);
              }}
            >
              {saveError ? (
                <div className="admin-bkd-edit-banner-err" role="alert">
                  {saveError}
                </div>
              ) : null}
              <section className="admin-bkd-section">
                <h3 className="admin-bkd-section-title">Client</h3>
                <div className="admin-form-grid admin-bkd-grid">
                  <div className="admin-form-group">
                    <label>Name</label>
                    <input value={form.client_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} placeholder="Client name" />
                  </div>
                  <div className="admin-form-group">
                    <label>Email *</label>
                    <input type="email" required value={form.client_email ?? ""} onChange={(e) => setForm((f) => ({ ...f, client_email: e.target.value }))} />
                  </div>
                  <div className="admin-form-group admin-form-full">
                    <label>Phone</label>
                    <input type="tel" value={form.client_phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, client_phone: e.target.value }))} />
                  </div>
                </div>
              </section>
              <section className="admin-bkd-section">
                <h3 className="admin-bkd-section-title">Event date &amp; slot</h3>
                <p className="admin-bkd-hint" style={{ marginTop: 0 }}>
                  <strong>Full venue (whole day)</strong> below = no time band — same as ticking whole venue on{" "}
                  <Link href="/admin/bookings/new" className="admin-link">
                    Create booking
                  </Link>
                  . Stored as empty <code style={{ fontSize: "0.85em" }}>event_slot_key</code> in the database.
                </p>
                <div className="admin-form-grid admin-bkd-grid admin-bkd-edit-event-grid">
                  <div className="admin-form-group">
                    <label>Event date *</label>
                    <input
                      type="date"
                      required
                      min={minEventDateForInput}
                      value={form.event_date ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Time slot or full venue</label>
                    <select
                      className="admin-bkd-slot-select"
                      value={form.event_slot_key == null || form.event_slot_key === "" ? "" : form.event_slot_key}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          event_slot_key: e.target.value === "" ? null : e.target.value,
                        }))
                      }
                    >
                      <option value="">Full venue (whole day)</option>
                      {slotDefs.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}{s.timeLabel ? ` · ${s.timeLabel}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group admin-form-full">
                    <label>Event type</label>
                    <input value={form.event_type ?? ""} onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))} placeholder="Wedding, corporate…" />
                  </div>
                  {form.event_date ? (
                    <div className="admin-form-group admin-form-full">
                      <AdminDateAvailabilityAdvisory
                        date={form.event_date}
                        excludeBookingId={id}
                        selectedSlotKey={form.event_slot_key}
                        thisBookingHolds={thisBookingHolds}
                      />
                    </div>
                  ) : null}
                  <div className="admin-form-group admin-form-full">
                    <label>Package (catalog)</label>
                    <select
                      value={form.package_id ?? ""}
                      onChange={(e) => {
                        const pid = e.target.value || undefined;
                        const pkg = packagesList.find((p) => p.id === pid);
                        setForm((f) => ({
                          ...f,
                          package_id: pid,
                          package_name: pkg?.name ?? (pid ? f.package_name : "") ?? "",
                        }));
                        if (pkg?.base_price_cents != null && pkg.base_price_cents >= 0) {
                          setTotalPounds(centsToPoundsInput(pkg.base_price_cents));
                        }
                        if (pid && pkg) {
                          adminFetch(`/api/admin/packages/${pid}`)
                            .then((r) => (r.ok ? r.json() : null))
                            .then((detail: PackageDetail | null) => setPackageDetail(detail));
                        } else {
                          setPackageDetail(null);
                        }
                      }}
                    >
                      <option value="">— None / type below</option>
                      {packagesList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.base_price_cents != null ? ` (£${(p.base_price_cents / 100).toFixed(2)})` : ""}
                        </option>
                      ))}
                    </select>
                    <p className="admin-bkd-hint" style={{ marginTop: "0.35rem" }}>
                      Choosing a package sets the <strong>total</strong> to the package price (you can edit before save). Save to apply.
                    </p>
                  </div>
                  <div className="admin-form-group admin-form-full">
                    <label>Package name (if no catalog link)</label>
                    <input value={form.package_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, package_name: e.target.value }))} placeholder="e.g. Full hire" />
                  </div>
                  <div className="admin-form-group admin-form-full">
                    <label>Extras / add-ons</label>
                    <textarea
                      rows={3}
                      value={form.extras ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, extras: e.target.value }))}
                      placeholder="e.g. Extra hour £200, Cake stand, Late finish"
                    />
                  </div>
                  <div className="admin-form-group admin-form-full">
                    <label>Status</label>
                    <div className="admin-bkd-statuses">
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={form.status === s ? "admin-bkd-status admin-bkd-status--on" : "admin-bkd-status"}
                          onClick={() => setForm((f) => ({ ...f, status: s }))}
                        >
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
              <section className="admin-bkd-section">
                <h3 className="admin-bkd-section-title">Figures (£)</h3>
                <p className="admin-bkd-hint">Enter amounts in pounds (e.g. 12500.50). Leave blank if unknown.</p>
                <div className="admin-form-grid admin-bkd-grid">
                  <div className="admin-form-group">
                    <label>Total</label>
                    <div className="admin-bkd-pound">
                      <span className="admin-bkd-pound-prefix">£</span>
                      <input inputMode="decimal" value={totalPounds} onChange={(e) => setTotalPounds(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                  <div className="admin-form-group">
                    <label>Deposit</label>
                    <div className="admin-bkd-pound">
                      <span className="admin-bkd-pound-prefix">£</span>
                      <input inputMode="decimal" value={depositPounds} onChange={(e) => setDepositPounds(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                  <div className="admin-form-group">
                    <label>Balance due</label>
                    <div className="admin-bkd-pound">
                      <span className="admin-bkd-pound-prefix">£</span>
                      <input inputMode="decimal" value={balancePounds} onChange={(e) => setBalancePounds(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                </div>
              </section>
              <section className="admin-bkd-section">
                <h3 className="admin-bkd-section-title">Notes</h3>
                <div className="admin-form-group">
                  <label>Special requirements</label>
                  <textarea rows={3} value={form.special_requirements ?? ""} onChange={(e) => setForm((f) => ({ ...f, special_requirements: e.target.value }))} placeholder="Catering, access, timings…" />
                </div>
                <div className="admin-form-group">
                  <label>Internal notes</label>
                  <textarea rows={3} value={form.notes ?? ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </section>
              <div className="admin-inv-modal-actions admin-bkd-actions">
                <button type="button" className="admin-btn admin-btn-danger" onClick={handleDelete}>
                  Delete booking
                </button>
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {exportOpen && (
        <div className="admin-bko-export-backdrop admin-bko-export-backdrop--wide" role="dialog" aria-modal aria-labelledby="export-title">
          <div className="admin-bko-export-modal admin-bko-export-modal--wide">
            <div className="admin-bko-export-head">
              <h2 id="export-title">Export booking PDF</h2>
              <button type="button" className="admin-inv-modal-x" onClick={() => setExportOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <p className="admin-bko-export-desc">
              Print-ready dossier: your <strong>business details</strong> (from Settings → Business &amp; bank) appear on page 1 with address, phone, email and bank block when configured. Choose sections below — uncheck internal-only content if the PDF is for the client.
            </p>
            <div className="admin-bko-export-actions-bar">
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-btn-sm"
                onClick={() => setExportSections({ ...DEFAULT_EXPORT })}
              >
                Select all
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-btn-sm"
                onClick={() =>
                  setExportSections({
                    client: false,
                    event: false,
                    money: false,
                    notes: false,
                    wedding: false,
                    payments: false,
                    tasks: false,
                    vendors: false,
                    documents: false,
                    comms: false,
                    record: false,
                  })
                }
              >
                Clear all
              </button>
            </div>
            <ul className="admin-bko-export-list">
              {EXPORT_LABELS.map(({ key, label, hint }) => (
                <li key={key}>
                  <label className="admin-bko-export-item">
                    <input
                      type="checkbox"
                      checked={exportSections[key]}
                      onChange={(e) => setExportSections((s) => ({ ...s, [key]: e.target.checked }))}
                    />
                    <span className="admin-bko-export-label">{label}</span>
                    <span className="admin-bko-export-hint">{hint}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="admin-inv-modal-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setExportOpen(false)}>
                Cancel
              </button>
              <button type="button" className="admin-btn admin-btn-primary" disabled={exporting} onClick={downloadExportPdf}>
                {exporting ? "Generating…" : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
