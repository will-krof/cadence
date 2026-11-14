import { prisma } from "@/lib/prisma";
import {
  createMemberSession,
  hashPassword,
  normalizeUsername,
  passwordProblem,
  usernameProblem,
} from "@/lib/auth";
import { freshInvite, inviteHasExpired } from "@/lib/invite";
import { INVITE_LIMIT, rateLimited } from "@/lib/rate-limit";
import { LIMITS } from "@/lib/sanitize";
import { NextRequest, NextResponse } from "next/server";

const dead = () =>
  NextResponse.json(
    { error: "This invite link is no longer valid" },
    { status: 404 },
  );

/**
 * Taking up an invite: the link is spent on picking a username and a password,
 * and from then on that login is how the person gets in. The link itself grants
 * nothing else, which is why it can be a three-day thing.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/invites/[token]">,
) {
  // A token is 24 random bytes, so guessing one is hopeless — but a limit costs
  // nothing and takes hopeless down to pointless.
  const limited = rateLimited(request, "invite", INVITE_LIMIT);
  if (limited) return limited;

  const { token } = await ctx.params;
  const body = await request.json().catch(() => ({}));

  const username = normalizeUsername(body.username);
  const password = typeof body.password === "string" ? body.password : "";

  if (password.length > LIMITS.password) {
    return NextResponse.json(
      { error: `Password must be ${LIMITS.password} characters or fewer` },
      { status: 400 },
    );
  }

  const member = await prisma.projectMember.findFirst({
    where: {
      inviteToken: token,
      inviteRevoked: false,
      project: { user: { bannedAt: null } },
    },
    select: {
      id: true,
      inviteExpiresAt: true,
      project: { select: { id: true, name: true } },
      developer: {
        select: { id: true, name: true, active: true, username: true },
      },
    },
  });
  if (!member || !member.developer.active) return dead();

  // A link that has run out is replaced on the spot, so the admin's copy of it
  // is live again by the time they look — the person just needs the new one.
  if (inviteHasExpired(member.inviteExpiresAt)) {
    await prisma.projectMember.update({
      where: { id: member.id },
      data: freshInvite(),
    });
    return NextResponse.json(
      {
        error:
          "This link has expired. A new one has been made — ask for it and try again.",
      },
      { status: 410 },
    );
  }

  // Their login already exists: the link has nothing left to set up, and it is
  // not a way to change somebody's password.
  if (member.developer.username) {
    return NextResponse.json(
      { error: "You already have a login — sign in with it instead." },
      { status: 409 },
    );
  }

  const nameProblem = usernameProblem(username);
  if (nameProblem) {
    return NextResponse.json({ error: nameProblem }, { status: 400 });
  }
  const secretProblem = passwordProblem(password);
  if (secretProblem) {
    return NextResponse.json({ error: secretProblem }, { status: 400 });
  }

  const taken = await prisma.developer.findUnique({
    where: { username },
    select: { id: true },
  });
  if (taken) {
    return NextResponse.json(
      { error: "That username is taken — try another" },
      { status: 409 },
    );
  }

  // Claim the login once. Two requests holding the same invitation must not
  // overwrite each other's credentials after both pass the earlier read.
  const passwordHash = await hashPassword(password);
  try {
    const claimed = await prisma.$transaction(async (tx) => {
      const result = await tx.developer.updateMany({
        where: {
          id: member.developer.id,
          active: true,
          username: null,
          user: { bannedAt: null },
          memberships: {
            some: {
              id: member.id,
              inviteToken: token,
              inviteRevoked: false,
              OR: [
                { inviteExpiresAt: null },
                { inviteExpiresAt: { gt: new Date() } },
              ],
            },
          },
        },
        data: { username, passwordHash },
      });
      if (result.count !== 1) return false;
      await tx.projectMember.update({
        where: { id: member.id },
        data: { inviteUsedAt: new Date() },
      });
      return true;
    });
    if (!claimed)
      return NextResponse.json(
        {
          error: "This invitation has already been used or is no longer valid",
        },
        { status: 409 },
      );
  } catch {
    return NextResponse.json(
      { error: "That username is taken — try another" },
      { status: 409 },
    );
  }

  await createMemberSession(member.developer.id);

  return NextResponse.json({
    project: member.project,
    name: member.developer.name,
    username,
  });
}
