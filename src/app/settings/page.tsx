import { Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage your notification preferences and account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Choose how you want to receive price drop alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Sign in to configure your notification preferences, timezone, and quiet hours.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Sign in to manage your account, view alert history, and update your profile.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Source</CardTitle>
          <CardDescription>Award pricing data configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Primary Source</span>
            <span>Seats.aero API</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Coverage</span>
            <span>12 of 17 AMEX partners</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Update Schedule</span>
            <span>Daily at 6:00 AM CT</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
