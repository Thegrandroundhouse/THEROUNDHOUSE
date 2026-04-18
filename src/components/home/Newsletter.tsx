"use client";

import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");

  return (
    <section className="newsletter-section" aria-label="Newsletter">
      <div className="container newsletter-inner">
        <h2 className="section-heading">Join Our Guest List</h2>
        <p className="newsletter-text">
          Be the first to hear about new events, venue showcases, and seasonal
          inspiration.
        </p>
        <form
          className="newsletter-form"
          onSubmit={(e) => {
            e.preventDefault();
            // TODO: submit to Supabase or API
          }}
        >
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="newsletter-input"
            required
            aria-label="Email address"
          />
          <button type="submit" className="btn btn-primary">
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}
