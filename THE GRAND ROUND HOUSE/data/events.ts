import type { EventType } from "@/types";

export const eventTypes: { type: EventType; label: string; slug: string }[] = [
  { type: "mehndi", label: "Mehndi & Henna Parties", slug: "mehndi-henna" },
  { type: "bar-bat-mitzvah", label: "Bar & Bat Mitzvah", slug: "bar-bat-mitzvah" },
  { type: "corporate", label: "Corporate", slug: "corporate" },
  { type: "birthdays", label: "Birthdays", slug: "birthdays" },
];
