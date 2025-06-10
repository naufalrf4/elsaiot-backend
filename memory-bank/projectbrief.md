# Project Brief: ElsaIoT Backend

## Project Overview

ElsaIoT Backend is an IoT-based water quality monitoring platform. It serves as the central system for managing water quality sensors deployed in various locations, processing their data, and providing insights through a web interface.

## Core Requirements

### Technology Stack

- **Backend Framework**: NestJS
- **Database**: PostgreSQL with TimescaleDB extension for time-series data
- **Communication Protocols**: MQTT for device communication, WebSockets for real-time frontend updates
- **Authentication**: JWT and Google OAuth

### Core Functionalities

1. **Authentication System**

   - JWT-based authentication
   - Google OAuth integration
   - Role-based access control

2. **Device Management**

   - Device registration and pairing
   - Device status monitoring
   - Firmware update management

3. **Sensor Data Management**

   - Data collection from ESP32 devices via MQTT
   - Time-series data storage in TimescaleDB
   - Data validation and preprocessing

4. **Calibration System**

   - Sensor calibration workflow
   - Offset management
   - Calibration history

5. **Real-time Monitoring**

   - WebSocket-based real-time updates
   - Threshold alerts and notifications
   - Dashboard visualization data endpoints

6. **Data Analysis**
   - Statistical analysis of water quality parameters
   - Trend identification
   - Anomaly detection

## Project Goals

1. Create a reliable, scalable backend for water quality monitoring
2. Ensure secure communication between IoT devices and the backend
3. Process and store sensor data efficiently
4. Provide real-time insights and visualizations
5. Enable easy calibration and management of sensor devices

## Constraints

1. Must handle potentially unreliable IoT device connections
2. Must scale to support hundreds of devices
3. Must ensure data integrity and security
4. Must provide high availability for critical monitoring functions
