// ==========================================
// MileageHawk Constants
// All reference data for airlines, airports, routes, and thresholds
// ==========================================

import type { AirlineData, AirportData, RegionThresholds, DealTier } from "./types";

// ==========================================
// AMEX Membership Rewards Airline Transfer Partners
// Last verified: February 2026
// ==========================================

export const AIRLINES: AirlineData[] = [
  {
    name: "Aer Lingus",
    code: "EI",
    loyaltyProgram: "AerClub",
    loyaltyCurrency: "Avios",
    amexTransferRatio: 1.0,
    alliance: null,
    minimumTransfer: 1000,
    hasTransferFee: false,
    transferFeeDetail: null,
    logoUrl: "/airlines/aer-lingus.svg",
    seatsAeroCode: null, // Not directly on Seats.aero
  },
  {
    name: "Aeromexico",
    code: "AM",
    loyaltyProgram: "Aeromexico Rewards",
    loyaltyCurrency: "Points",
    amexTransferRatio: 1.6, // 1:1.6 bonus (uses kilometers)
    alliance: "SkyTeam",
    minimumTransfer: 1000,
    hasTransferFee: false,
    transferFeeDetail: null,
    logoUrl: "/airlines/aeromexico.svg",
    seatsAeroCode: "aeromexico",
  },
  {
    name: "Air Canada",
    code: "AC",
    loyaltyProgram: "Aeroplan",
    loyaltyCurrency: "Aeroplan Points",
    amexTransferRatio: 1.0,
    alliance: "Star Alliance",
    minimumTransfer: 1000,
    hasTransferFee: false,
    transferFeeDetail: null,
    logoUrl: "/airlines/air-canada.svg",
    seatsAeroCode: "aeroplan",
  },
  {
    name: "Air France / KLM",
    code: "AF",
    loyaltyProgram: "Flying Blue",
    loyaltyCurrency: "Miles",
    amexTransferRatio: 1.0,
    alliance: "SkyTeam",
    minimumTransfer: 1000,
    hasTransferFee: false,
    transferFeeDetail: null,
    logoUrl: "/airlines/air-france.svg",
    seatsAeroCode: "flyingblue",
  },
  {
    name: "ANA",
    code: "NH",
    loyaltyProgram: "ANA Mileage Club",
    loyaltyCurrency: "Miles",
    amexTransferRatio: 1.0,
    alliance: "Star Alliance",
    minimumTransfer: 1000,
    hasTransferFee: false,
    transferFeeDetail: null,
    logoUrl: "/airlines/ana.svg",
    seatsAeroCode: null, // Not on Seats.aero
  },
  {
    name: "Avianca",
    code: "AV",
    loyaltyProgram: "LifeMiles",
    loyaltyCurrency: "Miles",
    amexTransferRatio: 1.0,
    alliance: "Star Alliance",
    minimumTransfer: 1000,
    hasTransferFee: false,
    transferFeeDetail: null,
    logoUrl: "/airlines/avianca.svg",
    seatsAeroCode: "lifemiles",
  },
  {
    name: "British Airways",
    code: "BA",
    loyaltyProgram: "Executive Club",
    loyaltyCurrency: "Avios",
    amexTransferRatio: 1.0,
    alliance: "Oneworld",
    minimumTransfer: 1000,
    hasTransferFee: false,
    transferFeeDetail: null,
    logoUrl: "/airlines/british-airways.svg",
    seatsAeroCode: null, // Not directly on Seats.aero
  },
  {
    name: "Cathay Pacific",
    code: "CX",
    loyaltyProgram: "Asia Miles",
    loyaltyCurrency: "Asia Miles",
    amexTransferRatio: 0.8, // 5:4 effective March 1, 2026
    alliance: "Oneworld",
    minimumTransfer: 1000,
    hasTransferFee: false,
    transferFeeDetail: null,
    logoUrl: "/airlines/cathay-pacific.svg",
    seatsAeroCode: null, // Not on Seats.aero
  },
  {
    name: "Delta Air Lines",
    code: "DL",
    loyaltyProgram: "SkyMiles",
    loyaltyCurrency: "Miles",
    amexTransferRatio: 1.0,
    alliance: "SkyTeam",
    minimumTransfer: 1000,
    hasTransferFee: true,
    transferFeeDetail: "$0.60 per 1,000 points (max $99)",
    logoUrl: "/airlines/delta.svg",
    seatsAeroCode: "delta",
  },
  {
    name: "Emirates",
    code: "EK",
    loyaltyProgram: "Skywards",
    loyaltyCurrency: "Skywards Miles",
    amexTransferRatio: 0.8, // 5:4 since Sept 2025
    alliance: null,
    minimumTransfer: 1000,
    hasTransferFee: false,
    transferFeeDetail: null,
    logoUrl: "/airlines/emirates.svg",
    seatsAeroCode: "emirates",
  },
  {
    name: "Etihad Airways",
    code: "EY",
    loyaltyProgram: "Etihad Guest",
    loyaltyCurrency: "Miles",
    amexTransferRatio: 1.0,
    alliance: null,
    minimumTransfer: 1000,
    hasTransferFee: false,
    transferFeeDetail: null,
    logoUrl: "/airlines/etihad.svg",
    seatsAeroCode: "etihad",
  },
  {
    name: "Iberia",
    code: "IB",
    loyaltyProgram: "Iberia Plus",
    loyaltyCurrency: "Avios",
    amexTransferRatio: 1.0,
    alliance: "Oneworld",
    minimumTransfer: 1000,
    hasTransferFee: false,
    transferFeeDetail: null,
    logoUrl: "/airlines/iberia.svg",
    seatsAeroCode: null, // Not on Seats.aero
  },
  {
    name: "JetBlue",
    code: "B6",
    loyaltyProgram: "TrueBlue",
    loyaltyCurrency: "Points",
    amexTransferRatio: 0.8, // 5:4
    alliance: null,
    minimumTransfer: 250,
    hasTransferFee: true,
    transferFeeDetail: "$0.60 per 1,000 points (max $99)",
    logoUrl: "/airlines/jetblue.svg",
    seatsAeroCode: "jetblue",
  },
  {
    name: "Qantas",
    code: "QF",
    loyaltyProgram: "Frequent Flyer",
    loyaltyCurrency: "Qantas Points",
    amexTransferRatio: 1.0,
    alliance: "Oneworld",
    minimumTransfer: 500,
    hasTransferFee: false,
    transferFeeDetail: null,
    logoUrl: "/airlines/qantas.svg",
    seatsAeroCode: "qantas",
  },
  {
    name: "Qatar Airways",
    code: "QR",
    loyaltyProgram: "Privilege Club",
    loyaltyCurrency: "Avios",
    amexTransferRatio: 1.0,
    alliance: "Oneworld",
    minimumTransfer: 1000,
    hasTransferFee: false,
    transferFeeDetail: null,
    logoUrl: "/airlines/qatar.svg",
    seatsAeroCode: "qatar",
  },
  {
    name: "Singapore Airlines",
    code: "SQ",
    loyaltyProgram: "KrisFlyer",
    loyaltyCurrency: "Miles",
    amexTransferRatio: 1.0,
    alliance: "Star Alliance",
    minimumTransfer: 1000,
    hasTransferFee: false,
    transferFeeDetail: null,
    logoUrl: "/airlines/singapore.svg",
    seatsAeroCode: "singapore",
  },
  {
    name: "Virgin Atlantic",
    code: "VS",
    loyaltyProgram: "Flying Club",
    loyaltyCurrency: "Virgin Points",
    amexTransferRatio: 1.0,
    alliance: "SkyTeam",
    minimumTransfer: 1000,
    hasTransferFee: false,
    transferFeeDetail: null,
    logoUrl: "/airlines/virgin-atlantic.svg",
    seatsAeroCode: "virginatlantic",
  },
];

// ==========================================
// AIRPORTS
// ==========================================

export const AIRPORTS: AirportData[] = [
  // ── Origins ──
  { code: "AUS", name: "Austin-Bergstrom International", city: "Austin", country: "United States", region: "LATIN_AMERICA_MEXICO" as const, latitude: 30.1975, longitude: -97.6664, isOrigin: true },
  { code: "DFW", name: "Dallas/Fort Worth International", city: "Dallas", country: "United States", region: "LATIN_AMERICA_MEXICO" as const, latitude: 32.8968, longitude: -97.038, isOrigin: true },
  { code: "DAL", name: "Dallas Love Field", city: "Dallas", country: "United States", region: "LATIN_AMERICA_MEXICO" as const, latitude: 32.8471, longitude: -96.8518, isOrigin: true },

  // ── Europe ──
  { code: "LHR", name: "London Heathrow", city: "London", country: "United Kingdom", region: "EUROPE" as const, latitude: 51.4700, longitude: -0.4543, isOrigin: false },
  { code: "LGW", name: "London Gatwick", city: "London", country: "United Kingdom", region: "EUROPE" as const, latitude: 51.1537, longitude: -0.1821, isOrigin: false },
  { code: "STN", name: "London Stansted", city: "London", country: "United Kingdom", region: "EUROPE" as const, latitude: 51.8860, longitude: 0.2389, isOrigin: false },
  { code: "CDG", name: "Charles de Gaulle", city: "Paris", country: "France", region: "EUROPE" as const, latitude: 49.0097, longitude: 2.5479, isOrigin: false },
  { code: "ORY", name: "Paris Orly", city: "Paris", country: "France", region: "EUROPE" as const, latitude: 48.7262, longitude: 2.3652, isOrigin: false },
  { code: "BER", name: "Berlin Brandenburg", city: "Berlin", country: "Germany", region: "EUROPE" as const, latitude: 52.3667, longitude: 13.5033, isOrigin: false },
  { code: "FCO", name: "Leonardo da Vinci-Fiumicino", city: "Rome", country: "Italy", region: "EUROPE" as const, latitude: 41.8003, longitude: 12.2389, isOrigin: false },
  { code: "BCN", name: "Barcelona-El Prat", city: "Barcelona", country: "Spain", region: "EUROPE" as const, latitude: 41.2971, longitude: 2.0785, isOrigin: false },
  { code: "MAD", name: "Adolfo Suarez Madrid-Barajas", city: "Madrid", country: "Spain", region: "EUROPE" as const, latitude: 40.4936, longitude: -3.5668, isOrigin: false },
  { code: "ATH", name: "Athens International", city: "Athens", country: "Greece", region: "EUROPE" as const, latitude: 37.9364, longitude: 23.9445, isOrigin: false },
  { code: "PMI", name: "Palma de Mallorca", city: "Mallorca", country: "Spain", region: "EUROPE" as const, latitude: 39.5517, longitude: 2.7388, isOrigin: false },
  { code: "LIS", name: "Humberto Delgado", city: "Lisbon", country: "Portugal", region: "EUROPE" as const, latitude: 38.7756, longitude: -9.1354, isOrigin: false },
  { code: "DUB", name: "Dublin Airport", city: "Dublin", country: "Ireland", region: "EUROPE" as const, latitude: 53.4264, longitude: -6.2499, isOrigin: false },
  { code: "ARN", name: "Stockholm Arlanda", city: "Stockholm", country: "Sweden", region: "EUROPE" as const, latitude: 59.6519, longitude: 17.9186, isOrigin: false },
  { code: "VIE", name: "Vienna International", city: "Vienna", country: "Austria", region: "EUROPE" as const, latitude: 48.1103, longitude: 16.5697, isOrigin: false },
  { code: "PRG", name: "Vaclav Havel Prague", city: "Prague", country: "Czech Republic", region: "EUROPE" as const, latitude: 50.1008, longitude: 14.2600, isOrigin: false },
  { code: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "Netherlands", region: "EUROPE" as const, latitude: 52.3105, longitude: 4.7683, isOrigin: false },

  // ── Asia ──
  { code: "NRT", name: "Narita International", city: "Tokyo", country: "Japan", region: "ASIA" as const, latitude: 35.7647, longitude: 140.3864, isOrigin: false },
  { code: "HND", name: "Tokyo Haneda", city: "Tokyo", country: "Japan", region: "ASIA" as const, latitude: 35.5494, longitude: 139.7798, isOrigin: false },
  { code: "BKK", name: "Suvarnabhumi", city: "Bangkok", country: "Thailand", region: "ASIA" as const, latitude: 13.6900, longitude: 100.7501, isOrigin: false },
  { code: "PVG", name: "Shanghai Pudong", city: "Shanghai", country: "China", region: "ASIA" as const, latitude: 31.1443, longitude: 121.8083, isOrigin: false },
  { code: "ICN", name: "Incheon International", city: "Seoul", country: "South Korea", region: "ASIA" as const, latitude: 37.4602, longitude: 126.4407, isOrigin: false },
  { code: "PEK", name: "Beijing Capital", city: "Beijing", country: "China", region: "ASIA" as const, latitude: 40.0799, longitude: 116.6031, isOrigin: false },

  // ── Middle East ──
  { code: "DXB", name: "Dubai International", city: "Dubai", country: "United Arab Emirates", region: "MIDDLE_EAST" as const, latitude: 25.2532, longitude: 55.3657, isOrigin: false },

  // ── Oceania ──
  { code: "SYD", name: "Sydney Kingsford Smith", city: "Sydney", country: "Australia", region: "OCEANIA" as const, latitude: -33.9399, longitude: 151.1753, isOrigin: false },
  { code: "MEL", name: "Melbourne Tullamarine", city: "Melbourne", country: "Australia", region: "OCEANIA" as const, latitude: -37.6690, longitude: 144.8410, isOrigin: false },

  // ── Latin America (Mexico/Central) ──
  { code: "BOG", name: "El Dorado International", city: "Bogota", country: "Colombia", region: "LATIN_AMERICA_SOUTH" as const, latitude: 4.7016, longitude: -74.1469, isOrigin: false },
  { code: "MEX", name: "Mexico City International", city: "Mexico City", country: "Mexico", region: "LATIN_AMERICA_MEXICO" as const, latitude: 19.4361, longitude: -99.0719, isOrigin: false },
  { code: "CUN", name: "Cancun International", city: "Cancun", country: "Mexico", region: "LATIN_AMERICA_MEXICO" as const, latitude: 21.0365, longitude: -86.8771, isOrigin: false },
  { code: "CZM", name: "Cozumel International", city: "Cozumel", country: "Mexico", region: "LATIN_AMERICA_MEXICO" as const, latitude: 20.5224, longitude: -86.9256, isOrigin: false },
  { code: "PVR", name: "Gustavo Diaz Ordaz", city: "Puerto Vallarta", country: "Mexico", region: "LATIN_AMERICA_MEXICO" as const, latitude: 20.6801, longitude: -105.2544, isOrigin: false },
  { code: "MDE", name: "Jose Maria Cordova", city: "Medellin", country: "Colombia", region: "LATIN_AMERICA_SOUTH" as const, latitude: 6.1645, longitude: -75.4231, isOrigin: false },
  { code: "GIG", name: "Rio de Janeiro Galeao", city: "Rio de Janeiro", country: "Brazil", region: "LATIN_AMERICA_SOUTH" as const, latitude: -22.8100, longitude: -43.2506, isOrigin: false },
  { code: "GRU", name: "Sao Paulo-Guarulhos", city: "Sao Paulo", country: "Brazil", region: "LATIN_AMERICA_SOUTH" as const, latitude: -23.4356, longitude: -46.4731, isOrigin: false },

  // ── Latin America (Central America) ──
  { code: "PTY", name: "Tocumen International", city: "Panama City", country: "Panama", region: "LATIN_AMERICA_SOUTH" as const, latitude: 9.0714, longitude: -79.3835, isOrigin: false },
  { code: "GUA", name: "La Aurora International", city: "Guatemala City", country: "Guatemala", region: "LATIN_AMERICA_SOUTH" as const, latitude: 14.5833, longitude: -90.5275, isOrigin: false },
  { code: "SJO", name: "Juan Santamaria International", city: "San Jose", country: "Costa Rica", region: "LATIN_AMERICA_SOUTH" as const, latitude: 9.9939, longitude: -84.2088, isOrigin: false },
  { code: "SJD", name: "Los Cabos International", city: "San Jose del Cabo", country: "Mexico", region: "LATIN_AMERICA_MEXICO" as const, latitude: 23.1518, longitude: -109.7215, isOrigin: false },
  { code: "GDL", name: "Miguel Hidalgo y Costilla International", city: "Guadalajara", country: "Mexico", region: "LATIN_AMERICA_MEXICO" as const, latitude: 20.5218, longitude: -103.3111, isOrigin: false },

  // ── Caribbean ──
  { code: "MBJ", name: "Sangster International", city: "Montego Bay", country: "Jamaica", region: "CARIBBEAN" as const, latitude: 18.5037, longitude: -77.9134, isOrigin: false },
  { code: "SJU", name: "Luis Munoz Marin International", city: "San Juan", country: "Puerto Rico", region: "CARIBBEAN" as const, latitude: 18.4394, longitude: -66.0018, isOrigin: false },
  { code: "NAS", name: "Lynden Pindling International", city: "Nassau", country: "Bahamas", region: "CARIBBEAN" as const, latitude: 25.0390, longitude: -77.4661, isOrigin: false },
  { code: "AUA", name: "Queen Beatrix International", city: "Oranjestad", country: "Aruba", region: "CARIBBEAN" as const, latitude: 12.5014, longitude: -70.0152, isOrigin: false },
];

// ==========================================
// ORIGIN AIRPORT CODES
// ==========================================

export const ORIGIN_CODES = ["AUS", "DFW", "DAL"] as const;

export const DESTINATION_AIRPORTS = AIRPORTS.filter((a) => !a.isOrigin);
export const ORIGIN_AIRPORTS = AIRPORTS.filter((a) => a.isOrigin);

// ==========================================
// DEFAULT ALERT THRESHOLDS (AMEX points, one-way)
// Based on Phase 1D research
// ==========================================

export const DEFAULT_THRESHOLDS: RegionThresholds[] = [
  {
    region: "EUROPE" as const,
    destinations: ["London", "Paris", "Berlin", "Rome", "Barcelona", "Madrid", "Athens", "Lisbon", "Dublin", "Stockholm", "Vienna", "Prague", "Mallorca", "Amsterdam"],
    economyPlus: { typicalRange: [35000, 50000], goodDeal: 30000, exceptionalDeal: 20000 },
    business: { typicalRange: [55000, 80000], goodDeal: 50000, exceptionalDeal: 35000 },
    first: { typicalRange: [90000, 130000], goodDeal: 85000, exceptionalDeal: 70000 },
  },
  {
    region: "ASIA" as const,
    destinations: ["Tokyo", "Bangkok", "Shanghai", "Seoul", "Beijing"],
    economyPlus: { typicalRange: [40000, 55000], goodDeal: 35000, exceptionalDeal: 25000 },
    business: { typicalRange: [60000, 90000], goodDeal: 55000, exceptionalDeal: 43000 },
    first: { typicalRange: [85000, 120000], goodDeal: 75000, exceptionalDeal: 55000 },
  },
  {
    region: "MIDDLE_EAST" as const,
    destinations: ["Dubai"],
    economyPlus: { typicalRange: [45000, 60000], goodDeal: 40000, exceptionalDeal: 30000 },
    business: { typicalRange: [80000, 120000], goodDeal: 70000, exceptionalDeal: 55000 },
    first: { typicalRange: [130000, 180000], goodDeal: 115000, exceptionalDeal: 90000 },
  },
  {
    region: "OCEANIA" as const,
    destinations: ["Sydney", "Melbourne"],
    economyPlus: { typicalRange: [50000, 65000], goodDeal: 45000, exceptionalDeal: 35000 },
    business: { typicalRange: [75000, 100000], goodDeal: 72500, exceptionalDeal: 60000 },
    first: { typicalRange: [110000, 160000], goodDeal: 100000, exceptionalDeal: 80000 },
  },
  {
    region: "LATIN_AMERICA_MEXICO" as const,
    destinations: ["Mexico City", "Cancun", "Cozumel", "Puerto Vallarta", "San Jose del Cabo", "Guadalajara"],
    economyPlus: { typicalRange: [12000, 20000], goodDeal: 10000, exceptionalDeal: 7500 },
    business: { typicalRange: [20000, 35000], goodDeal: 17500, exceptionalDeal: 12500 },
    first: { typicalRange: [35000, 50000], goodDeal: 30000, exceptionalDeal: 22500 },
  },
  {
    region: "LATIN_AMERICA_SOUTH" as const,
    destinations: ["Bogota", "Medellin", "Rio de Janeiro", "Panama City", "Guatemala City", "San Jose"],
    economyPlus: { typicalRange: [25000, 35000], goodDeal: 20000, exceptionalDeal: 15000 },
    business: { typicalRange: [40000, 60000], goodDeal: 35000, exceptionalDeal: 25000 },
    first: { typicalRange: [60000, 85000], goodDeal: 55000, exceptionalDeal: 45000 },
  },
  {
    region: "CARIBBEAN" as const,
    destinations: ["Montego Bay", "San Juan", "Nassau", "Oranjestad"],
    economyPlus: { typicalRange: [15000, 25000], goodDeal: 12500, exceptionalDeal: 9000 },
    business: { typicalRange: [25000, 45000], goodDeal: 22000, exceptionalDeal: 16000 },
    first: { typicalRange: [45000, 65000], goodDeal: 40000, exceptionalDeal: 30000 },
  },
];

// ==========================================
// DEAL SCORING
// ==========================================

export const DEAL_TIERS: { tier: DealTier; minScore: number; label: string; color: string }[] = [
  { tier: "unicorn", minScore: 50, label: "Unicorn", color: "text-amber-500" },
  { tier: "amazing", minScore: 35, label: "Amazing", color: "text-purple-500" },
  { tier: "great", minScore: 20, label: "Great Deal", color: "text-blue-500" },
  { tier: "good", minScore: 10, label: "Good Deal", color: "text-green-500" },
  { tier: "fair", minScore: 0, label: "Fair", color: "text-gray-500" },
];

export function getDealTier(score: number): DealTier {
  for (const tier of DEAL_TIERS) {
    if (score >= tier.minScore) return tier.tier;
  }
  return "fair";
}

export function getDealTierInfo(tier: DealTier) {
  return DEAL_TIERS.find((t) => t.tier === tier) ?? DEAL_TIERS[DEAL_TIERS.length - 1];
}

// ==========================================
// CABIN CLASS DISPLAY
// ==========================================

export const CABIN_CLASS_LABELS: Record<string, string> = {
  ECONOMY_PLUS: "Economy Plus",
  BUSINESS: "Business",
  FIRST: "First",
};

export const CABIN_CLASS_SHORT: Record<string, string> = {
  ECONOMY_PLUS: "Econ+",
  BUSINESS: "Biz",
  FIRST: "First",
};

export const CABIN_CLASS_COLORS: Record<string, string> = {
  ECONOMY_PLUS: "bg-sky-100 text-sky-800",
  BUSINESS: "bg-indigo-100 text-indigo-800",
  FIRST: "bg-amber-100 text-amber-800",
};

// ==========================================
// REGION DISPLAY
// ==========================================

export const REGION_LABELS: Record<string, string> = {
  EUROPE: "Europe",
  ASIA: "Asia",
  MIDDLE_EAST: "Middle East",
  OCEANIA: "Oceania",
  LATIN_AMERICA_MEXICO: "Mexico & Central America",
  LATIN_AMERICA_SOUTH: "South America",
  CARIBBEAN: "Caribbean",
};

export const REGION_EMOJI: Record<string, string> = {
  EUROPE: "eu",
  ASIA: "asia",
  MIDDLE_EAST: "me",
  OCEANIA: "oc",
  LATIN_AMERICA_MEXICO: "mx",
  LATIN_AMERICA_SOUTH: "sa",
  CARIBBEAN: "cb",
};

// ==========================================
// SEATS.AERO CONFIG
// ==========================================

export const SEATS_AERO_BASE_URL = "https://seats.aero/partnerapi";
export const SEATS_AERO_DAILY_LIMIT = 1000;

// Map Seats.aero source names to our airline codes
export const SEATS_AERO_SOURCE_MAP: Record<string, string> = {
  aeromexico: "AM",
  aeroplan: "AC",
  flyingblue: "AF",
  lifemiles: "AV",
  delta: "DL",
  emirates: "EK",
  etihad: "EY",
  jetblue: "B6",
  qantas: "QF",
  qatar: "QR",
  singapore: "SQ",
  virginatlantic: "VS",
};

// ==========================================
// APP CONFIG
// ==========================================

export const APP_NAME = "MileageHawk";
export const APP_DESCRIPTION = "Track award flight mileage costs across AMEX transfer partners";
export const SCRAPE_SCHEDULE_CT = "0 6 * * *"; // 6:00 AM Central Time
export const AGGREGATE_SCHEDULE_CT = "30 6 * * *"; // 6:30 AM Central Time
export const ALERT_CHECK_SCHEDULE_CT = "0 7 * * *"; // 7:00 AM Central Time
export const STALE_DATA_HOURS = 24; // Show warning if data older than this
export const MAX_PRICE_HISTORY_DAYS = 90;
export const DEFAULT_SEARCH_DATE_RANGE_DAYS = 60; // Look ahead 60 days by default
