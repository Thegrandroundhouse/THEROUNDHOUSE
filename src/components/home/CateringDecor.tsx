import Link from "next/link";
import { AnimateIn } from "@/components/animations/AnimateIn";

export function CateringDecor() {
  return (
    <AnimateIn as="section" animation="scale-in" className="relative overflow-hidden bg-cream py-28 md:py-36">
      <div className="absolute inset-0 bg-luxury-mesh opacity-50" />
      <div className="relative mx-auto max-w-7xl px-8 md:px-10">
        <p className="text-center text-[10px] font-medium uppercase tracking-[0.35em] text-gold">Experience</p>
        <h2 className="section-heading text-center">Catering & Décor</h2>
        <div className="divider-gold-thick mx-auto mt-6" />
        <div className="divider-gold mx-auto mt-1" />
        <div className="mt-20 grid gap-8 md:grid-cols-2">
          <div className="luxury-card group p-10 md:p-12">
            <div className="absolute right-0 top-0 text-[10rem] font-serif leading-none text-gold/[0.04]">◆</div>
            <h3 className="relative font-serif text-2xl font-semibold text-charcoal md:text-3xl">In-House Catering</h3>
            <p className="relative mt-5 max-w-lg leading-relaxed text-charcoal/70">Exceptional cuisine using the freshest produce and highest quality ingredients — combined with flair and innovation.</p>
            <Link href="/catering" className="btn-outline relative mt-10">View Dining</Link>
          </div>
          <div className="luxury-card group p-10 md:p-12">
            <div className="absolute right-0 top-0 text-[10rem] font-serif leading-none text-gold/[0.04]">◆</div>
            <h3 className="relative font-serif text-2xl font-semibold text-charcoal md:text-3xl">Décor</h3>
            <p className="relative mt-5 max-w-lg leading-relaxed text-charcoal/70">Imagine, Inspire, Design, Deliver. Luxury décor and production exclusive to our venue — themes, concepts and luxury touches.</p>
            <Link href="/decor" className="btn-outline relative mt-10">View Décor</Link>
          </div>
        </div>
      </div>
    </AnimateIn>
  );
}
