import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1746839137447 implements MigrationInterface {
    name = 'Migration1746839137447'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "episodes" DROP COLUMN "watchedMs"`);
        await queryRunner.query(`ALTER TABLE "episodes" DROP COLUMN "percentComplete"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "episodes" ADD "percentComplete" double precision`);
        await queryRunner.query(`ALTER TABLE "episodes" ADD "watchedMs" integer`);
    }

}
