// config.ts
export const config = {
  websocket: {
    port: parseInt(process.env.WS_PORT || '8080', 10),
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'ws-fanout',
    groupId: process.env.KAFKA_GROUP_ID || 'websocket-fanout-group',
  },
  topics: {
    telemetryEnriched: 'device.telemetry.enriched',
    alertsEnriched: 'device.alerts.enriched',
  },
};
