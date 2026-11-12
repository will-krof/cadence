export type AdminAction = "BAN" | "UNBAN" | "REVOKE_SESSIONS";

export interface ManagedUser {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "SUPERADMIN";
  createdAt: string;
  bannedAt: string | null;
  banReason: string | null;
}

export interface UserPage {
  users: ManagedUser[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RegistrationSeries {
  days: number;
  timezone: "UTC";
  points: { day: string; count: number }[];
}

export interface AuditEntry {
  id: string;
  action: string;
  createdAt: string;
  reason: string | null;
  target: { email: string; name: string | null } | null;
}
