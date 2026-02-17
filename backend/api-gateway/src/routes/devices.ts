// routes/devices.ts
import { Router } from 'express';
import { pool } from '../db';
import { AuthRequest, requirePermission } from '../middleware/auth';

const router = Router();

// GET /api/devices - List all devices
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { status, type, limit = 100, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM devices WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount++}`;
      params.push(status);
    }

    if (type) {
      query += ` AND type = $${paramCount++}`;
      params.push(type);
    }

    query += ` ORDER BY last_seen DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      devices: result.rows,
      total: result.rowCount,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// GET /api/devices/:id - Get single device
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM devices WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

// POST /api/devices - Create new device
router.post('/', requirePermission('device:configure'), async (req: AuthRequest, res) => {
  try {
    const { id, name, type, location, latitude, longitude, firmware_version } = req.body;

    const result = await pool.query(
      `INSERT INTO devices (id, name, type, location, latitude, longitude, firmware_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, name, type, location, latitude, longitude, firmware_version]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating device:', error);
    res.status(500).json({ error: 'Failed to create device' });
  }
});

// PUT /api/devices/:id - Update device
router.put('/:id', requirePermission('device:configure'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, type, location, latitude, longitude, firmware_version, status } = req.body;

    const result = await pool.query(
      `UPDATE devices 
       SET name = COALESCE($2, name),
           type = COALESCE($3, type),
           location = COALESCE($4, location),
           latitude = COALESCE($5, latitude),
           longitude = COALESCE($6, longitude),
           firmware_version = COALESCE($7, firmware_version),
           status = COALESCE($8, status),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, name, type, location, latitude, longitude, firmware_version, status]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({ error: 'Failed to update device' });
  }
});

// DELETE /api/devices/:id - Delete device
router.delete('/:id', requirePermission('device:configure'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM devices WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({ message: 'Device deleted', id });
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

export default router;
