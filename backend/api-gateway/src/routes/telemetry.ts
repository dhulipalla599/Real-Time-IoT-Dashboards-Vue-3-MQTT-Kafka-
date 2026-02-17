// routes/telemetry.ts
import { Router } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const result = await pool.query(
      'SELECT * FROM telemetry_history WHERE device_id = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
      [deviceId, limit, offset]
    );

    res.json({ telemetry: result.rows, total: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch telemetry' });
  }
});

export default router;
