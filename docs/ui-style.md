# Graphite and yellow UI

Cadence uses a dark-only visual system inspired by the supplied classic UI sheet.
The implementation uses CSS gradients, borders and shadows rather than image
sprites. Shared tokens and components live in `src/app/globals.css`.

- Graphite canvas and panels replace the earlier navy surfaces.
- Primary actions use yellow gradients, dark labels and highlighted top edges.
- Secondary actions use black gradients, light labels and a yellow hover state.
- Inset shadows give text fields and selectors a recessed appearance.
- Navigation, task cards and dialogs use the same beveled edges and panel tokens.
- Buttons expose hover, pressed, keyboard-focus and disabled states. Priority
  selector padding still leaves room for its dot and chevron in WebKit.
- Success, error and information notifications use green, red and blue gradients
  with contrasting text, icons and dismiss controls.
- Existing task/column/person colors retain their semantic meaning. Native
  checkboxes, radio controls and range controls use the yellow accent.

The dark-only server layout remains in place; saved light preferences and OS
color preferences do not switch the interface. Existing functionality,
authorization and text-only bug reporting are preserved.
