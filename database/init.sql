CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE device_status_enum AS ENUM ('paired', 'online', 'offline');
CREATE TYPE sensor_type_enum AS ENUM ('ph', 'tds', 'dissolved_oxygen', 'temperature');