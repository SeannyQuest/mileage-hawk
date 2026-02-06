"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  ArrowRight,
  ArrowLeft,
  Check,
  Search,
  Plane,
  Mail,
  MessageSquare,
  Smartphone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { CabinClassBadge } from "@/components/shared/CabinClassBadge";
import { formatPoints, formatPointsShort } from "@/lib/amex-partners";
import { CABIN_CLASS_LABELS, REGION_LABELS } from "@/lib/constants";
import type { RegionThresholds } from "@/lib/types";
import { toast } from "sonner";

interface Route {
  id: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  region: string;
  label: string;
}

interface Airline {
  id: string;
  name: string;
  code: string;
}

interface AlertWizardProps {
  routes: Route[];
  airlines: Airline[];
  thresholds: RegionThresholds[];
}

type Step = 1 | 2 | 3 | 4;

export function AlertWizard({ routes, airlines, thresholds }: AlertWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRouteId = searchParams.get("route");

  const [step, setStep] = useState<Step>(preselectedRouteId ? 2 : 1);
  const [selectedRouteId, setSelectedRouteId] = useState<string>(preselectedRouteId ?? "");
  const [selectedCabin, setSelectedCabin] = useState<string>("");
  const [selectedAirlineId, setSelectedAirlineId] = useState<string | null>(null);
  const [thresholdPoints, setThresholdPoints] = useState<number>(50000);
  const [channels, setChannels] = useState<string[]>(["EMAIL"]);
  const [routeSearch, setRouteSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);

  // Filter routes by search
  const filteredRoutes = useMemo(() => {
    if (!routeSearch) return routes;
    const q = routeSearch.toLowerCase();
    return routes.filter(
      (r) =>
        r.origin.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        r.originCity.toLowerCase().includes(q) ||
        r.destinationCity.toLowerCase().includes(q)
    );
  }, [routes, routeSearch]);

  // Get suggested threshold based on region + cabin
  const suggestedThreshold = useMemo(() => {
    if (!selectedRoute || !selectedCabin) return null;
    const regionThreshold = thresholds.find((t) => t.region === selectedRoute.region);
    if (!regionThreshold) return null;

    switch (selectedCabin) {
      case "ECONOMY_PLUS":
        return regionThreshold.economyPlus;
      case "BUSINESS":
        return regionThreshold.business;
      case "FIRST":
        return regionThreshold.first;
      default:
        return null;
    }
  }, [selectedRoute, selectedCabin, thresholds]);

  // Set default threshold when cabin changes
  const handleCabinSelect = (cabin: string) => {
    setSelectedCabin(cabin);
    if (selectedRoute) {
      const regionThreshold = thresholds.find((t) => t.region === selectedRoute.region);
      if (regionThreshold) {
        let defaultPts = 50000;
        switch (cabin) {
          case "ECONOMY_PLUS":
            defaultPts = regionThreshold.economyPlus.goodDeal;
            break;
          case "BUSINESS":
            defaultPts = regionThreshold.business.goodDeal;
            break;
          case "FIRST":
            defaultPts = regionThreshold.first.goodDeal;
            break;
        }
        setThresholdPoints(defaultPts);
      }
    }
  };

  const toggleChannel = (channel: string) => {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const handleSubmit = async () => {
    if (!selectedRouteId || !selectedCabin || channels.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeId: selectedRouteId,
          cabinClass: selectedCabin,
          airlineId: selectedAirlineId,
          thresholdPoints,
          alertChannels: channels,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create alert");
      }

      toast.success("Alert created!", {
        description: `You'll be notified when prices drop below ${formatPointsShort(thresholdPoints)} points.`,
      });
      router.push("/alerts");
    } catch {
      toast.error("Failed to create alert. Please sign in first.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Max slider value based on region
  const maxSliderValue = useMemo(() => {
    if (!suggestedThreshold) return 200000;
    return suggestedThreshold.typicalRange[1] * 2;
  }, [suggestedThreshold]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="h-8 w-8" />
          Create Alert
        </h1>
        <p className="text-muted-foreground">
          Get notified when award prices drop below your target
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s < step
                  ? "bg-green-100 text-green-700"
                  : s === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 4 && (
              <div className={`h-0.5 w-8 ${s < step ? "bg-green-300" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Route */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Route</CardTitle>
            <CardDescription>Choose the route you want to track</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by city or airport code..."
                value={routeSearch}
                onChange={(e) => setRouteSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {filteredRoutes.map((route) => (
                <button
                  key={route.id}
                  onClick={() => {
                    setSelectedRouteId(route.id);
                    setStep(2);
                  }}
                  className={`w-full text-left p-3 rounded-lg flex items-center justify-between hover:bg-accent transition-colors ${
                    selectedRouteId === route.id ? "bg-accent ring-1 ring-primary" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{route.origin}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{route.destination}</span>
                    <span className="text-sm text-muted-foreground">
                      {route.originCity} to {route.destinationCity}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {REGION_LABELS[route.region] ?? route.region}
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Cabin Class */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Cabin Class</CardTitle>
            <CardDescription>
              {selectedRoute
                ? `${selectedRoute.origin} → ${selectedRoute.destination}`
                : "Choose the cabin class to monitor"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["ECONOMY_PLUS", "BUSINESS", "FIRST"] as const).map((cabin) => (
              <button
                key={cabin}
                onClick={() => {
                  handleCabinSelect(cabin);
                  setStep(3);
                }}
                className={`w-full text-left p-4 rounded-lg border hover:bg-accent transition-colors ${
                  selectedCabin === cabin ? "ring-1 ring-primary bg-accent" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <CabinClassBadge cabinClass={cabin} />
                  <span className="text-sm text-muted-foreground">
                    {CABIN_CLASS_LABELS[cabin]}
                  </span>
                </div>
              </button>
            ))}

            {/* Optional airline filter */}
            <div className="pt-4 border-t space-y-2">
              <Label className="text-sm text-muted-foreground">
                Specific airline (optional)
              </Label>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={selectedAirlineId === null ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedAirlineId(null)}
                >
                  Any Airline
                </Badge>
                {airlines.map((airline) => (
                  <Badge
                    key={airline.id}
                    variant={selectedAirlineId === airline.id ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() =>
                      setSelectedAirlineId(
                        selectedAirlineId === airline.id ? null : airline.id
                      )
                    }
                  >
                    {airline.code} - {airline.name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Set Threshold */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Set Price Threshold</CardTitle>
            <CardDescription>
              Alert when AMEX points cost drops below this amount
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-green-700 mb-2">
                {formatPoints(thresholdPoints)}
              </div>
              <div className="text-sm text-muted-foreground">AMEX Membership Rewards points</div>
            </div>

            <Slider
              value={[thresholdPoints]}
              onValueChange={([v]) => setThresholdPoints(v)}
              min={5000}
              max={maxSliderValue}
              step={2500}
              className="my-6"
            />

            {suggestedThreshold && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <button
                  onClick={() => setThresholdPoints(suggestedThreshold.goodDeal)}
                  className="p-3 rounded-lg border hover:bg-accent transition-colors text-center"
                >
                  <div className="font-medium text-green-700">
                    {formatPointsShort(suggestedThreshold.goodDeal)}
                  </div>
                  <div className="text-xs text-muted-foreground">Good Deal</div>
                </button>
                <button
                  onClick={() => setThresholdPoints(suggestedThreshold.exceptionalDeal)}
                  className="p-3 rounded-lg border hover:bg-accent transition-colors text-center"
                >
                  <div className="font-medium text-purple-700">
                    {formatPointsShort(suggestedThreshold.exceptionalDeal)}
                  </div>
                  <div className="text-xs text-muted-foreground">Exceptional Deal</div>
                </button>
              </div>
            )}

            <Button className="w-full" onClick={() => setStep(4)}>
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Notification Channels + Confirm */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Channels</CardTitle>
            <CardDescription>How do you want to be notified?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {[
                { id: "EMAIL", label: "Email", icon: Mail, description: "Get an email when the price drops" },
                { id: "SMS", label: "SMS", icon: MessageSquare, description: "Receive a text message" },
                { id: "PUSH", label: "Push", icon: Smartphone, description: "Browser push notification" },
              ].map(({ id, label, icon: Icon, description }) => (
                <label
                  key={id}
                  className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${
                    channels.includes(id) ? "ring-1 ring-primary bg-accent" : ""
                  }`}
                >
                  <Checkbox
                    checked={channels.includes(id)}
                    onCheckedChange={() => toggleChannel(id)}
                  />
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{label}</div>
                    <div className="text-sm text-muted-foreground">{description}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Summary */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
              <h4 className="font-semibold">Alert Summary</h4>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">Route:</span>
                <span>{selectedRoute?.origin} → {selectedRoute?.destination}</span>
                <span className="text-muted-foreground">Cabin:</span>
                <span>{CABIN_CLASS_LABELS[selectedCabin] ?? selectedCabin}</span>
                <span className="text-muted-foreground">Airline:</span>
                <span>
                  {selectedAirlineId
                    ? airlines.find((a) => a.id === selectedAirlineId)?.name
                    : "Any"}
                </span>
                <span className="text-muted-foreground">Threshold:</span>
                <span className="font-semibold text-green-700">
                  Below {formatPoints(thresholdPoints)} pts
                </span>
                <span className="text-muted-foreground">Channels:</span>
                <span>{channels.join(", ")}</span>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={isSubmitting || channels.length === 0}
            >
              {isSubmitting ? "Creating..." : "Create Alert"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={() => setStep((step - 1) as Step)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
      </div>
    </div>
  );
}
