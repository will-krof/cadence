-- Existing workspace owners should also be available as task assignees.
-- Reuse an active profile with their email in their own roster, if present.
INSERT INTO "Developer" ("id", "userId", "name", "email")
SELECT 'owner:' || u."id", u."id", COALESCE(NULLIF(u."name", ''), u."email"), u."email"
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "Developer" d
  WHERE d."userId" = u."id" AND lower(d."email") = lower(u."email") AND d."active" = true
);
