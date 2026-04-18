import Link from "next/link";

export default function CateringPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-20 md:px-8 md:py-28">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">Experience</p>
      <h1 className="section-heading mt-2">In-House Catering</h1>
      <div className="divider-gold mt-6" />
      <p className="section-sub max-w-2xl">
        Our passion for flavour drives us to deliver exceptional cuisine. We create delicious dishes using only the
        freshest produce and the highest quality ingredients — combined with flair and innovation.
      </p>
      <div className="mt-16 rounded-sm border border-charcoal/10 bg-cream p-10 shadow-sm md:p-14">
        <h2 className="font-serif text-2xl font-semibold text-charcoal">Dining experience</h2>
        <p className="mt-6 max-w-2xl leading-relaxed text-charcoal/80">
          From traditional menus to bespoke creations, our chefs work with you to design a menu that reflects your
          culture and taste. Tastings available by appointment.
        </p>
        <Link href="/contact" className="btn-primary mt-10">
          Request a tasting
        </Link>
      </div>
    </div>
  );
}
