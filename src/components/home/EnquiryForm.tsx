"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function EnquiryForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [sending, setSending] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitMessage(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    const eventDate = (data.get("eventDate") as string)?.trim() || null;
    const guestCountRaw = (data.get("guestCount") as string)?.trim();
    const guestCount = guestCountRaw ? parseInt(guestCountRaw, 10) : null;
    const firstName = (data.get("firstName") as string)?.trim();
    const lastName = (data.get("lastName") as string)?.trim();
    const email = (data.get("email") as string)?.trim();
    const name = [firstName, lastName].filter(Boolean).join(" ");
    if (!name || !email) {
      setSubmitMessage({ type: "error", text: "Name and email are required." });
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setSubmitMessage({ type: "error", text: "Enquiries are not configured." });
      return;
    }
    setSending(true);
    const payload: Record<string, unknown> = {
      name,
      email,
      event_date: eventDate || null,
      guest_count: guestCount,
      message: form.querySelector('[name="message"]') ? (data.get("message") as string)?.trim() || null : null,
    };
    const { error } = await supabase.from("enquiries").insert(payload);
    setSending(false);
    if (error) {
      setSubmitMessage({ type: "error", text: error.message || "Failed to send enquiry." });
      return;
    }
    setSubmitMessage({ type: "ok", text: "Thank you. We will be in touch shortly." });
    form.reset();
    setStep(1);
  }

  function handleNext(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const date = (form.querySelector('[name="eventDate"]') as HTMLInputElement)?.value?.trim();
    const guests = (form.querySelector('[name="guestCount"]') as HTMLInputElement)?.value?.trim();
    const first = (form.querySelector('[name="firstName"]') as HTMLInputElement)?.value?.trim();
    const last = (form.querySelector('[name="lastName"]') as HTMLInputElement)?.value?.trim();
    const em = (form.querySelector('[name="email"]') as HTMLInputElement)?.value?.trim();
    if (!date || !guests || !first || !last || !em) {
      setSubmitMessage({ type: "error", text: "Please fill all required fields." });
      return;
    }
    setSubmitMessage(null);
    setStep(2);
  }

  return (
    <section className="enquiry-strip" id="enquire">
      <div className="enquiry-strip-bg" aria-hidden />
      <div className="container enquiry-strip-inner">
        <form className="enquiry-strip-form" onSubmit={step === 1 ? handleNext : handleSubmit}>
          <div className={`enquiry-strip-fields ${step === 2 ? "enquiry-strip-fields-hidden" : ""}`}>
            <label className="enquiry-strip-label">
              <span className="enquiry-strip-label-text">Event Date *</span>
              <input type="date" name="eventDate" required className="enquiry-strip-input" />
            </label>
            <label className="enquiry-strip-label">
              <span className="enquiry-strip-label-text">No. of Guests *</span>
              <input type="number" name="guestCount" min={1} placeholder="e.g. 150" required className="enquiry-strip-input" />
            </label>
            <label className="enquiry-strip-label">
              <span className="enquiry-strip-label-text">First Name *</span>
              <input type="text" name="firstName" required className="enquiry-strip-input" placeholder="First Name" />
            </label>
            <label className="enquiry-strip-label">
              <span className="enquiry-strip-label-text">Last Name *</span>
              <input type="text" name="lastName" required className="enquiry-strip-input" placeholder="Last Name" />
            </label>
            <label className="enquiry-strip-label">
              <span className="enquiry-strip-label-text">Email *</span>
              <input type="email" name="email" required className="enquiry-strip-input" placeholder="Email" />
            </label>
          </div>
          {step === 1 ? (
            <button type="submit" className="btn btn-primary enquiry-strip-next">
              Next
              <span className="enquiry-strip-arrow" aria-hidden>→</span>
            </button>
          ) : (
            <>
              <div className="enquiry-strip-step2">
                <label className="enquiry-strip-label full">
                  <span className="enquiry-strip-label-text">Message</span>
                  <textarea name="message" rows={3} className="enquiry-strip-input" placeholder="Tell us about your event…" />
                </label>
              </div>
              {submitMessage && (
                <p className={submitMessage.type === "ok" ? "enquiry-ok" : "enquiry-err"}>{submitMessage.text}</p>
              )}
              <div className="enquiry-strip-actions">
                <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
                <button type="submit" className="btn btn-primary" disabled={sending}>
                  {sending ? "Sending…" : "Send enquiry"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </section>
  );
}
