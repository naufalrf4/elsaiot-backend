# System Patterns: ElsaIoT Backend

## System Architecture

```
                 ┌─────────────────┐
                 │  React Frontend │
                 └────────┬────────┘
                          │
                          │ HTTP/WebSocket
                          │
┌───────────────┐  ┌─────┴──────┐  ┌───────────────┐
│ ESP32 Devices │──┤ NestJS API │──┤ TimescaleDB/  │
│ (Sensors)     │  │ Backend    │  │ PostgreSQL    │
└───────────────┘  └─────┬──────┘  └───────────────┘
        │                │
        │                │
        │          ┌────┴─────┐
        └──MQTT────┤ MQTT     │
                   │ Broker   │
                   └──────────┘
```

The ElsaIoT Backend follows a layered architecture with clear separation of concerns:

### Core Architectural Patterns

1. **Modular Monolith**

   - Organized as NestJS modules with clear boundaries
   - Each domain has its own module with controllers, services, and repositories
   - Enables potential future microservice extraction if needed

2. **Repository Pattern**

   - Data access logic encapsulated in repository classes
   - Domain services interact with repositories, not directly with database
   - Facilitates unit testing and potential database technology changes

3. **CQRS (Command Query Responsibility Segregation)**

   - Separate models for reading and updating data
   - Optimized query paths for dashboard and reporting features
   - Commands for device management operations and sensor data writes

4. **Event-Driven Architecture**
   - MQTT messages from devices trigger system events
   - Internal event bus for cross-module communication
   - WebSocket events for real-time frontend updates

## Key Component Relationships

1. **Authentication & Authorization**

   - JWT-based authentication with token refresh
   - HTTP-only secure cookies for refresh token storage
   - Role-based access control (Admin, User)
   - Password hashing with bcrypt
   - Global JWT and roles guards with Public route exceptions
   - Token-based security with short-lived access tokens (15min)
   - Token rotation with long-lived refresh tokens (7days)
   - Centralized auth configuration with type safety
   - Authentication strategies:
     - Local (username/password)
     - JWT token validation
     - Google OAuth with email verification and domain restrictions
   - User Profile Security Patterns:
     - Current password verification for password changes
     - Email uniqueness validation before updates
     - Immutable fields (id, role, createdAt) protected from self-updates
     - Soft-delete pattern for account deactivation via `active` flag
     - Last admin protection to prevent system lockout
     - Email domain restrictions for third-party authentication
     - Account linking validation to prevent conflicts

2. **Device Management**

   - Device registration and assignment to users/locations
   - Device health monitoring and status tracking
   - Firmware update management

3. **Sensor Data Pipeline**

   - MQTT message reception from devices
   - Data validation and preprocessing
   - Storage in TimescaleDB with efficient time-series indexing
   - Real-time processing for alerts and dashboard updates
   - Time-series data API with dynamic resolution selection:
     - Automatic resolution selection based on query time range
     - Raw data for short ranges (≤1 hour)
     - Minute-level aggregation for medium ranges (≤1 day)
     - Hour-level aggregation for longer ranges (≤1 week)
     - Daily aggregation for historical analysis (>1 week)
   - Flexible time range specification:
     - Explicit date ranges with `from`/`to` parameters
     - Preset ranges (`last_hour`, `last_day`, `last_week`, `last_month`)
     - Compact string format for custom ranges
   - Statistical analysis with trend detection:
     - Min/Max/Avg calculations per time period
     - Trend analysis comparing current values to period averages
     - Multi-resolution aggregation for different time spans
   - Time-series data security:
     - Device ownership validation before data access
     - Parameterized queries for SQL injection prevention
     - Automatic query optimization for TimescaleDB
     - Default and maximum limits on result set size
   - Response envelope consistency:
     - Status indicator for operation success
     - Human-readable message for UI display
     - Structured data payload with consistent shape
     - Metadata including timestamps and counts

4. **Calibration Workflow**

   - Step-by-step guided calibration process
   - Calibration factor calculation and application
   - Calibration history and audit trail

5. **Alerting System**

   - Threshold-based alert generation
   - Alert notification via WebSocket and external channels
   - Alert acknowledgment and resolution tracking

6. **Analytics Engine**

   - Statistical analysis of water quality parameters
   - Trend detection and anomaly identification
   - Reporting and data export capabilities

7. **MQTT Integration**

   - Topic-based message routing with strict validation
   - Topic structure: `elsaiot/{device_code}/{message_type}`
   - Handler chain pattern for message processing:
     1. Topic parsing and validation
     2. Message type identification
     3. Payload validation with DTOs
     4. Device ownership verification
     5. Status updates and persistence
   - Separation of concerns via specialized handlers:
     - `DataHandler`: Processes sensor readings
     - `CallbackHandler`: Processes calibration callbacks
   - Device status monitoring via scheduled task
   - Automatic reconnection with exponential backoff
   - Event-driven communication via EventEmitter
   - DTO-based message validation with class-validator
   - SSL/TLS support with configurable certificate verification
   - Configurable topic prefix from environment variables

8. **WebSocket Integration**

   - Socket.IO-based real-time communication
   - JWT authentication via query parameter token
   - Room-based event routing strategy:
     - User rooms: `user:{userId}` for all user-specific events
     - Device rooms: `device:{deviceId}` for device-specific events
   - Event naming convention: `domain.entity.action`
   - Consistent envelope format for all events:
     ```json
     {
       "status": true,
       "message": "Human-readable description",
       "data": { /* Event-specific payload */ },
       "meta": {
         "event": "event.name.here",
         "timestamp": "2025-05-08T12:34:56.789Z"
       }
     }
     ```
   - Event-driven pipeline:
     1. MQTT/system event triggers EventEmitter2 event
     2. Event listener receives payload and resolves device owner
     3. Specialized event class created for each event type
     4. Event emitted to appropriate user/device rooms
   - Built-in reconnection handling with Socket.IO
   - Cross-cutting concerns separated:
     - `SocketGateway`: Connection management and authentication
     - `SocketRoomService`: Room assignment and management
     - `SocketClientService`: Event emission and formatting
     - Event classes: Specialized for each event type
   - Device ownership verification on all events

### MQTT Handler Design Pattern

```
            ┌──────────────────┐
            │  MqttClientServ. │
            └────────┬─────────┘
                     │
                     │ setup handlers
                     ▼
        ┌────────────────────────┐
        │ MqttMessageProcessorSrv│
        └────────────┬───────────┘
                     │ routes message
                     ▼
       ┌─────────────────────────┐
       │    BaseMqttHandler      │◄─────┐
       │ (abstract base class)   │      │
       └─────────────────────────┘      │
               ▲           ▲            │
               │           │            │ validate
     inherits  │           │ inherits   │ topic, payload,
               │           │            │ device
        ┌──────┴───┐  ┌────┴─────┐      │
        │DataHandler│  │ Callback │      │
        │           │  │ Handler  │──────┘
        └───────────┘  └──────────┘
```

The MQTT module follows a hierarchical handler design:

1. **Base Handler**
   - Abstract class `BaseMqttHandler` defines common workflow
   - Template method pattern with customizable validation steps
   - Core processing pipeline with lifecycle hooks for subclasses

2. **Specialized Handlers**
   - `DataHandler`: Processes sensor readings with TimescaleDB storage
   - `CallbackHandler`: Processes calibration results with event emission
   - Each handler specializes in payload type and business logic

3. **Handler Registration**
   - Handlers register by message type in `MqttMessageProcessorService`
   - Dynamic dispatch based on parsed message type
   - Strict validation at each processing phase

4. **Message Flow**
   - MQTT client receives raw message
   - Topic parsing extracts device code and message type
   - Handler selection based on message type
   - Payload validation using specialized DTOs
   - Device verification ensures ownership
   - Processing logic specific to message type
   - Status update and error handling

5. **Data Persistence Strategy**
   - Sensor data stored in TimescaleDB hypertable
   - Fallback mechanism with raw SQL if TypeORM operation fails
   - Optimized for high-throughput time-series data
   - Atomic device status updates with last_online timestamp

## Design Patterns in Use

1. **Dependency Injection**

   - NestJS built-in DI container
   - Services register with container and declare dependencies
   - Facilitates testing and component swapping

2. **Factory Pattern**

   - Used for creating complex objects (e.g., sensor data processors)
   - Handles variations in sensor types and processing requirements

3. **Strategy Pattern**

   - Applied for different calibration methods
   - Allows selection of appropriate algorithm based on sensor type

4. **Observer Pattern**

   - Used for event handling and notifications
   - Decouples event producers from consumers

5. **Decorator Pattern**
   - Applied for route protection and request validation
   - NestJS decorators for controller route mapping
   - Custom decorators:
     - `@CurrentUser()` - extracts authenticated user from request with property path support
     - `@Roles()` - enforces role-based access to routes
     - `@Public()` - marks routes as publicly accessible without authentication

## API Standardization

1. **Global Response Format**

   - Consistent response structure across all endpoints
   - Format:
     ```json
     {
       "status": true,
       "message": "string",
       "data": any,
       "meta": object | undefined
     }
     ```
   - Implemented via `GlobalResponseInterceptor`
   - Default messages based on HTTP methods
   - Support for pagination metadata

2. **Global API Prefix**

   - All API routes use a global prefix: `api/v1`
   - The prefix is set in `main.ts` using `app.setGlobalPrefix()`
   - Controllers should only define their module segment (e.g., `'devices'`, `'auth'`, `'users'`)
   - Complete route example: `/api/v1/devices/pair` comes from `@Controller('devices')` + `@Post('pair')`
   - This pattern allows for easy API versioning by changing only the global prefix

3. **Global Error Handling**

   - Unified error response format
   - Format:
     ```json
     {
       "status": false,
       "message": "string | string[]",
       "data": null
     }
     ```
   - Captures HTTP exceptions, validation errors, and application errors
   - Centralized logging with appropriate severity levels
   - Implemented via `GlobalExceptionFilter`

4. **Request Validation**

   - DTO-based validation using class-validator
   - Strong typing and runtime validation
   - Detailed validation error messages

## Database Schema Overview

The database schema is structured around these core entities:

1. **Users**

   - Authentication details
   - Profile information
   - Role assignments

2. **Devices**

   - Device metadata
   - Connection status
   - Firmware information

3. **Locations**

   - Hierarchical location structure
   - Geographic coordinates
   - Environment metadata

4. **SensorData**

   - Time-series measurements
   - Raw and calibrated values
   - Quality indicators

5. **Calibrations**

   - Calibration factors
   - Calibration timestamps
   - Performed by user reference

6. **Alerts**
   - Alert type and severity
   - Triggered timestamps
   - Resolution status

TimescaleDB hypertables are used for efficient time-series data storage and querying.

### WebSocket Pattern Design

```
            ┌──────────────────────┐
            │   SocketGateway      │
            └──────────┬───────────┘
                       │
        ┌──────────────┴─────────────┐
        │    JWT Authentication      │
        └──────────────┬─────────────┘
                       │
       ┌───────────────┴──────────────┐
       │  SocketClientService         │◄────────┬─────────────┐
       └───────────────┬──────────────┘         │             │
                       │                         │             │
                       ▼                         │             │
       ┌───────────────────────────────┐         │             │
       │ SocketRoomService             │         │             │
       │ (user/device room management) │         │             │
       └───────────────────────────────┘         │             │
                                                 │             │
      ┌────────────────────────────────┐         │    ┌────────┴───────────┐
      │  EventEmitter2                 │──Events─┘    │ MqttEventListener  │
      └───────────┬────────────────────┘              │ DeviceStatusListener│
                  │                                   └────────────────────┘
    ┌─────────────┴──────────────┐
    │       Event Classes        │
    │ SensorDataEvent            │
    │ DeviceStatusEvent          │
    │ CalibrationStatusEvent     │
    │ NotificationEvent          │
    └────────────────────────────┘
```

The WebSocket integration follows the Observer pattern with event propagation:

1. **Connection Management**
   - `SocketGateway` handles client connections and authentication
   - JWT verification on connection with query parameter token
   - Client automatically joins appropriate rooms based on device ownership

2. **Event System**
   - Internal events emitted via `EventEmitter2`
   - Events translated to WebSocket events by listeners
   - Specialized event classes encapsulate formatting and routing logic

3. **Room-Based Isolation**
   - Multi-tenancy achieved with Socket.IO rooms
   - Each user has a dedicated room: `user:{userId}`
   - Each device has a dedicated room: `device:{deviceId}`
   - Events are only emitted to authorized rooms

4. **Event Listeners**
   - `MqttEventListener`: Converts MQTT events to WebSocket events
   - `DeviceStatusListener`: Handles device status changes
   - Listeners verify device ownership before emitting events
