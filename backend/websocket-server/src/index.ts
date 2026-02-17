import { WebSocketServer, WebSocket } from 'ws';
import { Kafka, Consumer } from 'kafkajs';
import { IncomingMessage } from 'http';
import { config } from './config';
import { logger } from './logger';

interface ClientSubscription {
  ws: WebSocket;
  deviceIds: Set<string>;
}

class WebSocketFanoutServer {
  private wss: WebSocketServer;
  private kafkaConsumer: Consumer;
  private subscriptions = new Map<string, Set<WebSocket>>(); // deviceId -> Set<WebSocket>
  private clients = new Map<WebSocket, ClientSubscription>();

  constructor() {
    this.wss = new WebSocketServer({ port: config.websocket.port });
    
    const kafka = new Kafka({
      clientId: 'ws-fanout',
      brokers: config.kafka.brokers,
    });

    this.kafkaConsumer = kafka.consumer({
      groupId: 'websocket-fanout-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const clientIp = req.socket.remoteAddress;
      logger.info('Client connected', { clientIp });

      this.clients.set(ws, { ws, deviceIds: new Set() });

      ws.on('message', (data: Buffer) => {
        this.handleClientMessage(ws, data);
      });

      ws.on('close', () => {
        this.handleClientDisconnect(ws);
        logger.info('Client disconnected', { clientIp });
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', { error: error.message, clientIp });
      });

      // Send initial connection acknowledgment
      ws.send(JSON.stringify({
        type: 'connected',
        timestamp: Date.now(),
        message: 'WebSocket connection established',
      }));
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', { error: error.message });
    });
  }

  private handleClientMessage(ws: WebSocket, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());

      switch (message.action) {
        case 'subscribe':
          this.subscribeClient(ws, message.deviceId);
          break;
        case 'unsubscribe':
          this.unsubscribeClient(ws, message.deviceId);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        default:
          logger.warn('Unknown action', { action: message.action });
      }
    } catch (error) {
      logger.error('Failed to parse client message', { error });
    }
  }

  private subscribeClient(ws: WebSocket, deviceId: string): void {
    const client = this.clients.get(ws);
    if (!client) return;

    // Add device to client's subscription list
    client.deviceIds.add(deviceId);

    // Add client to device's subscriber list
    if (!this.subscriptions.has(deviceId)) {
      this.subscriptions.set(deviceId, new Set());
    }
    this.subscriptions.get(deviceId)!.add(ws);

    logger.debug('Client subscribed', { deviceId, totalSubscribers: this.subscriptions.get(deviceId)!.size });

    // Acknowledge subscription
    ws.send(JSON.stringify({
      type: 'subscribed',
      deviceId,
      timestamp: Date.now(),
    }));
  }

  private unsubscribeClient(ws: WebSocket, deviceId: string): void {
    const client = this.clients.get(ws);
    if (!client) return;

    client.deviceIds.delete(deviceId);

    const subscribers = this.subscriptions.get(deviceId);
    if (subscribers) {
      subscribers.delete(ws);
      if (subscribers.size === 0) {
        this.subscriptions.delete(deviceId);
      }
    }

    logger.debug('Client unsubscribed', { deviceId });
  }

  private handleClientDisconnect(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (!client) return;

    // Remove client from all device subscriptions
    client.deviceIds.forEach((deviceId) => {
      const subscribers = this.subscriptions.get(deviceId);
      if (subscribers) {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
          this.subscriptions.delete(deviceId);
        }
      }
    });

    this.clients.delete(ws);
  }

  private async startKafkaConsumer(): Promise<void> {
    await this.kafkaConsumer.connect();
    logger.info('Kafka consumer connected');

    await this.kafkaConsumer.subscribe({
      topics: ['device.telemetry.enriched', 'device.alerts.enriched'],
      fromBeginning: false,
    });

    await this.kafkaConsumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) return;

        try {
          const payload = JSON.parse(message.value.toString());
          const deviceId = payload.deviceId;

          // Get all clients subscribed to this device
          const subscribers = this.subscriptions.get(deviceId);
          if (!subscribers || subscribers.size === 0) {
            return; // No one is watching this device
          }

          const messageToSend = JSON.stringify({
            type: topic.includes('alerts') ? 'alert' : 'telemetry',
            deviceId,
            data: payload,
            timestamp: Date.now(),
          });

          // Fan out to all subscribed clients
          let successCount = 0;
          let failCount = 0;

          subscribers.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(messageToSend);
                successCount++;
              } catch (error) {
                failCount++;
                logger.error('Failed to send to client', { deviceId, error });
              }
            }
          });

          logger.debug('Fanout complete', {
            deviceId,
            topic,
            successCount,
            failCount,
          });
        } catch (error) {
          logger.error('Failed to process Kafka message', { error });
        }
      },
    });
  }

  async start(): Promise<void> {
    logger.info('Starting WebSocket Fanout Server...');
    await this.startKafkaConsumer();
    logger.info(`WebSocket server listening on port ${config.websocket.port}`);
  }

  async stop(): Promise<void> {
    logger.info('Stopping WebSocket Fanout Server...');
    
    // Close all client connections
    this.wss.clients.forEach((ws) => {
      ws.close(1000, 'Server shutting down');
    });

    this.wss.close();
    await this.kafkaConsumer.disconnect();
  }

  getStats() {
    return {
      connectedClients: this.clients.size,
      activeSubscriptions: this.subscriptions.size,
      totalDevicesWatched: Array.from(this.subscriptions.values())
        .reduce((sum, subs) => sum + subs.size, 0),
    };
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

// Start server
const server = new WebSocketFanoutServer();
server.start().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});

// Log stats every 30 seconds
setInterval(() => {
  const stats = server.getStats();
  logger.info('Server stats', stats);
}, 30000);

export { WebSocketFanoutServer };
