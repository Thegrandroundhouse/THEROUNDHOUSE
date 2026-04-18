"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSuites } from "@/hooks/useSuites";

export default function SuitePage() {
  const params = useParams();
  const slug = params.slug as string;
  const { suites, isLoading } = useSuites();
  const suite = suites.find((s) => s.slug === slug);

  if (!isLoading && !suite) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-20">
        <p className="text-charcoal/80">Suite not found.</p>
        <Link href="/suites" className="mt-4 text-gold hover:underline">← Back to Suites</Link>
      </div>
    );
  }

  if (isLoading || !suite) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="h-96 animate-pulse rounded-sm bg-champagne/40" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-20 md:px-8 md:py-28">
      <Link href="/suites" className="text-sm text-gold transition hover:text-gold-light">
        ← Suites
      </Link>
      <h1 className="mt-6 section-heading">{suite.name}</h1>
      <p className="section-sub">Capacity: {suite.capacity}+ guests</p>
      <div className="relative mt-10 aspect-video overflow-hidden rounded-sm bg-champagne/50 shadow-elegant">
        <Image
          src={suite.image}
          alt={suite.name}
          fill
          sizes="(max-width: 1024px) 100vw, 896px"
          className="object-cover"
        />
      </div>
      <p className="mt-10 max-w-2xl text-lg leading-relaxed text-charcoal/90">{suite.description}</p>
      <Link href="/contact" className="btn-primary mt-10">
        Enquire for {suite.name}
      </Link>
    </div>
  );
}
