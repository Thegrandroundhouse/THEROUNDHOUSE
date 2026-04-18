"use client";

import { useTestimonials } from "@/hooks/useTestimonials";

export function TestimonialsSection() {
  const { testimonials, isLoading, error } = useTestimonials();

  if (error) return null;
  if (isLoading) {
    return (
      <section className="bg-ivory py-28 md:py-36">
        <div className="mx-auto max-w-7xl px-8 md:px-10">
          <h2 className="section-heading text-center">Testimonials</h2>
          <div className="divider-gold mx-auto mt-6" />
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-sm bg-champagne/30" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-ivory py-28 md:py-36">
      <div className="absolute top-0 left-1/2 h-px w-56 -translate-x-1/2 bg-gradient-to-r from-transparent via-gold/25 to-transparent" />
      <div className="absolute inset-0 bg-luxury-mesh opacity-40" />
      <div className="relative mx-auto max-w-7xl px-8 md:px-10">
        <p className="text-center text-[10px] font-medium uppercase tracking-[0.35em] text-gold">
          Kind Words
        </p>
        <h2 className="section-heading mt-3 text-center">Testimonials</h2>
        <div className="divider-gold-thick mx-auto mt-6" />
        <div className="divider-gold mx-auto mt-1" />
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {testimonials.slice(0, 3).map((t) => (
            <blockquote key={t.id} className="luxury-card p-10">
              <span className="absolute -top-1 left-8 font-serif text-7xl leading-none text-gold/15">
                “
              </span>
              <p className="relative text-lg leading-relaxed text-charcoal/85">
                {t.quote}
              </p>
              <footer className="mt-6 font-serif text-base font-semibold text-gold">
                — {t.author}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
