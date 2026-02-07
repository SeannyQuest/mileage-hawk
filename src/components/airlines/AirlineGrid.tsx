"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatTransferRatio } from "@/lib/amex-partners";
import type { AirlineData } from "@/lib/types";
import Link from "next/link";
import {
  Plane,
  ArrowRightLeft,
  AlertTriangle,
  Check,
  Home,
  ChevronRight,
} from "lucide-react";

interface AirlineGridProps {
  airlines: AirlineData[];
}

export function AirlineGrid({ airlines }: AirlineGridProps) {
  const oneToOne = airlines.filter((a) => a.amexTransferRatio === 1.0);
  const other = airlines.filter((a) => a.amexTransferRatio !== 1.0);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
          <Home className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Airlines</span>
      </nav>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">AMEX Transfer Partners</h1>
        <p className="text-muted-foreground">
          {airlines.length} airline loyalty programs accessible via Membership Rewards points
        </p>
      </div>

      {/* 1:1 Partners */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Check className="h-5 w-5 text-green-600" />
          1:1 AMEX Transfer Partners ({oneToOne.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {oneToOne.map((airline) => (
            <AirlineCard key={airline.code} airline={airline} />
          ))}
        </div>
      </section>

      <Separator />

      {/* Non-1:1 Partners */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-amber-600" />
          Other Ratios ({other.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {other.map((airline) => (
            <AirlineCard key={airline.code} airline={airline} />
          ))}
        </div>
      </section>
    </div>
  );
}

function AirlineCard({ airline }: { airline: AirlineData }) {
  const isSubPar = airline.amexTransferRatio < 1.0;
  const isBonus = airline.amexTransferRatio > 1.0;
  const hasCoverage = airline.seatsAeroCode !== null;
  const hasCapitalOne = airline.capitalOneTransferRatio !== null && airline.capitalOneTransferRatio !== undefined;
  const c1IsBonus = hasCapitalOne && airline.capitalOneTransferRatio! > 1.0;
  const c1IsSubPar = hasCapitalOne && airline.capitalOneTransferRatio! < 1.0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold">{airline.name}</h3>
            <p className="text-sm text-muted-foreground">{airline.loyaltyProgram}</p>
          </div>
          <div className="text-right space-y-1.5">
            <Badge
              variant="outline"
              className={
                isBonus
                  ? "bg-green-50 text-green-700 border-green-200"
                  : isSubPar
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
              }
            >
              {formatTransferRatio(airline.amexTransferRatio)}
            </Badge>
            {hasCapitalOne && (
              <Badge
                variant="outline"
                className={
                  c1IsBonus
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : c1IsSubPar
                      ? "bg-orange-50 text-orange-700 border-orange-200"
                      : "bg-indigo-50 text-indigo-700 border-indigo-200"
                }
              >
                C1: {formatTransferRatio(airline.capitalOneTransferRatio!)}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Currency</span>
            <span className="text-foreground">{airline.loyaltyCurrency}</span>
          </div>
          {airline.alliance && (
            <div className="flex justify-between text-muted-foreground">
              <span>Alliance</span>
              <span className="text-foreground">{airline.alliance}</span>
            </div>
          )}
          <div className="flex justify-between text-muted-foreground">
            <span>Min. Transfer</span>
            <span className="text-foreground">
              {airline.minimumTransfer.toLocaleString()} pts
            </span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
          {airline.hasTransferFee && (
            <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200 gap-1">
              <AlertTriangle className="h-3 w-3" />
              Transfer Fee
            </Badge>
          )}
          {hasCoverage ? (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200 gap-1">
              <Check className="h-3 w-3" />
              Live Pricing
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
              <Plane className="h-3 w-3" />
              Chart-Based
            </Badge>
          )}
          <Badge variant="outline" className="text-xs font-mono">
            {airline.code}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
