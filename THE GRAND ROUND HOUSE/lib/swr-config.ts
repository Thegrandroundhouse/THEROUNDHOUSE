import type { SWRConfiguration } from "swr";

export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60 * 1000, // 1 min
  focusThrottleInterval: 60 * 1000,
  errorRetryCount: 2,
};

export const SWR_KEYS = {
  testimonials: "/api/testimonials",
  suites: "/api/suites",
  gallery: (category: string) => `/api/gallery?category=${category}`,
  config: "/api/config",
} as const;
