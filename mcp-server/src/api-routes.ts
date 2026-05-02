/**
 * REST API routes. Tournament ID is mandatory in the path; no flat aliases.
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import {
  queryMatches,
  queryDecks,
  queryStats,
  queryPlayerDeck,
  queryPlayerStats,
  listArchetypes,
  getTournamentInfo,
  queryDecksByCard,
  listTournamentsBrief,
} from './queries.js';
import {
  validateQuery,
  matchQuerySchema,
  deckQuerySchema,
  statsQuerySchema,
  playerNameSchema,
  cardQuerySchema,
  tournamentIdSchema,
} from './validation.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(limiter);

// Helper: require tournament ID from path param, 404 if unknown
function requireTournamentId(req: Request, res: Response): string | null {
  try {
    return validateQuery(tournamentIdSchema, req.params.id);
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown tournament',
    });
    return null;
  }
}

// GET /api/tournaments — list all
router.get('/tournaments', (_req, res) => {
  const data = listTournamentsBrief();
  res.json({ success: true, count: data.length, data });
});

// GET /api/tournaments/:id — single tournament metadata
router.get('/tournaments/:id', (req, res) => {
  const id = requireTournamentId(req, res);
  if (!id) return;
  const info = getTournamentInfo(id);
  if (!info) {
    res.status(404).json({ success: false, error: 'Tournament not found' });
    return;
  }
  res.json({ success: true, data: info });
});

// GET /api/tournaments/:id/matches
router.get('/tournaments/:id/matches', (req, res) => {
  const id = requireTournamentId(req, res);
  if (!id) return;
  try {
    const params: Record<string, unknown> = { tournament_id: id };
    if (req.query.round) params.round = parseInt(req.query.round as string, 10);
    if (req.query.player) params.player = req.query.player as string;
    if (req.query.archetype) params.archetype = req.query.archetype as string;
    if (req.query.limit) params.limit = parseInt(req.query.limit as string, 10);

    const validated = validateQuery(matchQuerySchema, params);
    const results = queryMatches(validated);
    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

// GET /api/tournaments/:id/decks
router.get('/tournaments/:id/decks', (req, res) => {
  const id = requireTournamentId(req, res);
  if (!id) return;
  try {
    const params: Record<string, unknown> = { tournament_id: id };
    if (req.query.player) params.player = req.query.player as string;
    if (req.query.archetype) params.archetype = req.query.archetype as string;
    if (req.query.limit) params.limit = parseInt(req.query.limit as string, 10);

    const validated = validateQuery(deckQuerySchema, params);
    const results = queryDecks(validated);
    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

// GET /api/tournaments/:id/stats
router.get('/tournaments/:id/stats', (req, res) => {
  const id = requireTournamentId(req, res);
  if (!id) return;
  try {
    const params: Record<string, unknown> = { tournament_id: id };
    if (req.query.archetype) params.archetype = req.query.archetype as string;

    const validated = validateQuery(statsQuerySchema, params);
    const results = queryStats(validated);
    if (results === null) {
      res.status(404).json({ success: false, error: 'Archetype not found' });
      return;
    }
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

// GET /api/tournaments/:id/players/:player/deck
router.get('/tournaments/:id/players/:player/deck', (req, res) => {
  const id = requireTournamentId(req, res);
  if (!id) return;
  try {
    const player = validateQuery(playerNameSchema, req.params.player);
    const result = queryPlayerDeck(id, player);
    if (!result) {
      res.status(404).json({ success: false, error: 'Player not found' });
      return;
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

// GET /api/tournaments/:id/players/:player/stats
router.get('/tournaments/:id/players/:player/stats', (req, res) => {
  const id = requireTournamentId(req, res);
  if (!id) return;
  try {
    const player = validateQuery(playerNameSchema, req.params.player);
    const result = queryPlayerStats(id, player);
    if (!result) {
      res.status(404).json({ success: false, error: 'Player not found' });
      return;
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

// GET /api/tournaments/:id/archetypes
router.get('/tournaments/:id/archetypes', (req, res) => {
  const id = requireTournamentId(req, res);
  if (!id) return;
  try {
    const results = listArchetypes(id);
    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

// GET /api/tournaments/:id/cards/:card
router.get('/tournaments/:id/cards/:card', (req, res) => {
  const id = requireTournamentId(req, res);
  if (!id) return;
  try {
    const params: Record<string, unknown> = {
      tournament_id: id,
      card: req.params.card,
    };
    if (req.query.limit) params.limit = parseInt(req.query.limit as string, 10);

    const validated = validateQuery(cardQuerySchema, params);
    const results = queryDecksByCard(validated);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

export default router;
