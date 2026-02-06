// ==========================================
// Deal Scoring Service
// Calculates how good a deal is relative to historical averages
// ==========================================

import { getDealTier, DEFAULT_THRESHOLDS, CABIN_CLASS_LABELS } from "../constants";
import type { DealTier, Region } from "../types";
import { getThirtyDayAverage } from "./price-aggregator";

export interface DealScore {
  score: number; // percentage below 30-day average (0-100+)
  tier: DealTier;
  thirtyDayAvg: number | null;
  savings: number | null; // absolute points saved vs average
  savingsPercent: number | null;
}

/**
 * Calculate deal score for a specific price point.
 *
 * score = ((thirtyDayAvg - currentPrice) / thirtyDayAvg) * 100
 *
 * If no history exists, falls back to regional threshold comparison.
 */
export async function calculateDealScore(params: {
  routeId: string;
  airlineId: string;
  cabinClass: string;
  amexPointsEquivalent: number;
  region: Region;
}): Promise<DealScore> {
  const { routeId, airlineId, cabinClass, amexPointsEquivalent, region } = params;

  // Try 30-day average first
  const thirtyDayAvg = await getThirtyDayAverage(routeId, airlineId, cabinClass);

  if (thirtyDayAvg && thirtyDayAvg > 0) {
    const savings = thirtyDayAvg - amexPointsEquivalent;
    const savingsPercent = (savings / thirtyDayAvg) * 100;
    const score = Math.max(0, savingsPercent);

    return {
      score,
      tier: getDealTier(score),
      thirtyDayAvg,
      savings: savings > 0 ? savings : null,
      savingsPercent: savingsPercent > 0 ? Math.round(savingsPercent * 10) / 10 : null,
    };
  }

  // Fallback: compare against regional default thresholds
  return calculateDealScoreFromThresholds(amexPointsEquivalent, cabinClass, region);
}

/**
 * Synchronous deal scoring using static thresholds (no DB needed).
 * Used when no historical data is available or for quick displays.
 */
export function calculateDealScoreFromThresholds(
  amexPoints: number,
  cabinClass: string,
  region: Region
): DealScore {
  const regionThreshold = DEFAULT_THRESHOLDS.find((t) => t.region === region);

  if (!regionThreshold) {
    return {
      score: 0,
      tier: "fair",
      thirtyDayAvg: null,
      savings: null,
      savingsPercent: null,
    };
  }

  let thresholdConfig;
  switch (cabinClass) {
    case "ECONOMY_PLUS":
      thresholdConfig = regionThreshold.economyPlus;
      break;
    case "BUSINESS":
      thresholdConfig = regionThreshold.business;
      break;
    case "FIRST":
      thresholdConfig = regionThreshold.first;
      break;
    default:
      thresholdConfig = regionThreshold.business;
  }

  // Use midpoint of typical range as the "average"
  const typicalAvg = (thresholdConfig.typicalRange[0] + thresholdConfig.typicalRange[1]) / 2;
  const savings = typicalAvg - amexPoints;
  const savingsPercent = (savings / typicalAvg) * 100;
  const score = Math.max(0, savingsPercent);

  // Also check against explicit deal thresholds
  let tier: DealTier;
  if (amexPoints <= thresholdConfig.exceptionalDeal) {
    tier = "amazing";
  } else if (amexPoints <= thresholdConfig.goodDeal) {
    tier = "great";
  } else if (score >= 10) {
    tier = "good";
  } else {
    tier = getDealTier(score);
  }

  return {
    score,
    tier,
    thirtyDayAvg: Math.round(typicalAvg),
    savings: savings > 0 ? Math.round(savings) : null,
    savingsPercent: savingsPercent > 0 ? Math.round(savingsPercent * 10) / 10 : null,
  };
}
