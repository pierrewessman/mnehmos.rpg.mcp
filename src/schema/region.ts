import { z } from 'zod';

export const RegionSchema = z.object({
  id: z.string(),
  worldId: z.string(),
  name: z.string(),
  type: z.enum(['kingdom', 'duchy', 'county', 'wilderness', 'water']),
  centerX: z.number(),
  centerY: z.number(),
  color: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Region = z.infer<typeof RegionSchema>;
