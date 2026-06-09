"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Booking, BookingStatus } from "@/types/crm";
import { adminFetch, parseAdminError } from "@/lib/admin-api-client";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import { BookingQuickEditPanel, openBookingQuickEdit } from "@/components/admin/BookingQuickEditPanel";
import { BookingWorkspacePanel } from "@/components/admin/BookingWorkspacePanel";
import { SetReminderModal } from "@/components/admin/SetReminderModal";
import { AgreementGeneratePanel } from "@/components/admin/AgreementGeneratePanel";
import { BookingSummaryOverview } from "@/components/admin/BookingSummaryOverview";
import { defaultInstalmentCents } from "@/lib/booking-payment-setup";
import { AgreementPdfPreviewModal, useAgreementPdfPreview } from "@/components/admin/AgreementPdfPreviewModal";
import { parseContractData } from "@/lib/build-banqueting-contract";
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
  const [exportSections, setExportSections] = useState<ExportSections>({ ...DEFAULT_EXPORT });
  const [exporting, setExporting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [bookingInvoices, setBookingInvoices] = useState<{ id: string; invoice_number: string; status: string; amount_cents: number }[]>([]);
  const [packageDetail, setPackageDetail] = useState<PackageDetail | null>(null);
  const [paymentsSummary, setPaymentsSummary] = useState<PaymentsSummary | null>(null);
  const [milestoneDraft, setMilestoneDraft] = useState<Record<string, string>>({});
  const [milestoneLabel, setMilestoneLabel] = useState<Record<string, string>>({});
  const [milestoneAmt, setMilestoneAmt] = useState<Record<string, string>>({});
  const [milestoneDue, setMilestoneDue] = useState<Record<string, string>>({});
  const [milestoneUpdating, setMilestoneUpdating] = useState<string | null>(null);
  const [setupPaymentsLoading, setSetupPaymentsLoading] = useState(false);
  const [packagesList, setPackagesList] = useState<{ id: string; name: string; base_price_cents: number | null }[]>([]);
  const [slotDefs, setSlotDefs] = useState<{ key: string; label: string; timeLabel: string }[]>([]);
  const [agreementTemplates, setAgreementTemplates] = useState<{ id: string; name: string; slug: string; is_preferred: boolean }[]>([]);
  const [bookingAgreements, setBookingAgreements] = useState<
    {
      id: string;
      title: string | null;
      rendered_body: string;
      custom_values?: unknown;
      client_signed_at: string | null;
      venue_signed_at: string | null;
      created_at?: string;
    }[]
  >([]);
  const [agreementsMigration, setAgreementsMigration] = useState(false);
  const [signSaving, setSignSaving] = useState<string | null>(null);
  const agreementPreview = useAgreementPdfPreview();

  const loadPayments = useCallback(() => {
    adminFetch(`/api/admin/payments/booking/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { totals?: PaymentsSummary["totals"]; milestones?: PaymentsSummary["milestones"] } | null) => {
        if (d?.totals) {
          setPaymentsSummary({ totals: d.totals, milestones: d.milestones ?? [] });
          const next: Record<string, string> = {};
          const lb: Record<string, string> = {};
          const am: Record<string, string> = {};
          const du: Record<string, string> = {};
          for (const m of d.milestones ?? []) {
            next[m.id] = m.status;
            lb[m.id] = m.label;
            am[m.id] =
              m.amount_cents != null && Number.isFinite(m.amount_cents) ? (m.amount_cents / 100).toFixed(2) : "";
            du[m.id] = m.due_date || "";
          }
          setMilestoneDraft(next);
          setMilestoneLabel(lb);
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

  const saveMilestoneRow = async (
    m: PaymentsSummary["milestones"][0]
  ): Promise<{ ok: true; message: string } | { ok: false; message: string }> => {
    const status = milestoneDraft[m.id] ?? m.status;
    const label = (milestoneLabel[m.id] ?? m.label).trim();
    if (!label) {
      return { ok: false, message: "Enter a label for this instalment." };
    }
    const curA = milestoneAmt[m.id]?.trim() || "";
    const amt_cents = curA ? Math.round(parseFloat(curA.replace(/[^0-9.]/g, "")) * 100) : null;
    if (curA && (amt_cents == null || Number.isNaN(amt_cents) || amt_cents < 0)) {
      return { ok: false, message: "Enter a valid amount in pounds, or leave blank." };
    }
    const due = milestoneDue[m.id]?.trim() || null;
    setMilestoneUpdating(m.id);
    try {
      const r = await adminFetch(`/api/admin/payment-milestones/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, label, amount_cents: amt_cents, due_date: due }),
      });
      if (!r.ok) {
        return { ok: false, message: await parseAdminError(r, "Couldn’t save this instalment") };
      }
      loadPayments();
      loadWorkspace();
      return { ok: true, message: "Instalment saved." };
    } finally {
      setMilestoneUpdating(null);
    }
  };

  const markMilestonePaid = async (
    m: PaymentsSummary["milestones"][0]
  ): Promise<{ ok: true; message: string } | { ok: false; message: string }> => {
    setMilestoneUpdating(m.id);
    try {
      const r = await adminFetch(`/api/admin/payment-milestones/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      if (!r.ok) {
        return { ok: false, message: await parseAdminError(r, "Couldn’t mark as paid") };
      }
      setMilestoneDraft((d) => ({ ...d, [m.id]: "paid" }));
      loadPayments();
      loadWorkspace();
      return { ok: true, message: "Marked as paid." };
    } finally {
      setMilestoneUpdating(null);
    }
  };

  const setupPaymentsSchedule = async () => {
    setSetupPaymentsLoading(true);
    try {
      const r = await adminFetch(`/api/admin/bookings/${id}/setup-payments`, { method: "POST" });
      if (!r.ok) throw new Error(await parseAdminError(r, "Couldn’t create payment schedule"));
      loadPayments();
      loadWorkspace();
    } catch (e) {
      await alert(e instanceof Error ? e.message : "Couldn’t create payment schedule");
    } finally {
      setSetupPaymentsLoading(false);
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
    adminFetch("/api/admin/agreement-templates")
      .then((r) => r.json())
      .then((d: { rows?: { id: string; name: string; slug: string; is_preferred: boolean }[]; needsMigration?: boolean }) => {
        if (d.needsMigration) setAgreementsMigration(true);
        setAgreementTemplates(d.rows || []);
      })
      .catch(() => setAgreementTemplates([]));
    adminFetch(`/api/admin/bookings/${id}/agreements`)
      .then((r) => r.json())
      .then((d: { rows?: typeof bookingAgreements; needsMigration?: boolean }) => {
        if (d.needsMigration) setAgreementsMigration(true);
        setBookingAgreements(d.rows || []);
      })
      .catch(() => setBookingAgreements([]));
  }, [id, loadWorkspace, loadPayments]);

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

  const instalmentCents = useMemo(() => {
    if (!booking) return null;
    return defaultInstalmentCents({
      total_cents: booking.total_cents,
      deposit_cents: booking.deposit_cents,
      balance_cents: booking.balance_cents,
    });
  }, [booking?.total_cents, booking?.deposit_cents, booking?.balance_cents]);

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
        if (!res.ok) throw new Error(await parseAdminError(res, "Couldn’t update status"));
        const data = (await res.json()) as Booking;
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
      if (!res.ok) throw new Error(await parseAdminError(res, "Couldn’t save booking"));
      const data = (await res.json()) as Booking;
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
      if (!res.ok) throw new Error(await parseAdminError(res, "Couldn’t delete booking"));
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
        await alert(await parseAdminError(res, "Export failed"));
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

  const fetchAgreementPdfBlob = async (agreementId: string): Promise<Blob | null> => {
    const res = await adminFetch(`/api/admin/bookings/${id}/agreements/${agreementId}/pdf`);
    if (!res.ok) {
      await alert(await parseAdminError(res, "PDF failed"));
      return null;
    }
    return res.blob();
  };

  type AgreementRow = (typeof bookingAgreements)[0];

  function agreementPrintChecklist(a: AgreementRow): string {
    const contract = parseContractData(a.custom_values);
    const lines: string[] = [`${a.title || "Agreement"}`, ""];
    if (contract) {
      lines.push("PDF contents:");
      lines.push("• Page 1 — Client, event details & contract sum");
      if (contract.sections.includes) lines.push("• Page 2 — What’s included (+ table linen if enabled)");
      if (contract.sections.additional_options) lines.push("• Page 3 — Additional options & hourly rates");
      if (contract.sections.payment_terms) lines.push("• Page 4 — Payment schedule, bank details & acceptance");
      if (contract.include_terms) {
        lines.push("• Appendix — Full Terms & Conditions (all sections)");
      } else {
        lines.push("• Terms & Conditions — NOT included in this PDF");
        lines.push("  → Generate or attach the separate T&C document if required.");
      }
    } else {
      lines.push("PDF contents: merged text agreement from template.");
    }
    lines.push("");
    lines.push(`Client signed: ${a.client_signed_at ? "Yes" : "Not ticked yet"}`);
    lines.push(`Venue signed: ${a.venue_signed_at ? "Yes" : "Not ticked yet"}`);
    lines.push("");
    lines.push("Opens the full-colour PDF in a new tab, then your browser print dialog.");
    return lines.join("\n");
  }

  const toggleAgreementSigned = async (agreementId: string, field: "client" | "venue", checked: boolean) => {
    const key = `${agreementId}:${field}`;
    setSignSaving(key);
    try {
      const r = await adminFetch(`/api/admin/bookings/${id}/agreements/${agreementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(field === "client" ? { client_signed: checked } : { venue_signed: checked }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        await alert(typeof data.error === "string" ? data.error : "Could not save signature status");
        return;
      }
      setBookingAgreements((prev) =>
        prev.map((x) =>
          x.id === agreementId
            ? {
                ...x,
                client_signed_at: (data.client_signed_at as string | null) ?? null,
                venue_signed_at: (data.venue_signed_at as string | null) ?? null,
              }
            : x,
        ),
      );
    } finally {
      setSignSaving(null);
    }
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

  const previewAgreementPdf = async (a: AgreementRow) => {
    agreementPreview.startLoading(a.title || "Agreement");
    try {
      const blob = await fetchAgreementPdfBlob(a.id);
      if (!blob) {
        agreementPreview.close();
        return;
      }
      agreementPreview.showBlob(blob, a.title || "Agreement", () => downloadAgreementPdf(a.id, a.title || "agreement"));
    } catch {
      agreementPreview.showError("Could not load preview");
    }
  };

  const printAgreementPdf = async (a: AgreementRow) => {
    const proceed = await confirm(agreementPrintChecklist(a), {
      title: "Print agreement",
      confirmLabel: "Open PDF & print",
    });
    if (!proceed) return;
    try {
      const blob = await fetchAgreementPdfBlob(a.id);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => {
        try {
          w?.print();
        } catch {
          /* use File → Print in the PDF tab if needed */
        }
      }, 800);
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
          <button type="button" className="admin-btn admin-btn-primary" onClick={openBookingQuickEdit}>
            Edit details
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
          <div className="admin-bkd-banner-payments">
            <div className="admin-bkd-banner-payments-top">
              <span className="admin-bkd-banner-payments-title">Payments</span>
              <span className="admin-bkd-banner-payments-totals">
                <strong>{formatPounds(paymentsSummary.totals.customer_received)}</strong> collected
                <span className="admin-bkd-banner-payments-dot">·</span>
                <strong>{formatPounds(paymentsSummary.totals.milestone_pending)}</strong> still due
              </span>
              <Link href={`/admin/payments/booking/${id}`} className="admin-bkd-banner-payments-link">
                Ledger →
              </Link>
            </div>
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

      <BookingQuickEditPanel
        bookingId={id}
        form={form}
        setForm={setForm}
        totalPounds={totalPounds}
        setTotalPounds={setTotalPounds}
        depositPounds={depositPounds}
        setDepositPounds={setDepositPounds}
        balancePounds={balancePounds}
        setBalancePounds={setBalancePounds}
        packagesList={packagesList}
        slotDefs={slotDefs}
        minEventDateForInput={minEventDateForInput}
        thisBookingHolds={thisBookingHolds}
        onPackageSelect={(rawId) => {
          const pid = rawId || undefined;
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
        onSave={handleSave}
        saving={saving}
        eventDateLabel={eventDateLabel}
      />

      <BookingWorkspacePanel
        bookingId={id}
        overviewSlot={
          <BookingSummaryOverview
            bookingId={id}
            booking={booking}
            form={form}
            thisBookingHolds={thisBookingHolds}
            totalPounds={totalPounds}
            depositPounds={depositPounds}
            balancePounds={balancePounds}
            poundsInputToCents={poundsInputToCents}
            paymentsSummary={paymentsSummary}
            instalmentCents={instalmentCents}
            milestoneDraft={milestoneDraft}
            milestoneLabel={milestoneLabel}
            milestoneAmt={milestoneAmt}
            milestoneDue={milestoneDue}
            milestoneUpdating={milestoneUpdating}
            setMilestoneDraft={setMilestoneDraft}
            setMilestoneLabel={setMilestoneLabel}
            setMilestoneAmt={setMilestoneAmt}
            setMilestoneDue={setMilestoneDue}
            saveMilestoneRow={saveMilestoneRow}
            markMilestonePaid={markMilestonePaid}
            setupPaymentsLoading={setupPaymentsLoading}
            setupPaymentsSchedule={setupPaymentsSchedule}
            onPaymentRecorded={() => {
              loadPayments();
              loadWorkspace();
            }}
            packageDetail={packageDetail}
          />
        }
        agreementsSlot={
          <div className="admin-bws-agreements-panel">
            <div className="admin-card admin-unified-layout admin-bws-agreements-card">
              <div className="admin-bws-agreements-card-head">
                <h3 className="admin-section-title" style={{ marginTop: 0 }}>
                  Contracts &amp; agreements
                </h3>
                <p className="admin-bws-lead admin-bws-lead--compact" style={{ marginBottom: 0 }}>
                  Pick a template and generate. Tick client/venue signed when collected. Hire contract and T&amp;C produce
                  official PDFs.{" "}
                  <Link href="/admin/agreements" className="admin-link">
                    Edit templates
                  </Link>
                  {agreementsMigration ? (
                    <span className="admin-bws-agreements-mig"> — run migration 039 in Supabase first.</span>
                  ) : null}
                </p>
              </div>
              {!agreementsMigration && agreementTemplates.length > 0 ? (
                <AgreementGeneratePanel
                  bookingId={id}
                  templates={agreementTemplates}
                  onGenerated={(d) => setBookingAgreements((prev) => [d as (typeof bookingAgreements)[0], ...prev])}
                />
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
                          <td>
                            <label className="admin-agreement-sign-check">
                              <input
                                type="checkbox"
                                checked={Boolean(a.client_signed_at)}
                                disabled={signSaving === `${a.id}:client`}
                                onChange={(e) => toggleAgreementSigned(a.id, "client", e.target.checked)}
                                aria-label={`Client signed — ${a.title || "Agreement"}`}
                              />
                              <span className="admin-agreement-sign-check-label">
                                {a.client_signed_at
                                  ? `Signed ${new Date(a.client_signed_at).toLocaleDateString("en-GB")}`
                                  : "Not signed"}
                              </span>
                            </label>
                          </td>
                          <td>
                            <label className="admin-agreement-sign-check">
                              <input
                                type="checkbox"
                                checked={Boolean(a.venue_signed_at)}
                                disabled={signSaving === `${a.id}:venue`}
                                onChange={(e) => toggleAgreementSigned(a.id, "venue", e.target.checked)}
                                aria-label={`Venue signed — ${a.title || "Agreement"}`}
                              />
                              <span className="admin-agreement-sign-check-label">
                                {a.venue_signed_at
                                  ? `Signed ${new Date(a.venue_signed_at).toLocaleDateString("en-GB")}`
                                  : "Not signed"}
                              </span>
                            </label>
                          </td>
                          <td className="admin-table-phone">
                            {a.created_at ? new Date(a.created_at).toLocaleDateString("en-GB") : "—"}
                          </td>
                          <td>
                            <div className="admin-bkd-agreement-actions admin-bws-agreement-actions">
                              <button
                                type="button"
                                className="admin-btn admin-btn-secondary admin-btn-sm"
                                onClick={() => previewAgreementPdf(a)}
                              >
                                Preview
                              </button>
                              <button
                                type="button"
                                className="admin-btn admin-btn-primary admin-btn-sm"
                                onClick={() => downloadAgreementPdf(a.id, a.title || "agreement")}
                              >
                                PDF
                              </button>
                              <button
                                type="button"
                                className="admin-btn admin-btn-secondary admin-btn-sm"
                                onClick={() => printAgreementPdf(a)}
                              >
                                Print
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

      <AgreementPdfPreviewModal
        open={agreementPreview.open}
        title={agreementPreview.title}
        pdfUrl={agreementPreview.pdfUrl}
        loading={agreementPreview.loading}
        error={agreementPreview.error}
        onClose={agreementPreview.close}
        onDownload={agreementPreview.onDownload}
      />
    </div>
  );
}
