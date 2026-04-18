"use client";

import useSWR from "swr";
import { SWR_KEYS } from "@/lib/swr-config";
import type { Suite } from "@/types";

export function useSuites() {
  const { data, error, isLoading, mutate } = useSWR<Suite[]>(SWR_KEYS.suites);
  return { suites: data ?? [], error, isLoading, mutate };
}
