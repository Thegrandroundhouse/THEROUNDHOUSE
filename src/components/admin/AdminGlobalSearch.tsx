"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-api-client";

type SearchPayload = {
  bookings: { id: string; booking_code: string | null; client_name: string | null; client_email: string; event_date: string }[];
  invoices: { id: string; invoice_number: string; status: string }[];
  staff: { id: string; email: string | null; display_name: string | null; role: string }[];
  enquiries: { id: string; name: string | null; email: string | null; event_date: string | null }[];
};

export function AdminGlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SearchPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback((query: string) => {
    const t = query.trim();
    if (t.length < 2) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    adminFetch(`/api/admin/search?q=${encodeURIComponent(t)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: SearchPayload | null) => {
        setData(d);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setData(null);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(q), 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, runSearch]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = q.trim();
    if (t.length >= 2) {
      setOpen(false);
      router.push(`/admin/bookings?q=${encodeURIComponent(t)}`);
    }
  };

  const hasResults =
    data &&
    (data.bookings.length > 0 ||
      data.invoices.length > 0 ||
      data.staff.length > 0 ||
      data.enquiries.length > 0);

  return (
    <div className="admin-global-search" ref={wrapRef}>
      <form className="admin-topbar-search-wrap" role="search" onSubmit={onSubmit}>
        <label htmlFor="admin-nav-search" className="visually-hidden">
          Search bookings, invoices, staff…
        </label>
        <input
          id="admin-nav-search"
          type="search"
          className="admin-topbar-search"
          placeholder="Booking code, invoice #, email…"
          autoComplete="off"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="admin-search-results"
        />
      </form>
      {open && q.trim().length >= 2 && (
        <div id="admin-search-results" className="admin-global-search-panel" role="listbox">
          {loading ? (
            <p className="admin-global-search-muted">Searching…</p>
          ) : !hasResults ? (
            <p className="admin-global-search-muted">No matches — press Enter to search bookings</p>
          ) : (
            <div className="admin-global-search-sections">
              {data!.bookings.length > 0 && (
                <div className="admin-global-search-section">
                  <p className="admin-global-search-kicker">Bookings</p>
                  <ul>
                    {data!.bookings.map((b) => (
                      <li key={b.id}>
                        <Link href={`/admin/bookings/${b.id}`} className="admin-global-search-hit" onClick={() => setOpen(false)}>
                          <strong>{b.booking_code || b.id.slice(0, 8)}</strong>
                          <span>{b.client_name || b.client_email}</span>
                          <span className="admin-global-search-meta">{b.event_date}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data!.invoices.length > 0 && (
                <div className="admin-global-search-section">
                  <p className="admin-global-search-kicker">Invoices</p>
                  <ul>
                    {data!.invoices.map((inv) => (
                      <li key={inv.id}>
                        <Link href={`/admin/invoices/${inv.id}`} className="admin-global-search-hit" onClick={() => setOpen(false)}>
                          <strong>{inv.invoice_number}</strong>
                          <span className="admin-global-search-meta">{inv.status}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data!.enquiries.length > 0 && (
                <div className="admin-global-search-section">
                  <p className="admin-global-search-kicker">Enquiries</p>
                  <ul>
                    {data!.enquiries.map((en) => (
                      <li key={en.id}>
                        <Link href={`/admin/enquiries/${en.id}`} className="admin-global-search-hit" onClick={() => setOpen(false)}>
                          <strong>{en.name || en.email}</strong>
                          <span className="admin-global-search-meta">{en.event_date || "—"}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data!.staff.length > 0 && (
                <div className="admin-global-search-section">
                  <p className="admin-global-search-kicker">Team</p>
                  <ul>
                    {data!.staff.map((s) => (
                      <li key={s.id}>
                        <Link href="/admin/staff" className="admin-global-search-hit" onClick={() => setOpen(false)}>
                          <strong>{s.display_name || s.email}</strong>
                          <span className="admin-global-search-meta">{s.role}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <p className="admin-global-search-footer">
            <button
              type="button"
              className="admin-global-search-footer-btn"
              onClick={() => {
                setOpen(false);
                router.push(`/admin/bookings?q=${encodeURIComponent(q.trim())}`);
              }}
            >
              View all bookings matching “{q.trim()}” →
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
