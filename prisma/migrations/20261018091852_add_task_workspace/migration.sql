-- Step 1: Add workspaceId to Task.
ALTER TABLE "Task"
ADD COLUMN "workspaceId" TEXT;

-- Step 2: Add the foreign key.
ALTER TABLE "Task"
ADD CONSTRAINT "Task_workspaceId_fkey"
FOREIGN KEY ("workspaceId")
REFERENCES "Workspace"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Step 3: Assign Himaya's existing tasks to My First Workspace.
UPDATE "Task"
SET "workspaceId" = 'cmvdhhe63000010vo28jjamaz'
WHERE "userId" = (
    SELECT "ownerId"
    FROM "Workspace"
    WHERE id = 'cmvdhhe63000010vo28jjamaz'
)
AND "workspaceId" IS NULL;

-- Step 4: Create a Personal Workspace for users
-- who have tasks but do not yet have workspace membership.
WITH users_needing_workspace AS (
    SELECT DISTINCT t."userId"
    FROM "Task" t
    WHERE t."userId" IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM "WorkspaceMember" wm
          WHERE wm."userId" = t."userId"
      )
),
new_workspaces AS (
    INSERT INTO "Workspace" (
        id,
        name,
        slug,
        "ownerId",
        "createdAt",
        "updatedAt"
    )
    SELECT
        gen_random_uuid()::text,
        'Personal Workspace',
        'personal-' || substr(md5(u."userId"), 1, 12),
        u."userId",
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM users_needing_workspace u
    RETURNING id, "ownerId"
)
INSERT INTO "WorkspaceMember" (
    id,
    "workspaceId",
    "userId",
    role,
    "createdAt"
)
SELECT
    gen_random_uuid()::text,
    nw.id,
    nw."ownerId",
    'OWNER',
    CURRENT_TIMESTAMP
FROM new_workspaces nw;

-- Step 5: Assign tasks to the newly created Personal Workspace.
UPDATE "Task" t
SET "workspaceId" = w.id
FROM "Workspace" w
WHERE w."ownerId" = t."userId"
  AND w.name = 'Personal Workspace'
  AND w.slug = 'personal-' || substr(md5(t."userId"), 1, 12)
  AND t."workspaceId" IS NULL;