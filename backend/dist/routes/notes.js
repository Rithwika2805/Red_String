"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get all journal entries (manual + system)
router.get('/:caseId', auth_1.authenticateToken, async (req, res, next) => {
    const { caseId } = req.params;
    const userId = req.user?.id;
    try {
        const result = await (0, db_1.query)(`SELECT id, title, content, pinned, is_system, created_at, updated_at 
       FROM journal_entries 
       WHERE user_id = $1 AND case_id = $2 
       ORDER BY created_at ASC`, [userId, caseId]);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
});
// Create or update a manual note
router.post('/:caseId', auth_1.authenticateToken, async (req, res, next) => {
    const { caseId } = req.params;
    const { id, title, content, pinned } = req.body;
    const userId = req.user?.id;
    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
    }
    try {
        if (id) {
            // Edit existing note
            const updateResult = await (0, db_1.query)(`UPDATE journal_entries 
         SET title = $1, content = $2, pinned = $3, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4 AND user_id = $5 AND is_system = false
         RETURNING *`, [title, content, !!pinned, id, userId]);
            if (updateResult.rows.length === 0) {
                return res.status(404).json({ error: 'Note not found or cannot edit system notes' });
            }
            res.json(updateResult.rows[0]);
        }
        else {
            // Create new note
            const insertResult = await (0, db_1.query)(`INSERT INTO journal_entries (user_id, case_id, title, content, pinned, is_system)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING *`, [userId, caseId, title, content, !!pinned]);
            res.status(201).json(insertResult.rows[0]);
        }
    }
    catch (error) {
        next(error);
    }
});
// Delete a manual note
router.delete('/:caseId/:noteId', auth_1.authenticateToken, async (req, res, next) => {
    const { noteId } = req.params;
    const userId = req.user?.id;
    try {
        const result = await (0, db_1.query)('DELETE FROM journal_entries WHERE id = $1 AND user_id = $2 AND is_system = false RETURNING id', [noteId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Note not found or cannot delete system notes' });
        }
        res.json({ message: 'Note deleted successfully', id: noteId });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
