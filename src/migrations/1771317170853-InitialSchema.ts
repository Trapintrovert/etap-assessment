import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1771317170853 implements MigrationInterface {
  name = 'InitialSchema1771317170853';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_type_enum" AS ENUM('CREDIT', 'TRANSFER_IN', 'TRANSFER_OUT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_status_enum" AS ENUM('COMPLETED', 'PENDING', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."transactions_type_enum" NOT NULL, "wallet_id" uuid NOT NULL, "amount" numeric(20,2) NOT NULL, "reference" character varying, "metadata" jsonb, "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'COMPLETED', "transfer_id" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('USER', 'ADMIN')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "phone" character varying NOT NULL, "password_hash" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'USER', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE ("phone"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transfers_status_enum" AS ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "transfers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "from_wallet_id" uuid NOT NULL, "to_wallet_id" uuid NOT NULL, "amount" numeric(20,2) NOT NULL, "status" "public"."transfers_status_enum" NOT NULL DEFAULT 'PENDING_APPROVAL', "initiated_by_id" uuid NOT NULL, "approved_by_id" uuid, "approved_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f712e908b465e0085b4408cabc3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "wallets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "currency" character varying(10) NOT NULL, "balance" numeric(20,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_87fd1a36dcc4d5979379a7027c9" UNIQUE ("user_id", "currency"), CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_0b171330be0cb621f8d73b87a9e" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfers" ADD CONSTRAINT "FK_f6caf20d8fa02090ef9a643925d" FOREIGN KEY ("from_wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfers" ADD CONSTRAINT "FK_1a07635b8213a2a49f4933ba7af" FOREIGN KEY ("to_wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfers" ADD CONSTRAINT "FK_15c8831d2b8728e43bb5e63bc5c" FOREIGN KEY ("initiated_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfers" ADD CONSTRAINT "FK_f5d609167e430265a03e0fe9619" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD CONSTRAINT "FK_92558c08091598f7a4439586cda" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP CONSTRAINT "FK_92558c08091598f7a4439586cda"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfers" DROP CONSTRAINT "FK_f5d609167e430265a03e0fe9619"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfers" DROP CONSTRAINT "FK_15c8831d2b8728e43bb5e63bc5c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfers" DROP CONSTRAINT "FK_1a07635b8213a2a49f4933ba7af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfers" DROP CONSTRAINT "FK_f6caf20d8fa02090ef9a643925d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_0b171330be0cb621f8d73b87a9e"`,
    );
    await queryRunner.query(`DROP TABLE "wallets"`);
    await queryRunner.query(`DROP TABLE "transfers"`);
    await queryRunner.query(`DROP TYPE "public"."transfers_status_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
  }
}
