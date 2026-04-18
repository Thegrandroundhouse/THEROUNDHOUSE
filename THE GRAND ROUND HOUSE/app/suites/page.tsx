"use client";

import Link from "next/link";
import Image from "next/image";
import { useSuites } from "@/hooks/useSuites";

export default function SuitesPage() {
  const { suites, isLoading, error } = useSuites();

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-20">
        <p className="text-red-700">Failed to load suites.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-28">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">Venue</p>
      <h1 className="section-heading mt-2">Suites</h1>
      <div className="divider-gold mt-6" />
      <p className="section-sub max-w-2xl">
        Three luxury ballrooms and exclusive suites — each designed to make your event unforgettable.
      </p>
      {isLoading ? (
        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-80 animate-pulse rounded-sm bg-champagne/40" />
          ))}
        </div>
      ) : (
        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {suites.map((suite) => (
            <Link
              key={suite.id}
              href={`/suites/${suite.slug}`}
              className="group relative overflow-hidden rounded-sm border border-charcoal/10 bg-cream shadow-sm transition-all hover:border-gold/30 hover:shadow-elegant"
            >
              <div className="relative aspect-video bg-champagne/50 transition group-hover:scale-[1.02]">
                <Image
                  src={suite.image}
                  alt={suite.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="p-8">
                <h2 className="font-serif text-2xl font-semibold text-charcoal transition group-hover:text-gold">
                  {suite.name}
                </h2>
                <p className="mt-2 text-sm uppercase tracking-wider text-charcoal/70">
                  Capacity: {suite.capacity}+
                </p>
                <p className="mt-3 leading-relaxed text-charcoal/80">{suite.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
