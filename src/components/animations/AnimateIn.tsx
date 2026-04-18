"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const animationClasses: Record<string, string> = {
  "fade-in-up": "animate-fade-in-up",
  "fade-in-up-slow": "animate-fade-in-up-slow",
  "slide-in-left": "animate-slide-in-left",
  "slide-in-right": "animate-slide-in-right",
  "scale-in": "animate-scale-in",
  "fade-in": "animate-fade-in",
};

interface AnimateInProps {
  children: ReactNode;
  animation?: keyof typeof animationClasses;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "article";
}

export function AnimateIn({
  children,
  animation = "fade-in-up",
  delay = 0,
  className = "",
  as: Tag = "div",
}: AnimateInProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const animClass = animationClasses[animation] ?? animationClasses["fade-in-up"];

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`${className} ${visible ? animClass : "opacity-0"}`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      {children}
    </Tag>
  );
}
