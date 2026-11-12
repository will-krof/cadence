import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Wordmark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FeedbackProvider } from "@/components/Feedback";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const metadata = { title: "Admin panel · Cadence" };

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "SUPERADMIN") notFound();
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--plane)]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--hairline)] bg-[var(--surface)] px-4 py-3 sm:px-6">
        <Link href="/app">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/app" className="btn-secondary">
            Back to workspace
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="thin-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          <header>
            <div className="flex items-center gap-3">
              <h1 className="t-title">Admin panel</h1>
              <span className="chip chip-accent">SUPERADMIN</span>
            </div>
            <p className="t-small mt-2">
              Manage registered accounts and access. Project contents stay
              private to their workspaces.
            </p>
          </header>
          <FeedbackProvider>
            <AdminPanel currentUserId={user.id} />
          </FeedbackProvider>
        </div>
      </main>
    </div>
  );
}
