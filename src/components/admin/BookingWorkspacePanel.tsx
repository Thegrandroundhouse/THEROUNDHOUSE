"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { adminFetch } from "@/lib/admin-api-client";
import { labelForVendorType } from "@/lib/vendor-types";
import { useAdminDialog } from "@/components/admin/AdminDialogContext";
import Link from "next/link";

type Workspace = {
  wedding: Record<string, unknown> | null;
  milestones: { id?: string; label: string; amount_cents: number | null; due_date: string | null; status: string }[];
  tasks: { id: string; title: string; done: boolean; due_date: string | null; workflow_key: string | null }[];
  documents: { id: string; name: string; doc_type: string | null; file_url: string | null; custom_fields?: Record<string, unknown> }[];
  communications: { id: string; channel: string; body: string; sent_at: string }[];
  bookingVendors: { vendor_id: string; role: string | null; vendors: { id: string; name: string; vendor_type: string } | null }[];
  spaces: { id: string; name: string; slug: string }[];
};

export type WorkspaceTab = "overview" | "wedding" | "payments" | "agreements" | "tasks" | "vendors" | "docs" | "comms";

export function BookingWorkspacePanel({
  bookingId,
  overviewSlot,
  agreementsSlot,
}: {
  bookingId: string;
  overviewSlot?: React.ReactNode;
  agreementsSlot?: React.ReactNode;
}) {
  const { confirm } = useAdminDialog();
  const [ws, setWs] = useState<Workspace | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>(overviewSlot ? "overview" : "wedding");
  const [vendorsList, setVendorsList] = useState<{ id: string; name: string; vendor_type: string }[]>([]);
  const [workspaceFlash, setWorkspaceFlash] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFlash = useCallback((type: "ok" | "err", msg: string) => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setWorkspaceFlash({ type, msg });
    const ms = type === "ok" ? 3500 : 6000;
    flashTimer.current = setTimeout(() => setWorkspaceFlash(null), ms);
  }, []);

  const load = () => {
    adminFetch(`/api/admin/bookings/${bookingId}/workspace`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Workspace unavailable — run migration 015"))))
      .then(setWs)
      .catch((e) => setErr(e.message))
      .finally(() => {});
  };

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  useEffect(() => {
    load();
    adminFetch("/api/admin/vendors?limit=500")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => {
        const x = d as { rows?: { id: string; name: string; vendor_type: string }[] } | { id: string; name: string; vendor_type: string }[];
        const list = Array.isArray(x) ? x : x.rows || [];
        setVendorsList(list.filter((v): v is { id: string; name: string; vendor_type: string } => Boolean(v?.id)));
      });
  }, [bookingId]);

  const patch = async (body: object, successMsg: string) => {
    const res = await adminFetch(`/api/admin/bookings/${bookingId}/workspace`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showFlash("err", typeof data.error === "string" ? data.error : "Couldn’t save — try again.");
      return false;
    }
    setWs(data);
    showFlash("ok", successMsg);
    return true;
  };

  const TAB_LABELS: Record<WorkspaceTab, string> = {
    overview: "1 · Summary",
    wedding: "2 · Event details",
    agreements: "3 · Contracts",
    payments: "4 · Payments",
    tasks: "5 · Tasks",
    vendors: "6 · Vendors",
    docs: "7 · Documents",
    comms: "8 · Comms",
  };
  const TABS: WorkspaceTab[] = overviewSlot
    ? ["overview", "wedding", "agreements", "payments", "tasks", "vendors", "docs", "comms"]
    : ["wedding", "agreements", "payments", "tasks", "vendors", "docs", "comms"];

  if (err) {
    return (
      <section className="admin-bws admin-bws--error" aria-label="Workspace">
        <p className="admin-bws-error-text">{err}</p>
        <p className="admin-bws-error-hint">
          Apply <code>015_venue_crm_modules.sql</code> in Supabase, then refresh.
        </p>
      </section>
    );
  }
  if (!ws) {
    return (
      <section className="admin-bws admin-bws--loading" aria-busy>
        <div className="admin-bws-loading-bar" />
        <p className="admin-bws-loading-label">Loading workspace…</p>
      </section>
    );
  }

  const w = ws.wedding || {};
  return (
    <section className="admin-bws" aria-label="Booking workspace">
      <div className="admin-bws-head">
        <h2 className="admin-bws-title">Booking workspace</h2>
        <p className="admin-bws-sub">Follow the tabs left to right — summary, event, contract, payments, then ops.</p>
      </div>
      <div className="admin-bws-tabs" role="tablist" aria-label="Workspace sections">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "admin-bws-tab admin-bws-tab--on" : "admin-bws-tab"}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>
      <div className="admin-bws-body" role="tabpanel">
      {workspaceFlash && (
        <div
          className={workspaceFlash.type === "ok" ? "admin-bws-flash admin-bws-flash--ok" : "admin-bws-flash admin-bws-flash--err"}
          role="status"
          aria-live="polite"
        >
          {workspaceFlash.type === "ok" ? "✓ " : ""}
          {workspaceFlash.msg}
        </div>
      )}
      {tab === "overview" && overviewSlot && <div className="admin-bws-overview">{overviewSlot}</div>}
      {tab === "wedding" && (
        <div className="admin-bws-tab-inner">
          <p className="admin-bws-lead">Guest count, event space, menu, decor, seating and timeline.</p>
          <div className="admin-bws-card">
            <div className="admin-form admin-form-grid admin-bws-form-grid">
              <div className="admin-form-group">
                <label>Guest count</label>
                <input type="number" defaultValue={(w.guest_count as number) ?? ""} id="wed-guests" />
              </div>
              <div className="admin-form-group admin-form-full">
                <label>Event space</label>
                <select defaultValue="" id="wed-space">
                  <option value="">— Venue-wide / TBD</option>
                  {ws.spaces.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="admin-form-group admin-form-full">
                <label>Menu selection</label>
                <textarea defaultValue={(w.menu_selection as string) ?? ""} id="wed-menu" rows={2} />
              </div>
              <div className="admin-form-group admin-form-full">
                <label>Decoration preferences</label>
                <textarea defaultValue={(w.decoration_preferences as string) ?? ""} id="wed-decor" rows={2} />
              </div>
              <div className="admin-form-group admin-form-full">
                <label>Seating notes</label>
                <textarea defaultValue={(w.seating_notes as string) ?? ""} id="wed-seat" rows={2} />
              </div>
              <div className="admin-form-group admin-form-full">
                <label>Timeline (HH:MM — activity, one per line)</label>
                <textarea
                  defaultValue={Array.isArray(w.timeline) ? (w.timeline as { time?: string; label?: string }[]).map((x) => `${x.time || ""} ${x.label || ""}`).join("\n") : ""}
                  id="wed-timeline"
                  rows={4}
                  placeholder="14:00 — Ceremony&#10;16:00 — Reception"
                />
              </div>
            </div>
            <div className="admin-bws-card-actions">
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => {
                  const timelineRaw = (document.getElementById("wed-timeline") as HTMLTextAreaElement).value.split("\n").filter(Boolean).map((line) => {
                    const [time, ...rest] = line.split(/[—\-]/);
                    return { time: time?.trim(), label: rest.join("—").trim() || line };
                  });
                  patch(
                    {
                      wedding: {
                        guest_count: parseInt((document.getElementById("wed-guests") as HTMLInputElement).value, 10) || null,
                        menu_selection: (document.getElementById("wed-menu") as HTMLTextAreaElement).value || null,
                        decoration_preferences: (document.getElementById("wed-decor") as HTMLTextAreaElement).value || null,
                        seating_notes: (document.getElementById("wed-seat") as HTMLTextAreaElement).value || null,
                        timeline: timelineRaw,
                      },
                      space_id: (document.getElementById("wed-space") as HTMLSelectElement).value || null,
                    },
                    "Wedding details saved.",
                  );
                }}
              >
                Save wedding details
              </button>
            </div>
          </div>
        </div>
      )}
      {tab === "payments" && (
        <div className="admin-bws-tab-inner">
          <p className="admin-bws-lead">
            Hire contract instalments (4×25% by default) — same labels as the contract PDF. Amounts in pounds.
          </p>
          <div className="admin-bws-card">
            <div className="admin-bws-milestones">
              {(
                ws.milestones.length > 0
                  ? ws.milestones
                  : [
                      { label: "On Booking Confirmation", amount_cents: null, due_date: null, status: "pending" },
                      { label: "6 months before function", amount_cents: null, due_date: null, status: "pending" },
                      { label: "4 months before function", amount_cents: null, due_date: null, status: "pending" },
                      { label: "2 months before function", amount_cents: null, due_date: null, status: "pending" },
                    ]
              ).map((m, i) => (
                <div key={m.label + i} className="admin-bws-milestone-row">
                  <div className="admin-form-group admin-bws-milestone-label">
                    <label>Label</label>
                    <input
                      type="text"
                      defaultValue={m.label}
                      id={`mil-label-${i}`}
                    />
                  </div>
                  <div className="admin-form-group admin-bws-milestone-amt">
                    <label>Amount (£)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      defaultValue={m.amount_cents != null ? (m.amount_cents / 100).toFixed(2) : ""}
                      id={`mil-amt-${i}`}
                    />
                  </div>
                  <div className="admin-form-group admin-bws-milestone-due">
                    <label>Due date</label>
                    <input type="date" defaultValue={m.due_date?.slice(0, 10) ?? ""} id={`mil-due-${i}`} />
                  </div>
                  <input type="hidden" id={`mil-status-${i}`} defaultValue={m.status || "pending"} />
                </div>
              ))}
            </div>
            <div className="admin-bws-card-actions">
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => {
                  const rowCount = document.querySelectorAll(".admin-bws-milestone-row").length;
                  const milestones = Array.from({ length: rowCount }, (_, i) => {
                    const amtStr = (document.getElementById(`mil-amt-${i}`) as HTMLInputElement).value.trim();
                    const amt = amtStr ? Math.round(parseFloat(amtStr.replace(/[^0-9.]/g, "")) * 100) : null;
                    return {
                      label: (document.getElementById(`mil-label-${i}`) as HTMLInputElement).value,
                      amount_cents: amt != null && !Number.isNaN(amt) ? amt : null,
                      due_date: (document.getElementById(`mil-due-${i}`) as HTMLInputElement).value || null,
                      status: (document.getElementById(`mil-status-${i}`) as HTMLInputElement).value || "pending",
                    };
                  });
                  patch({ milestones }, "Payment schedule saved.");
                }}
              >
                Save payment schedule
              </button>
            </div>
          </div>
        </div>
      )}
      {tab === "agreements" && agreementsSlot ? (
        <div className="admin-bws-tab-inner admin-bws-tab-inner--agreements">{agreementsSlot}</div>
      ) : null}
      {tab === "tasks" && (
        <div className="admin-bws-tab-inner">
          <div className="admin-bws-card">
            <h3 className="admin-bws-section-title">Checklist</h3>
            <ul className="admin-bws-task-list">
              {ws.tasks.map((t) => (
                <li key={t.id} className="admin-bws-task-item">
                  <label className="admin-bws-task-check">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => patch({ updateTask: { id: t.id, title: t.title, done: !t.done, due_date: t.due_date } }, "Task updated.")}
                    />
                    <span className={t.done ? "admin-bws-task-title admin-bws-task-title--done" : "admin-bws-task-title"}>{t.title}</span>
                  </label>
                  <button
                    type="button"
                    className="admin-btn admin-btn-sm admin-btn-ghost admin-bws-task-del"
                    onClick={() => patch({ deleteTaskId: t.id }, "Task removed.")}
                    aria-label="Remove task"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="admin-bws-task-add">
              <input placeholder="New task title…" id="new-task-title" className="admin-bws-task-input" />
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => {
                  const el = document.getElementById("new-task-title") as HTMLInputElement;
                  const title = el?.value?.trim();
                  if (!title) return;
                  patch({ newTask: { title } }, "Task added.");
                  if (el) el.value = "";
                }}
              >
                Add task
              </button>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-bws-workflow-btn"
              onClick={() => patch({ newTask: { title: "Send contract", workflow_key: "send_contract" } }, "Task added.")}
            >
              + Add workflow: Send contract
            </button>
          </div>
        </div>
      )}
      {tab === "vendors" && (
        <div className="admin-bws-tab-inner">
          <div className="admin-bws-vendors-actions">
            <Link href="/admin/vendors" className="admin-btn admin-btn-ghost admin-bws-vendor-dir-link">
              Vendor directory →
            </Link>
          </div>
          <div className="admin-bws-card">
            <h3 className="admin-bws-section-title">Linked to this booking</h3>
            {ws.bookingVendors.length === 0 ? (
              <p className="admin-bws-empty-msg">No vendors linked yet. Use the form below to link one.</p>
            ) : (
              <ul className="admin-bws-vendor-list">
                {ws.bookingVendors.map((bv) => (
                  <li key={bv.vendor_id} className="admin-bws-vendor-item">
                    <span className="admin-bws-vendor-name">{bv.vendors?.name ?? "Unknown"}</span>
                    {bv.vendors?.vendor_type ? <span className="admin-bws-vendor-type">{bv.vendors.vendor_type}</span> : null}
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm admin-btn-ghost"
                      onClick={() => patch({ unlinkVendorId: bv.vendor_id }, "Vendor unlinked.")}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="admin-bws-card">
            <h3 className="admin-bws-section-title">Link a vendor</h3>
            <div className="admin-bws-link-vendor-row">
              <select id="link-vendor" className="admin-bws-vendor-select" aria-label="Choose vendor">
                <option value="">— Choose a vendor —</option>
                {vendorsList.map((v) => (
                  <option key={v.id} value={v.id}>
                    {labelForVendorType(v.vendor_type)}: {v.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => {
                  const vendorId = (document.getElementById("link-vendor") as HTMLSelectElement).value;
                  if (!vendorId) {
                    showFlash("err", "Choose a vendor from the list first.");
                    return;
                  }
                  patch({ linkVendor: { vendor_id: vendorId } }, "Vendor linked.");
                }}
              >
                Link vendor
              </button>
            </div>
          </div>
        </div>
      )}
      {tab === "docs" && (
        <div className="admin-bws-tab-inner admin-bws-docs">
          <div className="admin-bws-card">
            <h3 className="admin-bws-section-title">Documents</h3>
            {ws.documents.length === 0 ? (
              <p className="admin-bws-empty-msg">No documents yet. Attach a file or add a link below.</p>
            ) : (
              <ul className="admin-bws-docs-list">
                {ws.documents.map((d) => (
                  <li key={d.id} className="admin-bws-doc-item">
                    <div className="admin-bws-doc-head">
                      <span className="admin-bws-doc-name">{d.name}</span>
                      {d.doc_type ? <span className="admin-bws-doc-type">{d.doc_type}</span> : null}
                      <div className="admin-bws-doc-actions">
                        {d.file_url ? (
                          <a href={d.file_url} className="admin-btn admin-btn-sm admin-btn-primary" target="_blank" rel="noreferrer">View</a>
                        ) : (
                          <span className="admin-bws-doc-no-file">Link only</span>
                        )}
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm admin-btn-ghost"
                          onClick={async () => {
                            if (await confirm("Delete this document?")) patch({ deleteDocId: d.id }, "Document removed.");
                          }}
                          aria-label="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {d.custom_fields && Object.keys(d.custom_fields).length > 0 ? (
                      <dl className="admin-bws-doc-custom">
                        {Object.entries(d.custom_fields).map(([k, v]) => (
                          <span key={k} className="admin-bws-doc-custom-row"><dt>{k}</dt><dd>{String(v)}</dd></span>
                        ))}
                      </dl>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="admin-bws-card">
            <h3 className="admin-bws-section-title">Attach document</h3>
            <p className="admin-bws-lead admin-bws-lead--compact">Upload a file (PDF, Word, Excel, images). Max 20MB.</p>
            <div className="admin-bws-doc-upload-row">
              <input
                type="file"
                id="doc-file"
                className="admin-bws-doc-file-input"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
                aria-label="Choose file"
              />
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={async () => {
                  const input = document.getElementById("doc-file") as HTMLInputElement;
                  const file = input?.files?.[0];
                  if (!file) {
                    showFlash("err", "Choose a file to upload first.");
                    return;
                  }
                  const form = new FormData();
                  form.set("file", file);
                  try {
                    const res = await adminFetch(`/api/admin/bookings/${bookingId}/upload-doc`, { method: "POST", body: form });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Upload failed");
                    await patch(
                      { newDoc: { name: data.name || file.name, file_url: data.file_url, doc_type: "Attachment", custom_fields: {} } },
                      "Document uploaded and added.",
                    );
                    input.value = "";
                  } catch (e) {
                    showFlash("err", e instanceof Error ? e.message : "Upload failed.");
                  }
                }}
              >
                Upload &amp; add
              </button>
            </div>
          </div>
          <div className="admin-bws-card">
            <h3 className="admin-bws-section-title">Add by URL / link</h3>
            <p className="admin-bws-lead admin-bws-lead--compact">Add a document record with a link. Optionally set type and custom fields (e.g. Signed: Yes).</p>
            <div className="admin-bws-form-grid">
              <div className="admin-form-group admin-form-full">
                <label>Document name</label>
                <input placeholder="e.g. Contract signed" id="doc-name" />
              </div>
              <div className="admin-form-group admin-form-full">
                <label>URL</label>
                <input type="url" placeholder="https://…" id="doc-url" />
              </div>
              <div className="admin-form-group">
                <label>Type</label>
                <select id="doc-type">
                  <option value="">—</option>
                  <option value="Contract">Contract</option>
                  <option value="Invoice">Invoice</option>
                  <option value="Certificate">Certificate</option>
                  <option value="Photo">Photo</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="admin-form-group admin-form-full">
                <label>Custom fields (optional)</label>
                <input placeholder="Signed: Yes, Version: 1.0" id="doc-custom-raw" />
                <span className="admin-bws-docs-custom-hint">Key: value, comma or newline separated</span>
              </div>
            </div>
            <div className="admin-bws-card-actions">
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={() => {
                  const name = (document.getElementById("doc-name") as HTMLInputElement).value.trim();
                  if (!name) {
                    showFlash("err", "Enter a document name.");
                    return;
                  }
                  const url = (document.getElementById("doc-url") as HTMLInputElement).value.trim();
                  const docType = (document.getElementById("doc-type") as HTMLSelectElement).value || null;
                  const raw = (document.getElementById("doc-custom-raw") as HTMLInputElement).value.trim();
                  const custom_fields: Record<string, string> = {};
                  if (raw) {
                    raw.split(/[\n,]+/).forEach((part) => {
                      const m = part.trim().match(/^([^:]+):\s*(.*)$/);
                      if (m) custom_fields[m[1].trim()] = m[2].trim();
                    });
                  }
                  patch({ newDoc: { name, file_url: url || null, doc_type: docType, custom_fields } }, "Document record added.");
                  (document.getElementById("doc-name") as HTMLInputElement).value = "";
                  (document.getElementById("doc-url") as HTMLInputElement).value = "";
                  (document.getElementById("doc-type") as HTMLSelectElement).value = "";
                  (document.getElementById("doc-custom-raw") as HTMLInputElement).value = "";
                }}
              >
                Add document record
              </button>
            </div>
          </div>
        </div>
      )}
      {tab === "comms" && (
        <div className="admin-bws-tab-inner">
          <div className="admin-bws-card">
            <h3 className="admin-bws-section-title">Log communication</h3>
            <p className="admin-bws-lead admin-bws-lead--compact">Record an email, call or note for this booking.</p>
            <textarea id="comm-body" rows={3} placeholder="e.g. Sent contract via email. Client confirmed receipt." className="admin-bws-comms-textarea" />
            <div className="admin-bws-card-actions">
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => {
                  const el = document.getElementById("comm-body") as HTMLTextAreaElement;
                  const body = el?.value?.trim();
                  if (!body) return;
                  patch({ newComm: { body, channel: "note" } }, "Communication logged.");
                  if (el) el.value = "";
                }}
              >
                Log communication
              </button>
            </div>
          </div>
          <h3 className="admin-bws-section-title admin-bws-section-title--list">Recent</h3>
          <ul className="admin-bws-comms-list">
            {ws.communications.length === 0 ? (
              <li className="admin-bws-empty-msg">No communications logged yet.</li>
            ) : (
              ws.communications.map((c) => (
                <li key={c.id} className="admin-bws-comms-item">
                  <span className="admin-bws-comms-meta">{new Date(c.sent_at).toLocaleString()} · {c.channel}</span>
                  <p className="admin-bws-comms-body">{c.body?.slice(0, 300)}{(c.body?.length ?? 0) > 300 ? "…" : ""}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
      </div>
    </section>
  );
}
