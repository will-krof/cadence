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

## Status dropdowns

Timeline rows and Tracker cards show their current status as a colored chip.
Opening it shows the project's colored column chips, marks the current selection,
and lets editors move the task. The owner's **Edit columns** shortcut, with a
pencil icon below the list, opens the shared Project columns dialog to create,
rename, recolor or mark columns as finished. This also works on an unsorted task
before the first column exists and with Tracker switched off. Read-only viewers
see a chip without mutation controls; invited editors do not receive the settings
shortcut.

Arrow keys, Home and End move through the options; Enter or Space chooses one.
Escape returns focus to the trigger. Tab can reach Edit columns. Outside clicks
and scrolling the board dismiss the popup, while scrolling inside a long list
keeps it open. The popup is rendered outside scroll containers and positioned
within the viewport. The surrounding interface retains the dark Cadence palette.
