import Link from "next/link";

export default function Catering() {
  return (
    <section className="catering-section" id="catering">
      <div className="container catering-grid">
        <div
          className="catering-image"
          style={{
            backgroundImage: `url("https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80")`,
          }}
        />
        <div className="catering-content">
          <p className="section-label">In-House Catering</p>
          <h2 className="section-heading">The Grand Roundhouse Catering</h2>
          <p className="catering-text">
            Our passion for flavour drives us to deliver exceptional cuisine.
            Our approach is to create delicious dishes using only the freshest
            produce and the highest quality of ingredients — these combined with
            flair and innovation are the essential ingredients of our menus.
          </p>
          <Link href="/catering" className="btn btn-primary">
            View dining
          </Link>
        </div>
      </div>
    </section>
  );
}
