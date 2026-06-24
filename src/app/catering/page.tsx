import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "In-House Catering – The Grand Round House",
  description: "Exceptional cuisine with the freshest produce and highest quality ingredients.",
};

export default function CateringPage() {
  return (
    <main id="main-content" className="page-content bg-ivory">
      <div className="container py-16 md:py-24">
        <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-gold">Dining</p>
        <h1 className="page-title mt-2">In-House Catering</h1>
        <div className="divider-gold mt-4" />
        <p className="page-lead mt-4">
          Our passion for flavour drives us to deliver exceptional cuisine. We create delicious dishes using only the freshest produce and the highest quality of ingredients — combined with flair and innovation.
        </p>
        <p className="page-body mt-6 max-w-3xl">
          From traditional feasts to bespoke creations, our chefs bring your vision to the table. Menus can be tailored to dietary requirements and cultural preferences. Discuss your ideas with our team when you enquire.
        </p>
        <Link href="/contact" className="btn-primary mt-10 inline-block">Enquire now</Link>
      </div>
    </main>
  );
}
