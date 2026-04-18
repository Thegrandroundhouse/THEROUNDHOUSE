import Link from "next/link";

export default function DecorPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-20 md:px-8 md:py-28">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">Experience</p>
      <h1 className="section-heading mt-2">Décor</h1>
      <div className="divider-gold mt-6" />
      <p className="section-sub max-w-2xl">
        Luxury décor and production exclusive to our venue. Imagine, Inspire, Design, Deliver.
      </p>
      <div className="mt-16 rounded-sm border border-charcoal/10 bg-cream p-10 shadow-sm md:p-14">
        <p className="max-w-2xl leading-relaxed text-charcoal/80">
          We start with your imagination to create the brief. Themes, concepts, mood boards and luxury touches —
          every detail designed to make your event stand out. From elegant weddings to luxury celebrations.
        </p>
        <Link href="/contact" className="btn-primary mt-10">
          Discuss your vision
        </Link>
      </div>
    </div>
  );
}
