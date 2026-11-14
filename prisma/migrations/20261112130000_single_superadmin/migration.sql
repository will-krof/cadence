-- An installation has at most one superadmin. Enforced for all writers,
-- including concurrent promotions and direct SQL, not only the app's API.
-- If an existing install has several, stop rather than choose whose access
-- to revoke silently. Resolve those accounts before applying this migration.
CREATE UNIQUE INDEX "User_single_superadmin"
ON "User" ("role") WHERE "role" = 'SUPERADMIN';
