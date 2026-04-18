import type { WeddingType } from "@/types";

export const weddingTypes: { type: WeddingType; label: string; slug: string }[] = [
  { type: "asian", label: "Asian Weddings", slug: "asian-weddings" },
  { type: "african", label: "African Weddings", slug: "african-weddings" },
  { type: "turkish", label: "Turkish Weddings", slug: "turkish-weddings" },
  { type: "sikh", label: "Sikh Weddings", slug: "sikh-weddings" },
  { type: "muslim", label: "Muslim Weddings", slug: "muslim-weddings" },
  { type: "hindu", label: "Hindu Weddings", slug: "hindu-weddings" },
  { type: "bengali", label: "Bengali Weddings", slug: "bengali-weddings" },
];
