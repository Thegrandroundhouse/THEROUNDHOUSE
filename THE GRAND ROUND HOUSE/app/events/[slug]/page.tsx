import { notFound } from "next/navigation";
import Link from "next/link";
import { eventTypes } from "@/data/events";

export async function generateStaticParams() {
  return eventTypes.map((e) => ({ slug: e.slug }));
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = eventTypes.find((e) => e.slug === slug);
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-20 md:px-8 md:py-28">
      <Link href="/events" className="text-sm text-gold transition hover:text-gold-light">
        ← Events
      </Link>
      <h1 className="mt-6 section-heading">{event.label}</h1>
      <div className="divider-gold mt-6" />
      <p className="section-sub max-w-2xl">
        From intimate gatherings to large celebrations, we create the perfect setting for {event.label.toLowerCase()}.
        In-house catering and décor available.
      </p>
      <Link href="/contact" className="btn-primary mt-10">
        Enquire now
      </Link>
    </div>
  );
}
