import type { EventType } from "@/types/site";

export const eventTypes: { type: EventType; label: string; slug: string }[] = [
  { type: "mehndi", label: "Mehndi & Henna Parties", slug: "mehndi-henna" },
  { type: "corporate", label: "Corporate", slug: "corporate" },
  { type: "birthdays", label: "Birthdays", slug: "birthdays" },
];
