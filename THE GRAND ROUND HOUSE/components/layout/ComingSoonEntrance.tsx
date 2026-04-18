"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { siteConfig } from "@/data/site";

const STORAGE_KEY = "grh_entered";

export function ComingSoonEntrance() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const hasEntered = typeof sessionStorage !== "undefined" && sessionStorage.getItem(STORAGE_KEY);
    if (!hasEntered) {
      setVisible(true);
    }
  }, [mounted]);

  const handleEnter = useCallback(() => {
    setExiting(true);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, "1");
    }
    setTimeout(() => setVisible(false), 400);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleEnter();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, handleEnter]);

  useEffect(() => {
    if (visible && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [visible]);

  if (!mounted || !visible) return null;

  const { comingSoon } = siteConfig;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-opacity duration-300 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
      aria-modal="true"
      role="dialog"
      aria-labelledby="coming-soon-title"
      aria-describedby="coming-soon-desc"
    >
      {/* Dimmed, blurred backdrop */}
      <div
        className="absolute inset-0 bg-charcoal/90 backdrop-blur-sm"
        aria-hidden
      />
      <button
        type="button"
        onClick={handleEnter}
        className="absolute inset-0 cursor-default focus:outline-none"
        tabIndex={-1}
        aria-label="Close overlay"
      />

      {/* Centered modal card */}
      <div
        className={`relative z-10 w-full max-w-lg rounded-xl bg-[#faf8f5] p-8 shadow-2xl transition-all duration-300 md:p-10 ${
          exiting ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">
          {siteConfig.venueName}
        </p>
        <h1
          id="coming-soon-title"
          className="mt-3 font-serif text-3xl font-semibold tracking-tight text-charcoal md:text-4xl"
        >
          Coming Soon
        </h1>
        {comingSoon && (
          <p className="mt-2 font-serif text-xl font-medium text-gold">
            Opening {comingSoon.month} {comingSoon.year}
          </p>
        )}
        <p id="coming-soon-desc" className="mt-6 text-charcoal/80 leading-relaxed">
          We&apos;re putting the finishing touches on something special. Be the first to know when we open.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleEnter}
            ref={buttonRef}
            className="rounded-lg border border-charcoal/20 bg-transparent px-6 py-2.5 text-sm font-medium text-charcoal transition hover:bg-charcoal/5 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2"
          >
            Enter site
          </button>
          <Link
            href="/contact"
            onClick={handleEnter}
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-2.5 text-sm font-medium text-charcoal transition hover:bg-gold-light focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2"
          >
            Register interest
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
