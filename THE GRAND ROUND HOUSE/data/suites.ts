import type { Suite } from "@/types";

export const suites: Suite[] = [
  {
    id: "1",
    name: "Grand Ballroom",
    slug: "grand-ballroom",
    capacity: 400,
    description:
      "Our flagship space with soaring ceilings, crystal chandeliers and timeless elegance.",
    image: "/images/venue/venue-1.png",
  },
  {
    id: "2",
    name: "Meridian Ballroom",
    slug: "meridian-ballroom",
    capacity: 250,
    description:
      "Intimate yet grand, perfect for receptions and celebrations.",
    image: "/images/venue/venue-2.png",
  },
  {
    id: "3",
    name: "The Eternity Suite",
    slug: "eternity-suite",
    capacity: 150,
    description: "A refined setting for smaller gatherings and ceremonies.",
    image: "/images/venue/venue-3.png",
  },
  {
    id: "4",
    name: "The Infinity Suite",
    slug: "infinity-suite",
    capacity: 120,
    description: "Elegant and versatile for bespoke events.",
    image: "/images/venue/venue-4.png",
  },
];
