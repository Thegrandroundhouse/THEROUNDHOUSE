import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { eventTypes } from "@/data/events";

export const metadata: Metadata = {
  title: "Events – The Grand Round House",
  description: "Mehndi & Henna parties, Bar & Bat Mitzvah, corporate events and birthdays at The Grand Round House.",
};

const PLACEHOLDER = "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80";

export default function EventsPage() {
  return (
    <main id="main-content" className="page-content bg-ivory">
      <div className="container py-16 md:py-24">
        <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-gold">Events</p>
        <h1 className="page-title mt-2">Events</h1>
        <div className="divider-gold mt-4" />
        <p className="page-lead mt-4">
          From Mehndi & Henna parties and Bar & Bat Mitzvah to corporate events and birthdays — we host it all with the same care and grandeur.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {eventTypes.map((e) => (
            <Link key={e.slug} href={`/events/${e.slug}`} className="group luxury-card block overflow-hidden">
              <div className="relative aspect-[16/10]">
                <Image src={PLACEHOLDER} alt={e.label} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover transition duration-500 group-hover:scale-105" unoptimized />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-8 text-white">
                  <h2 className="font-serif text-2xl font-semibold md:text-3xl">{e.label}</h2>
                  <span className="mt-2 inline-flex items-center text-sm font-medium uppercase tracking-widest text-gold-light">Discover →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
