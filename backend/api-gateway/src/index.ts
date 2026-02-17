// index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { logger } from './logger';
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';

// Route imports
import authRoutes from './routes/auth';
import devicesRoutes from './routes/devices';
import telemetryRoutes from './routes/telemetry';
import alertsRoutes from './routes/alerts';
import usersRoutes from './routes/users';

const app = express();
const PORT = parseInt(process.env.API_PORT || '3000', 10);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(pinoHttp({ logger }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes (public)
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/devices', authenticateToken, devicesRoutes);
app.use('/api/telemetry', authenticateToken, telemetryRoutes);
app.use('/api/alerts', authenticateToken, alertsRoutes);
app.use('/api/users', authenticateToken, usersRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`API Gateway listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
