import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1746323133203 implements MigrationInterface {
    name = 'Migration1746323133203'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tracks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ratingKey" character varying NOT NULL, "title" character varying NOT NULL, "artist" character varying NOT NULL, "album" character varying NOT NULL, "state" character varying NOT NULL, "user" character varying, "player" character varying, "startTime" TIMESTAMP NOT NULL, "pausedAt" TIMESTAMP, "endTime" TIMESTAMP, "listenedMs" integer, "thumbnailPath" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "rawData" jsonb, CONSTRAINT "PK_242a37ffc7870380f0e611986e8" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "tracks"`);
    }

}
