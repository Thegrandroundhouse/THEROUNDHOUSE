import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Décor – The Grand Roundhouse",
  description: "Luxury décor and production exclusive to The Grand Roundhouse. Imagine, Inspire, Design, Deliver.",
};

export default function DecorPage() {
  return (
    <main id="main-content" className="page-content bg-ivory">
      <div className="container py-16 md:py-24">
        <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-gold">Experience</p>
        <h1 className="page-title mt-2">Décor</h1>
        <div className="divider-gold mt-4" />
        <p className="page-lead mt-4">
          Our luxury décor and production partner is exclusive to The Grand Roundhouse. Inspired by your dreams — Imagine, Inspire, Design, Deliver.
        </p>
        <p className="page-body mt-6 max-w-3xl">
          We start with your imagination to create themes, concepts and mood boards. Every detail is designed to make your event stand out in the most breathtaking way.
        </p>
        <Link href="/contact" className="btn-primary mt-10 inline-block">Enquire now</Link>
      </div>
    </main>
  );
}
