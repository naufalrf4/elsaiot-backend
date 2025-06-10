import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateSensorLogsCompositePrimary1748189234678 implements MigrationInterface {
    name = 'UpdateSensorLogsCompositePrimary1748189234678'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sensor_logs" DROP CONSTRAINT "PK_ef820315084d84525ba7eb0698c"`);
        await queryRunner.query(`ALTER TABLE "sensor_logs" ADD CONSTRAINT "PK_3b8d4de8a0fea9d8a47569d6264" PRIMARY KEY ("id", "timestamp")`);
        await queryRunner.query(`ALTER TABLE "sensor_logs" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`DROP SEQUENCE "sensor_logs_id_seq"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "sensor_logs_id_seq" OWNED BY "sensor_logs"."id"`);
        await queryRunner.query(`ALTER TABLE "sensor_logs" ALTER COLUMN "id" SET DEFAULT nextval('"sensor_logs_id_seq"')`);
        await queryRunner.query(`ALTER TABLE "sensor_logs" DROP CONSTRAINT "PK_3b8d4de8a0fea9d8a47569d6264"`);
        await queryRunner.query(`ALTER TABLE "sensor_logs" ADD CONSTRAINT "PK_ef820315084d84525ba7eb0698c" PRIMARY KEY ("id")`);
    }

}
