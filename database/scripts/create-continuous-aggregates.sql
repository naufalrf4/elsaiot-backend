-- Create hypertable for sensor_logs
SELECT create_hypertable('sensor_logs', 'timestamp', if_not_exists => TRUE);

-- Create continuous aggregate for hourly data
CREATE MATERIALIZED VIEW sensor_logs_hourly
WITH (
  timescaledb.continuous,
  timescaledb.finalized = true
) AS
SELECT
  time_bucket('1 hour', "timestamp") AS bucket,
  "deviceId",
  avg(ph) AS avg_ph,
  avg(temperature) AS avg_temperature,
  avg(tds) AS avg_tds,
  avg("dissolvedOxygen") AS avg_dissolved_oxygen,
  min(ph) AS min_ph,
  min(temperature) AS min_temperature,
  min(tds) AS min_tds,
  min("dissolvedOxygen") AS min_dissolved_oxygen,
  max(ph) AS max_ph,
  max(temperature) AS max_temperature,
  max(tds) AS max_tds,
  max("dissolvedOxygen") AS max_dissolved_oxygen
FROM sensor_logs
GROUP BY bucket, "deviceId";

-- Create continuous aggregate for daily data
CREATE MATERIALIZED VIEW sensor_logs_daily
WITH (
  timescaledb.continuous,
  timescaledb.finalized = true
) AS
SELECT
  time_bucket('1 day', "timestamp") AS bucket,
  "deviceId",
  avg(ph) AS avg_ph,
  avg(temperature) AS avg_temperature,
  avg(tds) AS avg_tds,
  avg("dissolvedOxygen") AS avg_dissolved_oxygen,
  min(ph) AS min_ph,
  min(temperature) AS min_temperature,
  min(tds) AS min_tds,
  min("dissolvedOxygen") AS min_dissolved_oxygen,
  max(ph) AS max_ph,
  max(temperature) AS max_temperature,
  max(tds) AS max_tds,
  max("dissolvedOxygen") AS max_dissolved_oxygen
FROM sensor_logs
GROUP BY bucket, "deviceId";

-- Add policies for continuous aggregates
SELECT add_continuous_aggregate_policy('sensor_logs_hourly',
  start_offset => INTERVAL '3 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');

-- Add policies for continuous aggregates
SELECT add_continuous_aggregate_policy('sensor_logs_daily',
  start_offset => INTERVAL '30 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day');

