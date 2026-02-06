"use client";

import Link from "next/link";
import {
  Plane,
  BarChart3,
  Bell,
  Sparkles,
  TrendingDown,
  ArrowRight,
  Building2,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CabinClassBadge } from "@/components/shared/CabinClassBadge";
import { DataFreshnessBadge } from "@/components/shared/DataFreshnessBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { QuickSearch } from "./QuickSearch";
import { formatPoints, formatPointsShort } from "@/lib/amex-partners";
import { REGION_LABELS, CABIN_CLASS_LABELS } from "@/lib/constants";
import type { AirlineData } from "@/lib/types";

interface QuickSearchRoute {
  id: string;
  slug: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  region: string;
}

interface DashboardProps {
  stats: {
    totalRoutes: number;
    totalAirlines: number;
    totalAlerts: number;
    lastScrapedAt: string | null;
    scrapeStatus: string | null;
  } | null;
  recentDeals: Array<{
    id: string;
    cabinClass: string;
    mileageCost: number;
    amexPointsEquivalent: number;
    isDirect: boolean;
    travelDate: Date | string;
    bookingUrl: string | null;
    route: {
      originAirport: { code: string; city: string };
      destinationAirport: { code: string; city: string; region: string };
    };
    airline: { name: string; code: string; loyaltyProgram: string; logoUrl: string | null };
  }>;
  airlines: AirlineData[];
  routes: QuickSearchRoute[];
}

export function DashboardClient({ stats, recentDeals, airlines, routes }: DashboardProps) {
  const hasData = recentDeals.length > 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Hero */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          {stats?.lastScrapedAt && (
            <DataFreshnessBadge scrapedAt={stats.lastScrapedAt} />
          )}
        </div>
        <p className="text-muted-foreground">
          Track award flight prices across AMEX Membership Rewards transfer partners
        </p>
        {/* Quick Search */}
        <div className="max-w-xl">
          <QuickSearch routes={routes} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Routes Monitored"
          value={stats?.totalRoutes ?? 0}
          icon={<MapPin className="h-4 w-4" />}
        />
        <StatCard
          title="Airlines"
          value={stats?.totalAirlines ?? airlines.length}
          icon={<Building2 className="h-4 w-4" />}
        />
        <StatCard
          title="Deals Found"
          value={recentDeals.length}
          icon={<Sparkles className="h-4 w-4" />}
        />
        <StatCard
          title="Active Alerts"
          value={stats?.totalAlerts ?? 0}
          icon={<Bell className="h-4 w-4" />}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Best Deals — takes 2/3 on large screens */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-green-600" />
              Best Deals
            </h2>
            <Link href="/deals">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          {hasData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Plane className="h-12 w-12" />}
              title="No price data yet"
              description="Price data will appear here once the daily scraping job runs. Set up your Seats.aero API key and trigger the first scrape."
              action={
                <Link href="/routes">
                  <Button>Browse Routes</Button>
                </Link>
              }
            />
          )}
        </div>

        {/* Sidebar — takes 1/3 */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/routes" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Plane className="h-4 w-4" />
                  Browse Routes
                </Button>
              </Link>
              <Link href="/deals" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Sparkles className="h-4 w-4" />
                  View Deals
                </Button>
              </Link>
              <Link href="/alerts" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Bell className="h-4 w-4" />
                  Manage Alerts
                </Button>
              </Link>
              <Link href="/airlines" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Building2 className="h-4 w-4" />
                  AMEX Partners
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Transfer Partners Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AMEX Transfer Partners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>1:1 Partners</span>
                  <span className="font-medium text-foreground">
                    {airlines.filter((a) => a.amexTransferRatio === 1.0).length}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Bonus Ratio</span>
                  <span className="font-medium text-foreground">
                    {airlines.filter((a) => a.amexTransferRatio > 1.0).length}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Sub-1:1 Ratio</span>
                  <span className="font-medium text-foreground">
                    {airlines.filter((a) => a.amexTransferRatio < 1.0).length}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>Total Partners</span>
                  <span>{airlines.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Regions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monitored Regions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(REGION_LABELS).map(([key, label]) => (
                  <Link key={key} href={`/deals?region=${key}`}>
                    <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                      {label}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Sub-Components ──

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DealCard({
  deal,
}: {
  deal: DashboardProps["recentDeals"][number];
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span>{deal.airline.name}</span>
              <CabinClassBadge cabinClass={deal.cabinClass} variant="short" />
            </div>
            <div className="text-lg font-semibold">
              {deal.route.originAirport.code}
              <ArrowRight className="inline h-4 w-4 mx-1 text-muted-foreground" />
              {deal.route.destinationAirport.code}
            </div>
            <div className="text-sm text-muted-foreground">
              {deal.route.originAirport.city} to {deal.route.destinationAirport.city}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-green-700">
              {formatPointsShort(deal.amexPointsEquivalent)}
            </div>
            <div className="text-xs text-muted-foreground">AMEX pts</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatPoints(deal.mileageCost)} {deal.airline.loyaltyProgram}</span>
          {deal.isDirect && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">Direct</Badge>
          )}
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            {REGION_LABELS[deal.route.destinationAirport.region] ?? deal.route.destinationAirport.region}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
