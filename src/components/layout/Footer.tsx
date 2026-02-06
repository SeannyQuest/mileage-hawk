import { Plane } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Plane className="h-4 w-4" />
            <span>MileageHawk</span>
            <Separator orientation="vertical" className="h-4" />
            <span>AMEX Membership Rewards Award Flight Tracker</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Prices are estimates based on award availability data. Always verify on the airline site before booking.
          </div>
        </div>
      </div>
    </footer>
  );
}
