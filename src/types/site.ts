export type WeddingType = "asian" | "african" | "turkish" | "sikh" | "muslim" | "hindu" | "bengali";
export type EventType = "mehndi" | "corporate" | "birthdays";

export interface SiteConfig {
  venueName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
}

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
