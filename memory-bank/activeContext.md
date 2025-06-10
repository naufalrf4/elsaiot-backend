# Active Context: ElsaIoT Backend

## Current Work Focus

The ElsaIoT Backend project has completed the authentication system, device management implementation, MQTT integration, and WebSocket integration. Key completed features include:

1. **Authentication System**

   - JWT-based authentication with proper security configuration
   - Refresh token rotation with HttpOnly cookies
   - Role-based access control with guards
   - Global guards and decorators for route protection
   - Standardized response handling for all endpoints
   - Admin User Management with CRUD operations, filtering, and pagination
   - User Profile Management with secure self-service updates and account deactivation
   - Google OAuth integration with automatic account creation/linking
   - Key security patterns implemented:
     - Current password verification for password changes
     - Email uniqueness validation before updates
     - Role-based security restrictions 
     - Soft-delete pattern for account deactivation
     - Protection against deactivating the last admin account
     - Email domain restrictions for Google OAuth
     - Verified email enforcement for OAuth logins
     - Conflict handling for email-based account linking
     - Complete documentation in docs/authentication.md and docs/user-profile.md

2. **Device Management**

   - Device registration and pairing workflow
   - Device CRUD operations with ownership validation
   - Multi-tenancy support with user-scoped device access
   - Device status tracking (local database)
   - Device listing with filtering and pagination
   - Complete documentation in docs/devices.md

3. **MQTT Integration (Completed)**

   - ✅ MQTT client connection with automatic reconnection
   - ✅ Topic-based message routing and validation
   - ✅ Payload validation using DTO schemas
   - ✅ Sensor data persistence to TimescaleDB
   - ✅ Device online/offline tracking
   - ✅ Topic structure: `elsaiot/{device_code}/{message_type}`
   - ✅ SSL/TLS support with configurable verification
   - ✅ Complete documentation in docs/mqtt.md

4. **WebSocket Integration (Completed)**

   - ✅ Socket.IO integration with NestJS gateways
   - ✅ JWT-based authentication via query parameter token
   - ✅ Room-based event routing for multi-tenancy 
   - ✅ Event types implemented for all real-time updates
   - ✅ Client reconnection handling
   - ✅ Automatic room assignment based on device ownership
   - ✅ Complete documentation in docs/websocket.md

**Current Focus: Dashboard Data and Alerting**

The focus is now shifting to dashboard data endpoints and the alert system:

1. **Dashboard Data API Implementation (Completed)**

   - ✅ Time-series data aggregation endpoints
   - ✅ Historical trend analysis
   - ✅ Device status summary endpoints
   - ✅ Efficient querying of TimescaleDB continuous aggregates
   - ✅ Automated time resolution selection
   - ✅ Flexible time range filtering
   - ✅ Column naming conventions standardized (proper quoting of camelCase columns in SQL)
   - ✅ Documentation in docs/sensors.md

2. **Next Focus: Calibration System Implementation**
 
   - ⏳ 3-point calibration workflow
   - ⏳ Calibration data persistence with JSONB
   - ⏳ Calibration validation and application
   - ⏳ Calibration history tracking
   - ⏳ Model calculation (linear regression)

3. **Future Focus: Alerting System Implementation**
 
   - ⏳ Alert threshold configuration
   - ⏳ Real-time alert generation
   - ⏳ Alert notification via WebSocket
   - ⏳ Alert history and management
   - ⏳ External notification integration (email, SMS)

4. **Challenges to Address**

   - ✅ Efficient querying of large time-series datasets
   - ⏳ Implementing robust calibration model with error handling
   - ⏳ Supporting different calibration models per sensor type
   - ⏳ Balancing real-time alerting with system performance
   - ⏳ Implementing threshold-based detection with minimal delay
   - ⏳ Creating flexible notification routing based on severity

## Current Focus - Enhanced Authentication Security

The project is currently focused on improving the authentication security, particularly around the refresh token mechanism to prevent token hijacking attacks.

### Recent Changes

#### Enhanced Refresh Token Security

We've implemented a comprehensive security upgrade for refresh tokens with these key features:

1. **Token Rotation** - Each refresh token is single-use (tracked with `isUsed` field) and a new token is issued when used, creating a rotation chain through the `previousToken` reference.

2. **Device Fingerprinting** - Tokens are now bound to devices through fingerprinting that combines:
   - IP address
   - User agent 
   - Browser characteristics
   - This helps detect token theft when tokens are used from different devices than they were issued for.

3. **Token Family Revocation** - If a potential token theft is detected, the entire token chain is revoked, not just the single token.

4. **Client Metadata Storage** - Additional information about the client is stored with each token:
   - IP address
   - User agent
   - Device fingerprint
   - This provides an audit trail and additional verification points.

5. **Token Status Tracking** - New statuses track token lifecycle:
   - `isUsed` - Whether a token has been used for refresh
   - `isRevoked` - Whether a token has been deliberately invalidated

### Database Changes

The refresh token security improvements required these schema changes:

- Added security-related columns to the `refresh_tokens` table
- Created indexes for efficient token lookup and validation
- The changes were implemented manually through SQL migration

### In Progress

- Testing the refresh token system with real-world scenarios
- Detecting abnormal token usage patterns
- Implementing user notifications for suspicious token activity

## Next Steps

1. Complete testing of the token rotation and security mechanism
2. Implement user notifications for suspicious authentication activity
3. Finalize documentation for the enhanced authentication flow

## Implementation Details

### Device Pairing Workflow

- Devices will be pre-flashed with unique `device_code`
- Users will scan QR codes to register devices (containing only `device_code`)
- Manual input option will be available as fallback
- Pairing is HTTP-initiated through `POST /api/v1/devices/pair`
- Unpaired devices do not publish data to MQTT until successfully paired

### Sensor Data Management

- Using TimescaleDB hypertable (`sensor_logs`) for time-series data
- All sensor values (pH, TDS, dissolved oxygen, temperature) stored as `DOUBLE PRECISION`
- Implementing data retention policies:
  - Raw data retained for 90 days
  - Hourly aggregates retained for 6 months
  - Daily aggregates retained for 2 years
- Continuous aggregates will be set up for efficient dashboard queries
- Compression enabled for older chunks (after 7 days)

### Calibration System

- Implementing 3-point calibration model for all sensors
- Linear regression (least squares) over 3 voltage-value pairs
- Validation checks:
  - Slope (`m`) and intercept (`c`) calculated server-side
  - Validate `m` is negative for pH and `R² > 0.95` before publishing
- Process initiated via `POST /api/v1/calibration`
- MQTT topics:
  - Outbound: `elsaiot/{device_id}/calibration`
  - Inbound: `elsaiot/{device_id}/callback`
- Device callbacks include success/error status for retry logic
- Calibration history stored in `calibrations` table with JSONB for flexible data
- Latest calibration overwrites prior; historical entries stored for audit only
- No automatic drift detection in MVP

### Calibration Payload Storage with JSONB

Flexible JSONB schema to support different calibration models per sensor type:

#### pH Sensor — 3-point linear regression

```json
{
  "points": [
    { "voltage": 2.35, "value": 4 },
    { "voltage": 1.76, "value": 7 },
    { "voltage": 1.45, "value": 10 }
  ],
  "model": "linear",
  "meta": { "unit": "pH" }
}
```

#### TDS Sensor — 2-point approximation

```json
{
  "points": [
    { "voltage": 2.12, "value": 100 },
    { "voltage": 1.84, "value": 500 }
  ],
  "model": "linear",
  "meta": { "unit": "ppm" }
}
```

#### DO Sensor — Polynomial fit

```json
{
  "coefficients": [0.002, -0.03, 6.5],
  "model": "quadratic",
  "meta": { "unit": "mg/L" }
}
```

#### Temperature Sensor — Factory-calibrated, manual offset only

```json
{
  "offset": -0.7,
  "model": "offset",
  "meta": { "unit": "°C" }
}
```

### Alert System

- Defining three severity levels: `info`, `warning`, `critical`
- Critical alerts trigger external notifications (email, SMS)
- Alerts managed through WebSocket events with proper user routing
- Users can dismiss, mark-as-read, and set auto-expiration preferences
- Thresholds configurable per device and tied to fish profiles

### Security Model

- Multi-tenant separation with device ownership scoped per user_id
- No formal organization/tenant entity in MVP
- Admin role implies global admin privileges
- Each device linked to exactly one user (no shared access in MVP)
- Comprehensive audit logging for sensitive operations
- Strict JWT validation with proper secret management
- Rate limiting and security headers for all API endpoints

### Real-time Data Flow

- Target latency: <500ms from MQTT ingestion to WebSocket delivery
- ESP32 devices send data every 5 seconds
- Backend implements debouncing and data transformation
- WebSocket broadcasting optimized for minimal overhead
- Socket.IO used for robust client reconnection support

## Recent Decisions

1. **Database Strategy**

   - Selected PostgreSQL with TimescaleDB for time-series data
   - Decided on hybrid approach using TypeORM + Raw SQL
     - TypeORM for standard entities and CRUD operations
     - Raw SQL for TimescaleDB hypertables and performance-sensitive operations
   - Planned for continuous aggregation of time-series data
   - Defined retention policies for different data resolutions

2. **API Design**

   - Adopted RESTful API design with OpenAPI documentation
   - Established WebSocket-based real-time updates for dashboards
   - Defined consistent error handling and response formats
   - Created standardized envelope format for all API responses

3. **Device Communication**

   - Selected MQTT as the primary protocol for device communication
   - Defined the topic structure: `elsaiot/{device_id}/{message_type}`
   - Established device authentication and provisioning mechanisms
   - Set QoS level 1 for all sensor data messages

4. **Event-Driven Architecture**
   - Using `@nestjs/event-emitter` for intra-service events
   - Events emitted after database commit
   - Critical actions requiring cross-module consistency wrapped in explicit transactions
   - No automated replay capability for failed events in MVP

5. **User Self-Management**
   - Implemented self-service profile management with appropriate security controls
   - Established pattern for password changes requiring current password verification
   - Created soft-delete approach for account deactivation
   - Protected sensitive fields from modification through profile updates
   - Added checks to prevent deactivating the last admin account
   - Created comprehensive documentation of the profile management features

## Database Architecture

### Core Tables

- `users`: Auth & identity management
- `refresh_tokens`: JWT refresh sessions
- `devices`: User-device pairing & status tracking
- `sensor_logs`: TimescaleDB hypertable for sensor data
- `calibrations`: Calibration records with JSONB payload
- `offsets`: Device-specific safe ranges
- `fish_profiles`: Preset range profiles per fish type
- `notifications`: Warning/event alerts per user/device

### Database Schema Status

- ✅ Core database schema successfully created via TypeORM migration
- ✅ All entity models synchronized with database tables
- ✅ Proper enum types created for typed columns
- ✅ Foreign key relationships established for referential integrity
- ✅ Index created on sensor_logs for device_id and timestamp
- ✅ TimescaleDB hypertable for sensor_logs configured
- ✅ Compression policies enabled for efficient storage (older than 7 days)
- ✅ Retention policy set for 1 year of data
- ✅ Continuous aggregates created for hourly and daily data summaries
- ✅ Refresh policies set for automatic materialized view updates

### Enum Types

```sql
CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE device_status_enum AS ENUM ('paired', 'online', 'offline');
CREATE TYPE sensor_type_enum AS ENUM ('ph', 'tds', 'dissolved_oxygen', 'temperature');
```

## Service Responsibilities

| Module          | Tasks                                    |
| --------------- | ---------------------------------------- |
| `auth`          | JWT, OAuth, cookie rotation              |
| `users`         | Profile CRUD                             |
| `devices`       | Pairing, status update, last_online      |
| `sensors`       | MQTT ingestion, log to DB                |
| `mqtt`          | Topic subscription, publishing           |
| `websocket`     | Emit per user token/auth                 |
| `calibrations`  | Regression calc, log to DB, MQTT publish |
| `offsets`       | Threshold config, log + MQTT             |
| `notifications` | Emit warning if out-of-range             |

## Next Steps

1. **Complete Authentication System** ✅

   - ✅ Create NestJS project structure with domain modules
   - ✅ Set up Docker-based development environment
   - ✅ Configure TypeORM with initial migrations
   - ✅ Implement database schema with enum types and base tables
   - ✅ Implement JWT authentication with refresh tokens
   - ✅ Implement role-based access control
   - ✅ Create comprehensive authentication documentation
   - ⏳ Implement Google OAuth integration

2. **Implement Device Management** ✅

   - ✅ Develop device registration and pairing API
   - ✅ Implement device controllers and services
   - ✅ Create device status tracking
   - ✅ Establish device ownership and permissions
   - ✅ Create full device documentation

3. **MQTT Integration** ✅

   - ✅ Complete MQTT service implementation
   - ✅ Implement device message handling
   - ✅ Establish device status tracking via MQTT
   - ✅ Create topic structure and message formats
   - ✅ Implement device online/offline detection
   - ✅ Create documentation for MQTT integration

4. **Real-time Dashboard Support** (Current Focus)
   - ⏳ Implement WebSocket gateways
   - ⏳ Develop event-based update mechanism
   - ⏳ Create API endpoints for dashboard data
   - ⏳ Optimize data delivery for low-latency updates
