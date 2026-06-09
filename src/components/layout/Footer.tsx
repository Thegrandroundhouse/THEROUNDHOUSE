"use client";

import Link from "next/link";
import { useState } from "react";
import { siteConfig } from "@/data/site";

const PHONE = siteConfig.phone;

const EXPLORE = [
  { label: "Weddings", href: "/weddings" },
  { label: "Events", href: "/events" },
  { label: "Gallery", href: "/gallery" },
  { label: "FAQs", href: "/faqs" },
];

const LINKS = [
  { label: "In-House Catering", href: "/catering" },
  { label: "Virtual Tour", href: "/virtual-tour" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Testimonials", href: "/testimonials" },
];

const SUITES = [
  { label: "Main Hall", href: "/suites#main-hall" },
  { label: "The Round Room", href: "/suites#round-room" },
  { label: "The Garden Suite", href: "/suites#garden-suite" },
  { label: "VIP Suites", href: "/suites#vip" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  return (
    <footer className="site-footer">
      <div className="container footer-guest-list">
        <h2 className="footer-guest-list-heading">Join Our Guest List</h2>
        <p className="footer-guest-list-text">
          Be the first to hear about new events, venue showcases, and seasonal inspiration.
        </p>
        <form
          className="footer-guest-list-form"
          onSubmit={(e) => {
            e.preventDefault();
            setEmail("");
          }}
        >
          <input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="footer-guest-list-input"
            required
            aria-label="Email address"
          />
          <button type="submit" className="btn btn-primary">Subscribe</button>
        </form>
      </div>
      <div className="container footer-grid">
        <div className="footer-brand">
          <div className="section-label">The Grand Roundhouse</div>
          <p className="footer-address">{siteConfig.address}</p>
          <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="footer-phone">
            {PHONE}
          </a>
        </div>
        <div className="footer-col">
          <h3 className="footer-title">Explore</h3>
          <ul className="footer-links">
            {EXPLORE.map(({ label, href }) => (
              <li key={href}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="footer-col">
          <h3 className="footer-title">Links</h3>
          <ul className="footer-links">
            {LINKS.map(({ label, href }) => (
              <li key={href}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="footer-col">
          <h3 className="footer-title">Suites</h3>
          <ul className="footer-links">
            {SUITES.map(({ label, href }) => (
              <li key={href}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="footer-bottom container">
        <p>© {new Date().getFullYear()} THE ROUNDHOUSE. All rights reserved.</p>
      </div>
    </footer>
  );
}
