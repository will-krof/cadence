import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const { response } = await requireSuperadmin();
  if (response) return response;
  const events = await prisma.adminAudit.findMany({
    take: 30,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      action: true,
      createdAt: true,
      reason: true,
      target: { select: { name: true, email: true } },
    },
  });
  return NextResponse.json({ events });
}
