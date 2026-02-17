// routes/users.ts
import { Router } from 'express';
import { pool } from '../db';
import { requirePermission } from '../middleware/auth';

const router = Router();

router.get('/', requirePermission('user:manage'), async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, username, role, created_at FROM users');
    res.json({ users: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
