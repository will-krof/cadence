# Project Metrics

Project settings contains a mutually exclusive Project / Product choice. Existing
and new projects default to Project. Enable the Metrics module and independently
choose which of its five project indicators appear. Save and Cancel apply to the
whole settings draft. Disabling the module or changing the type does not delete
work or metric preferences.

| Indicator | Definition |
| --- | --- |
| Project progress | Completed tasks / all tasks, rounded to a whole percent. Subtasks are counted as tasks. Completion follows the project's columns marked as finished. |
| Overdue tasks | Open tasks whose saved due-date calendar day precedes today in UTC. Completed and undated tasks are excluded. |
| Completed in 7 days | Currently completed tasks with their latest recorded completion in the last seven UTC calendar days, including today. A reopened task is excluded. Each task counts once. |
| Average completion time | Arithmetic mean of creation-to-latest-completion durations for currently completed tasks with usable history. This is not the Reports screen's median cycle time. Missing or invalid history is excluded and its count shown. No samples produces an unavailable value, not a fabricated zero. |
| Team workload | Open assignments per person. A shared task counts once per assignee; unassigned open tasks are shown separately. Completed assignments are excluded. |

Metrics is a read-only sidebar view, separate from detailed Reports. It refreshes
on opening and through Refresh metrics. It returns only enabled indicators. No
finished column, empty work and missing history receive explicit explanations.
Project overview displays the saved type and enabled metric names without edits.

Owners can configure and read their own project metrics. Invited members need
view permission for an enabled task board (project admins retain access). Other
projects/workspaces remain inaccessible, including to a global superadmin.
Metrics uses aggregate counts and minimal assignee names/colors, not task titles,
member emails or full profiles. Disabled modules return 404.

Product is selectable so projects can be classified now. Product metrics are not
implemented in this first release and do not display project indicators. The next
product phase is planned to use manual entry for a selected period, as requested.

Both SQLite and PostgreSQL migrations only add fields, leaving existing project
and task data in place. The module defaults off; its five indicator switches
default on, ready for an owner to customize when enabling it.

Validation: `npm test` covers metric arithmetic and existing regressions.
`npm run test:metrics` uses the same disposable-local PostgreSQL safeguards as the
admin integration tests (`cadence_admin_test_<suffix>` database). Build a
PostgreSQL production bundle first. Never run integration fixtures on a shared or
production database.
