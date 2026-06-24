import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { eventTypes } from "@/data/events";

const PLACEHOLDER = "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80";

const copy: Record<string, { lead: string; body: string }> = {
  "mehndi-henna": { lead: "Mehndi and Henna parties at The Grand Round House are full of colour and celebration.", body: "Our ballrooms and catering are set up for large gatherings, music and dance. We work with you on layout, timing and menu so your Mehndi night runs smoothly and memorably." },
  corporate: { lead: "Corporate events at The Grand Round House bring professionalism and impact.", body: "Our ballrooms suit conferences, gala dinners, product launches and team celebrations. In-house catering and AV support are available so your event runs seamlessly." },
  birthdays: { lead: "Birthday celebrations at The Grand Round House are tailored to your scale and style.", body: "From intimate gatherings to large parties, we provide the space, catering and flexibility. Our team helps with layout and logistics so you can enjoy the day." },
};

interface Props { params: Promise<{ slug: string }>; }

export async function generateStaticParams() {
  return eventTypes.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const e = eventTypes.find((x) => x.slug === slug);
  if (!e) return { title: "Events – The Grand Round House" };
  return { title: `${e.label} – The Grand Round House`, description: copy[e.slug]?.lead ?? e.label };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const e = eventTypes.find((x) => x.slug === slug);
  if (!e) notFound();
  const c = copy[e.slug] ?? { lead: "", body: "" };

  return (
    <main id="main-content" className="page-content bg-ivory">
      <div className="container py-16 md:py-24">
        <Link href="/events" className="text-sm font-medium uppercase tracking-widest text-gold hover:text-gold-dark">← Events</Link>
        <div className="relative mt-8 aspect-[21/9] overflow-hidden rounded-sm">
          <Image src={PLACEHOLDER} alt={e.label} fill sizes="100vw" className="object-cover" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-8 text-white">
            <h1 className="font-serif text-4xl font-semibold md:text-5xl">{e.label}</h1>
            <p className="mt-2 text-lg text-ivory/90">{c.lead}</p>
          </div>
        </div>
        <div className="mt-10 max-w-3xl">
          <p className="page-body text-lg leading-relaxed">{c.body}</p>
          <Link href="/contact" className="btn-primary mt-10 inline-block">Enquire now</Link>
        </div>
      </div>
    </main>
  );
}
