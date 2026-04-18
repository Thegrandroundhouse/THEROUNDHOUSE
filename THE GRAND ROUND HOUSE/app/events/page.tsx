import Link from "next/link";
import { eventTypes } from "@/data/events";

export default function EventsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-28">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">Celebrations</p>
      <h1 className="section-heading mt-2">Events</h1>
      <div className="divider-gold mt-6" />
      <p className="section-sub max-w-2xl">
        Mehndi nights, Bar & Bat Mitzvah, corporate events and birthdays — all under one roof.
      </p>
      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {eventTypes.map((e) => (
          <Link
            key={e.slug}
            href={`/events/${e.slug}`}
            className="group rounded-sm border border-charcoal/10 bg-cream p-8 transition-all hover:border-gold/40 hover:shadow-elegant"
          >
            <span className="font-serif text-xl font-semibold text-charcoal transition group-hover:text-gold">
              {e.label}
            </span>
            <span className="mt-3 block text-xs uppercase tracking-[0.2em] text-charcoal/60 group-hover:text-gold">
              Discover →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
