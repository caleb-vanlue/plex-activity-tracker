import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1746659041932 implements MigrationInterface {
    name = 'Migration1746659041932'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tracks" RENAME COLUMN "thumbnailUrl" TO "thumbnailFileId"`);
        await queryRunner.query(`ALTER TABLE "episodes" RENAME COLUMN "thumbnailUrl" TO "thumbnailFileId"`);
        await queryRunner.query(`ALTER TABLE "movies" RENAME COLUMN "thumbnailUrl" TO "thumbnailFileId"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "movies" RENAME COLUMN "thumbnailFileId" TO "thumbnailUrl"`);
        await queryRunner.query(`ALTER TABLE "episodes" RENAME COLUMN "thumbnailFileId" TO "thumbnailUrl"`);
        await queryRunner.query(`ALTER TABLE "tracks" RENAME COLUMN "thumbnailFileId" TO "thumbnailUrl"`);
    }

}
