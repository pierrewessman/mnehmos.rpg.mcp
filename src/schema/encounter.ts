import { z } from 'zod';

export const TokenSchema = z.object({
    id: z.string(),
    characterId: z.string(),
    x: z.number().int(),
    y: z.number().int(),
    hp: z.number().int().min(0),
    conditions: z.array(z.string()),
});

export type Token = z.infer<typeof TokenSchema>;

export const EncounterSchema = z.object({
    id: z.string(),
    regionId: z.string(),
    tokens: z.array(TokenSchema),
    round: z.number().int().min(0),
    activeTokenId: z.string().optional(),
    status: z.enum(['active', 'completed', 'paused']),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export type Encounter = z.infer<typeof EncounterSchema>;
