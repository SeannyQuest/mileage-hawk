// ==========================================
// AMEX Transfer Partner Utilities
// ==========================================

import { AIRLINES } from "./constants";

/**
 * Calculate AMEX Membership Rewards points needed for a given airline mileage cost.
 * Formula: amexPoints = ceil(airlineMiles / transferRatio)
 *
 * For 1:1 partners (ratio = 1.0): 50,000 miles = 50,000 MR points
 * For 5:4 partners (ratio = 0.8): 50,000 miles = 62,500 MR points
 * For 1:1.6 partners (ratio = 1.6): 50,000 miles = 31,250 MR points
 */
export function calculateAmexPoints(airlineMiles: number, transferRatio: number): number {
  if (transferRatio <= 0) throw new Error("Transfer ratio must be positive");
  return Math.ceil(airlineMiles / transferRatio);
}

/**
 * Calculate how many airline miles you get for a given AMEX points transfer.
 * Formula: airlineMiles = floor(amexPoints * transferRatio)
 */
export function calculateAirlineMiles(amexPoints: number, transferRatio: number): number {
  if (transferRatio <= 0) throw new Error("Transfer ratio must be positive");
  return Math.floor(amexPoints * transferRatio);
}

/**
 * Get airline data by code
 */
export function getAirlineByCode(code: string) {
  return AIRLINES.find((a) => a.code === code);
}

/**
 * Get all airlines covered by Seats.aero
 */
export function getSeatsAeroAirlines() {
  return AIRLINES.filter((a) => a.seatsAeroCode !== null);
}

/**
 * Get airlines NOT covered by Seats.aero (need alternative data sources)
 */
export function getUncoveredAirlines() {
  return AIRLINES.filter((a) => a.seatsAeroCode === null);
}

/**
 * Get airlines by alliance
 */
export function getAirlinesByAlliance(alliance: string) {
  return AIRLINES.filter((a) => a.alliance === alliance);
}

/**
 * Get all 1:1 transfer partners
 */
export function getOneToOnePartners() {
  return AIRLINES.filter((a) => a.amexTransferRatio === 1.0);
}

/**
 * Get partners with sub-1:1 ratios (less favorable)
 */
export function getSubParPartners() {
  return AIRLINES.filter((a) => a.amexTransferRatio < 1.0);
}

/**
 * Get the best AMEX points price across all airlines for a route
 * Takes an array of { airlineCode, mileageCost } and returns the best deal
 */
export function findBestAmexDeal(
  prices: { airlineCode: string; mileageCost: number }[]
): { airlineCode: string; mileageCost: number; amexPoints: number; transferRatio: number } | null {
  let bestDeal: {
    airlineCode: string;
    mileageCost: number;
    amexPoints: number;
    transferRatio: number;
  } | null = null;

  for (const price of prices) {
    const airline = getAirlineByCode(price.airlineCode);
    if (!airline) continue;

    const amexPoints = calculateAmexPoints(price.mileageCost, airline.amexTransferRatio);

    if (!bestDeal || amexPoints < bestDeal.amexPoints) {
      bestDeal = {
        airlineCode: price.airlineCode,
        mileageCost: price.mileageCost,
        amexPoints,
        transferRatio: airline.amexTransferRatio,
      };
    }
  }

  return bestDeal;
}

/**
 * Format transfer ratio for display
 * 1.0 → "1:1"
 * 0.8 → "5:4"
 * 1.6 → "1:1.6"
 */
export function formatTransferRatio(ratio: number): string {
  if (ratio === 1.0) return "1:1";
  if (ratio === 0.8) return "5:4";
  if (ratio === 1.6) return "1:1.6";
  return `1:${ratio}`;
}

/**
 * Format points with comma separators
 * 55000 → "55,000"
 */
export function formatPoints(points: number): string {
  return points.toLocaleString("en-US");
}

/**
 * Format points with "K" shorthand
 * 55000 → "55K"
 * 72500 → "72.5K"
 */
export function formatPointsShort(points: number): string {
  if (points >= 1000) {
    const k = points / 1000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return points.toString();
}
