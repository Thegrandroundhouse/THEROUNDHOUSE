import type { Metadata } from "next";
import { SuitesList } from "@/components/suites/SuitesList";

export const metadata: Metadata = {
  title: "Suites – The Grand Round House",
  description: "Main Hall, The Round Room, The Garden Suite and VIP Suites. Find the perfect space for your event.",
};

export default function SuitesPage() {
  return (
    <main id="main-content" className="page-content bg-ivory">
      <div className="container py-16 md:py-24">
        <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-gold">Our Spaces</p>
        <h1 className="page-title mt-2">Suites</h1>
        <div className="divider-gold mt-4" />
        <p className="page-lead mt-4">
          From our flagship ballroom to intimate suites — each space is designed to create unforgettable moments.
        </p>
        <SuitesList />
      </div>
    </main>
  );
}
