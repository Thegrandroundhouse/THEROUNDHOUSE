"use client";

import { SWRConfig } from "swr";
import { swrConfig } from "@/lib/swr-config";
import { fetcher } from "@/lib/api";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={{ ...swrConfig, fetcher }}>{children}</SWRConfig>;
}
