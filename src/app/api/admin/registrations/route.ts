import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { response } = await requireSuperadmin();
  if (response) return response;
  const days = Number(request.nextUrl.searchParams.get("days") ?? 30);
  if (![7, 30, 90, 365].includes(days))
    return NextResponse.json(
      { error: "Choose 7, 30, 90 or 365 days" },
      { status: 400 },
    );
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  const dayKey = (date: Date) => date.toISOString().slice(0, 10);
  const rows = await prisma.registrationDay.findMany({
    where: { day: { gte: dayKey(start), lte: dayKey(end) } },
    orderBy: { day: "asc" },
  });
  const counts = new Map(rows.map((row) => [row.day, row.count]));
  const points = Array.from({ length: days }, (_, i) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + i);
    const day = dayKey(date);
    return { day, count: counts.get(day) ?? 0 };
  });
  return NextResponse.json({ days, timezone: "UTC", points });
}
