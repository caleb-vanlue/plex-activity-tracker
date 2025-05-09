import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1746833643531 implements MigrationInterface {
    name = 'Migration1746833643531'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."user_media_sessions_mediatype_enum" AS ENUM('track', 'movie', 'episode')`);
        await queryRunner.query(`CREATE TYPE "public"."user_media_sessions_state_enum" AS ENUM('playing', 'paused', 'stopped')`);
        await queryRunner.query(`CREATE TABLE "user_media_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "mediaType" "public"."user_media_sessions_mediatype_enum" NOT NULL, "mediaId" character varying NOT NULL, "state" "public"."user_media_sessions_state_enum" NOT NULL, "player" character varying, "startTime" TIMESTAMP, "endTime" TIMESTAMP, "timeWatchedMs" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "user_id" character varying, "track_id" uuid, "movie_id" uuid, "episode_id" uuid, CONSTRAINT "PK_b1fc187fdce762ddc6edff66f52" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" character varying NOT NULL, "title" character varying NOT NULL, "thumbUrl" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "user_media_sessions" ADD CONSTRAINT "FK_1d5f449eb8c657cb181ed08b7ac" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_media_sessions" ADD CONSTRAINT "FK_d843a84a0b4bf809e3a9ae7f6eb" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_media_sessions" ADD CONSTRAINT "FK_e746f10ded64f62b9630cf27488" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_media_sessions" ADD CONSTRAINT "FK_0b7d8f1235418292f8d37fec7e9" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_media_sessions" DROP CONSTRAINT "FK_0b7d8f1235418292f8d37fec7e9"`);
        await queryRunner.query(`ALTER TABLE "user_media_sessions" DROP CONSTRAINT "FK_e746f10ded64f62b9630cf27488"`);
        await queryRunner.query(`ALTER TABLE "user_media_sessions" DROP CONSTRAINT "FK_d843a84a0b4bf809e3a9ae7f6eb"`);
        await queryRunner.query(`ALTER TABLE "user_media_sessions" DROP CONSTRAINT "FK_1d5f449eb8c657cb181ed08b7ac"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "user_media_sessions"`);
        await queryRunner.query(`DROP TYPE "public"."user_media_sessions_state_enum"`);
        await queryRunner.query(`DROP TYPE "public"."user_media_sessions_mediatype_enum"`);
    }

}
