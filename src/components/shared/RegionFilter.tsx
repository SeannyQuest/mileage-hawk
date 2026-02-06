"use client";

import { Badge } from "@/components/ui/badge";
import { REGION_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface RegionFilterProps {
  selected: string | null;
  onChange: (region: string | null) => void;
  className?: string;
}

const REGIONS = Object.entries(REGION_LABELS);

export function RegionFilter({ selected, onChange, className }: RegionFilterProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Badge
        variant={selected === null ? "default" : "outline"}
        className="cursor-pointer"
        onClick={() => onChange(null)}
      >
        All Regions
      </Badge>
      {REGIONS.map(([value, label]) => (
        <Badge
          key={value}
          variant={selected === value ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => onChange(selected === value ? null : value)}
        >
          {label}
        </Badge>
      ))}
    </div>
  );
}
