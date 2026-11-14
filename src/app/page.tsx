import Link from "next/link";
import { getViewer } from "@/lib/viewer";
import { Wordmark } from "@/components/Logo";

export default async function LandingPage() {
  const viewer = await getViewer();
  const inside = viewer != null;

  return (
    <div className="schematic thin-scroll flex-1 overflow-y-auto bg-[var(--plane)]">
      <header className="brand-header flex items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <Wordmark />
        <div className="flex items-center gap-2">
          {inside ? (
            <Link href="/app" className="btn-primary">
              Open app
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 pb-16 sm:px-8">
        <section className="py-14 sm:py-20">
          <p className="mb-3 text-[0.75rem] font-medium uppercase tracking-wider text-[var(--accent)]">
            Timeline, tracker, wiki, reports and team in one
          </p>
          <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Plan the sprint. Then watch it move.
          </h1>
          <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-[var(--ink-secondary)]">
            Cadence gives every project a Gantt timeline and a kanban tracker
            over the same tasks — so scheduling and day-to-day progress never
            drift apart. The board is yours to name: columns you write, colour
            and reorder yourself, on a tracker that starts empty rather than
            arriving with somebody else’s idea of how you work.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={inside ? "/app" : "/signup"} className="btn-primary">
              {inside ? "Open app" : "Create your workspace"}
            </Link>
            {!inside && (
              <Link href="/login" className="btn-secondary">
                I already have an account
              </Link>
            )}
          </div>
          {!inside && (
            <p className="mt-4 max-w-xl text-[0.8125rem] leading-relaxed text-[var(--ink-muted)]">
              Been sent an invite link? Open it and pick a username and password
              — you don’t need an account of your own, and each link works for
              three days.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
