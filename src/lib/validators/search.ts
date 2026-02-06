import { z } from "zod";
import {
  CabinClassSchema,
  RegionSchema,
  PaginationSchema,
  SortOrderSchema,
  AirportCodeSchema,
  DateSchema,
} from "./common";

// ==========================================
// Search & Filter Validation Schemas
// ==========================================

export const PriceSearchSchema = PaginationSchema.extend({
  origin: AirportCodeSchema.optional(),
  destination: AirportCodeSchema.optional(),
  region: RegionSchema.optional(),
  cabinClass: CabinClassSchema.optional(),
  airline: z.string().optional(),
  dateFrom: DateSchema.optional(),
  dateTo: DateSchema.optional(),
  maxPoints: z.coerce.number().int().min(0).optional(),
  directOnly: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  sort: z.enum(["price", "date", "savings", "airline"]).default("price"),
  order: SortOrderSchema,
});

export const RouteFilterSchema = z.object({
  origin: AirportCodeSchema.optional(),
  region: RegionSchema.optional(),
  cabinClass: CabinClassSchema.optional(),
  airline: z.string().optional(),
  sort: z.enum(["price", "drop", "destination"]).default("price"),
});

export const PriceHistorySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
  airline: z.string().optional(),
  cabinClass: CabinClassSchema.optional(),
});

export const BestDealsSchema = PaginationSchema.extend({
  region: RegionSchema.optional(),
  cabinClass: CabinClassSchema.optional(),
  sort: z.enum(["savings", "price", "score"]).default("savings"),
});

export type PriceSearchInput = z.infer<typeof PriceSearchSchema>;
export type RouteFilterInput = z.infer<typeof RouteFilterSchema>;
export type PriceHistoryInput = z.infer<typeof PriceHistorySchema>;
export type BestDealsInput = z.infer<typeof BestDealsSchema>;
