import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectScope } from "@/lib/api-auth";
import { requireViewer } from "@/lib/viewer";
import { forbidden, notFound } from "@/lib/responses";
import { buildProjectMetrics } from "@/lib/metrics";
import { PROJECT_METRICS, type ProjectMetricValues } from "@/lib/metrics-types";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/projects/[id]/metrics">,
) {
  const { viewer, response } = await requireViewer();
  if (response) return response;
  const { id } = await ctx.params;
  const project = await prisma.project.findFirst({
    where: { AND: [{ id }, projectScope(viewer)] },
    select: {
      hasMetrics: true,
      hasTimeline: true,
      hasTracker: true,
      projectType: true,
      metricsProgress: true,
      metricsOverdue: true,
      metricsCompleted: true,
      metricsCompletionTime: true,
      metricsWorkload: true,
    },
  });
  if (!project || !project.hasMetrics) return notFound("Metrics");
  // These metrics summarize the boards; members need board-view access.
  if (viewer.kind === "member") {
    const place = viewer.places.find((entry) => entry.projectId === id);
    if (
      !place ||
      !(
        place.isAdmin ||
        (project.hasTimeline && place.canViewTimeline) ||
        (project.hasTracker && place.canViewTracker)
      )
    )
      return forbidden();
  }
  const generatedAt = new Date();
  if (project.projectType === "PRODUCT")
    return NextResponse.json({
      projectType: "PRODUCT",
      generatedAt,
      enabled: [],
      hasDoneColumn: false,
      values: {},
    });
  const enabled = PROJECT_METRICS.filter((metric) => project[metric.flag]).map(
    (metric) => metric.key,
  );
  if (!enabled.length)
    return NextResponse.json({
      projectType: "PROJECT",
      generatedAt,
      enabled,
      hasDoneColumn: false,
      values: {},
    });
  const [tasks, completions, doneColumns] = await prisma.$transaction([
    prisma.task.findMany({
      where: { projectId: id },
      select: {
        id: true,
        createdAt: true,
        endDate: true,
        column: { select: { isDone: true } },
        assignees: {
          select: {
            developer: { select: { id: true, name: true, color: true } },
          },
        },
      },
    }),
    prisma.taskEvent.groupBy({
      by: ["taskId"],
      orderBy: { taskId: "asc" },
      where: { task: { projectId: id }, column: { is: { isDone: true } } },
      _max: { at: true },
    }),
    prisma.projectColumn.count({ where: { projectId: id, isDone: true } }),
  ]);
  const all = buildProjectMetrics(
    tasks,
    completions.flatMap((row) =>
      row._max?.at ? [{ taskId: row.taskId, at: row._max.at }] : [],
    ),
    generatedAt,
  );
  const values: ProjectMetricValues = Object.fromEntries(
    enabled.map((key) => [key, all[key]]),
  );
  return NextResponse.json({
    projectType: "PROJECT",
    generatedAt,
    enabled,
    hasDoneColumn: doneColumns > 0,
    values,
  });
}
