"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Sparkles, ArrowUpDown, ArrowRight, ChevronRight, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RegionFilter } from "@/components/shared/RegionFilter";
import { CabinClassBadge } from "@/components/shared/CabinClassBadge";
import { DealScoreBadge } from "@/components/shared/DealScoreBadge";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useBestDeals } from "@/lib/hooks/use-prices";
import { formatPointsShort } from "@/lib/amex-partners";
import { REGION_LABELS, CABIN_CLASS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";

type SortOption = "score" | "price" | "savings";

const SORT_LABELS: Record<SortOption, string> = {
  score: "Deal Score",
  price: "Lowest Price",
  savings: "Savings %",
};

export default function DealsPage() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedCabin, setSelectedCabin] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("score");

  const { data, isLoading, error } = useBestDeals({
    region: selectedRegion ?? undefined,
    cabinClass: selectedCabin ?? undefined,
    limit: 30,
  });

  const deals = useMemo(() => {
    const rawDeals = data?.data ?? [];
    const sorted = [...rawDeals];
    switch (sortBy) {
      case "price":
        sorted.sort((a: { amexPointsEquivalent: number }, b: { amexPointsEquivalent: number }) =>
          a.amexPointsEquivalent - b.amexPointsEquivalent
        );
        break;
      case "savings":
        sorted.sort((a: { savingsPercent: number | null }, b: { savingsPercent: number | null }) =>
          (b.savingsPercent ?? 0) - (a.savingsPercent ?? 0)
        );
        break;
      case "score":
      default:
        sorted.sort((a: { dealScore: number }, b: { dealScore: number }) =>
          b.dealScore - a.dealScore
        );
        break;
    }
    return sorted;
  }, [data, sortBy]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
          <Home className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Deals</span>
      </nav>

      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-amber-500" />
          Best Deals
        </h1>
        <p className="text-muted-foreground">
          The lowest mileage prices across all monitored routes today
        </p>
      </div>

      {/* Filters + Sort */}
      <div className="space-y-3">
        <RegionFilter selected={selectedRegion} onChange={setSelectedRegion} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex gap-2">
            {["ECONOMY_PLUS", "BUSINESS", "FIRST"].map((cabin) => (
              <Button
                key={cabin}
                variant={selectedCabin === cabin ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCabin(selectedCabin === cabin ? null : cabin)}
              >
                {CABIN_CLASS_LABELS[cabin] ?? cabin}
              </Button>
            ))}
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Sort:</span>
            {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
              <Button
                key={option}
                variant={sortBy === option ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy(option)}
              >
                {SORT_LABELS[option]}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <LoadingState variant="cards" count={6} />
      ) : error ? (
        <EmptyState
          title="Failed to load deals"
          description="There was an error fetching the latest deals. Please try again."
        />
      ) : deals.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-12 w-12" />}
          title="No deals found"
          description="No price data available yet. Deals will appear after the first scraping run completes."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deals.map((deal: {
            id: string;
            origin: string;
            originCity: string;
            destination: string;
            destinationCity: string;
            region: string;
            cabinClass: string;
            airline: { name: string; code: string };
            amexPointsEquivalent: number;
            capitalOnePointsEquivalent?: number | null;
            isDirect: boolean;
            dealScore: number;
            dealTier: "fair" | "good" | "great" | "amazing" | "unicorn";
          }) => (
            <Card key={deal.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {deal.airline.name}
                      </span>
                      <CabinClassBadge cabinClass={deal.cabinClass} variant="short" />
                    </div>
                    <div className="text-lg font-semibold flex items-center gap-1">
                      {deal.origin}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      {deal.destination}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {deal.originCity} to {deal.destinationCity}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-xl font-bold text-green-700">
                      {formatPointsShort(deal.amexPointsEquivalent)}
                    </div>
                    <div className="text-xs text-muted-foreground">AMEX pts</div>
                    {deal.capitalOnePointsEquivalent !== null && deal.capitalOnePointsEquivalent !== undefined && (
                      <div className="text-xs text-blue-600">
                        {formatPointsShort(deal.capitalOnePointsEquivalent)} C1
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DealScoreBadge
                      tier={deal.dealTier}
                      score={deal.dealScore}
                    />
                    {deal.isDirect && (
                      <Badge variant="outline" className="text-xs">Direct</Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {REGION_LABELS[deal.region] ?? deal.region}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
