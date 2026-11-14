import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import type { AdminAction } from "@/lib/admin-types";

export async function requireSuperadmin(): ReturnType<typeof requireUser> {
  const result = await requireUser();
  if (result.response) return result;
  if (result.user.role !== "SUPERADMIN") {
    return {
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  return result;
}

export const ADMIN_USER_FIELDS = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  bannedAt: true,
  banReason: true,
} as const;

export class AdminActionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Account lifecycle only: no project contents, impersonation or role granting. */
export async function moderateUser(
  actorId: string,
  targetId: string,
  action: AdminAction,
  options: { reason?: string } = {},
) {
  if (!["BAN", "UNBAN", "REVOKE_SESSIONS"].includes(action))
    throw new AdminActionError("Invalid action", 400);
  return prisma.$transaction(
    async (tx) => {
      const actor = await tx.user.findUnique({
        where: { id: actorId },
        select: { role: true, bannedAt: true },
      });
      if (actor?.role !== "SUPERADMIN" || actor.bannedAt)
        throw new AdminActionError("Not allowed", 403);
      const target = await tx.user.findUnique({
        where: { id: targetId },
        select: { id: true, email: true, role: true, bannedAt: true },
      });
      if (!target) throw new AdminActionError("Account not found", 404);
      if (target.id === actorId || target.role === "SUPERADMIN")
        throw new AdminActionError("The superadmin account is protected", 409);
      // Session removal and access changes commit together. Workspace members
      // lose sessions too; auth additionally checks the owner's ban on every read.
      if (action !== "UNBAN") {
        await tx.session.deleteMany({ where: { userId: targetId } });
        await tx.developerSession.deleteMany({
          where: { developer: { userId: targetId } },
        });
      }
      if (action === "BAN" || action === "UNBAN") {
        const changed = await tx.user.updateMany({
          where: { id: targetId, role: "ADMIN" },
          data:
            action === "BAN"
              ? {
                  bannedAt: target.bannedAt ?? new Date(),
                  banReason: options.reason || null,
                }
              : { bannedAt: null, banReason: null },
        });
        if (changed.count !== 1)
          throw new AdminActionError(
            "The account can no longer be changed",
            409,
          );
      }
      await tx.adminAudit.create({
        data: {
          actorId,
          targetId,
          action,
          reason: action === "BAN" ? options.reason || null : null,
        },
      });
      return { ok: true };
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
