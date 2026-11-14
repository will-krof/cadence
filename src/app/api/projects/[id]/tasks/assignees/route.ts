import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectScope, workspaceOwnerId } from "@/lib/api-auth";
import { requireViewer } from "@/lib/viewer";
import { MAX_ASSIGNEES, parseAssignees } from "@/lib/assignees";
import { TASK_FIELDS, taskPayloads } from "@/lib/task-select";
import { badRequest, conflict, forbidden, notFound } from "@/lib/responses";

/** One atomic assignment change to explicitly selected tasks on one timeline. */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/projects/[id]/tasks/assignees">,
) {
  const { viewer, response } = await requireViewer();
  if (response) return response;
  const { id } = await ctx.params;
  const project = await prisma.project.findFirst({
    where: { AND: [{ id }, projectScope(viewer)] },
    select: { hasTimeline: true },
  });
  if (!project) return notFound("Project");
  if (
    !project.hasTimeline ||
    (viewer.kind === "member" &&
      !viewer.places.some((p) => p.projectId === id && p.canEditTimeline))
  )
    return forbidden();
  const body = await request.json().catch(() => null);
  if (
    !body ||
    !Array.isArray(body.taskIds) ||
    !body.taskIds.length ||
    body.taskIds.length > 500 ||
    body.taskIds.some(
      (value: unknown) =>
        typeof value !== "string" || !value || value.length > 200,
    )
  )
    return badRequest("Select between 1 and 500 tasks");
  const taskIds: string[] = [...new Set<string>(body.taskIds)];
  if (body.mode !== "add" && body.mode !== "replace")
    return badRequest("Choose add or replace");
  const parsed = parseAssignees(body.assigneeIds);
  if ("error" in parsed) return badRequest(parsed.error);
  if (
    !("ids" in parsed) ||
    !parsed.ids.length ||
    !Array.isArray(body.assigneeIds) ||
    body.assigneeIds.some(
      (value: unknown) => typeof value !== "string" || !value,
    )
  )
    return badRequest("Choose at least one person");
  const ids = parsed.ids;
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const [tasks, people] = await Promise.all([
          tx.task.findMany({
            where: { projectId: id, id: { in: taskIds } },
            select: {
              id: true,
              assignees: {
                select: { developerId: true },
                orderBy: { order: "asc" },
              },
            },
          }),
          tx.developer.count({
            where: {
              id: { in: ids },
              userId: workspaceOwnerId(viewer),
              active: true,
            },
          }),
        ]);
        if (tasks.length !== taskIds.length)
          return { response: notFound("Task") };
        if (people !== ids.length)
          return { response: notFound("Active team member") };
        const changes = tasks.map((task) => ({
          taskId: task.id,
          ids:
            body.mode === "replace"
              ? ids
              : [
                  ...new Set([
                    ...task.assignees.map((a) => a.developerId),
                    ...ids,
                  ]),
                ],
        }));
        if (changes.some((change) => change.ids.length > MAX_ASSIGNEES))
          return {
            response: badRequest(
              `One or more tasks would exceed ${MAX_ASSIGNEES} people. No assignments were changed. Choose fewer people or use Replace.`,
            ),
          };
        await tx.taskAssignee.deleteMany({
          where: { taskId: { in: taskIds } },
        });
        await tx.taskAssignee.createMany({
          data: changes.flatMap((change) =>
            change.ids.map((developerId, order) => ({
              taskId: change.taskId,
              developerId,
              order,
            })),
          ),
        });
        await tx.task.updateMany({
          where: { projectId: id, id: { in: taskIds } },
          data: { updatedAt: new Date() },
        });
        return {
          tasks: await tx.task.findMany({
            where: { projectId: id, id: { in: taskIds } },
            select: TASK_FIELDS,
          }),
        };
      },
      { isolationLevel: "Serializable" },
    );
    if (result.response) return result.response;
    return NextResponse.json(taskPayloads(result.tasks));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2034"
    )
      return conflict(
        "Assignments changed in another request. Please try again.",
      );
    throw error;
  }
}
