export const BUG_REPORT_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"] as const;
export type BugReportStatus = (typeof BUG_REPORT_STATUSES)[number];
export const BUG_REPORT_LABELS: Record<BugReportStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
};
export const BUG_REPORT_LIMITS = { subject: 200, message: 10000, perHour: 5 };

export interface BugTicket {
  id: string;
  subject: string;
  message: string;
  status: BugReportStatus;
  createdAt: string;
  updatedAt: string;
  reporterKind: "OWNER" | "MEMBER";
  reporterName: string;
  reporterEmail: string | null;
  reporterUsername: string | null;
}

export interface BugTicketPage {
  tickets: BugTicket[];
  total: number;
  page: number;
  pageSize: number;
}
