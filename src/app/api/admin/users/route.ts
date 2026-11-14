import { prisma } from "@/lib/prisma";
import { ADMIN_USER_FIELDS, requireSuperadmin } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { response } = await requireSuperadmin();
  if (response) return response;
  const params = request.nextUrl.searchParams;
  const query = (params.get("q") ?? "").trim().slice(0, 200);
  const status = params.get("status") ?? "all";
  const order = params.get("order") === "oldest" ? "asc" : "desc";
  const page = Math.min(100000, Math.max(1, Number(params.get("page")) || 1));
  if (
    !Number.isInteger(page) ||
    !["all", "active", "banned"].includes(status)
  ) {
    return NextResponse.json({ error: "Invalid filter" }, { status: 400 });
  }
  const insensitive = /^postgres(?:ql)?:/.test(process.env.DATABASE_URL ?? "")
    ? { mode: "insensitive" as const }
    : {};
  const where = {
    ...(status === "banned"
      ? { bannedAt: { not: null } }
      : status === "active"
        ? { bannedAt: null }
        : {}),
    ...(query
      ? {
          OR: [
            { email: { contains: query.toLowerCase() } },
            { name: { contains: query, ...insensitive } },
          ],
        }
      : {}),
  };
  const pageSize = 25;
  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: ADMIN_USER_FIELDS,
      orderBy: [{ createdAt: order }, { id: order }],
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
  ]);
  return NextResponse.json({ users, total, page, pageSize });
}
