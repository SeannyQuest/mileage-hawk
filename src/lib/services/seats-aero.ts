// ==========================================
// Seats.aero API Client
// Documentation: https://developers.seats.aero
// ==========================================

import { SEATS_AERO_BASE_URL, SEATS_AERO_SOURCE_MAP } from "../constants";
import type { SeatsAeroAvailability, SeatsAeroSearchResponse } from "../types";

class SeatsAeroClient {
  private apiKey: string;
  private baseUrl: string;
  private callsRemaining: number = 1000;

  constructor() {
    const apiKey = process.env.SEATS_AERO_API_KEY;
    if (!apiKey) {
      throw new Error("SEATS_AERO_API_KEY environment variable is required");
    }
    this.apiKey = apiKey;
    this.baseUrl = SEATS_AERO_BASE_URL;
  }

  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        "Partner-Authorization": this.apiKey,
        Accept: "application/json",
      },
    });

    // Track remaining API calls from response headers
    const remaining = response.headers.get("X-Ratelimit-Remaining");
    if (remaining) {
      this.callsRemaining = parseInt(remaining, 10);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new SeatsAeroError(
        `Seats.aero API error: ${response.status} ${response.statusText}`,
        response.status,
        errorText
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Search for award availability between two airports.
   * Uses the cached search endpoint.
   */
  async searchAvailability(params: {
    origin: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    source?: string;
    cursor?: string;
  }): Promise<SeatsAeroSearchResponse> {
    const queryParams: Record<string, string> = {
      origin_airport: params.origin,
    };
    if (params.destination) queryParams.destination_airport = params.destination;

    if (params.startDate) queryParams.start_date = params.startDate;
    if (params.endDate) queryParams.end_date = params.endDate;
    if (params.source) queryParams.source = params.source;
    if (params.cursor) queryParams.cursor = params.cursor;

    return this.request<SeatsAeroSearchResponse>("/search", queryParams);
  }

  /**
   * Get bulk availability for a source and region combination.
   * This is the most efficient endpoint for daily scraping.
   */
  async getBulkAvailability(params: {
    source: string;
    originRegion?: string;
    destinationRegion?: string;
    startDate?: string;
    endDate?: string;
    cursor?: string;
  }): Promise<SeatsAeroSearchResponse> {
    const queryParams: Record<string, string> = {
      source: params.source,
    };

    if (params.originRegion) queryParams.origin_region = params.originRegion;
    if (params.destinationRegion) queryParams.destination_region = params.destinationRegion;
    if (params.startDate) queryParams.start_date = params.startDate;
    if (params.endDate) queryParams.end_date = params.endDate;
    if (params.cursor) queryParams.cursor = params.cursor;

    return this.request<SeatsAeroSearchResponse>("/availability", queryParams);
  }

  /**
   * Get detailed trip information for a specific availability ID.
   */
  async getTrips(availabilityId: string) {
    return this.request<{ data: unknown[] }>(`/trips/${availabilityId}`);
  }

  /**
   * Get available routes.
   */
  async getRoutes(params?: { source?: string }) {
    const queryParams: Record<string, string> = {};
    if (params?.source) queryParams.source = params.source;

    return this.request<{ data: { route: string; source: string }[] }>("/routes", queryParams);
  }

  /**
   * Get remaining API calls for today.
   */
  getRemainingCalls(): number {
    return this.callsRemaining;
  }

  /**
   * Get the airline code for a Seats.aero source name.
   */
  static getAirlineCode(source: string): string | undefined {
    return SEATS_AERO_SOURCE_MAP[source];
  }

  /**
   * Get the Seats.aero source name for an airline code.
   */
  static getSourceName(airlineCode: string): string | undefined {
    return Object.entries(SEATS_AERO_SOURCE_MAP).find(([, code]) => code === airlineCode)?.[0];
  }
}

export class SeatsAeroError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody: string
  ) {
    super(message);
    this.name = "SeatsAeroError";
  }
}

// Singleton instance (lazy initialization)
let clientInstance: SeatsAeroClient | null = null;

export function getSeatsAeroClient(): SeatsAeroClient {
  if (!clientInstance) {
    clientInstance = new SeatsAeroClient();
  }
  return clientInstance;
}

/**
 * Parse Seats.aero availability data into our normalized format.
 * Returns one entry per cabin class that has availability.
 *
 * Note: Seats.aero API returns mileage costs as string or int (varies),
 * and direct flags as YDirect/WDirect/JDirect/FDirect (not YDirectFlights).
 */
export function parseAvailability(
  availability: SeatsAeroAvailability
): {
  cabinClass: "ECONOMY_PLUS" | "BUSINESS" | "FIRST";
  mileageCost: number;
  remainingSeats: number | null;
  isDirect: boolean;
}[] {
  const results: {
    cabinClass: "ECONOMY_PLUS" | "BUSINESS" | "FIRST";
    mileageCost: number;
    remainingSeats: number | null;
    isDirect: boolean;
  }[] = [];

  function parseCost(value: string | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return value;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Premium Economy / Economy Plus (W cabin)
  if (availability.WAvailable) {
    const cost = parseCost(availability.WMileageCost);
    if (cost > 0) {
      results.push({
        cabinClass: "ECONOMY_PLUS",
        mileageCost: cost,
        remainingSeats: availability.WRemainingSeats || null,
        isDirect: availability.WDirect ?? false,
      });
    }
  }

  // Business (J cabin)
  if (availability.JAvailable) {
    const cost = parseCost(availability.JMileageCost);
    if (cost > 0) {
      results.push({
        cabinClass: "BUSINESS",
        mileageCost: cost,
        remainingSeats: availability.JRemainingSeats || null,
        isDirect: availability.JDirect ?? false,
      });
    }
  }

  // First (F cabin)
  if (availability.FAvailable) {
    const cost = parseCost(availability.FMileageCost);
    if (cost > 0) {
      results.push({
        cabinClass: "FIRST",
        mileageCost: cost,
        remainingSeats: availability.FRemainingSeats || null,
        isDirect: availability.FDirect ?? false,
      });
    }
  }

  return results;
}

/**
 * Extract origin and destination airport codes from a Seats.aero availability record.
 */
export function getRouteCodes(avail: SeatsAeroAvailability): { origin: string; destination: string } {
  return {
    origin: avail.Route.OriginAirport,
    destination: avail.Route.DestinationAirport,
  };
}
