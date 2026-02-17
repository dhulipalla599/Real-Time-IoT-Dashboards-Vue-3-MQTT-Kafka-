// routes/alerts.ts
import { Router } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { deviceId, severity, acknowledged, limit = 100 } = req.query;
    let query = 'SELECT * FROM alerts WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (deviceId) {
      query += ` AND device_id = $${paramCount++}`;
      params.push(deviceId);
    }
    if (severity) {
      query += ` AND severity = $${paramCount++}`;
      params.push(severity);
    }
    if (acknowledged !== undefined) {
      query += ` AND acknowledged = $${paramCount++}`;
      params.push(acknowledged === 'true');
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);
    res.json({ alerts: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

router.put('/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE alerts SET acknowledged = TRUE, acknowledged_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

export default router;
