"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { formatPointsShort } from "@/lib/amex-partners";

interface HistoryEntry {
  date: string;
  minPrice: number;
  avgPrice: number;
  maxPrice: number;
  cabinClass: string;
  airlineCode: string;
  airlineName: string;
}

interface PriceHistoryChartProps {
  data: HistoryEntry[];
  className?: string;
}

const COLORS = [
  "#2563eb", // blue
  "#16a34a", // green
  "#dc2626", // red
  "#9333ea", // purple
  "#ea580c", // orange
  "#0891b2", // cyan
  "#c026d3", // fuchsia
  "#65a30d", // lime
];

type TimeRange = "30" | "60" | "90";

export function PriceHistoryChart({ data, className }: PriceHistoryChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30");
  const [showRange, setShowRange] = useState(false);

  // Filter by time range
  const filteredData = useMemo(() => {
    const days = parseInt(timeRange);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return data.filter((d) => d.date >= cutoffStr);
  }, [data, timeRange]);

  // Get unique airlines in the data
  const airlines = useMemo(() => {
    const seen = new Map<string, string>();
    for (const d of filteredData) {
      if (!seen.has(d.airlineCode)) {
        seen.set(d.airlineCode, d.airlineName);
      }
    }
    return Array.from(seen.entries()).map(([code, name]) => ({ code, name }));
  }, [filteredData]);

  // Pivot data: one row per date, columns for each airline's avgPrice
  const chartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number>>();

    for (const entry of filteredData) {
      if (!dateMap.has(entry.date)) {
        dateMap.set(entry.date, { date: entry.date } as unknown as Record<string, number>);
      }
      const row = dateMap.get(entry.date)!;
      // Use airline code as key, store avg price
      row[entry.airlineCode] = entry.avgPrice;
      // If showing range, also store min/max
      if (showRange) {
        row[`${entry.airlineCode}_min`] = entry.minPrice;
        row[`${entry.airlineCode}_max`] = entry.maxPrice;
      }
    }

    return Array.from(dateMap.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );
  }, [filteredData, showRange]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No history data available for this time range
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {(["30", "60", "90"] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range}d
            </Button>
          ))}
        </div>
        <Button
          variant={showRange ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowRange(!showRange)}
        >
          {showRange ? "Hide Range" : "Show Min/Max"}
        </Button>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const d = new Date(value);
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => formatPointsShort(value)}
            className="text-muted-foreground"
            width={60}
          />
          <Tooltip
            formatter={(value: number | string | undefined, name: string | undefined) => {
              const numValue = typeof value === "number" ? value : 0;
              const strName = name ?? "";
              const airline = airlines.find((a) => a.code === strName.replace(/_min|_max/, ""));
              const label = airline?.name ?? strName;
              const suffix = strName.includes("_min") ? " (Min)" : strName.includes("_max") ? " (Max)" : "";
              return [`${formatPointsShort(numValue)} pts`, `${label}${suffix}`];
            }}
            labelFormatter={(label) => {
              return new Date(label).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
            }}
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
            }}
          />
          <Legend
            formatter={(value: string) => {
              const airline = airlines.find((a) => a.code === value);
              return airline?.name ?? value;
            }}
          />
          {airlines.map((airline, i) => (
            <Line
              key={airline.code}
              type="monotone"
              dataKey={airline.code}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
