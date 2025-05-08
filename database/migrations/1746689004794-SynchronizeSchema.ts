import { MigrationInterface, QueryRunner } from "typeorm";

export class SynchronizeSchema1746689004794 implements MigrationInterface {
    name = 'SynchronizeSchema1746689004794'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'user')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "googleId" character varying, "email" character varying NOT NULL, "password" character varying, "fullName" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'user', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" SERIAL NOT NULL, "userId" uuid NOT NULL, "token" character varying NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."devices_status_enum" AS ENUM('paired', 'online', 'offline')`);
        await queryRunner.query(`CREATE TABLE "devices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "deviceCode" character varying NOT NULL, "userId" uuid NOT NULL, "name" character varying, "status" "public"."devices_status_enum" NOT NULL DEFAULT 'offline', "lastOnline" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fc23b3ead43da6f88e88b0150f4" UNIQUE ("deviceCode"), CONSTRAINT "PK_b1514758245c12daf43486dd1f0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sensor_logs" ("id" BIGSERIAL NOT NULL, "deviceId" uuid NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, "ph" double precision, "temperature" double precision, "tds" double precision, "dissolvedOxygen" double precision, CONSTRAINT "PK_ef820315084d84525ba7eb0698c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8770ab311b741fa8ca844feffb" ON "sensor_logs" ("deviceId", "timestamp") `);
        await queryRunner.query(`CREATE TYPE "public"."fish_profiles_sensortype_enum" AS ENUM('ph', 'tds', 'dissolved_oxygen', 'temperature')`);
        await queryRunner.query(`CREATE TABLE "fish_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fishType" character varying NOT NULL, "sensorType" "public"."fish_profiles_sensortype_enum" NOT NULL, "minValue" double precision NOT NULL, "maxValue" double precision NOT NULL, CONSTRAINT "PK_b88c1391f92640e068be32d27c2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "deviceId" uuid NOT NULL, "type" character varying NOT NULL, "title" character varying NOT NULL, "message" character varying NOT NULL, "isRead" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."offsets_sensortype_enum" AS ENUM('ph', 'tds', 'dissolved_oxygen', 'temperature')`);
        await queryRunner.query(`CREATE TABLE "offsets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "deviceId" uuid NOT NULL, "sensorType" "public"."offsets_sensortype_enum" NOT NULL, "minValue" double precision NOT NULL, "maxValue" double precision NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d257bee4d927dd3e7610b2d2054" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."calibrations_sensortype_enum" AS ENUM('ph', 'tds', 'dissolved_oxygen', 'temperature')`);
        await queryRunner.query(`CREATE TABLE "calibrations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "deviceId" uuid NOT NULL, "sensorType" "public"."calibrations_sensortype_enum" NOT NULL, "payload" jsonb NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_862106016f7d55e70021555fd7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "devices" ADD CONSTRAINT "FK_e8a5d59f0ac3040395f159507c6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sensor_logs" ADD CONSTRAINT "FK_61b35c097d2ef82e34336f1ed65" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_e474018575697774263adb98ae8" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "offsets" ADD CONSTRAINT "FK_c3764b39fdc00d69b05371ed206" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "calibrations" ADD CONSTRAINT "FK_5ca7bc4eb442f9d10b3f5d42d08" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "calibrations" DROP CONSTRAINT "FK_5ca7bc4eb442f9d10b3f5d42d08"`);
        await queryRunner.query(`ALTER TABLE "offsets" DROP CONSTRAINT "FK_c3764b39fdc00d69b05371ed206"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_e474018575697774263adb98ae8"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_692a909ee0fa9383e7859f9b406"`);
        await queryRunner.query(`ALTER TABLE "sensor_logs" DROP CONSTRAINT "FK_61b35c097d2ef82e34336f1ed65"`);
        await queryRunner.query(`ALTER TABLE "devices" DROP CONSTRAINT "FK_e8a5d59f0ac3040395f159507c6"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_610102b60fea1455310ccd299de"`);
        await queryRunner.query(`DROP TABLE "calibrations"`);
        await queryRunner.query(`DROP TYPE "public"."calibrations_sensortype_enum"`);
        await queryRunner.query(`DROP TABLE "offsets"`);
        await queryRunner.query(`DROP TYPE "public"."offsets_sensortype_enum"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TABLE "fish_profiles"`);
        await queryRunner.query(`DROP TYPE "public"."fish_profiles_sensortype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8770ab311b741fa8ca844feffb"`);
        await queryRunner.query(`DROP TABLE "sensor_logs"`);
        await queryRunner.query(`DROP TABLE "devices"`);
        await queryRunner.query(`DROP TYPE "public"."devices_status_enum"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }

}
