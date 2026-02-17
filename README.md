# Real-Time IoT Dashboard

Enterprise-grade IoT monitoring platform with MQTT, Kafka, WebSockets, and Vue 3.

## Performance Metrics

- **Dashboard Latency**: < 200ms (97.5% reduction from 5-10s polling)
- **Backend Load**: 78% reduction
- **Throughput**: 10K+ concurrent events/second
- **Zero Downtime**: Blue-green deployments on AWS ECS

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- npm 9+

### Installation

```bash
# Clone repository
git clone https://github.com/dvsandeep/iot-realtime-dashboard
cd iot-realtime-dashboard

# Install all dependencies
npm run install:all

# Start infrastructure (MQTT, Kafka, PostgreSQL, Redis)
npm run docker:up

# Start all services (in separate terminal)
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Architecture

```
[IoT Devices] → MQTT → Node.js Bridge → Kafka → WebSocket Server → Vue 3 Dashboard
                                         ↓
                                    PostgreSQL
```

## Project Structure

```
iot-realtime-dashboard/
├── backend/
│   ├── mqtt-kafka-bridge/    # MQTT → Kafka ingestion
│   ├── websocket-server/      # WebSocket fanout to clients
│   ├── stream-processor/      # Kafka Streams enrichment
│   └── api-gateway/           # REST API
├── frontend/                   # Vue 3 dashboard
├── docker/                     # Docker configurations
├── docker-compose.yml
└── package.json
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| MQTT Broker | 1883 | Device telemetry ingestion |
| Kafka | 9092 | Event streaming |
| PostgreSQL | 5432 | Device & user data |
| Redis | 6379 | Caching |
| API Gateway | 3000 | REST API |
| WebSocket Server | 8080 | Real-time updates |
| Frontend | 5173 | Vue 3 dashboard |
| Kafka UI | 8090 | Kafka monitoring |

## Environment Variables

Create `.env` files in each backend service directory:

```env
# MQTT Bridge
MQTT_BROKER_URL=mqtt://localhost:1883
KAFKA_BROKERS=localhost:9092

# API Gateway
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iot_platform
DB_USER=iot_user
DB_PASSWORD=iot_password
JWT_SECRET=your-secret-key

# WebSocket Server
WS_PORT=8080
KAFKA_BROKERS=localhost:9092
```

## Development

```bash
# Run individual services
npm run dev -w backend/mqtt-kafka-bridge
npm run dev -w backend/websocket-server
npm run dev -w backend/api-gateway
npm run dev -w frontend

# View logs
npm run docker:logs

# Stop infrastructure
npm run docker:down
```

## Testing

```bash
# Run all tests
npm test

# Test individual service
npm test -w backend/api-gateway
```

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for AWS ECS deployment instructions.

## Related Article

📄 [Building Enterprise-Grade Real-Time IoT Dashboards with Vue 3, MQTT, and Kafka](./docs/ARTICLE.md)

## Author

**D.V. Sandeep**  
Principal Engineer @ Hughes  
[LinkedIn](https://linkedin.com/in/dhullipalla-sandeep) | [Email](mailto:dvsandeep599@gmail.com)

## License

MIT
