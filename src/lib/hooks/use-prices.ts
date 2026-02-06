"use client";

import { useQuery } from "@tanstack/react-query";

export function useBestDeals(params?: {
  region?: string;
  cabinClass?: string;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.region) searchParams.set("region", params.region);
  if (params?.cabinClass) searchParams.set("cabinClass", params.cabinClass);
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  return useQuery({
    queryKey: ["best-deals", params],
    queryFn: async () => {
      const res = await fetch(`/api/prices/best-deals?${searchParams}`);
      if (!res.ok) throw new Error("Failed to fetch deals");
      return res.json();
    },
  });
}

export function usePriceSearch(params: {
  origin?: string;
  destination?: string;
  region?: string;
  cabinClass?: string;
  dateFrom?: string;
  dateTo?: string;
  maxPoints?: number;
  directOnly?: boolean;
  sort?: string;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });

  return useQuery({
    queryKey: ["price-search", params],
    queryFn: async () => {
      const res = await fetch(`/api/prices/search?${searchParams}`);
      if (!res.ok) throw new Error("Failed to search prices");
      return res.json();
    },
    enabled: !!(params.origin || params.destination || params.region),
  });
}

export function useRoutePrices(routeId: string | undefined) {
  return useQuery({
    queryKey: ["route-prices", routeId],
    queryFn: async () => {
      const res = await fetch(`/api/routes/${routeId}/prices`);
      if (!res.ok) throw new Error("Failed to fetch route prices");
      return res.json();
    },
    enabled: !!routeId,
  });
}

export function usePriceHistory(
  routeId: string | undefined,
  params?: {
    days?: number;
    airline?: string;
    cabinClass?: string;
  }
) {
  const searchParams = new URLSearchParams();
  if (params?.days) searchParams.set("days", params.days.toString());
  if (params?.airline) searchParams.set("airline", params.airline);
  if (params?.cabinClass) searchParams.set("cabinClass", params.cabinClass);

  return useQuery({
    queryKey: ["price-history", routeId, params],
    queryFn: async () => {
      const res = await fetch(`/api/routes/${routeId}/history?${searchParams}`);
      if (!res.ok) throw new Error("Failed to fetch price history");
      return res.json();
    },
    enabled: !!routeId,
  });
}
