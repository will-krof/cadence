# Project Metrics

Project settings contains a mutually exclusive Project / Product choice. Existing
and new projects default to Project. Enable the Metrics module and independently
choose which of its six project indicators appear. Save and Cancel apply to the
whole settings draft. Disabling the module or changing the type does not delete
work or metric preferences.

| Indicator | Definition |
| --- | --- |
| Project progress | Completed tasks / all tasks, rounded to a whole percent. Subtasks are counted as tasks. Completion follows the project's columns marked as finished. |
| Overdue tasks | Open tasks whose saved due-date calendar day precedes today in UTC. Completed and undated tasks are excluded. |
| Completed in 7 days | Currently completed tasks with their latest recorded completion in the last seven UTC calendar days, including today. A reopened task is excluded. Each task counts once. |
| Average completion time | Arithmetic mean of creation-to-latest-completion durations for currently completed tasks with usable history. This is not the Reports screen's median cycle time. Missing or invalid history is excluded and its count shown. No samples produces an unavailable value, not a fabricated zero. |
| Burndown chart | Remaining tasks over time, compared with an ideal line to the project deadline. See details below. |
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
and task data in place. The module defaults off; its six indicator switches
default on, ready for an owner to customize when enabling it.

Validation: `npm test` covers metric arithmetic and existing regressions.
`npm run test:metrics` uses the same disposable-local PostgreSQL safeguards as the
admin integration tests (`cadence_admin_test_<suffix>` database). Build a
PostgreSQL production bundle first. Never run integration fixtures on a shared or
production database.

## Burndown


The chart counts tasks, including subtasks, equally; it does not use estimates or
story points. A finished tracker column determines completion. It replays task
column events at the end of each UTC calendar day, using the current count for
today. New tasks and reopened tasks can increase the remaining count. Future
actuals are blank.

The period starts on the configured project start date, or on the first task's
creation day (today for an empty project). It ends at the later of today or the
project deadline. The ideal line goes from the first day's remaining count to
zero on the configured deadline and remains zero after it. No deadline or an
unknown starting count means no ideal line. A single-day deadline has an ideal
remaining count of zero. Long periods are sampled to at most 122 observations,
including the start, end and today. The expandable table exposes the values
without depending on SVG or color.

This is a reconstruction from surviving tasks and recorded column events, not
an immutable scope ledger: deleting tasks excludes them from the entire chart,
and changing which columns count as finished reinterprets their history. Missing
or deleted-column events produce gaps rather than invented historical counts.
Historical sprint membership is not recorded, so this first version covers the
whole project rather than individual sprints.

`metricsBurndown` is an independent persisted setting, defaulting to enabled
alongside the other metric switches. The Metrics module itself remains disabled
by default. Additive SQLite and PostgreSQL migrations preserve existing rows.
