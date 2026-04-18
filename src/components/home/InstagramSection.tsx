const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80",
  "https://images.unsplash.com/photo-1569074187119-cb18bd377e43?w=400&q=80",
  "https://images.unsplash.com/photo-1519167758481-83f550bb4b44?w=400&q=80",
  "https://images.unsplash.com/photo-1555244162-803834f70033?w=400&q=80",
  "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400&q=80",
  "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=400&q=80",
];

export default function InstagramSection() {
  return (
    <section className="instagram-section" aria-label="Latest from Instagram">
      <div className="container">
        <p className="section-label">Follow us</p>
        <h2 className="section-heading">Our Latest Instagrams</h2>
        <div className="instagram-grid">
          {PLACEHOLDER_IMAGES.map((src, i) => (
            <a
              key={i}
              href="#"
              className="instagram-item"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Instagram post ${i + 1}`}
            >
              <img src={src} alt="" width={400} height={400} />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
