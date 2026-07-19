import { Router, Response } from 'express';
import { query } from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get board state
router.get('/:caseId', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  const { caseId } = req.params;
  const userId = req.user?.id;

  try {
    const result = await query(
      'SELECT cards, connections, zoom, pan FROM board_state WHERE user_id = $1 AND case_id = $2',
      [userId, caseId]
    );

    if (result.rows.length === 0) {
      return res.json({
        cards: [],
        connections: [],
        zoom: 1.0,
        pan: { x: 0, y: 0 }
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update board state
router.post('/:caseId', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  const { caseId } = req.params;
  const { cards, connections, zoom, pan } = req.body;
  const userId = req.user?.id;

  try {
    await query(
      `INSERT INTO board_state (user_id, case_id, cards, connections, zoom, pan)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, case_id) DO UPDATE SET
         cards = $3,
         connections = $4,
         zoom = $5,
         pan = $6,
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        caseId,
        JSON.stringify(cards || []),
        JSON.stringify(connections || []),
        zoom || 1.0,
        JSON.stringify(pan || { x: 0, y: 0 })
      ]
    );

    res.json({ message: 'Board state saved successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
