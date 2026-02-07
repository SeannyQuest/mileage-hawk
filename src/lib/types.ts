// ==========================================
// Core TypeScript types for MileageHawk
// ==========================================

import type { CabinClass, Region, AlertChannel } from "@prisma/client";

// Re-export Prisma enums for convenience
export type { CabinClass, Region, AlertChannel };

// ==========================================
// Airline Types
// ==========================================

export interface AirlineData {
  name: string;
  code: string;
  loyaltyProgram: string;
  loyaltyCurrency: string;
  amexTransferRatio: number;
  capitalOneTransferRatio: number | null; // null = not a Capital One partner
  alliance: string | null;
  minimumTransfer: number;
  hasTransferFee: boolean;
  transferFeeDetail: string | null;
  logoUrl: string | null;
  seatsAeroCode: string | null;
}

// ==========================================
// Airport Types
// ==========================================

export interface AirportData {
  code: string;
  name: string;
  city: string;
  country: string;
  region: Region;
  latitude: number;
  longitude: number;
  isOrigin: boolean;
}

// ==========================================
// Price Types
// ==========================================

export interface PriceResult {
  id: string;
  routeId: string;
  airlineId: string;
  airlineName: string;
  airlineCode: string;
  loyaltyProgram: string;
  cabinClass: CabinClass;
  mileageCost: number;
  amexPointsEquivalent: number;
  cashCopay: number | null;
  availabilityCount: number | null;
  isDirect: boolean;
  travelDate: string;
  scrapedAt: string;
  bookingUrl: string | null;
}

export interface RoutePrice {
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  region: Region;
  cabinClass: CabinClass;
  bestPrice: number; // amexPointsEquivalent
  bestAirline: string;
  allPrices: PriceResult[];
}

export interface PriceHistoryPoint {
  date: string;
  minPrice: number;
  avgPrice: number;
  maxPrice: number;
}

export interface DealResult {
  id: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  region: Region;
  cabinClass: CabinClass;
  airlineName: string;
  airlineCode: string;
  loyaltyProgram: string;
  amexPointsEquivalent: number;
  mileageCost: number;
  thirtyDayAvg: number;
  dealScore: number; // percentage below 30-day average
  dealTier: DealTier;
  travelDate: string;
  bookingUrl: string | null;
  isDirect: boolean;
  cashCopay: number | null;
}

export type DealTier = "fair" | "good" | "great" | "amazing" | "unicorn";

// ==========================================
// Alert Types
// ==========================================

export interface AlertFormData {
  routeId: string;
  cabinClass: CabinClass;
  airlineId: string | null; // null = any airline
  thresholdPoints: number;
  alertChannels: AlertChannel[];
}

export interface AlertWithDetails {
  id: string;
  userId: string;
  routeId: string;
  originCode: string;
  originCity: string;
  destinationCode: string;
  destinationCity: string;
  cabinClass: CabinClass;
  airlineId: string | null;
  airlineName: string | null;
  thresholdPoints: number;
  alertChannels: AlertChannel[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  currentBestPrice: number | null;
  createdAt: string;
}

// ==========================================
// Search & Filter Types
// ==========================================

export interface PriceSearchParams {
  origin?: string;
  destination?: string;
  region?: Region;
  cabinClass?: CabinClass;
  airline?: string;
  dateFrom?: string;
  dateTo?: string;
  maxPoints?: number;
  directOnly?: boolean;
  sort?: "price" | "date" | "savings" | "airline";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface RouteFilterParams {
  origin?: string;
  region?: Region;
  cabinClass?: CabinClass;
  airline?: string;
  sort?: "price" | "drop" | "destination";
}

// ==========================================
// Dashboard Types
// ==========================================

export interface DashboardStats {
  totalRoutes: number;
  dealsToday: number;
  averageSavingsPercent: number;
  lastScrapedAt: string | null;
  totalAlerts: number;
  alertsTriggeredToday: number;
}

// ==========================================
// Seats.aero API Types
// ==========================================

export interface SeatsAeroRoute {
  ID: string;
  OriginAirport: string;
  OriginRegion: string;
  DestinationAirport: string;
  DestinationRegion: string;
  Distance: number;
  Source: string;
}

export interface SeatsAeroAvailability {
  ID: string;
  RouteID: string;
  Route: SeatsAeroRoute; // Nested route object
  Date: string; // "2026-03-15"
  ParsedDate: string;
  YAvailable: boolean;
  WAvailable: boolean;
  JAvailable: boolean;
  FAvailable: boolean;
  YMileageCost: string | number;
  WMileageCost: string | number;
  JMileageCost: string | number;
  FMileageCost: string | number;
  YRemainingSeats: number;
  WRemainingSeats: number;
  JRemainingSeats: number;
  FRemainingSeats: number;
  YDirect: boolean;
  WDirect: boolean;
  JDirect: boolean;
  FDirect: boolean;
  Source: string; // "virginatlantic"
  CreatedAt: string;
  UpdatedAt: string;
}

export interface SeatsAeroSearchResponse {
  data: SeatsAeroAvailability[];
  count: number;
  hasMore: boolean;
  cursor?: number;
}

// ==========================================
// Notification Types
// ==========================================

export interface AlertNotification {
  alertId: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  userPhone: string | null;
  channel: AlertChannel;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  cabinClass: CabinClass;
  airlineName: string;
  loyaltyProgram: string;
  mileageCost: number;
  amexPointsEquivalent: number;
  thresholdPoints: number;
  travelDate: string;
  bookingUrl: string | null;
  timezone?: string | null;
  quietHoursStart?: number | null;
  quietHoursEnd?: number | null;
}

// ==========================================
// API Response Types
// ==========================================

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// ==========================================
// Default Threshold Types
// ==========================================

export interface RegionThresholds {
  region: Region;
  destinations: string[];
  economyPlus: ThresholdConfig;
  business: ThresholdConfig;
  first: ThresholdConfig;
}

export interface ThresholdConfig {
  typicalRange: [number, number];
  goodDeal: number;
  exceptionalDeal: number;
}
