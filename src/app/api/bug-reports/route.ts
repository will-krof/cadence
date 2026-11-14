import { NextRequest, NextResponse } from "next/server";
import { requireViewer } from "@/lib/viewer";
import { prisma } from "@/lib/prisma";
import { BUG_REPORT_LIMITS } from "@/lib/bug-report-types";

export async function POST(request: NextRequest) {
  const { viewer, response } = await requireViewer();
  if (response) return response;
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  ) {
    return NextResponse.json(
      { error: "Send a text-only JSON report" },
      { status: 415 },
    );
  }
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !["subject", "message"].includes(key)) ||
    typeof body.subject !== "string" ||
    typeof body.message !== "string"
  ) {
    return NextResponse.json(
      { error: "Only a text subject and description are accepted" },
      { status: 400 },
    );
  }
  const subject = body.subject.trim(),
    message = body.message.trim();
  if (
    !subject ||
    !message ||
    subject.length > BUG_REPORT_LIMITS.subject ||
    message.length > BUG_REPORT_LIMITS.message
  ) {
    return NextResponse.json(
      {
        error: `Enter a subject (up to ${BUG_REPORT_LIMITS.subject} characters) and description (up to ${BUG_REPORT_LIMITS.message} characters)`,
      },
      { status: 400 },
    );
  }

  // Identity comes from the authenticated account, never from submitted fields.
  const author =
    viewer.kind === "owner"
      ? {
          reporterKind: "OWNER",
          reporterName: viewer.user.name || viewer.user.email,
          reporterEmail: viewer.user.email,
          reporterUsername: null,
          userId: viewer.user.id,
        }
      : await prisma.developer
          .findUnique({
            where: { id: viewer.developerId },
            select: { id: true, name: true, email: true, username: true },
          })
          .then((person) =>
            person
              ? {
                  reporterKind: "MEMBER",
                  reporterName: person.name,
                  reporterEmail: person.email,
                  reporterUsername: person.username,
                  developerId: person.id,
                }
              : null,
          );
  if (!author)
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const scope =
    viewer.kind === "owner"
      ? { userId: viewer.user.id }
      : { developerId: viewer.developerId };

  // A database-backed cap works across Vercel instances. Serializable admission
  // prevents concurrent submissions from spending the last slot twice.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ticket = await prisma.$transaction(
        async (tx) => {
          const count = await tx.bugReport.count({
            where: {
              ...scope,
              createdAt: { gte: new Date(Date.now() - 3600000) },
            },
          });
          if (count >= BUG_REPORT_LIMITS.perHour) return null;
          return tx.bugReport.create({
            data: { subject, message, ...author },
            select: { id: true },
          });
        },
        { isolationLevel: "Serializable", timeout: 15000 },
      );
      if (!ticket)
        return NextResponse.json(
          {
            error:
              "You can send up to 5 reports per hour. Please try again later.",
          },
          { status: 429, headers: { "retry-after": "3600" } },
        );
      return NextResponse.json(ticket, { status: 201 });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2034" &&
        attempt < 2
      )
        continue;
      return NextResponse.json(
        { error: "Could not send your report. Please try again." },
        { status: 503 },
      );
    }
  }
}
