import { z } from "zod";
import { CabinClassSchema, AlertChannelSchema, IdSchema } from "./common";

// ==========================================
// Alert Validation Schemas
// ==========================================

export const CreateAlertSchema = z.object({
  routeId: IdSchema,
  cabinClass: CabinClassSchema,
  airlineId: z.string().nullable().optional().default(null),
  thresholdPoints: z.number().int().min(1000).max(500000),
  alertChannels: z.array(AlertChannelSchema).min(1, "At least one alert channel is required"),
});

export const UpdateAlertSchema = z.object({
  thresholdPoints: z.number().int().min(1000).max(500000).optional(),
  alertChannels: z.array(AlertChannelSchema).min(1).optional(),
  isActive: z.boolean().optional(),
  airlineId: z.string().nullable().optional(),
});

export type CreateAlertInput = z.infer<typeof CreateAlertSchema>;
export type UpdateAlertInput = z.infer<typeof UpdateAlertSchema>;
