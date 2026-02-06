"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plane,
  ArrowRight,
  Search,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RegionFilter } from "@/components/shared/RegionFilter";
import { EmptyState } from "@/components/shared/EmptyState";
import { RouteMap } from "./RouteMap";
import { REGION_LABELS, ORIGIN_CODES } from "@/lib/constants";

interface RouteItem {
  id: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  destinationCountry: string;
  region: string;
}

interface RouteBrowserProps {
  routes: RouteItem[];
}

export function RouteBrowser({ routes }: RouteBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);

  const filteredRoutes = useMemo(() => {
    return routes.filter((route) => {
      // Region filter
      if (selectedRegion && route.region !== selectedRegion) return false;
      // Origin filter
      if (selectedOrigin && route.origin !== selectedOrigin) return false;
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          route.destination.toLowerCase().includes(q) ||
          route.destinationCity.toLowerCase().includes(q) ||
          route.destinationCountry.toLowerCase().includes(q) ||
          route.origin.toLowerCase().includes(q) ||
          route.originCity.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [routes, searchQuery, selectedRegion, selectedOrigin]);

  // Group by destination city for cleaner display
  const groupedByDestination = useMemo(() => {
    const groups = new Map<string, RouteItem[]>();
    for (const route of filteredRoutes) {
      const key = route.destinationCity;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(route);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredRoutes]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Routes</h1>
        <p className="text-muted-foreground">
          {routes.length} monitored routes across {new Set(routes.map((r) => r.destinationCity)).size} destinations
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search destinations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {ORIGIN_CODES.map((code) => (
              <Button
                key={code}
                variant={selectedOrigin === code ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedOrigin(selectedOrigin === code ? null : code)}
              >
                {code}
              </Button>
            ))}
          </div>
        </div>
        <RegionFilter selected={selectedRegion} onChange={setSelectedRegion} />
      </div>

      {/* Route Map */}
      <RouteMap
        routes={filteredRoutes.map((r) => ({
          origin: r.origin,
          destination: r.destination,
          region: r.region,
        }))}
      />

      {/* Route Grid */}
      {groupedByDestination.length === 0 ? (
        <EmptyState
          icon={<Filter className="h-12 w-12" />}
          title="No routes match your filters"
          description="Try adjusting your search or region filter."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupedByDestination.map(([city, cityRoutes]) => (
            <Card key={city} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold">{city}</h3>
                    <p className="text-sm text-muted-foreground">
                      {cityRoutes[0].destinationCountry}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {REGION_LABELS[cityRoutes[0].region] ?? cityRoutes[0].region}
                  </Badge>
                </div>
                <div className="space-y-1.5 mt-3">
                  {cityRoutes.map((route) => (
                    <Link
                      key={route.id}
                      href={`/routes/${route.origin.toLowerCase()}-${route.destination.toLowerCase()}`}
                      className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-accent transition-colors"
                    >
                      <Plane className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{route.origin}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span>{route.destination}</span>
                      <span className="text-muted-foreground ml-auto">
                        {route.originCity}
                      </span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
