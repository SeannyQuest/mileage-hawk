import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { STALE_DATA_HOURS } from "@/lib/constants";

interface DataFreshnessBadgeProps {
  scrapedAt: string | Date | null;
  className?: string;
}

export function DataFreshnessBadge({ scrapedAt, className }: DataFreshnessBadgeProps) {
  if (!scrapedAt) {
    return (
      <Badge variant="outline" className={cn("text-red-600 bg-red-50 border-red-200 gap-1", className)}>
        <AlertTriangle className="h-3 w-3" />
        No data
      </Badge>
    );
  }

  const date = typeof scrapedAt === "string" ? new Date(scrapedAt) : scrapedAt;
  const ageMs = Date.now() - date.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const isStale = ageHours > STALE_DATA_HOURS;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        isStale
          ? "text-amber-600 bg-amber-50 border-amber-200"
          : "text-green-600 bg-green-50 border-green-200",
        className
      )}
    >
      {isStale ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      {formatDistanceToNow(date, { addSuffix: true })}
    </Badge>
  );
}
