"use client";

import { useQuery } from "@tanstack/react-query";

export function useRoutes(params?: {
  origin?: string;
  region?: string;
  cabinClass?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.origin) searchParams.set("origin", params.origin);
  if (params?.region) searchParams.set("region", params.region);
  if (params?.cabinClass) searchParams.set("cabinClass", params.cabinClass);

  return useQuery({
    queryKey: ["routes", params],
    queryFn: async () => {
      const res = await fetch(`/api/routes?${searchParams}`);
      if (!res.ok) throw new Error("Failed to fetch routes");
      return res.json();
    },
  });
}

export function useAirlines() {
  return useQuery({
    queryKey: ["airlines"],
    queryFn: async () => {
      const res = await fetch("/api/airlines");
      if (!res.ok) throw new Error("Failed to fetch airlines");
      return res.json();
    },
    staleTime: 60 * 60 * 1000, // Airlines data rarely changes — 1 hour
  });
}
