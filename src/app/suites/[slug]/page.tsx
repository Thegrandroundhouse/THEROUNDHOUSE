import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { suites } from "@/data/suites";

const PLACEHOLDER = "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80";

interface Props { params: Promise<{ slug: string }>; }

export async function generateStaticParams() {
  return suites.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const suite = suites.find((s) => s.slug === slug);
  if (!suite) return { title: "Suite – The Grand Round House" };
  return { title: `${suite.name} – The Grand Round House`, description: suite.description };
}

export default async function SuitePage({ params }: Props) {
  const { slug } = await params;
  const suite = suites.find((s) => s.slug === slug);
  if (!suite) notFound();

  const imgSrc = suite.image?.startsWith("http") || suite.image?.startsWith("/") ? suite.image : PLACEHOLDER;

  return (
    <main id="main-content" className="page-content bg-ivory">
      <div className="container py-16 md:py-24">
        <Link href="/suites" className="text-sm font-medium uppercase tracking-widest text-gold hover:text-gold-dark">← Suites</Link>
        <div className="relative mt-8 aspect-[21/9] overflow-hidden rounded-sm">
          <Image src={imgSrc} alt={suite.name} fill sizes="100vw" className="object-cover" unoptimized={imgSrc.startsWith("http")} />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-8 text-white">
            <h1 className="font-serif text-4xl font-semibold md:text-5xl">{suite.name}</h1>
            <p className="mt-2 text-ivory/90">Up to {suite.capacity} guests</p>
          </div>
        </div>
        <div className="mt-10 max-w-3xl">
          <p className="page-body text-lg leading-relaxed">{suite.description}</p>
          <Link href="/contact" className="btn-primary mt-10 inline-block">Enquire now</Link>
        </div>
      </div>
    </main>
  );
}
