/**
 * Input validation utilities using Zod
 * 
 * Security features:
 * - Strict type validation
 * - String length limits
 * - Regex patterns for allowed characters
 * - Number range validation
 */

import { z } from 'zod';

// Maximum values to prevent abuse
const MAX_STRING_LENGTH = 100;
const MAX_RESULTS = 1000;
const MAX_ROUND = 20;

/**
 * Safe string schema - alphanumeric, spaces, hyphens only
 */
export const safeStringSchema = z
  .string()
  .max(MAX_STRING_LENGTH)
  .regex(/^[a-zA-Z0-9\s\-']+$/, 'Invalid characters in string');

/**
 * Player name validation
 */
export const playerNameSchema = z
  .string()
  .min(1)
  .max(MAX_STRING_LENGTH)
  .regex(/^[a-zA-Z0-9\s\-'.]+$/, 'Invalid player name');

/**
 * Archetype name validation
 */
export const archetypeSchema = z
  .string()
  .min(1)
  .max(MAX_STRING_LENGTH)
  .regex(/^[a-zA-Z\s\-]+$/, 'Invalid archetype name');

/**
 * Round number validation
 */
export const roundSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_ROUND);

/**
 * Round string validation (for match data which uses string keys)
 */
export const roundStringSchema = z
  .string()
  .regex(/^\d+$/, 'Round must be a numeric string')
  .transform((val) => parseInt(val, 10))
  .pipe(roundSchema);

/**
 * Result limit validation
 */
export const limitSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_RESULTS)
  .default(100);

/**
 * Query parameters for match queries
 */
export const matchQuerySchema = z.object({
  round: roundSchema.optional(),
  player: playerNameSchema.optional(),
  archetype: archetypeSchema.optional(),
  limit: limitSchema.optional(),
});

/**
 * Query parameters for deck queries
 */
export const deckQuerySchema = z.object({
  player: playerNameSchema.optional(),
  archetype: archetypeSchema.optional(),
  limit: limitSchema.optional(),
});

/**
 * Query parameters for stats queries
 */
export const statsQuerySchema = z.object({
  archetype: archetypeSchema.optional(),
});

/**
 * Query parameters for player deck queries
 */
export const playerDeckQuerySchema = z.object({
  player: playerNameSchema,
});

/**
 * Card name validation
 */
export const cardNameSchema = z
  .string()
  .min(1)
  .max(MAX_STRING_LENGTH)
  .regex(/^[a-zA-Z0-9\s\-',./]+$/, 'Invalid card name');

/**
 * Query parameters for card queries
 */
export const cardQuerySchema = z.object({
  card: cardNameSchema,
  limit: limitSchema.optional(),
});

/**
 * Sanitize a string by removing potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .slice(0, MAX_STRING_LENGTH)
    .replace(/[^\w\s\-'.]/g, '');
}

/**
 * Validate and sanitize query parameters
 */
export function validateQuery<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map(e => e.message).join(', ');
      throw new Error(`Validation error: ${messages}`);
    }
    throw error;
  }
}

export type MatchQuery = z.infer<typeof matchQuerySchema>;
export type DeckQuery = z.infer<typeof deckQuerySchema>;
export type StatsQuery = z.infer<typeof statsQuerySchema>;
export type PlayerDeckQuery = z.infer<typeof playerDeckQuerySchema>;
export type CardQuery = z.infer<typeof cardQuerySchema>;
