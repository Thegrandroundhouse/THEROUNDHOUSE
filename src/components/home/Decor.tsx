import Link from "next/link";

export default function Decor() {
  return (
    <section className="decor-section" id="decor">
      <div className="container decor-grid">
        <div className="decor-content">
          <p className="section-label">Décor</p>
          <h2 className="section-heading">Luxury Décor & Production</h2>
          <p className="decor-text">
            Our in-house décor and production team is exclusive to The Grand Round House.
            Inspired by your dreams, our motto is “Imagine, Inspire, Design,
            Deliver”. We start with letting your imagination create our brief.
            We aim to inspire you with a vision for your event, including
            themes, concepts, mood boards and luxury touches.
          </p>
          <Link href="/decor" className="btn btn-primary">
            View décor
          </Link>
        </div>
        <div
          className="decor-image"
          style={{
            backgroundImage: `url("https://images.unsplash.com/photo-1519167758481-83f550bb4b44?w=800&q=80")`,
          }}
        />
      </div>
    </section>
  );
}
