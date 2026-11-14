# Timeline columns and bulk assignment

Workspace owners can open **Columns** on Timeline, create named/color-coded
statuses, rename them and choose which statuses mean finished. The columns are
shared with Tracker, but Tracker does not need to be enabled. Column management
retains the existing owner-only API rules. The shared creation form closes after
a successful addition on both boards.

Editors can select task checkboxes individually, Shift-click a checkbox or title
to select an inclusive range, or select every task in the current view. The range
follows visible ordering, including rows outside the virtualized viewport. Folded
subtasks and tasks in other sprints are excluded. Selection is scoped to the
project, sprint and fold state; unavailable/deleted rows are excluded at use time.
Ordinary title clicks still open task details; Ctrl/Cmd-click toggles selection.

Choose one or more active team members, then **Assign selected**. **Add people**
is the default and preserves existing assignees; **Replace assignees** explicitly
replaces them. Up to four people per task and 500 selected tasks per request are
supported. No changes are written until Apply; failures retain selection and the
chosen people for retry. Clearing selection changes no assignments.

`PATCH /api/projects/[id]/tasks/assignees` validates the requested project,
enabled Timeline, timeline-edit rights, every task and every active workspace
assignee. A serializable transaction validates the entire batch before replacing
join rows and updating task timestamps. An invalid task, foreign/archived person
or a four-person limit violation rejects the whole batch. Concurrent write
conflicts return 409 for retry instead of losing an accepted addition. The client
merges only returned task rows, guarded against switching projects during a save.
No schema changes or migrations are needed.

Validation: `npm test` includes range selection checks. After a PostgreSQL build,
`npm run test:timeline` requires a disposable local `cadence_admin_test_<suffix>`
TEST_DATABASE_URL and checks columns while Tracker is off, additive/replacement
semantics, unaffected tasks, atomic failures, concurrency, input limits, active
roster and project/workspace/member permission boundaries. Never use a shared or
production database for integration fixtures.
