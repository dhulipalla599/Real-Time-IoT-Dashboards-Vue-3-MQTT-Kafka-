// config.ts
export const config = {
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'iot-bridge',
  },
  topics: {
    telemetryRaw: process.env.KAFKA_TOPIC_TELEMETRY || 'device.telemetry.raw',
    alertsRaw: process.env.KAFKA_TOPIC_ALERTS || 'device.alerts.raw',
    diagnosticsRaw: process.env.KAFKA_TOPIC_DIAGNOSTICS || 'device.diagnostics.raw',
  },
};
