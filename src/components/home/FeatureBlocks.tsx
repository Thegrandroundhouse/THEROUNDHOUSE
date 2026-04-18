import { FeatureBlock } from "./FeatureBlock";
import type { FeatureBlockProps } from "./FeatureBlock";
import { AnimateIn } from "@/components/animations/AnimateIn";
import type { ImagesMap } from "@/lib/site-data-server";

const VENUE_PLACEHOLDERS = ["/images/venue/venue-1.png", "/images/venue/venue-2.png", "/images/venue/venue-3.png", "/images/venue/venue-4.png", "/images/venue/venue-5.png"];

const FEATURE_KEYS = ["feature_1_image", "feature_2_image", "feature_3_image", "feature_4_image", "feature_5_image"];

const features: Omit<FeatureBlockProps, "imageSrc" | "imageAlt">[] = [
  { label: "Our Spaces", title: "Three Luxury Ballrooms Under One Roof", paragraphs: ["From the flagship Grand Ballroom to the intimate Eternity and Infinity Suites, each space is designed to create unforgettable moments. Soaring ceilings, crystal chandeliers and bespoke layouts for every celebration."], buttonText: "View Suites", buttonHref: "/suites", imageSide: "right", variant: "ivory", imageOverlay: "fadeLeft" },
  { label: "In-House Catering", title: "Exceptional Cuisine, Tailored to You", paragraphs: ["Our passion for flavour drives every menu. We use only the freshest produce and the highest quality ingredients, combined with flair and innovation. From traditional feasts to bespoke creations, our chefs bring your vision to the table."], buttonText: "View Dining", buttonHref: "/catering", imageSide: "left", variant: "gold", imageOverlay: "vignette" },
  { label: "Décor & Design", title: "Imagine, Inspire, Design, Deliver", paragraphs: ["Midnight Garden Events is our exclusive luxury décor and production partner. We start with your imagination to create themes, concepts and mood boards. Every detail is designed to make your event stand out in the most breathtaking way."], buttonText: "View Décor", buttonHref: "/decor", imageSide: "right", variant: "warm", imageOverlay: "bottom" },
  { label: "Events", title: "Weddings, Mehndi, Corporate & More", paragraphs: ["Whether it's a wedding, Mehndi night or corporate gala, we bring the same care and grandeur to every occasion. Event management, in-house catering and décor all under one roof for a seamless experience."], buttonText: "Explore Events", buttonHref: "/events", imageSide: "left", variant: "cream", imageOverlay: "fadeRight" },
  { label: "Why Choose Us", title: "Over 1,500 Five-Star Reviews", paragraphs: ["We know your event will only happen once. That's why we go the extra mile for every bride, groom and family. From the first enquiry to the last dance, our team is with you every step of the way."], buttonText: "Read Testimonials", buttonHref: "/testimonials", imageSide: "right", variant: "dark", imageOverlay: "soft" },
];

export function FeatureBlocks({ images = {} }: { images?: ImagesMap }) {
  return (
    <>
      {features.map((base, i) => {
        const key = FEATURE_KEYS[i];
        const img = key ? images[key] : null;
        const props: FeatureBlockProps = {
          ...base,
          imageSrc: img?.url ?? VENUE_PLACEHOLDERS[i] ?? "/images/venue/venue-1.png",
          imageAlt: img?.alt_text ?? base.label,
        };
        return (
          <AnimateIn key={i} as="div" animation={props.imageSide === "left" ? "slide-in-left" : "slide-in-right"} delay={i * 100}>
            <FeatureBlock {...props} />
          </AnimateIn>
        );
      })}
    </>
  );
}
