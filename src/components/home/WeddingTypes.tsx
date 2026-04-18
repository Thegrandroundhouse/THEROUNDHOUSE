import Link from "next/link";

const TYPES = [
  { label: "Asian Weddings", href: "/weddings/asian" },
  { label: "Turkish Weddings", href: "/weddings/turkish" },
  { label: "African Weddings", href: "/weddings/african" },
  { label: "Sikh Weddings", href: "/weddings/sikh" },
  { label: "Bengali Weddings", href: "/weddings/bengali" },
  { label: "Hindu Weddings", href: "/weddings/hindu" },
  { label: "Muslim Weddings", href: "/weddings/muslim" },
];

export default function WeddingTypes() {
  return (
    <section className="wedding-types-section" aria-label="Wedding types">
      <div className="container">
        <p className="section-label">Bespoke Weddings</p>
        <h2 className="section-heading">
          Elegance Tailored to Every Occasion
        </h2>
        <div className="wedding-types-grid">
          {TYPES.map(({ label, href }) => (
            <Link key={href} href={href} className="wedding-type-card">
              <span className="wedding-type-label">{label}</span>
              <span className="wedding-type-cta">Discover</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
