"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AIRPORTS } from "@/lib/constants";

interface RouteMapProps {
  routes: Array<{
    origin: string;
    destination: string;
    region: string;
  }>;
  highlightedRoute?: { origin: string; destination: string } | null;
}

// Simple Mercator projection
function project(lat: number, lng: number, width: number, height: number): [number, number] {
  const x = ((lng + 180) / 360) * width;
  // Clamp latitude for Mercator
  const clampedLat = Math.max(-85, Math.min(85, lat));
  const latRad = (clampedLat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = height / 2 - (mercN / Math.PI) * (height / 2);
  return [x, y];
}

// Region colors
const REGION_COLORS: Record<string, string> = {
  EUROPE: "#6366f1",
  ASIA: "#ec4899",
  MIDDLE_EAST: "#f59e0b",
  OCEANIA: "#14b8a6",
  LATIN_AMERICA_MEXICO: "#22c55e",
  LATIN_AMERICA_SOUTH: "#10b981",
};

export function RouteMap({ routes, highlightedRoute }: RouteMapProps) {
  const WIDTH = 900;
  const HEIGHT = 450;

  // Build airport lookup from constants
  const airportMap = useMemo(() => {
    const map = new Map<string, { code: string; city: string; lat: number; lng: number; isOrigin: boolean }>();
    for (const a of AIRPORTS) {
      map.set(a.code, { code: a.code, city: a.city, lat: a.latitude, lng: a.longitude, isOrigin: a.isOrigin });
    }
    return map;
  }, []);

  // Collect unique airports used in routes
  const usedAirports = useMemo(() => {
    const codes = new Set<string>();
    for (const r of routes) {
      codes.add(r.origin);
      codes.add(r.destination);
    }
    return Array.from(codes)
      .map((code) => airportMap.get(code))
      .filter(Boolean) as Array<{ code: string; city: string; lat: number; lng: number; isOrigin: boolean }>;
  }, [routes, airportMap]);

  // Compute unique route arcs
  const arcs = useMemo(() => {
    const seen = new Set<string>();
    return routes
      .map((r) => {
        const key = `${r.origin}-${r.destination}`;
        if (seen.has(key)) return null;
        seen.add(key);
        const from = airportMap.get(r.origin);
        const to = airportMap.get(r.destination);
        if (!from || !to) return null;
        const isHighlighted =
          highlightedRoute?.origin === r.origin && highlightedRoute?.destination === r.destination;
        return { from, to, region: r.region, isHighlighted };
      })
      .filter(Boolean) as Array<{
      from: { code: string; lat: number; lng: number };
      to: { code: string; lat: number; lng: number };
      region: string;
      isHighlighted: boolean;
    }>;
  }, [routes, airportMap, highlightedRoute]);

  // Generate a curved path between two projected points (quadratic Bezier)
  function arcPath(from: [number, number], to: [number, number]): string {
    const midX = (from[0] + to[0]) / 2;
    const midY = (from[1] + to[1]) / 2;
    // Curve upward proportional to distance
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    const offset = Math.min(dist * 0.25, 80);
    const cpX = midX;
    const cpY = midY - offset;
    return `M ${from[0]} ${from[1]} Q ${cpX} ${cpY} ${to[0]} ${to[1]}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Route Map</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden rounded-b-lg">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto bg-slate-50 dark:bg-slate-900"
          style={{ minHeight: 200 }}
        >
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="45" height="45" patternUnits="userSpaceOnUse">
              <path
                d="M 45 0 L 0 0 0 45"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.3"
                className="text-slate-200 dark:text-slate-700"
              />
            </pattern>
          </defs>
          <rect width={WIDTH} height={HEIGHT} fill="url(#grid)" />

          {/* Arcs */}
          {arcs.map((arc, i) => {
            const from = project(arc.from.lat, arc.from.lng, WIDTH, HEIGHT);
            const to = project(arc.to.lat, arc.to.lng, WIDTH, HEIGHT);
            const color = REGION_COLORS[arc.region] ?? "#94a3b8";
            return (
              <path
                key={i}
                d={arcPath(from, to)}
                fill="none"
                stroke={color}
                strokeWidth={arc.isHighlighted ? 2.5 : 1}
                strokeOpacity={arc.isHighlighted ? 0.9 : 0.3}
                strokeDasharray={arc.isHighlighted ? "none" : "4 3"}
              />
            );
          })}

          {/* Airport dots */}
          {usedAirports.map((airport) => {
            const [x, y] = project(airport.lat, airport.lng, WIDTH, HEIGHT);
            const isOrigin = airport.isOrigin;
            return (
              <g key={airport.code}>
                <circle
                  cx={x}
                  cy={y}
                  r={isOrigin ? 5 : 3.5}
                  fill={isOrigin ? "#ef4444" : "#3b82f6"}
                  stroke="white"
                  strokeWidth={1.5}
                />
                <text
                  x={x}
                  y={y - (isOrigin ? 8 : 6)}
                  textAnchor="middle"
                  className="fill-slate-600 dark:fill-slate-300"
                  fontSize={isOrigin ? 10 : 8}
                  fontWeight={isOrigin ? 600 : 400}
                >
                  {airport.code}
                </text>
              </g>
            );
          })}

          {/* Legend */}
          <g transform={`translate(${WIDTH - 150}, 15)`}>
            <rect x={-8} y={-5} width={150} height={20} rx={4} className="fill-white/80 dark:fill-slate-800/80" />
            <circle cx={0} cy={6} r={4} fill="#ef4444" />
            <text x={8} y={10} fontSize={9} className="fill-slate-600 dark:fill-slate-300">
              Origin
            </text>
            <circle cx={55} cy={6} r={3} fill="#3b82f6" />
            <text x={62} y={10} fontSize={9} className="fill-slate-600 dark:fill-slate-300">
              Destination
            </text>
          </g>
        </svg>
      </CardContent>
    </Card>
  );
}
