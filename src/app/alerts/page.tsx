"use client";

import Link from "next/link";
import { Bell, Plus, BellOff, Home, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CabinClassBadge } from "@/components/shared/CabinClassBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useAlerts, useDeleteAlert, useUpdateAlert } from "@/lib/hooks/use-alerts";
import { formatPointsShort } from "@/lib/amex-partners";
import { Switch } from "@/components/ui/switch";

export default function AlertsPage() {
  const { data, isLoading } = useAlerts();
  const deleteAlert = useDeleteAlert();
  const updateAlert = useUpdateAlert();

  const alerts = data?.data ?? [];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
          <Home className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Alerts</span>
      </nav>

      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Alerts
          </h1>
          <p className="text-muted-foreground">
            Get notified when award prices drop below your thresholds
          </p>
        </div>
        <Link href="/alerts/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Alert
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <LoadingState variant="cards" count={3} />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={<BellOff className="h-12 w-12" />}
          title="No alerts yet"
          description="Create your first alert to get notified when award flight prices drop below your target."
          action={
            <Link href="/alerts/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Alert
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map((alert: {
            id: string;
            originCode: string;
            originCity: string;
            destinationCode: string;
            destinationCity: string;
            cabinClass: string;
            airlineName: string | null;
            thresholdPoints: number;
            alertChannels: string[];
            isActive: boolean;
            lastTriggeredAt: string | null;
          }) => (
            <Card key={alert.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-lg font-semibold">
                      {alert.originCode} → {alert.destinationCode}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {alert.originCity} to {alert.destinationCity}
                    </div>
                  </div>
                  <Switch
                    checked={alert.isActive}
                    onCheckedChange={(checked) =>
                      updateAlert.mutate({
                        id: alert.id,
                        data: { isActive: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <CabinClassBadge cabinClass={alert.cabinClass} />
                  {alert.airlineName ? (
                    <Badge variant="outline">{alert.airlineName}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Any Airline
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-muted-foreground">Threshold: </span>
                    <span className="font-semibold">
                      {formatPointsShort(alert.thresholdPoints)} pts
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {alert.alertChannels.map((ch: string) => (
                      <Badge key={ch} variant="secondary" className="text-xs">
                        {ch}
                      </Badge>
                    ))}
                  </div>
                </div>

                {alert.lastTriggeredAt && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Last triggered: {new Date(alert.lastTriggeredAt).toLocaleDateString()}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteAlert.mutate(alert.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
