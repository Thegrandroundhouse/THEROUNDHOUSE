export type WeddingType =
  | "asian"
  | "african"
  | "turkish"
  | "sikh"
  | "muslim"
  | "hindu"
  | "bengali";

export type EventType =
  | "mehndi"
  | "bar-bat-mitzvah"
  | "corporate"
  | "birthdays";

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  avatar?: string;
}

export interface Suite {
  id: string;
  name: string;
  slug: string;
  capacity: number;
  description: string;
  image: string;
}

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  category: string;
}

export interface EnquiryFormData {
  typeOfFunction: string;
  whereDidYouHear: string;
  name: string;
  email: string;
  phone: string;
  date?: string;
  message?: string;
}

export interface SiteConfig {
  venueName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  comingSoon?: { month: string; year: string };
}
