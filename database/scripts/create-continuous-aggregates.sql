-- This script needs to be run manually outside of TypeORM migrations
-- because continuous aggregates cannot be created inside transaction blocks

-- Create continuous aggregate for hourly data
CREATE MATERIALIZED VIEW IF NOT EXISTS sensor_logs_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', "timestamp") AS bucket,
  "deviceId",
  AVG(ph) AS avg_ph,
  AVG(temperature) AS avg_temperature,
  AVG(tds) AS avg_tds,
  AVG("dissolvedOxygen") AS avg_dissolved_oxygen,
  MIN(ph) AS min_ph,
  MIN(temperature) AS min_temperature,
  MIN(tds) AS min_tds,
  MIN("dissolvedOxygen") AS min_dissolved_oxygen,
  MAX(ph) AS max_ph,
  MAX(temperature) AS max_temperature,
  MAX(tds) AS max_tds,
  MAX("dissolvedOxygen") AS max_dissolved_oxygen
FROM sensor_logs
GROUP BY bucket, "deviceId";

-- Create continuous aggregate for daily data
CREATE MATERIALIZED VIEW IF NOT EXISTS sensor_logs_daily
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', "timestamp") AS bucket,
  "deviceId",
  AVG(ph) AS avg_ph,
  AVG(temperature) AS avg_temperature,
  AVG(tds) AS avg_tds,
  AVG("dissolvedOxygen") AS avg_dissolved_oxygen,
  MIN(ph) AS min_ph,
  MIN(temperature) AS min_temperature,
  MIN(tds) AS min_tds,
  MIN("dissolvedOxygen") AS min_dissolved_oxygen,
  MAX(ph) AS max_ph,
  MAX(temperature) AS max_temperature,
  MAX(tds) AS max_tds,
  MAX("dissolvedOxygen") AS max_dissolved_oxygen
FROM sensor_logs
GROUP BY bucket, "deviceId";

-- Set refresh policies for continuous aggregates
SELECT add_continuous_aggregate_policy('sensor_logs_hourly',
  start_offset => INTERVAL '3 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');

SELECT add_continuous_aggregate_policy('sensor_logs_daily',
  start_offset => INTERVAL '30 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day'); 