"use client";

import { useTestimonials } from "@/hooks/useTestimonials";

export default function TestimonialsPage() {
  const { testimonials, isLoading, error } = useTestimonials();

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-20">
        <p className="text-red-700">Failed to load testimonials.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-28">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">Kind words</p>
      <h1 className="section-heading mt-2">Testimonials</h1>
      <div className="divider-gold mt-6" />
      <p className="section-sub max-w-2xl">
        What our couples and families say about their experience.
      </p>
      {isLoading ? (
        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-sm bg-champagne/40" />
          ))}
        </div>
      ) : (
        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {testimonials.map((t) => (
            <blockquote
              key={t.id}
              className="relative rounded-sm border border-charcoal/10 bg-cream p-10 shadow-sm"
            >
              <span className="absolute -top-1 left-8 font-serif text-6xl leading-none text-gold/20">&quot;</span>
              <p className="relative text-lg leading-relaxed text-charcoal/90">{t.quote}</p>
              <footer className="mt-6 font-serif text-base font-semibold text-gold">— {t.author}</footer>
            </blockquote>
          ))}
        </div>
      )}
    </div>
  );
}
