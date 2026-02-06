import { Badge } from "@/components/ui/badge";
import { CABIN_CLASS_LABELS, CABIN_CLASS_SHORT, CABIN_CLASS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface CabinClassBadgeProps {
  cabinClass: string;
  variant?: "default" | "short";
  className?: string;
}

export function CabinClassBadge({ cabinClass, variant = "default", className }: CabinClassBadgeProps) {
  const label = variant === "short"
    ? CABIN_CLASS_SHORT[cabinClass] || cabinClass
    : CABIN_CLASS_LABELS[cabinClass] || cabinClass;
  const fullLabel = CABIN_CLASS_LABELS[cabinClass] || cabinClass;
  const colorClass = CABIN_CLASS_COLORS[cabinClass] || "bg-gray-100 text-gray-800";

  return (
    <Badge
      variant="outline"
      className={cn(colorClass, "font-medium border-0", className)}
      title={variant === "short" ? fullLabel : undefined}
    >
      {label}
    </Badge>
  );
}
