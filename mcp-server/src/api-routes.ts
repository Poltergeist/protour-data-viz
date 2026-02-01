/**
 * REST API routes for tournament data
 * Provides HTTP endpoints that mirror MCP tools
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import {
  queryMatches,
  queryDecks,
  queryStats,
  queryPlayerDeck,
  listArchetypes,
  getTournamentInfo,
  queryDecksByCard,
  queryPlayerStats,
} from './queries.js';
import {
  validateQuery,
  matchQuerySchema,
  deckQuerySchema,
  statsQuerySchema,
  playerNameSchema,
  cardQuerySchema,
} from './validation.js';

const router = Router();

// Rate limiting: 100 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes
router.use(limiter);

/**
 * GET /api/matches
 * Query matches by round, player, or archetype
 */
router.get('/matches', (req: Request, res: Response) => {
  try {
    // Convert query params to correct types
    const params: any = {};
    
    if (req.query.round) {
      params.round = parseInt(req.query.round as string, 10);
    }
    if (req.query.player) {
      params.player = req.query.player as string;
    }
    if (req.query.archetype) {
      params.archetype = req.query.archetype as string;
    }
    if (req.query.limit) {
      params.limit = parseInt(req.query.limit as string, 10);
    }

    const validated = validateQuery(matchQuerySchema, params);
    const results = queryMatches(validated);
    
    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request',
    });
  }
});

/**
 * GET /api/decks
 * Query deck lists by player or archetype
 */
router.get('/decks', (req: Request, res: Response) => {
  try {
    const params: any = {};
    
    if (req.query.player) {
      params.player = req.query.player as string;
    }
    if (req.query.archetype) {
      params.archetype = req.query.archetype as string;
    }
    if (req.query.limit) {
      params.limit = parseInt(req.query.limit as string, 10);
    }

    const validated = validateQuery(deckQuerySchema, params);
    const results = queryDecks(validated);
    
    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request',
    });
  }
});

/**
 * GET /api/stats
 * Get archetype statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const params: any = {};
    
    if (req.query.archetype) {
      params.archetype = req.query.archetype as string;
    }

    const validated = validateQuery(statsQuerySchema, params);
    const results = queryStats(validated);
    
    if (results === null) {
      res.status(404).json({
        success: false,
        error: 'Archetype not found',
      });
      return;
    }
    
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request',
    });
  }
});

/**
 * GET /api/players/:player/deck
 * Get specific player's deck and performance
 */
router.get('/players/:player/deck', (req: Request, res: Response) => {
  try {
    const player = validateQuery(playerNameSchema, req.params.player);
    const results = queryPlayerDeck(player);
    
    if (results === null) {
      res.status(404).json({
        success: false,
        error: 'Player not found',
      });
      return;
    }
    
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request',
    });
  }
});

/**
 * GET /api/players/:player/stats
 * Get individual player's performance statistics
 */
router.get('/players/:player/stats', (req: Request, res: Response) => {
  try {
    const player = validateQuery(playerNameSchema, req.params.player);
    const results = queryPlayerStats(player);
    
    if (results === null) {
      res.status(404).json({
        success: false,
        error: 'Player not found',
      });
      return;
    }
    
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request',
    });
  }
});

/**
 * GET /api/archetypes
 * List all archetypes with stats
 */
router.get('/archetypes', (_req: Request, res: Response) => {
  try {
    const results = listArchetypes();
    
    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/tournament
 * Get tournament metadata
 */
router.get('/tournament', (_req: Request, res: Response) => {
  try {
    const results = getTournamentInfo();
    
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/cards/:card
 * Query decks by card name and get performance statistics
 */
router.get('/cards/:card', (req: Request, res: Response) => {
  try {
    const params = {
      card: req.params.card as string,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };

    const validated = validateQuery(cardQuerySchema, params);
    const results = queryDecksByCard(validated);
    
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request',
    });
  }
});

export default router;
