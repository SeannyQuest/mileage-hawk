import { z } from "zod";

// ==========================================
// Shared Zod Validation Schemas
// ==========================================

export const CabinClassSchema = z.enum(["ECONOMY_PLUS", "BUSINESS", "FIRST"]);

export const RegionSchema = z.enum([
  "EUROPE",
  "ASIA",
  "MIDDLE_EAST",
  "OCEANIA",
  "LATIN_AMERICA_MEXICO",
  "LATIN_AMERICA_SOUTH",
]);

export const AlertChannelSchema = z.enum(["EMAIL", "SMS", "PUSH"]);

export const PaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const SortOrderSchema = z.enum(["asc", "desc"]).default("asc");

export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format");

export const AirportCodeSchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/, "Airport code must be 3 uppercase letters");

export const IdSchema = z.string().min(1, "ID is required");
