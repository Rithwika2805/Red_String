"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get board state
router.get('/:caseId', auth_1.authenticateToken, async (req, res, next) => {
    const { caseId } = req.params;
    const userId = req.user?.id;
    try {
        const result = await (0, db_1.query)('SELECT nodes, edges, zoom, pan FROM board_state WHERE user_id = $1 AND case_id = $2', [userId, caseId]);
        if (result.rows.length === 0) {
            return res.json({
                nodes: [],
                edges: [],
                cards: [],
                connections: [],
                zoom: 1.0,
                pan: { x: 0, y: 0 }
            });
        }
        const row = result.rows[0];
        res.json({
            nodes: row.nodes,
            edges: row.edges,
            cards: row.nodes, // backward compatibility
            connections: row.edges, // backward compatibility
            zoom: row.zoom,
            pan: row.pan
        });
    }
    catch (error) {
        next(error);
    }
});
// Update board state
router.post('/:caseId', auth_1.authenticateToken, async (req, res, next) => {
    const { caseId } = req.params;
    const { nodes, edges, cards, connections, zoom, pan } = req.body;
    const userId = req.user?.id;
    // Use graph names or fallback to old card names
    const finalNodes = nodes || cards || [];
    const finalEdges = edges || connections || [];
    try {
        await (0, db_1.query)(`INSERT INTO board_state (user_id, case_id, nodes, edges, zoom, pan)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, case_id) DO UPDATE SET
         nodes = $3,
         edges = $4,
         zoom = $5,
         pan = $6,
         updated_at = CURRENT_TIMESTAMP`, [
            userId,
            caseId,
            JSON.stringify(finalNodes),
            JSON.stringify(finalEdges),
            zoom || 1.0,
            JSON.stringify(pan || { x: 0, y: 0 })
        ]);
        res.json({ message: 'Board state saved successfully' });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
