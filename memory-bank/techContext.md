# Technology Context: ElsaIoT Backend

## Technology Stack

### Backend Core

- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **API Style**: RESTful with OpenAPI documentation
- **Real-time Communication**: WebSockets (Socket.io)

### Database

- **Primary Database**: PostgreSQL 15+
- **Time-series Extension**: TimescaleDB
- **ORM Strategy**: Hybrid approach (TypeORM + Raw SQL)
  - TypeORM for standard entities and CRUD operations
  - Raw SQL for TimescaleDB hypertables and performance-critical operations
- **Migrations**: TypeORM migrations + Raw SQL scripts for TimescaleDB-specific features
- **Data Retention**: Continuous aggregates with retention policies

### IoT Communication

- **Protocol**: MQTT 3.1.1
- **Broker**: Mosquitto
- **Client Library**: MQTT.js
- **Topic Structure**: `elsaiot/{device_id}/{message_type}`
  - Data: `elsaiot/{device_id}/data`
  - Calibration: `elsaiot/{device_id}/calibration`
  - Offset: `elsaiot/{device_id}/offset`
  - Callback: `elsaiot/{device_id}/callback`
- **QoS Level**: 1 (at least once delivery)

### Authentication & Security

- **Authentication**: JWT-based with refresh tokens
- **Token Expiration**: Access (15 min), Refresh (7 days)
- **OAuth Provider**: Google OAuth 2.0
- **Password Hashing**: bcrypt
- **API Security**: Helmet, rate limiting, CORS
- **Role-Based Access**: Admin, Operator, Viewer roles

### Testing & Quality

- **Unit Testing**: Jest
- **E2E Testing**: Supertest
- **API Testing**: Postman/Insomnia
- **Code Quality**: ESLint, Prettier
- **CI/CD Integration**: GitHub Actions

### DevOps & Deployment

- **Containerization**: Docker, Docker Compose
- **CI/CD**: GitHub Actions
- **Environment Management**: dotenv
- **Logging**: Winston
- **Monitoring**: Prometheus + Grafana

## Data Flow Specifications

### MQTT Message Flows

#### Inbound Topics

- **Device Data**: `elsaiot/{device_id}/data`

  ```json
  {
    "timestamp": "2023-08-01T12:34:56.789Z",
    "readings": {
      "ph": 4.0,
      "ph_volt": 2.35,
      "tds": 100,
      "tds_volt": 2.12,
      "dissolved_oxygen": 8.5,
      "do_volt": 1.86,
      "temperature": 25.3
    }
  }
  ```

- **Calibration Callback**: `elsaiot/{device_id}/callback`
  ```json
  {
    "request_id": "uuid-string",
    "status": "success",
    "sensor_type": "ph", // ph | tds | dissolved_oxygen
    "message": "Calibration completed successfully"
  }
  ```

#### Outbound Topics

- **Calibration Command**: `elsaiot/{device_id}/calibration`

  ```json
  {
    "request_id": "uuid-string",
    "sensor_type": "ph",  // ph | tds | dissolved_oxygen
    "coefficients": {
      "m": -3.28,
      "c": 13.42
    }
  }
  ```

- **Offset Configuration**: `elsaiot/{device_id}/offset`
  ```json
  { 
    "sensor_type": "ph", // ph | tds | dissolved_oxygen
    "warning_low": 6.5,
    "warning_high": 8.5,
    "critical_low": 6.0,
    "critical_high": 9.0
  }
  ```

### WebSocket Events

#### Emitted to Frontend

- **Sensor Data Update**:

  ```json
  {
    "event": "sensor_data",
    "device_id": "uuid-string",
    "timestamp": "2023-08-01T12:34:56.789Z",
    "readings": {
      "ph": 7.2,
      "tds": 450,
      "dissolved_oxygen": 8.5,
      "temperature": 25.3
    }
  }
  ```

- **Notification Event**:

  ```json
  {
    "event": "notification",
    "id": "uuid-string",
    "device_id": "device-uuid",
    "severity": "warning",
    "message": "pH level above warning threshold",
    "timestamp": "2023-08-01T12:34:56.789Z",
    "read": false,
    "dismissed": false
  }
  ```

- **Calibration Status Update**:
  ```json
  {
    "event": "calibration_status",
    "device_id": "uuid-string",
    "sensor_type": "ph",
    "status": "success",
    "message": "Calibration completed successfully"
  }
  ```

## Technology Constraints & Considerations

### Hardware Constraints

- **Target Devices**: ESP32 microcontrollers
- **Connectivity**: WiFi (occasionally unstable)
- **Power**: Battery-operated devices with power optimization needs
- **Memory**: Limited memory for message buffering on devices
- **Data Transmission**: Devices send data every 5 seconds

### Scalability Requirements

- **Sensor Data**: High write throughput (potentially millions of data points per day)
- **Query Performance**: Fast time-series queries for dashboard visualization
- **Connection Management**: Handle hundreds of concurrent device connections
- **WebSocket Scaling**: Efficient broadcasting to multiple connected clients
- **Data Aggregation**: TimescaleDB continuous aggregates for efficient queries

### Security Requirements

- **Data Encryption**: TLS for all communications
- **Device Authentication**: Secure device registration and authentication
- **Access Control**: Fine-grained permissions for different user roles
- **Audit Trail**: Logging of sensitive operations
- **Multi-tenant Structure**: Device ownership linked directly to user_id (no organization entity in MVP)

## API Design Specifications

### RESTful Endpoints

#### Authentication

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login with email/password
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/google` - Initiate Google OAuth flow
- `GET /api/v1/auth/google/callback` - Google OAuth callback

#### User Management

- `GET /api/v1/users/me` - Get current user profile
- `PUT /api/v1/users/me` - Update current user profile
- `GET /api/v1/users` - List users (admin only)
- `GET /api/v1/users/:id` - Get user by ID (admin only)
- `PUT /api/v1/users/:id` - Update user (admin only)

#### Device Management

- `GET /api/v1/devices` - List user's devices
- `GET /api/v1/devices/:id` - Get device details
- `POST /api/v1/devices/pair` - Pair new device
- `PUT /api/v1/devices/:id` - Update device name/settings
- `DELETE /api/v1/devices/:id` - Remove device pairing

#### Sensor Data

- `GET /api/v1/devices/:id/data` - Get recent data for device
- `GET /api/v1/devices/:id/data/history` - Get historical data with filters
- `GET /api/v1/dashboard` - Get aggregated data for dashboard

#### Calibration

- `POST /api/v1/calibration` - Start calibration process
- `GET /api/v1/calibration/history` - Get calibration history
- `GET /api/v1/calibration/:id` - Get calibration details

#### Offsets & Alerts

- `GET /api/v1/offsets/:device_id` - Get device offsets
- `PUT /api/v1/offsets/:device_id` - Update device offsets
- `GET /api/v1/notifications` - Get user notifications
- `PUT /api/v1/notifications/:id` - Update notification status

### Response Format

All API responses follow a consistent envelope format:

```json
{
  "status": "success", // or "error"
  "data": {}, // response data
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  },
  "message": "Operation successful"
}
```

Error responses:

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}
```

## Database Strategy

### TypeORM and Raw SQL Hybrid Approach

- **TypeORM is used for**:

  - Standard entities: `users`, `refresh_tokens`, `devices`, `offsets`, `fish_profiles`, `notifications`
  - Typical CRUD operations, relationships, and admin management
  - DTO ↔ Entity mapping in modules like `auth`, `users`, `devices`

- **Raw SQL is used for**:

  - `sensor_logs` (TimescaleDB hypertable, bulk insert operations)
  - `calibrations` (JSONB, regression-specific logic)
  - Continuous aggregates & retention policies
  - TimescaleDB-specific features

- **Management Approach**:

  - TimescaleDB-specific features (e.g., `create_hypertable`, `add_retention_policy`) handled via raw SQL in `/database/migrations/` using DO `$$ BEGIN...END $$; COMMIT;`
  - Data ingestion uses parameterized SQL with `pg` client for bulk inserts

- **Rationale**:
  - ORM functionality is unsuitable for TimescaleDB hypertable operations and performance-sensitive inserts
  - Hybrid approach ensures maximum database performance while retaining development ergonomics for standard CRUD operations

### TimescaleDB Data Management Strategy

- **Continuous Aggregates**:

  ```sql
  CREATE MATERIALIZED VIEW sensor_logs_hourly
    WITH (timescaledb.continuous) AS
    SELECT time_bucket('1 hour', timestamp) AS hour,
           device_id,
           sensor_type,
           avg(calibrated_value) AS avg_value,
           min(calibrated_value) AS min_value,
           max(calibrated_value) AS max_value,
           count(*) AS sample_count
    FROM sensor_logs
    GROUP BY hour, device_id, sensor_type;

  CREATE MATERIALIZED VIEW sensor_logs_daily
    WITH (timescaledb.continuous) AS
    SELECT time_bucket('1 day', timestamp) AS day,
           device_id,
           sensor_type,
           avg(calibrated_value) AS avg_value,
           min(calibrated_value) AS min_value,
           max(calibrated_value) AS max_value,
           count(*) AS sample_count
    FROM sensor_logs
    GROUP BY day, device_id, sensor_type;
  ```

- **Retention Policy**:

  ```sql
  SELECT add_retention_policy('sensor_logs', INTERVAL '90 days');
  ```

- **Compression**:

  ```sql
  SELECT add_compression_policy('sensor_logs', INTERVAL '7 days');
  ```

- **Backup Strategy**:

  - Daily logical dumps via `pg_dump` (full backup every 24h)

- **Ingestion During Maintenance**:
  - MQTT messages buffered by async queue in memory (e.g., BullMQ)
  - Retries on database unavailability
  - Unprocessed messages logged to `failed_ingestion_logs` if retries exhausted

## Development Environment Setup

### Local Development Prerequisites

- Node.js 18+
- PostgreSQL 15+ with TimescaleDB extension
- MQTT broker (Mosquitto)
- Docker and Docker Compose

### Docker-based Development

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: timescale/timescaledb:latest-pg15
    environment:
      POSTGRES_USER: elsaiot
      POSTGRES_PASSWORD: password
      POSTGRES_DB: elsaiot
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql

  mqtt:
    image: eclipse-mosquitto:2.0
    ports:
      - '1883:1883'
      - '9001:9001'
    volumes:
      - ./mqtt/mosquitto.conf:/mosquitto/config/mosquitto.conf
      - mosquitto_data:/mosquitto/data
      - mosquitto_log:/mosquitto/log

  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=development
      - DATABASE_HOST=postgres
      - MQTT_HOST=mqtt
    volumes:
      - ./src:/app/src
    depends_on:
      - postgres
      - mqtt

volumes:
  pgdata:
  mosquitto_data:
  mosquitto_log:
```

### Configuration Management

- Environment-specific configuration files
- Secrets management using environment variables
- Feature flags for staged deployment of functionality
- Configuration schema:
  ```typescript
  interface AppConfig {
    port: number;
    database: {
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
    };
    mqtt: {
      host: string;
      port: number;
      username?: string;
      password?: string;
      clientId: string;
    };
    jwt: {
      secret: string;
      accessExpiresIn: string;
      refreshExpiresIn: string;
    };
    google: {
      clientId: string;
      clientSecret: string;
      callbackUrl: string;
    };
  }
  ```

### Development Workflow

- Feature branch development
- Pull request reviews
- Automated testing in CI pipeline
- Staging deployment before production

## Event-driven Communication

### Internal Event System

- **Technology**: `@nestjs/event-emitter` for intra-service events
- **Event Types**:

  - `sensor_data.received`
  - `device.updated`
  - `calibration.completed`
  - etc.

- **Transaction Handling**:

  - Events emitted after database commit using `onApplicationBootstrap` hooks
  - Critical actions requiring cross-module consistency wrapped in explicit transactions

- **Event Format**:

  ```typescript
  {
    event: "sensor_data.received",
    payload: { device_id, timestamp, values }
  }
  ```

- **Error Handling**:
  - Failed event processing logged for manual review
  - No automatic replay in MVP
  - Failed MQTT or WebSocket emissions logged for potential manual reprocessing

## Integration Points

### External Services

- Google OAuth for authentication
- Email service for notifications (SendGrid/Mailgun)
- SMS gateway for critical alerts (Twilio)
- Telegram Bot API for notifications

### Frontend Integration

- RESTful API for data access
- WebSocket connections for real-time updates
- OpenAPI documentation for API discovery
- Authentication token handling
- Response format consistency

### IoT Device Integration

- MQTT for device communication
- JSON message format
- Device provisioning API
- Firmware update mechanism
- Over-the-air configuration updates
