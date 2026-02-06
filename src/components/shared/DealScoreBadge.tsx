import { Badge } from "@/components/ui/badge";
import { getDealTierInfo } from "@/lib/constants";
import type { DealTier } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sparkles, Star, TrendingDown, Flame, CircleDot } from "lucide-react";

interface DealScoreBadgeProps {
  tier: DealTier;
  score?: number;
  className?: string;
}

const TIER_STYLES: Record<DealTier, { bg: string; text: string; icon: typeof Star }> = {
  unicorn: { bg: "bg-amber-100", text: "text-amber-700", icon: Sparkles },
  amazing: { bg: "bg-purple-100", text: "text-purple-700", icon: Flame },
  great: { bg: "bg-blue-100", text: "text-blue-700", icon: Star },
  good: { bg: "bg-green-100", text: "text-green-700", icon: TrendingDown },
  fair: { bg: "bg-gray-100", text: "text-gray-600", icon: CircleDot },
};

export function DealScoreBadge({ tier, score, className }: DealScoreBadgeProps) {
  const tierInfo = getDealTierInfo(tier);
  const style = TIER_STYLES[tier];
  const Icon = style.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        style.bg,
        style.text,
        "font-semibold border-0 gap-1",
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {tierInfo.label}
      {score !== undefined && score > 0 && (
        <span className="opacity-75">-{Math.round(score)}%</span>
      )}
    </Badge>
  );
}
