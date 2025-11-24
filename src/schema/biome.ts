import { z } from 'zod';

export const BiomeSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  temperatureMin: z.number(),
  temperatureMax: z.number(),
  moistureMin: z.number().min(0).max(1),
  moistureMax: z.number().min(0).max(1),
  elevationMin: z.number(),
  elevationMax: z.number(),
});

export type Biome = z.infer<typeof BiomeSchema>;
