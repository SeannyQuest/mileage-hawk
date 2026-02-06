"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plane,
  ArrowRight,
  Bell,
  ExternalLink,
  TrendingDown,
  Calendar,
  Clock,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CabinClassBadge } from "@/components/shared/CabinClassBadge";
import { DataFreshnessBadge } from "@/components/shared/DataFreshnessBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { PriceHistoryChart } from "@/components/prices/PriceHistoryChart";
import { formatPoints, formatPointsShort, formatTransferRatio } from "@/lib/amex-partners";
import { REGION_LABELS, CABIN_CLASS_LABELS } from "@/lib/constants";

interface Airline {
  id: string;
  name: string;
  code: string;
  loyaltyProgram: string;
  loyaltyCurrency: string;
  amexTransferRatio: number;
  logoUrl: string | null;
}

interface PriceEntry {
  id: string;
  airline: Airline;
  cabinClass: string;
  mileageCost: number;
  amexPointsEquivalent: number;
  cashCopay: number | null;
  availabilityCount: number | null;
  isDirect: boolean;
  travelDate: string;
  scrapedAt: string;
  bookingUrl: string | null;
}

interface HistoryEntry {
  date: string;
  minPrice: number;
  avgPrice: number;
  maxPrice: number;
  cabinClass: string;
  airlineCode: string;
  airlineName: string;
}

interface RouteDetailProps {
  route: {
    id: string;
    origin: string;
    originCity: string;
    originCountry: string;
    destination: string;
    destinationCity: string;
    destinationCountry: string;
    region: string;
  };
  prices: PriceEntry[];
  history: HistoryEntry[];
}

export function RouteDetail({ route, prices, history }: RouteDetailProps) {
  const [selectedCabin, setSelectedCabin] = useState<string>("all");

  const filteredPrices =
    selectedCabin === "all"
      ? prices
      : prices.filter((p) => p.cabinClass === selectedCabin);

  const filteredHistory =
    selectedCabin === "all"
      ? history
      : history.filter((h) => h.cabinClass === selectedCabin);

  // Get unique cabin classes with prices
  const availableCabins = [...new Set(prices.map((p) => p.cabinClass))];

  // Find best price per cabin
  const bestByClass: Record<string, PriceEntry> = {};
  for (const p of prices) {
    if (!bestByClass[p.cabinClass] || p.amexPointsEquivalent < bestByClass[p.cabinClass].amexPointsEquivalent) {
      bestByClass[p.cabinClass] = p;
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Route Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/routes" className="hover:text-foreground transition-colors">
            Routes
          </Link>
          <span>/</span>
          <span>{route.origin} → {route.destination}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <span>{route.originCity}</span>
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
              <span>{route.destinationCity}</span>
            </h1>
            <div className="flex items-center gap-3 mt-2 text-muted-foreground">
              <span>{route.origin} → {route.destination}</span>
              <Badge variant="outline">
                {REGION_LABELS[route.region] ?? route.region}
              </Badge>
              {prices.length > 0 && (
                <DataFreshnessBadge scrapedAt={prices[0].scrapedAt} />
              )}
            </div>
          </div>

          <Link href={`/alerts/new?route=${route.id}`}>
            <Button className="gap-2">
              <Bell className="h-4 w-4" />
              Set Price Alert
            </Button>
          </Link>
        </div>
      </div>

      {/* Best Prices Summary Cards */}
      {Object.keys(bestByClass).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(["ECONOMY_PLUS", "BUSINESS", "FIRST"] as const).map((cabin) => {
            const best = bestByClass[cabin];
            if (!best) return (
              <Card key={cabin} className="opacity-50">
                <CardContent className="pt-6 text-center">
                  <CabinClassBadge cabinClass={cabin} className="mb-2" />
                  <p className="text-sm text-muted-foreground">No data</p>
                </CardContent>
              </Card>
            );
            return (
              <Card key={cabin} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <CabinClassBadge cabinClass={cabin} />
                    {best.isDirect && (
                      <Badge variant="outline" className="text-xs">Direct</Badge>
                    )}
                  </div>
                  <div className="text-3xl font-bold text-green-700 mb-1">
                    {formatPointsShort(best.amexPointsEquivalent)}
                  </div>
                  <div className="text-sm text-muted-foreground">AMEX points</div>
                  <div className="mt-2 pt-2 border-t text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>{best.airline.name}</span>
                      <span>{formatPoints(best.mileageCost)} {best.airline.loyaltyCurrency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transfer ratio</span>
                      <span>{formatTransferRatio(best.airline.amexTransferRatio)}</span>
                    </div>
                    {best.cashCopay !== null && (
                      <div className="flex justify-between">
                        <span>Taxes/fees</span>
                        <span>${best.cashCopay.toFixed(0)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cabin filter tabs + content */}
      <Tabs value={selectedCabin} onValueChange={setSelectedCabin}>
        <TabsList>
          <TabsTrigger value="all">All Cabins</TabsTrigger>
          {availableCabins.map((cabin) => (
            <TabsTrigger key={cabin} value={cabin}>
              {CABIN_CLASS_LABELS[cabin] ?? cabin}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCabin} className="space-y-8 mt-6">
          {/* Price History Chart */}
          {filteredHistory.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingDown className="h-5 w-5" />
                  Price History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PriceHistoryChart data={filteredHistory} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={<TrendingDown className="h-10 w-10" />}
                  title="No history yet"
                  description="Price history will build over time as daily scraping runs accumulate data."
                />
              </CardContent>
            </Card>
          )}

          {/* Price Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plane className="h-5 w-5" />
                All Available Prices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPrices.length === 0 ? (
                <EmptyState
                  title="No prices available"
                  description="No award pricing data found for this route yet."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Airline</TableHead>
                        <TableHead>Cabin</TableHead>
                        <TableHead className="text-right">AMEX Points</TableHead>
                        <TableHead className="text-right">Airline Miles</TableHead>
                        <TableHead className="text-right">Ratio</TableHead>
                        <TableHead className="text-right">Taxes</TableHead>
                        <TableHead className="text-center">Seats</TableHead>
                        <TableHead className="text-center">Direct</TableHead>
                        <TableHead>Travel Date</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPrices.map((price) => (
                        <TableRow key={price.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{price.airline.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {price.airline.loyaltyProgram}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <CabinClassBadge cabinClass={price.cabinClass} variant="short" />
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-700">
                            {formatPoints(price.amexPointsEquivalent)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatPoints(price.mileageCost)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatTransferRatio(price.airline.amexTransferRatio)}
                          </TableCell>
                          <TableCell className="text-right">
                            {price.cashCopay !== null ? `$${price.cashCopay.toFixed(0)}` : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            {price.availabilityCount !== null ? (
                              <div className="flex items-center justify-center gap-1">
                                <Users className="h-3 w-3" />
                                {price.availabilityCount}
                              </div>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            {price.isDirect ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">Yes</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">No</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {new Date(price.travelDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            {price.bookingUrl && (
                              <a
                                href={price.bookingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button variant="ghost" size="sm" className="gap-1">
                                  <ExternalLink className="h-3 w-3" />
                                  Book
                                </Button>
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Updated timestamp */}
          {filteredPrices.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last updated: {new Date(filteredPrices[0].scrapedAt).toLocaleString()}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
