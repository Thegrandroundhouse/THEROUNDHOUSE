"use client";

import { useState } from "react";
import { postEnquiry } from "@/lib/api";

const FUNCTION_TYPES = [
  "Wedding", "Engagement", "Mehndi Night", "Reception", "Birthday", "Corporate",
  "Bar/Bat Mitzvah", "Anniversary", "Other",
];

const SOURCES = [
  "Google Search", "Instagram", "Facebook", "Word of Mouth", "Wedding Fair", "Other",
];

export function EnquiryForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [form, setForm] = useState({
    typeOfFunction: "",
    whereDidYouHear: "",
    name: "",
    email: "",
    phone: "",
    date: "",
    message: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      await postEnquiry(form);
      setStatus("success");
      setForm({ typeOfFunction: "", whereDidYouHear: "", name: "", email: "", phone: "", date: "", message: "" });
    } catch {
      setStatus("error");
    }
  }

  const inputClass =
    "mt-2 w-full rounded-sm border border-charcoal/15 bg-ivory px-4 py-3 text-charcoal transition focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold";

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-xl space-y-5">
      <div>
        <label htmlFor="typeOfFunction" className="block text-sm font-medium text-charcoal/90">
          Type of function *
        </label>
        <select
          id="typeOfFunction"
          required
          value={form.typeOfFunction}
          onChange={(e) => setForm((f) => ({ ...f, typeOfFunction: e.target.value }))}
          className={inputClass}
        >
          <option value="">Select</option>
          {FUNCTION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="whereDidYouHear" className="block text-sm font-medium text-charcoal">
          Where did you hear about us? *
        </label>
        <select
          id="whereDidYouHear"
          required
          value={form.whereDidYouHear}
          onChange={(e) => setForm((f) => ({ ...f, whereDidYouHear: e.target.value }))}
          className={inputClass}
        >
          <option value="">Select</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-charcoal">Name *</label>
          <input
            id="name"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-charcoal/90">Email *</label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-charcoal">Phone *</label>
        <input
          id="phone"
          type="tel"
          required
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-charcoal">Preferred date</label>
        <input
          id="date"
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-charcoal">Message</label>
        <textarea
          id="message"
          rows={4}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          className={inputClass}
        />
      </div>
      {status === "success" && (
        <p className="text-gold-dark">Thank you. We will be in touch shortly.</p>
      )}
      {status === "error" && (
        <p className="text-red-700">Something went wrong. Please try again or call us.</p>
      )}
      <button type="submit" disabled={status === "loading"} className="btn-primary mt-4 w-full sm:w-auto">
        {status === "loading" ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
