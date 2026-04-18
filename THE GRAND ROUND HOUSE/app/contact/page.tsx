import { siteConfig } from "@/data/site";
import { EnquiryForm } from "@/components/contact/EnquiryForm";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-28">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">Get in touch</p>
      <h1 className="section-heading mt-2">Contact</h1>
      <div className="divider-gold mt-6" />
      <p className="section-sub max-w-2xl">
        Complete the form below and our team will be in touch shortly.
      </p>
      <div className="mt-16 grid gap-16 lg:grid-cols-2">
        <div className="space-y-6">
          <h2 className="font-serif text-2xl font-semibold text-charcoal">Visit & reach us</h2>
          <p className="text-charcoal/80">{siteConfig.address}</p>
          <a
            href={`tel:${siteConfig.phone.replace(/\s/g, "")}`}
            className="block text-gold transition hover:text-gold-light"
          >
            {siteConfig.phone}
          </a>
          <a
            href={`mailto:${siteConfig.email}`}
            className="block text-gold transition hover:text-gold-light"
          >
            {siteConfig.email}
          </a>
        </div>
        <div className="rounded-sm border border-charcoal/10 bg-cream p-8 shadow-sm md:p-10">
          <h2 className="font-serif text-xl font-semibold text-charcoal">Enquiry form</h2>
          <p className="mt-2 text-sm text-charcoal/70">All fields marked * are required.</p>
          <EnquiryForm />
        </div>
      </div>
    </div>
  );
}
