import { FeatureBlock } from "./FeatureBlock";
import type { FeatureBlockProps } from "./FeatureBlock";
import { AnimateIn } from "@/components/animations/AnimateIn";

const features: FeatureBlockProps[] = [
  {
    imageSrc: "/images/venue/venue-1.png",
    imageAlt: "Grand ballroom with floral stage and gold accents",
    label: "Our Spaces",
    title: "Three Luxury Ballrooms Under One Roof",
    paragraphs: [
      "From the flagship Grand Ballroom to the intimate Eternity and Infinity Suites, each space is designed to create unforgettable moments. Soaring ceilings, crystal chandeliers and bespoke layouts for every celebration.",
    ],
    buttonText: "View Suites",
    buttonHref: "/suites",
    imageSide: "right",
    variant: "ivory",
    imageOverlay: "fadeLeft",
  },
  {
    imageSrc: "/images/venue/venue-2.png",
    imageAlt: "Ornate stage with golden arches and chandeliers",
    label: "In-House Catering",
    title: "Exceptional Cuisine, Tailored to You",
    paragraphs: [
      "Our passion for flavour drives every menu. We use only the freshest produce and the highest quality ingredients, combined with flair and innovation. From traditional feasts to bespoke creations, our chefs bring your vision to the table.",
    ],
    buttonText: "View Dining",
    buttonHref: "/catering",
    imageSide: "left",
    variant: "gold",
    imageOverlay: "vignette",
  },
  {
    imageSrc: "/images/venue/venue-3.png",
    imageAlt: "Elegant hall with hanging florals and crystal chandeliers",
    label: "Décor & Design",
    title: "Imagine, Inspire, Design, Deliver",
    paragraphs: [
      "Midnight Garden Events is our exclusive luxury décor and production partner. We start with your imagination to create themes, concepts and mood boards. Every detail is designed to make your event stand out in the most breathtaking way.",
    ],
    buttonText: "View Décor",
    buttonHref: "/decor",
    imageSide: "right",
    variant: "warm",
    imageOverlay: "bottom",
  },
  {
    imageSrc: "/images/venue/venue-4.png",
    imageAlt: "Reception hall with red carpet and floral centerpieces",
    label: "Events",
    title: "Weddings, Mehndi, Corporate & More",
    paragraphs: [
      "Whether it’s a wedding, Mehndi night, Bar Mitzvah or corporate gala, we bring the same care and grandeur to every occasion. Event management, in-house catering and décor all under one roof for a seamless experience.",
    ],
    buttonText: "Explore Events",
    buttonHref: "/events",
    imageSide: "left",
    variant: "cream",
    imageOverlay: "fadeRight",
  },
  {
    imageSrc: "/images/venue/venue-5.png",
    imageAlt: "Luxurious ballroom with gold and maroon decor",
    label: "Why Choose Us",
    title: "Over 1,500 Five-Star Reviews",
    paragraphs: [
      "We know your event will only happen once. That’s why we go the extra mile for every bride, groom and family. From the first enquiry to the last dance, our team is with you every step of the way.",
    ],
    buttonText: "Read Testimonials",
    buttonHref: "/testimonials",
    imageSide: "right",
    variant: "dark",
    imageOverlay: "soft",
  },
];

export function FeatureBlocks() {
  return (
    <>
      {features.map((props, i) => (
        <AnimateIn
          key={i}
          as="div"
          animation={props.imageSide === "left" ? "slide-in-left" : "slide-in-right"}
          delay={i * 100}
        >
          <FeatureBlock {...props} />
        </AnimateIn>
      ))}
    </>
  );
}
