BEGIN;
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "banReason" TEXT,
ADD COLUMN     "bannedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RegistrationDay" (
    "day" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RegistrationDay_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "AdminAudit" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "targetId" TEXT,
    "reason" TEXT,

    CONSTRAINT "AdminAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAudit_createdAt_idx" ON "AdminAudit"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAudit_targetId_idx" ON "AdminAudit"("targetId");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_bannedAt_createdAt_idx" ON "User"("bannedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "AdminAudit" ADD CONSTRAINT "AdminAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAudit" ADD CONSTRAINT "AdminAudit_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Registration history contains counts, not account identities. Deleting an
-- account does not rewrite its day's historical registration count.
INSERT INTO "RegistrationDay" ("day", "count")
SELECT to_char("createdAt", 'YYYY-MM-DD'), COUNT(*) FROM "User" GROUP BY 1;
CREATE FUNCTION cadence_record_registration() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "RegistrationDay" ("day", "count") VALUES (to_char(NEW."createdAt", 'YYYY-MM-DD'), 1)
  ON CONFLICT ("day") DO UPDATE SET "count" = "RegistrationDay"."count" + 1;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "User_record_registration" AFTER INSERT ON "User"
FOR EACH ROW EXECUTE FUNCTION cadence_record_registration();

COMMIT;
