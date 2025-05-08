import { MigrationInterface, QueryRunner } from 'typeorm';

export class TimescaleHypertable1746689800000 implements MigrationInterface {
  name = 'TimescaleHypertable1746689800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sensor_logs 
      DROP CONSTRAINT "PK_ef820315084d84525ba7eb0698c"
    `);

    await queryRunner.query(`
      ALTER TABLE sensor_logs 
      ADD CONSTRAINT "PK_sensor_logs" 
      PRIMARY KEY ("id", "timestamp")
    `);

    await queryRunner.query(
      `SELECT create_hypertable('sensor_logs', 'timestamp', if_not_exists => TRUE)`,
    );

    await queryRunner.query(
      `ALTER TABLE sensor_logs SET (
        timescaledb.compress,
        timescaledb.compress_segmentby = '"deviceId"'
      )`,
    );

    await queryRunner.query(
      `SELECT add_compression_policy('sensor_logs', INTERVAL '7 days')`,
    );

    await queryRunner.query(
      `SELECT add_retention_policy('sensor_logs', INTERVAL '365 days')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SELECT remove_retention_policy('sensor_logs')`);

    await queryRunner.query(`SELECT remove_compression_policy('sensor_logs')`);

    await queryRunner.query(`
      ALTER TABLE sensor_logs 
      DROP CONSTRAINT "PK_sensor_logs"
    `);

    await queryRunner.query(`
      ALTER TABLE sensor_logs 
      ADD CONSTRAINT "PK_ef820315084d84525ba7eb0698c" 
      PRIMARY KEY ("id")
    `);
  }
}
