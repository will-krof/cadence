import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { BUG_REPORT_STATUSES } from "@/lib/bug-report-types";

export async function GET(request: NextRequest) {
  const { response } = await requireSuperadmin();
  if (response) return response;
  const params = request.nextUrl.searchParams;
  const status = params.get("status") ?? "all";
  const page = Number(params.get("page") ?? 1);
  if (
    (status !== "all" && !BUG_REPORT_STATUSES.some((s) => s === status)) ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 100000
  ) {
    return NextResponse.json({ error: "Invalid filter" }, { status: 400 });
  }
  const query = (params.get("q") ?? "").trim().slice(0, 200);
  const insensitive = /^postgres(?:ql)?:/.test(process.env.DATABASE_URL ?? "")
    ? { mode: "insensitive" as const }
    : {};
  const where = {
    ...(status === "all" ? {} : { status }),
    ...(query
      ? {
          OR: [
            "subject",
            "message",
            "reporterName",
            "reporterEmail",
            "reporterUsername",
          ].map((field) => ({
            [field]: { contains: query, ...insensitive },
          })),
        }
      : {}),
  };
  const pageSize = 25;
  const [total, tickets] = await prisma.$transaction([
    prisma.bugReport.count({ where }),
    prisma.bugReport.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: {
        id: true,
        subject: true,
        message: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        reporterKind: true,
        reporterName: true,
        reporterEmail: true,
        reporterUsername: true,
      },
    }),
  ]);
  return NextResponse.json({ tickets, total, page, pageSize });
}
