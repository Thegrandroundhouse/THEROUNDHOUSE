"use client";

import useSWR from "swr";
import { SWR_KEYS } from "@/lib/swr-config";
import type { Testimonial } from "@/types";

export function useTestimonials() {
  const { data, error, isLoading, mutate } = useSWR<Testimonial[]>(SWR_KEYS.testimonials);
  return { testimonials: data ?? [], error, isLoading, mutate };
}
