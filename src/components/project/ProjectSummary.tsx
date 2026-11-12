"use client";

import { Avatar, TagChip } from "@/components/ui";
import {
  Developer,
  Membership,
  Project,
  PROJECT_TOOL_TOGGLES,
  TASK_FIELD_TOGGLES,
  ROLE_TOOLS,
  ACCESS_OPTIONS,
  accessOf,
} from "@/lib/types";

/** Saved project configuration, with no mutation controls or invitation tokens. */
export function ProjectSummary({
  project,
  people,
  memberships,
  loading,
}: {
  project: Project;
  people: Developer[];
  memberships: Membership[];
  loading: boolean;
}) {
  const tools = PROJECT_TOOL_TOGGLES.filter((tool) => project[tool.key]);
  const fields = TASK_FIELD_TOGGLES.filter((field) => project[field.key]);
  const hasTasks = project.hasTimeline || project.hasTracker;
  const membershipOf = new Map(
    memberships
      .filter((m) => m.projectId === project.id)
      .map((m) => [m.developerId, m]),
  );

  return (
    <>
      <section
        className="card flex flex-col gap-4 p-4"
        aria-label="Project configuration"
      >
        <h3 className="text-[0.8125rem] font-semibold">
          Project configuration
        </h3>
        <div>
          <h4 className="field-label mb-2">Enabled tools</h4>
          <div className="flex flex-wrap gap-1.5">
            <span className="chip">Team</span>
            {tools.map((tool) => (
              <span key={tool.key} className="chip chip-accent">
                {tool.label}
              </span>
            ))}
          </div>
        </div>
        {hasTasks && (
          <div>
            <h4 className="field-label mb-2">Task fields</h4>
            <div className="flex flex-wrap gap-1.5">
              {["Title", "Description", "Who is on it", "Status"].map(
                (label) => (
                  <span key={label} className="chip">
                    {label}
                  </span>
                ),
              )}
              {fields.map((field) => (
                <span key={field.key} className="chip chip-accent">
                  {field.label}
                </span>
              ))}
            </div>
          </div>
        )}
        {hasTasks && project.taskHasTags && (
          <div>
            <h4 className="field-label mb-2">Tags</h4>
            <div className="flex flex-wrap gap-1.5">
              {project.tags.length ? (
                project.tags.map((tag) => <TagChip key={tag.id} tag={tag} />)
              ) : (
                <p className="text-[0.75rem] text-[var(--ink-muted)]">
                  No tags yet.
                </p>
              )}
            </div>
          </div>
        )}
        {project.hasTracker && (
          <div>
            <h4 className="field-label mb-2">Tracker columns</h4>
            <div className="flex flex-wrap gap-1.5">
              {project.columns.length ? (
                project.columns.map((column) => (
                  <span key={column.id} className="chip">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: column.color }}
                      aria-hidden="true"
                    />
                    {column.name}
                    {column.isDone ? " · Finished" : ""}
                  </span>
                ))
              ) : (
                <p className="text-[0.75rem] text-[var(--ink-muted)]">
                  No columns yet.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2.5" aria-label="Project people">
        <h3 className="text-[0.8125rem] font-semibold">People</h3>
        {loading ? (
          <p className="text-[0.75rem] text-[var(--ink-muted)]">Loading…</p>
        ) : people.length === 0 ? (
          <p className="text-[0.75rem] text-[var(--ink-muted)]">
            Nobody on this project yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {people.map((person) => {
              const membership = membershipOf.get(person.id);
              const held = project.hasRoles
                ? project.roles.filter((role) =>
                    membership?.roleIds.includes(role.id),
                  )
                : [];
              return (
                <li
                  key={person.id}
                  className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-[var(--hairline)] px-3 py-2"
                >
                  <Avatar person={person} size={24} />
                  <span className="min-w-0 flex-1 break-words text-[0.8125rem]">
                    {person.name}
                  </span>
                  {held.map((role) => (
                    <span key={role.id} className="chip">
                      {role.name}
                    </span>
                  ))}
                  {!membership && (
                    <span className="text-[0.6875rem] text-[var(--ink-muted)]">
                      Task assignee
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {project.hasRoles && (
        <section className="flex flex-col gap-2.5" aria-label="Project roles">
          <h3 className="text-[0.8125rem] font-semibold">Roles</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.75rem]">
              <thead>
                <tr>
                  <th className="py-2 pr-3">Role</th>
                  {ROLE_TOOLS.filter(
                    (tool) => !tool.tool || project[tool.tool],
                  ).map((tool) => (
                    <th key={tool.view} className="px-2 py-2">
                      {tool.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {project.roles.map((role) => (
                  <tr
                    key={role.id}
                    className="border-t border-[var(--hairline)]"
                  >
                    <th scope="row" className="py-2 pr-3 font-medium">
                      {role.name}
                    </th>
                    {ROLE_TOOLS.filter(
                      (tool) => !tool.tool || project[tool.tool],
                    ).map((tool) => (
                      <td
                        key={tool.view}
                        className="px-2 py-2 text-[var(--ink-secondary)]"
                      >
                        {
                          ACCESS_OPTIONS.find(
                            (option) => option.value === accessOf(role, tool),
                          )?.label
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
