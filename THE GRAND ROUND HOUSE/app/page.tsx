import { Hero } from "@/components/home/Hero";
import { ComingSoonSection } from "@/components/home/ComingSoonSection";
import { About } from "@/components/home/About";
import { FeatureBlocks } from "@/components/home/FeatureBlocks";
import { VenueGallery } from "@/components/home/VenueGallery";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { WeddingTypes } from "@/components/home/WeddingTypes";
import { Stats } from "@/components/home/Stats";
import { CateringDecor } from "@/components/home/CateringDecor";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ComingSoonSection />
      <About />
      <FeatureBlocks />
      <VenueGallery />
      <TestimonialsSection />
      <WeddingTypes />
      <Stats />
      <CateringDecor />
    </>
  );
}
