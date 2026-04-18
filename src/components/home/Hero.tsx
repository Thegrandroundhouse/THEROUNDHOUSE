import Link from "next/link";

const VENUE_NAME = "The Grand Roundhouse";
const HERO_TITLE = "A Luxury Wedding Venue Like No Other";
const HERO_SUBTITLE = "Where every celebration is crafted with care, elegance and timeless attention to detail.";
const STATS = [
  { value: "1,500+", label: "Reviews" },
  { value: "3", label: "Luxury Ballrooms" },
  { value: "800+", label: "Capacity" },
];

export default function Hero() {
  return (
    <section className="hero" aria-label="Welcome">
      <div className="hero-bg" />
      <div className="hero-overlay" aria-hidden />
      <div className="hero-vignette" aria-hidden />
      <div className="hero-frame" aria-hidden />
      <div className="hero-content container">
        <p className="hero-venue">{VENUE_NAME}</p>
        <h1 className="hero-title">{HERO_TITLE}</h1>
        <div className="divider-gold-thick" style={{ marginTop: "1.5rem" }} />
        <div className="divider-gold" style={{ marginTop: "0.5rem" }} />
        <p className="hero-subtitle">{HERO_SUBTITLE}</p>
        <div className="hero-ctas">
          <Link href="/contact#enquire" className="btn btn-primary hero-cta">
            Enquire Now
          </Link>
          <Link href="/gallery" className="hero-cta-outline">
            View Gallery
          </Link>
        </div>
        <ul className="hero-stats">
          {STATS.map((stat) => (
            <li key={stat.label} className="hero-stat-item">
              <span className="hero-stat-value">{stat.value}</span>
              <span>{stat.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
