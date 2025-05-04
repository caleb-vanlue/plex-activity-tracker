import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1746367776448 implements MigrationInterface {
    name = 'Migration1746367776448'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "episodes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ratingKey" character varying, "title" character varying NOT NULL, "showTitle" character varying, "season" integer, "episode" integer, "summary" character varying, "duration" integer, "state" character varying NOT NULL DEFAULT 'unknown', "user" character varying, "player" character varying, "thumbnailUrl" character varying, "startTime" TIMESTAMP WITH TIME ZONE, "endTime" TIMESTAMP WITH TIME ZONE, "watchedMs" integer, "percentComplete" double precision, "raw" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a003fda8b0473fffc39cb831c7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "movies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ratingKey" character varying, "title" character varying NOT NULL, "year" integer, "director" character varying, "studio" character varying, "summary" character varying, "duration" integer, "state" character varying NOT NULL DEFAULT 'unknown', "user" character varying, "player" character varying, "thumbnailUrl" character varying, "startTime" TIMESTAMP WITH TIME ZONE, "endTime" TIMESTAMP WITH TIME ZONE, "watchedMs" integer, "percentComplete" double precision, "raw" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c5b2c134e871bfd1c2fe7cc3705" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "movies"`);
        await queryRunner.query(`DROP TABLE "episodes"`);
    }

}
