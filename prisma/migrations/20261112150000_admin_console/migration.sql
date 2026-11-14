BEGIN;
-- AlterTable
ALTER TABLE "User" ADD COLUMN "banReason" TEXT;
ALTER TABLE "User" ADD COLUMN "bannedAt" DATETIME;

-- CreateTable
CREATE TABLE "RegistrationDay" (
    "day" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "AdminAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "targetId" TEXT,
    "reason" TEXT,
    CONSTRAINT "AdminAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AdminAudit_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AdminAudit_createdAt_idx" ON "AdminAudit"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAudit_targetId_idx" ON "AdminAudit"("targetId");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_bannedAt_createdAt_idx" ON "User"("bannedAt", "createdAt");


-- Backfill existing accounts, then count every future registration atomically.
INSERT INTO "RegistrationDay" ("day", "count") SELECT CASE WHEN typeof("createdAt") IN ('integer', 'real') THEN strftime('%Y-%m-%d', "createdAt" / 1000.0, 'unixepoch') ELSE date("createdAt") END, COUNT(*) FROM "User" GROUP BY 1;
CREATE TRIGGER "User_record_registration" AFTER INSERT ON "User"
BEGIN
  INSERT INTO "RegistrationDay" ("day", "count") VALUES (CASE WHEN typeof(NEW."createdAt") IN ('integer', 'real') THEN strftime('%Y-%m-%d', NEW."createdAt" / 1000.0, 'unixepoch') ELSE date(NEW."createdAt") END, 1)
  ON CONFLICT ("day") DO UPDATE SET "count" = "RegistrationDay"."count" + 1;
END;

COMMIT;
