CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE device_status_enum AS ENUM ('paired', 'online', 'offline');
CREATE TYPE sensor_type_enum AS ENUM ('ph', 'tds', 'dissolved_oxygen', 'temperature');

SELECT create_hypertable('sensor_logs', 'timestamp', if_not_exists => TRUE);

ALTER TABLE sensor_logs SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'device_id'
);

SELECT add_compression_policy('sensor_logs', INTERVAL '7 days');

SELECT add_retention_policy('sensor_logs', INTERVAL '1 year');

CREATE INDEX IF NOT EXISTS idx_sensor_logs_device_id ON sensor_logs (device_id);
CREATE INDEX IF NOT EXISTS idx_sensor_logs_timestamp_device_id ON sensor_logs (timestamp DESC, device_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS sensor_logs_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', timestamp) AS bucket,
  device_id,
  AVG(ph) AS avg_ph,
  AVG(temperature) AS avg_temperature,
  AVG(tds) AS avg_tds,
  AVG(dissolved_oxygen) AS avg_dissolved_oxygen,
  MIN(ph) AS min_ph,
  MIN(temperature) AS min_temperature,
  MIN(tds) AS min_tds,
  MIN(dissolved_oxygen) AS min_dissolved_oxygen,
  MAX(ph) AS max_ph,
  MAX(temperature) AS max_temperature,
  MAX(tds) AS max_tds,
  MAX(dissolved_oxygen) AS max_dissolved_oxygen
FROM sensor_logs
GROUP BY bucket, device_id;

SELECT add_continuous_aggregate_policy('sensor_logs_hourly',
  start_offset => INTERVAL '3 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');

CREATE MATERIALIZED VIEW IF NOT EXISTS sensor_logs_daily
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', timestamp) AS bucket,
  device_id,
  AVG(ph) AS avg_ph,
  AVG(temperature) AS avg_temperature,
  AVG(tds) AS avg_tds,
  AVG(dissolved_oxygen) AS avg_dissolved_oxygen,
  MIN(ph) AS min_ph,
  MIN(temperature) AS min_temperature,
  MIN(tds) AS min_tds,
  MIN(dissolved_oxygen) AS min_dissolved_oxygen,
  MAX(ph) AS max_ph,
  MAX(temperature) AS max_temperature,
  MAX(tds) AS max_tds,
  MAX(dissolved_oxygen) AS max_dissolved_oxygen
FROM sensor_logs
GROUP BY bucket, device_id;

SELECT add_continuous_aggregate_policy('sensor_logs_daily',
  start_offset => INTERVAL '30 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day');