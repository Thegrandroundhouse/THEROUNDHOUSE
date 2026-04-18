import { getSiteContent, getSiteImages } from "@/lib/site-data-server";
import { GrandHero } from "@/components/home/GrandHero";
import { GrandAbout } from "@/components/home/GrandAbout";
import { FeatureBlocks } from "@/components/home/FeatureBlocks";
import { VenueGallery } from "@/components/home/VenueGallery";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { GrandWeddingTypes } from "@/components/home/GrandWeddingTypes";
import { GrandStats } from "@/components/home/GrandStats";
import { CateringDecor } from "@/components/home/CateringDecor";

export default async function HomePage() {
  const [content, images] = await Promise.all([getSiteContent(), getSiteImages()]);
  return (
    <>
      <GrandHero content={content} images={images} />
      <GrandAbout content={content} images={images} />
      <FeatureBlocks images={images} />
      <VenueGallery images={images} />
      <TestimonialsSection />
      <GrandWeddingTypes />
      <GrandStats />
      <CateringDecor />
    </>
  );
}
