import { AnimateIn } from "@/components/animations/AnimateIn";

export function GrandStats() {
  const items = [
    { value: "3", label: "Luxury Ballrooms" },
    { value: "1,500+", label: "Google Reviews" },
    { value: "800+", label: "Maximum Capacity" },
  ];
  return (
    <AnimateIn as="section" animation="fade-in-up" className="relative border-y border-gold/10 bg-ink py-20 text-ivory md:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_50%,rgba(212,175,55,0.06),transparent)]" />
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      <div className="absolute left-0 right-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      <div className="relative mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-12 px-8 md:gap-20">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center gap-12 md:gap-20">
            <div className="text-center">
              <div className="font-serif text-5xl font-semibold md:text-6xl bg-gradient-to-b from-gold-light to-gold bg-clip-text text-transparent">{item.value}</div>
              <div className="mt-3 text-[10px] uppercase tracking-[0.3em] text-ivory/60">{item.label}</div>
            </div>
            {i < items.length - 1 && <div className="hidden h-16 w-px shrink-0 bg-gradient-to-b from-transparent via-gold/30 to-transparent md:block" aria-hidden />}
          </div>
        ))}
      </div>
    </AnimateIn>
  );
}
