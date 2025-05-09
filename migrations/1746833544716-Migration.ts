import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1746833544716 implements MigrationInterface {
    name = 'Migration1746833544716'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tracks" DROP COLUMN "state"`);
        await queryRunner.query(`ALTER TABLE "tracks" DROP COLUMN "user"`);
        await queryRunner.query(`ALTER TABLE "tracks" DROP COLUMN "player"`);
        await queryRunner.query(`ALTER TABLE "tracks" DROP COLUMN "listenedMs"`);
        await queryRunner.query(`ALTER TABLE "tracks" DROP COLUMN "startTime"`);
        await queryRunner.query(`ALTER TABLE "tracks" DROP COLUMN "endTime"`);
        await queryRunner.query(`ALTER TABLE "episodes" DROP COLUMN "state"`);
        await queryRunner.query(`ALTER TABLE "episodes" DROP COLUMN "user"`);
        await queryRunner.query(`ALTER TABLE "episodes" DROP COLUMN "player"`);
        await queryRunner.query(`ALTER TABLE "episodes" DROP COLUMN "startTime"`);
        await queryRunner.query(`ALTER TABLE "episodes" DROP COLUMN "endTime"`);
        await queryRunner.query(`ALTER TABLE "movies" DROP COLUMN "state"`);
        await queryRunner.query(`ALTER TABLE "movies" DROP COLUMN "user"`);
        await queryRunner.query(`ALTER TABLE "movies" DROP COLUMN "player"`);
        await queryRunner.query(`ALTER TABLE "movies" DROP COLUMN "startTime"`);
        await queryRunner.query(`ALTER TABLE "movies" DROP COLUMN "endTime"`);
        await queryRunner.query(`ALTER TABLE "movies" DROP COLUMN "watchedMs"`);
        await queryRunner.query(`ALTER TABLE "movies" DROP COLUMN "percentComplete"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "movies" ADD "percentComplete" double precision`);
        await queryRunner.query(`ALTER TABLE "movies" ADD "watchedMs" integer`);
        await queryRunner.query(`ALTER TABLE "movies" ADD "endTime" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "movies" ADD "startTime" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "movies" ADD "player" character varying`);
        await queryRunner.query(`ALTER TABLE "movies" ADD "user" character varying`);
        await queryRunner.query(`ALTER TABLE "movies" ADD "state" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "episodes" ADD "endTime" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "episodes" ADD "startTime" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "episodes" ADD "player" character varying`);
        await queryRunner.query(`ALTER TABLE "episodes" ADD "user" character varying`);
        await queryRunner.query(`ALTER TABLE "episodes" ADD "state" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tracks" ADD "endTime" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "tracks" ADD "startTime" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "tracks" ADD "listenedMs" integer`);
        await queryRunner.query(`ALTER TABLE "tracks" ADD "player" character varying`);
        await queryRunner.query(`ALTER TABLE "tracks" ADD "user" character varying`);
        await queryRunner.query(`ALTER TABLE "tracks" ADD "state" character varying NOT NULL`);
    }

}
