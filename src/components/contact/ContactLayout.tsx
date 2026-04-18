"use client";

import { useState, useRef } from "react";
import { VenueCalendarWidget } from "./VenueCalendarWidget";
import { GrandEnquiryForm } from "./GrandEnquiryForm";

type ContactLayoutProps = { phone: string; email: string; address: string };

export function ContactLayout({ phone, email, address }: ContactLayoutProps) {
  const [selectedDate, setSelectedDate] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  function handleSelectDate(d: string) {
    setSelectedDate(d);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }

  const formattedDate = selectedDate
    ? new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div className="mt-6 grid gap-6 sm:mt-8 sm:gap-8 lg:mt-10 lg:grid-cols-2 lg:gap-10">
      {/* Calendar — first on mobile so users pick date then scroll to form */}
      <div className="order-1 lg:sticky lg:top-20 lg:order-none lg:self-start">
        <div className="contact-card-mobile rounded-2xl border border-charcoal/[0.08] bg-white px-4 py-4 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] sm:px-5 sm:py-5 lg:px-5 lg:py-5">
          <h2 className="font-serif text-xl font-semibold tracking-tight text-charcoal sm:text-2xl">
            Choose your date
          </h2>
          <p className="mt-1.5 text-sm leading-snug text-charcoal/70 sm:text-[0.9375rem]">
            Tap an open day. Grey = fully booked. Tinted = some time slots left.
          </p>
          {formattedDate && (
            <p className="mt-3 rounded-lg bg-gold/10 px-3 py-2.5 text-center text-sm font-medium text-gold-dark ring-1 ring-gold/20">
              Selected: <span className="font-semibold text-charcoal">{formattedDate}</span>
            </p>
          )}
          <div className="contact-calendar-wrap mt-3 sm:mt-4">
            <VenueCalendarWidget compact onSelectDate={handleSelectDate} />
          </div>
          <p className="mt-4 text-center text-xs text-charcoal/50 lg:hidden">
            Scroll down to send your enquiry →
          </p>
        </div>
      </div>

      {/* Enquiry form first, then visit card */}
      <div className="order-2 space-y-6 sm:space-y-8 lg:order-none">
        <div
          ref={formRef}
          className="contact-card-mobile scroll-mt-4 rounded-2xl border border-charcoal/[0.08] bg-white px-4 py-5 pb-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] sm:px-5 sm:py-6 sm:pb-8 lg:px-6"
        >
          <h2 id="enquire" className="font-serif text-xl font-semibold tracking-tight text-charcoal sm:text-2xl">
            Send an enquiry
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-charcoal/70 sm:text-base">
            Complete the form — we’ll confirm availability and pricing.
          </p>
          <GrandEnquiryForm
            selectedDate={selectedDate}
            onDateClear={() => setSelectedDate("")}
            onDatePicked={(d) => setSelectedDate(d)}
          />
        </div>

        <div className="contact-visit-card rounded-2xl border border-charcoal/[0.08] bg-white px-4 py-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] sm:px-6 sm:py-7 lg:px-7">
          <h2 className="font-serif text-lg font-semibold tracking-tight text-charcoal sm:text-xl">
            Visit &amp; reach us
          </h2>
          {address ? (
            <p className="mt-3 text-sm leading-relaxed text-charcoal/60 sm:text-[0.9375rem]">{address}</p>
          ) : null}
          <div className="mt-6 flex flex-col gap-3">
            {phone ? (
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-charcoal px-4 py-3.5 text-center text-sm font-semibold text-ivory shadow-sm transition hover:bg-charcoal/90 active:scale-[0.99]"
              >
                Call {phone}
              </a>
            ) : null}
            {email ? (
              <a
                href={`mailto:${email}`}
                className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border-2 border-gold/45 bg-[#faf8f5] px-4 py-3.5 text-center text-sm font-semibold text-charcoal transition hover:border-gold hover:bg-ivory active:scale-[0.99]"
              >
                Email us
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
