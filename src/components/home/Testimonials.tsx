"use client";

import { useState } from "react";

const QUOTES = [
  {
    text: "Thank you so much for going above and beyond to make our wedding day so seamless and special. From the planning stages through to the big day itself, you were so supportive, responsive, and attentive to every detail. The Grand Round House looked absolutely stunning, and your team handled everything with such professionalism and warmth.",
    names: "Aimy & Kajesh",
  },
  {
    text: "We recently celebrated our Traditional Yoruba Nigerian wedding and White Wedding at The Grand Round House, and it was truly the best decision we could have made. From the very first visit, we were blown away by the sheer elegance and grandeur of the venue. The stunning chandeliers, luxurious decor, and beautifully designed spaces created the perfect backdrop for our special day.",
    names: "Annette Babyemi",
  },
  {
    text: "I don't even know where to start. Everything was amazing. The food, the venue, the décor set up, your team and the service was honestly top notch! Honestly, you smashed it and I cannot thank The Grand Round House enough for everything! We had the most amazing time!",
    names: "Ravnik Dhaliwal",
  },
  {
    text: "Thank you to the team at The Grand Round House who made our wedding day so special! We had such a wonderful time, everything went so smoothly and was well coordinated with all the suppliers. The chefs went out of their way to do bespoke requests and everyone loved the in-house decor and food!",
    names: "Pre Vyas",
  },
  {
    text: "What an absolute dream! If you're planning an Indian wedding, we can't recommend The Grand Round House enough — they've really got it all. You pay the price for the service but you really have a stress free day and can actually enjoy your special day. The combination of a gorgeous venue, authentic food, and incredible service made our big day so special.",
    names: "Dimple Rana",
  },
];

export default function Testimonials() {
  const [active, setActive] = useState(0);

  return (
    <section className="testimonials-section" aria-label="Testimonials">
      <div className="container">
        <p className="section-label">Testimonials</p>
        <h2 className="section-heading">What Our Couples Say</h2>
        <div className="testimonial-slide">
          <blockquote className="testimonial-quote">
            <p>"{QUOTES[active].text}"</p>
            <cite>— {QUOTES[active].names}</cite>
          </blockquote>
        </div>
        <div className="testimonial-dots">
          {QUOTES.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`testimonial-dot ${i === active ? "active" : ""}`}
              aria-label={`Go to testimonial ${i + 1}`}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
