import type { Metadata } from "next";
import { TestimonialsFull } from "@/components/testimonials/TestimonialsFull";

export const metadata: Metadata = {
  title: "Testimonials – The Grand Roundhouse",
  description: "What our couples and clients say about their experience at The Grand Roundhouse.",
};

export default function TestimonialsPage() {
  return (
    <main id="main-content" className="page-content bg-ivory">
      <div className="container py-16 md:py-24">
        <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-gold">Kind Words</p>
        <h1 className="page-title mt-2">Testimonials</h1>
        <div className="divider-gold mt-4" />
        <p className="page-lead mt-4">
          Hear from couples and families who celebrated their special day with us.
        </p>
        <TestimonialsFull />
      </div>
    </main>
  );
}
