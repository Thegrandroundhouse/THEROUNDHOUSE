import Link from "next/link";
import Image from "next/image";

type ImageSide = "left" | "right";
type Variant = "cream" | "ivory" | "gold" | "dark" | "warm";

const variants: Record<Variant, { bg: string; label: string; title: string; body: string; button: string }> = {
  cream: { bg: "bg-[#f7f4ed]", label: "text-[#a4845a]", title: "text-charcoal", body: "text-charcoal/90", button: "bg-[#a4845a] text-white hover:bg-[#8b6f4a]" },
  ivory: { bg: "bg-ivory", label: "text-gold", title: "text-charcoal", body: "text-charcoal/85", button: "border-2 border-gold text-gold hover:bg-gold hover:text-ivory" },
  gold: { bg: "bg-[#f5efe6]", label: "text-gold-dark", title: "text-charcoal", body: "text-charcoal/80", button: "bg-charcoal text-ivory hover:bg-charcoal-soft" },
  dark: { bg: "bg-ink", label: "text-gold-light", title: "text-ivory", body: "text-ivory/80", button: "bg-gold-light text-ink hover:bg-gold" },
  warm: { bg: "bg-[#faf6f0]", label: "text-[#8b6914]", title: "text-charcoal", body: "text-charcoal/80", button: "bg-[#8b6914] text-white hover:bg-[#6d5210]" },
};

const overlayStyles: Record<string, string> = {
  none: "",
  fadeRight: "bg-gradient-to-r from-transparent via-transparent to-black/40",
  fadeLeft: "bg-gradient-to-l from-transparent via-transparent to-black/30",
  vignette: "bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_40%,rgba(0,0,0,0.25)_100%)]",
  bottom: "bg-gradient-to-t from-black/50 via-transparent to-transparent",
  soft: "bg-gradient-to-r from-white/10 via-transparent to-transparent",
};

export interface FeatureBlockProps {
  imageSrc: string;
  imageAlt: string;
  label: string;
  title: string;
  paragraphs: string[];
  buttonText: string;
  buttonHref: string;
  imageSide?: ImageSide;
  variant?: Variant;
  imageOverlay?: keyof typeof overlayStyles;
}

export function FeatureBlock({ imageSrc, imageAlt, label, title, paragraphs, buttonText, buttonHref, imageSide = "left", variant = "cream", imageOverlay = "none" }: FeatureBlockProps) {
  const v = variants[variant];
  const overlay = overlayStyles[imageOverlay] ?? "";

  const imageBlock = (
    <div className="relative h-[50vh] md:h-auto md:min-h-[min(75vh,600px)] overflow-hidden">
      <Image src={imageSrc} alt={imageAlt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition duration-700 ease-out hover:scale-105" unoptimized={imageSrc.startsWith("http")} />
      {overlay && <div className={`absolute inset-0 ${overlay}`} aria-hidden />}
    </div>
  );

  const textBlock = (
    <div className={`flex flex-col justify-center px-8 py-16 md:px-12 md:py-20 lg:px-16 ${v.bg}`}>
      <p className={`text-xs font-medium uppercase tracking-[0.3em] ${v.label}`}>{label}</p>
      <h2 className={`mt-3 font-serif text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl ${v.title}`}>{title}</h2>
      {paragraphs.map((p, i) => (
        <p key={i} className={`max-w-lg text-base leading-relaxed ${i === 0 ? "mt-6" : "mt-4"} ${v.body}`}>{p}</p>
      ))}
      <Link href={buttonHref} className={`mt-10 inline-flex w-fit items-center gap-2 rounded-md px-8 py-3.5 text-sm font-medium uppercase tracking-[0.2em] transition ${v.button}`}>
        {buttonText} <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
      </Link>
    </div>
  );

  return (
    <section className="grid grid-cols-1 md:grid-cols-2">
      {imageSide === "left" ? <>{imageBlock}{textBlock}</> : <>{textBlock}{imageBlock}</>}
    </section>
  );
}
