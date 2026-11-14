import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { BUG_REPORT_STATUSES } from "@/lib/bug-report-types";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/admin/bug-reports/[id]">,
) {
  const { response } = await requireSuperadmin();
  if (response) return response;
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => key !== "status") ||
    !BUG_REPORT_STATUSES.some((status) => status === body.status)
  ) {
    return NextResponse.json(
      { error: "Choose a valid ticket status" },
      { status: 400 },
    );
  }
  const { id } = await ctx.params;
  const result = await prisma.bugReport.updateMany({
    where: { id },
    data: { status: body.status },
  });
  if (!result.count)
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
