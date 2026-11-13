# Cadence visual style

The supplied `somnium-payments-status.html` is a visual reference: its business
content and scripts are not part of Cadence. The shared styles live in
`src/app/globals.css`.

| Reference feature | Cadence treatment |
| --- | --- |
| Canvas `#f8fafc`, white header and panels | Light workspace, entry pages and admin panel use the same neutral surfaces |
| Ink `#1f2937`, gray dividers `#e5e7eb` | Shared text and border tokens |
| System font stack | Native system sans-serif; no remote font download |
| 14px panel corners, 10px smaller cards | Shared radius tokens |
| 1px 2px shadow at 4% opacity | Restrained shared card shadow |
| Blue, green, amber, purple and gray status pills | Semantic pastel status tokens; darkened small text for contrast |
| Slim colored edge on board cards | Tracker task edges use the existing column color |
| Compact headings and controls | 24px page titles, 16px shared headings, 13px controls |

Blue is the action/selection accent. Green denotes active/resolved states,
amber denotes work in progress, and red remains reserved for dangerous or
blocked states. Existing project, column, tag and person colors are preserved.

Dark mode uses equivalent neutral slate surfaces and lighter semantic colors;
the theme switch and saved user preference continue to work. Both themes retain
visible keyboard focus and contrasting priority markers. No reference tabs,
payment features, media or external scripts are imported.
