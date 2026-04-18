import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        champagne: "#f5ebe0",
        "champagne-dark": "#e8dcc8",
        gold: "#b8860b",
        "gold-light": "#d4af37",
        "gold-pale": "#f0e6d3",
        "gold-dark": "#8b6914",
        charcoal: "#141414",
        "charcoal-soft": "#2d2d2d",
        ivory: "#faf8f5",
        cream: "#fdfcfa",
        ink: "#050505",
        "ink-soft": "#0a0a0a",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-elegant": "linear-gradient(180deg, var(--tw-gradient-stops))",
        "hero-overlay": "linear-gradient(to bottom, rgba(5,5,5,0.5) 0%, rgba(5,5,5,0.75) 100%)",
        "gold-shine": "linear-gradient(135deg, rgba(212,175,55,0.15) 0%, transparent 50%, rgba(212,175,55,0.08) 100%)",
        "luxury-mesh": "radial-gradient(ellipse 100% 80% at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 60%), radial-gradient(ellipse 80% 50% at 80% 100%, rgba(184,134,11,0.05) 0%, transparent 50%)",
      },
      animation: {
        "fade-in": "fadeIn 1.2s ease-out forwards",
        "fade-in-up": "fadeInUp 1s ease-out forwards",
        "fade-in-up-slow": "fadeInUp 1.2s ease-out forwards",
        "slide-in-left": "slideInLeft 0.8s ease-out forwards",
        "slide-in-right": "slideInRight 0.8s ease-out forwards",
        "scale-in": "scaleIn 0.7s ease-out forwards",
        "shine": "shine 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(28px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shine: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
      boxShadow: {
        "elegant": "0 4px 24px -4px rgba(184, 134, 11, 0.12), 0 8px 32px -8px rgba(0,0,0,0.08)",
        "elegant-lg": "0 12px 48px -12px rgba(184, 134, 11, 0.15), 0 24px 64px -24px rgba(0,0,0,0.1)",
        "gold-glow": "0 0 40px -8px rgba(184, 134, 11, 0.35)",
        "luxury": "0 0 0 1px rgba(212,175,55,0.12), 0 8px 32px -8px rgba(0,0,0,0.06), 0 24px 64px -24px rgba(184,134,11,0.08)",
        "luxury-hover": "0 0 0 1px rgba(212,175,55,0.2), 0 16px 48px -12px rgba(0,0,0,0.08), 0 32px 80px -24px rgba(184,134,11,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
