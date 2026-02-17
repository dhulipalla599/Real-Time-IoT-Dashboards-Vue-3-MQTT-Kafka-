import mqtt from 'mqtt';
import { Kafka, Producer } from 'kafkajs';
import { config } from './config';
import { logger } from './logger';

interface TelemetryPayload {
  deviceId: string;
  timestamp: number;
  status: 'online' | 'offline' | 'degraded';
  signalStrength: number;
  latency: number;
  temperature?: number;
  uptime?: number;
  [key: string]: unknown;
}

class MqttKafkaBridge {
  private mqttClient: mqtt.MqttClient;
  private kafkaProducer: Producer;
  private isConnected = false;

  constructor() {
    // Initialize MQTT client
    this.mqttClient = mqtt.connect(config.mqtt.brokerUrl, {
      clientId: `telemetry-bridge-${process.pid}`,
      username: config.mqtt.username,
      password: config.mqtt.password,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30000,
    });

    // Initialize Kafka producer
    const kafka = new Kafka({
      clientId: 'iot-bridge',
      brokers: config.kafka.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.kafkaProducer = kafka.producer({
      allowAutoTopicCreation: false,
      transactionTimeout: 30000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.mqttClient.on('connect', async () => {
      logger.info('MQTT connected');
      await this.connectKafka();
      await this.subscribeMqttTopics();
      this.isConnected = true;
    });

    this.mqttClient.on('message', async (topic, payload) => {
      await this.handleMqttMessage(topic, payload);
    });

    this.mqttClient.on('error', (error) => {
      logger.error('MQTT error', { error: error.message });
    });

    this.mqttClient.on('offline', () => {
      logger.warn('MQTT offline');
      this.isConnected = false;
    });

    this.mqttClient.on('reconnect', () => {
      logger.info('MQTT reconnecting...');
    });
  }

  private async connectKafka(): Promise<void> {
    try {
      await this.kafkaProducer.connect();
      logger.info('Kafka producer connected');
    } catch (error) {
      logger.error('Kafka connection failed', { error });
      throw error;
    }
  }

  private async subscribeMqttTopics(): Promise<void> {
    const topics = [
      'devices/+/telemetry',      // Individual device telemetry
      'devices/+/alerts',          // Device alerts
      'devices/+/diagnostics',     // Diagnostic data
    ];

    for (const topic of topics) {
      await this.mqttClient.subscribeAsync(topic, { qos: 1 });
      logger.info(`Subscribed to MQTT topic: ${topic}`);
    }
  }

  private async handleMqttMessage(topic: string, payload: Buffer): Promise<void> {
    try {
      const parts = topic.split('/');
      const deviceId = parts[1];
      const messageType = parts[2]; // telemetry, alerts, diagnostics

      const data = JSON.parse(payload.toString()) as Record<string, unknown>;

      // Validate and enrich payload
      const enrichedPayload: TelemetryPayload = {
        deviceId,
        timestamp: Date.now(),
        ...data,
      } as TelemetryPayload;

      // Publish to Kafka with device ID as partition key for ordering
      await this.kafkaProducer.send({
        topic: `device.${messageType}.raw`,
        messages: [
          {
            key: deviceId,
            value: JSON.stringify(enrichedPayload),
            headers: {
              'message-type': messageType,
              'device-id': deviceId,
              'ingestion-timestamp': String(Date.now()),
            },
          },
        ],
      });

      logger.debug('Message bridged', {
        deviceId,
        messageType,
        kafkaTopic: `device.${messageType}.raw`,
      });
    } catch (error) {
      logger.error('Failed to handle MQTT message', {
        topic,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async start(): Promise<void> {
    logger.info('Starting MQTT-Kafka Bridge...');
    // Connection happens automatically via event handlers
  }

  async stop(): Promise<void> {
    logger.info('Stopping MQTT-Kafka Bridge...');
    this.mqttClient.end();
    await this.kafkaProducer.disconnect();
    this.isConnected = false;
  }

  getStatus(): { mqtt: boolean; kafka: boolean } {
    return {
      mqtt: this.mqttClient.connected,
      kafka: this.isConnected,
    };
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await bridge.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await bridge.stop();
  process.exit(0);
});

// Start bridge
const bridge = new MqttKafkaBridge();
bridge.start().catch((error) => {
  logger.error('Failed to start bridge', { error });
  process.exit(1);
});

export { MqttKafkaBridge };
