export const PROJECT_METRICS = [
  {
    key: "progress",
    flag: "metricsProgress",
    label: "Project progress",
    hint: "Completed tasks as a share of all tasks",
  },
  {
    key: "overdue",
    flag: "metricsOverdue",
    label: "Overdue tasks",
    hint: "Open tasks with a due date before today (UTC)",
  },
  {
    key: "completed",
    flag: "metricsCompleted",
    label: "Completed in 7 days",
    hint: "Currently completed tasks finished in the last 7 calendar days (UTC)",
  },
  {
    key: "completionTime",
    flag: "metricsCompletionTime",
    label: "Average completion time",
    hint: "Creation to latest completion, using recorded history",
  },
  {
    key: "workload",
    flag: "metricsWorkload",
    label: "Team workload",
    hint: "Open assignments per person, with unassigned tasks shown separately",
  },
] as const;

export type MetricKey = (typeof PROJECT_METRICS)[number]["key"];
export type MetricFlag = (typeof PROJECT_METRICS)[number]["flag"];
export type MetricSettings = Record<MetricFlag, boolean>;

export interface ProjectMetricValues {
  progress?: { percent: number; done: number; total: number };
  overdue?: { count: number; datedOpen: number };
  completed?: { count: number; from: string; to: string };
  completionTime?: { days: number | null; sample: number; untracked: number };
  workload?: {
    totalOpen: number;
    unassigned: number;
    people: { id: string; name: string; color: string; openTasks: number }[];
  };
}

export interface MetricsPayload {
  projectType: "PROJECT" | "PRODUCT";
  generatedAt: string;
  enabled: MetricKey[];
  hasDoneColumn: boolean;
  values: ProjectMetricValues;
}
