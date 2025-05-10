import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1746893505412 implements MigrationInterface {
    name = 'Migration1746893505412'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_media_sessions" ADD "pausedAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_media_sessions" DROP COLUMN "pausedAt"`);
    }

}
