import type { Metadata } from "next";
import { siteConfig } from "@/data/site";
import { ContactLayout } from "@/components/contact/ContactLayout";

export const metadata: Metadata = {
  title: "Contact Us – The Grand Round House",
  description: "Get in touch. Check availability and send an enquiry.",
};

export default function ContactPage() {
  const { phone, email, address } = siteConfig;
  return (
    <div className="min-h-screen bg-gradient-to-b from-ivory via-[#f8f5ef] to-ivory pb-[max(2.5rem,env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto max-w-7xl px-3 pb-8 pt-5 sm:px-4 sm:pb-12 sm:pt-6 md:px-5 lg:px-6 lg:pb-14">
        <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-gold sm:text-[11px]">
          Get in touch
        </p>
        <h1 className="mt-2 font-serif text-[1.75rem] font-semibold leading-tight tracking-tight text-charcoal sm:text-4xl md:text-[2.75rem]">
          Contact Us
        </h1>
        <div className="divider-gold mx-0 mt-4 max-w-[5rem]" />
        <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-charcoal/80 sm:text-lg">
          Pick a date on the calendar, then send your details — we’ll reply as soon as we can.
        </p>

        <ContactLayout phone={phone} email={email} address={address ?? ""} />
      </div>
    </div>
  );
}
