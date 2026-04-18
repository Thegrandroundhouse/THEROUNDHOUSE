"use client";

import { useTestimonials } from "@/hooks/useTestimonials";

export function TestimonialsFull() {
  const { testimonials, isLoading, error } = useTestimonials();

  if (error) return <p className="mt-10 text-charcoal/70">Unable to load testimonials.</p>;
  if (isLoading) {
    return (
      <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-56 animate-pulse rounded-sm bg-champagne/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {testimonials.map((t) => (
        <blockquote key={t.id} className="luxury-card p-10">
          <span className="absolute -top-1 left-8 font-serif text-7xl leading-none text-gold/15">&quot;</span>
          <p className="relative text-lg leading-relaxed text-charcoal/85">{t.quote}</p>
          <footer className="mt-6 font-serif text-base font-semibold text-gold">— {t.author}</footer>
        </blockquote>
      ))}
    </div>
  );
}
