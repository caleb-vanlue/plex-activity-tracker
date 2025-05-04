import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1746370494828 implements MigrationInterface {
    name = 'Migration1746370494828'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tracks" DROP COLUMN "pausedAt"`);
        await queryRunner.query(`ALTER TABLE "tracks" DROP COLUMN "thumbnailPath"`);
        await queryRunner.query(`ALTER TABLE "tracks" DROP COLUMN "rawData"`);
        await queryRunner.query(`ALTER TABLE "tracks" ADD "thumbnailUrl" character varying`);
        await queryRunner.query(`ALTER TABLE "tracks" ADD "raw" jsonb`);
        await queryRunner.query(`ALTER TABLE "tracks" DROP COLUMN "startTime"`);
        await queryRunner.query(`ALTER TABLE "tracks" ADD "startTime" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "tracks" DROP COLUMN "endTime"`);
        await queryRunner.query(`ALTER TABLE "tracks" ADD "endTime" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "episodes" ALTER COLUMN "ratingKey" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "episodes" ALTER COLUMN "state" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "episodes" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "episodes" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "episodes" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "episodes" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "episodes" ALTER COLUMN "showTitle" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "episodes" ALTER COLUMN "season" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "episodes" ALTER COLUMN "episode" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "episodes" DROP COLUMN "summary"`);
        await queryRunner.query(`ALTER TABLE "episodes" ADD "summary" text`);
        await queryRunner.query(`ALTER TABLE "movies" ALTER COLUMN "ratingKey" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "movies" ALTER COLUMN "state" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "movies" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "movies" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "movies" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "movies" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "movies" DROP COLUMN "summary"`);
        await queryRunner.query(`ALTER TABLE "movies" ADD "summary" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "movies" DROP COLUMN "summary"`);
        await queryRunner.query(`ALTER TABLE "movies" ADD "summary" character varying`);
        await queryRunner.query(`ALTER TABLE "movies" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "movies" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "movies" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "movies" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "movies" ALTER COLUMN "state" SET DEFAULT 'unknown'`);
        await queryRunner.query(`ALTER TABLE "movies" ALTER COLUMN "ratingKey" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "episodes" DROP COLUMN "summary"`);
        await queryRunner.query(`ALTER TABLE "episodes" ADD "summary" character varying`);
        await queryRunner.query(`ALTER TABLE "episodes" ALTER COLUMN "episode" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "episodes" ALTER COLUMN "season" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "episodes" ALTER COLUMN "showTitle" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "episodes" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "episodes" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "episodes" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "episodes" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "episodes" ALTER COLUMN "state" SET DEFAULT 'unknown'`);
        await queryRunner.query(`ALTER TABLE "episodes" ALTER COLUMN "ratingKey" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tracks" DROP COLUMN "endTime"`);
        await queryRunner.query(`ALTER TABLE "tracks" ADD "endTime" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "tracks" DROP COLUMN "startTime"`);
        await queryRunner.query(`ALTER TABLE "tracks" ADD "startTime" TIMESTAMP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tracks" DROP COLUMN "raw"`);
        await queryRunner.query(`ALTER TABLE "tracks" DROP COLUMN "thumbnailUrl"`);
        await queryRunner.query(`ALTER TABLE "tracks" ADD "rawData" jsonb`);
        await queryRunner.query(`ALTER TABLE "tracks" ADD "thumbnailPath" character varying`);
        await queryRunner.query(`ALTER TABLE "tracks" ADD "pausedAt" TIMESTAMP`);
    }

}
