import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { weddingTypes } from "@/data/weddings";
import type { WeddingType } from "@/types/site";
import { VENUE_IMAGES, VENUE_IMAGE_ALTS } from "@/data/venue-images";

const copy: Record<WeddingType, { lead: string; body: string }> = {
  asian: { lead: "Asian weddings at The Grand Round House combine grandeur with warmth and tradition.", body: "Our ballrooms and in-house catering are designed to host large celebrations with style. From the ceremony to the reception, we support every detail so your day runs seamlessly." },
  african: { lead: "African weddings here are celebrated with scale, colour and joy.", body: "We provide the space, catering and flexibility for traditional and contemporary elements. Our team works with you to create a day that honours your culture and your vision." },
  turkish: { lead: "Turkish weddings at The Grand Round House bring together elegance and festivity.", body: "Our venues suit both intimate gatherings and larger receptions. In-house catering and décor options help you create the atmosphere you imagine." },
  sikh: { lead: "Sikh weddings at The Grand Round House are hosted with respect and grandeur.", body: "We accommodate Anand Karaj and reception under one roof where possible, with space for dhol, dance and celebration. Our team supports you from planning to the last dance." },
  muslim: { lead: "Muslim weddings at The Grand Round House are celebrated with care and sophistication.", body: "We offer halal in-house catering and spaces that work for nikah and walima. Our team helps you plan so your day runs smoothly and memorably." },
  hindu: { lead: "Hindu weddings at The Grand Round House blend tradition with modern luxury.", body: "Our ballrooms suit ceremonies and receptions of all sizes. From mandap space to catering and décor, we work with you to bring your vision to life." },
  bengali: { lead: "Bengali weddings at The Grand Round House are full of warmth and grandeur.", body: "We host biye, reception and related events with in-house catering and flexible spaces. Our team supports you so every ritual and celebration is seamless." },
};

interface Props { params: Promise<{ type: string }>; }

export async function generateStaticParams() {
  return weddingTypes.map((w) => ({ type: w.type }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  const w = weddingTypes.find((x) => x.type === type);
  if (!w) return { title: "Weddings – The Grand Round House" };
  return { title: `${w.label} – The Grand Round House`, description: copy[w.type as WeddingType]?.lead ?? w.label };
}

export default async function WeddingTypePage({ params }: Props) {
  const { type } = await params;
  const w = weddingTypes.find((x) => x.type === type);
  if (!w) notFound();
  const c = copy[w.type as WeddingType] ?? { lead: "", body: "" };
  const idx = weddingTypes.findIndex((x) => x.type === w.type);
  const heroSrc = VENUE_IMAGES[idx % VENUE_IMAGES.length] ?? "/images/venue/venue-1.png";
  const heroAlt = VENUE_IMAGE_ALTS[idx % VENUE_IMAGES.length] ?? w.label;

  return (
    <main id="main-content" className="page-content bg-ivory">
      <div className="container py-16 md:py-24">
        <Link href="/weddings" className="text-sm font-medium uppercase tracking-widest text-gold hover:text-gold-dark">← Weddings</Link>
        <div className="relative mt-8 aspect-[21/9] overflow-hidden rounded-sm">
          <Image src={heroSrc} alt={heroAlt} fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-8 text-white">
            <h1 className="font-serif text-4xl font-semibold md:text-5xl">{w.label}</h1>
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
