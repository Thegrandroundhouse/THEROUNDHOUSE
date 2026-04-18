import { notFound } from "next/navigation";
import Link from "next/link";
import { weddingTypes } from "@/data/weddings";

export async function generateStaticParams() {
  return weddingTypes.map((w) => ({ type: w.type }));
}

export default async function WeddingTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const wedding = weddingTypes.find((w) => w.type === type);
  if (!wedding) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-20 md:px-8 md:py-28">
      <Link href="/weddings" className="text-sm text-gold transition hover:text-gold-light">
        ← Weddings
      </Link>
      <h1 className="mt-6 section-heading">{wedding.label}</h1>
      <div className="divider-gold mt-6" />
      <p className="section-sub max-w-2xl">
        We are honoured to host {wedding.label.toLowerCase()} with the same care and elegance we bring to every celebration.
        Custom menus, décor and event management tailored to your traditions.
      </p>
      <div className="mt-14 rounded-sm border border-charcoal/10 bg-cream p-10 shadow-sm md:p-12">
        <p className="leading-relaxed text-charcoal/90">
          Contact us to discuss your date, guest count and requirements. Our team will guide you through every step.
        </p>
        <Link href="/contact" className="btn-primary mt-8">
          Enquire now
        </Link>
      </div>
    </div>
  );
}
