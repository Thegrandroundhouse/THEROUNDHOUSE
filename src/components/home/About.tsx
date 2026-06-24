import Link from "next/link";

export default function About() {
  return (
    <section className="about-section" id="about">
      <div className="container about-grid">
        <div className="about-image-wrap">
          <div
            className="about-image"
            style={{
              backgroundImage: `url("https://images.unsplash.com/photo-1569074187119-cb18bd377e43?w=800&q=80")`,
            }}
          />
        </div>
        <div className="about-content">
          <p className="section-label">About Us</p>
          <h2 className="section-heading">
            Welcome to
            <br />
            The Grand Round House
          </h2>
          <p className="about-text">
            The Grand Round House is a luxury wedding and reception venue in Dagenham,
            Essex. We are unique because we know that each event will only
            happen once in a lifetime — and so we do everything possible to
            ensure perfection for your special day.
          </p>
          <p className="about-text">
            We truly care about our clients and always go the extra mile for
            each and every bride, groom, family and client who comes through our
            doors.
          </p>
          <Link href="/contact" className="btn btn-primary">
            About Us
          </Link>
        </div>
      </div>
    </section>
  );
}
