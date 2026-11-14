import { NextRequest, NextResponse } from "next/server";
import { AdminActionError, moderateUser, requireSuperadmin } from "@/lib/admin";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/admin/users/[id]">,
) {
  const { user, response } = await requireSuperadmin();
  if (response) return response;
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Provide an action" }, { status: 400 });
  }
  const action = body.action;
  if (!["BAN", "UNBAN", "REVOKE_SESSIONS"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (
    body.reason != null &&
    (typeof body.reason !== "string" || body.reason.length > 500)
  ) {
    return NextResponse.json(
      { error: "A reason must be 500 characters or fewer" },
      { status: 400 },
    );
  }
  try {
    const result = await moderateUser(user.id, id, action, {
      reason: body.reason?.trim(),
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminActionError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error("Account moderation failed", error);
    return NextResponse.json(
      { error: "Could not complete this action. Refresh and try again." },
      { status: 500 },
    );
  }
}
