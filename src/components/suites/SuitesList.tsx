"use client";

import Link from "next/link";
import Image from "next/image";
import { useSuites } from "@/hooks/useSuites";

const PLACEHOLDER = "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80";

export function SuitesList() {
  const { suites, isLoading } = useSuites();

  if (isLoading) {
    return (
      <div className="mt-12 grid gap-8 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-80 animate-pulse rounded-sm bg-champagne/40" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-12 grid gap-8 md:grid-cols-2">
      {suites.map((suite) => (
        <Link key={suite.id} href={`/suites/${suite.slug}`} className="group luxury-card block overflow-hidden">
          <div className="relative aspect-[16/10]">
            <Image
              src={suite.image?.startsWith("http") || suite.image?.startsWith("/") ? suite.image : PLACEHOLDER}
              alt={suite.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition duration-500 group-hover:scale-105"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white">
              <h2 className="font-serif text-2xl font-semibold md:text-3xl">{suite.name}</h2>
              <p className="mt-1 text-sm text-ivory/80">Up to {suite.capacity} guests</p>
              <span className="mt-3 inline-flex items-center text-sm font-medium uppercase tracking-widest text-gold-light">View suite →</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
