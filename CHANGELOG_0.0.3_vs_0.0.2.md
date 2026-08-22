# SolidEdit 0.0.3 vs 0.0.2

SolidEdit 0.0.3 introduces two explicit interface profiles without changing the editor's content or storage contract.

## Full mode

- Full mode is the default.
- Every available content toolbar group is visible from the first render.
- The ribbon expand/collapse button is removed.
- Existing mount calls that do not specify a mode continue to use full mode.

## Mini mode

- Enable it with `toolbarSize: "mini"` in `mountContentEditor(...)` or `initContentEditor(...)` options.
- Toolbar buttons are fixed at 32px and glyphs at 16px.
- Toolbar group gaps and padding are reduced.
- The toolbar-size switch is hidden so a compact host cannot grow the controls accidentally.
- The available tools, generated HTML, form mirroring, and public mount API are the same as full mode.

`toolbarSize` is the only mini-mode switch, so it does not collide with content-mode options such as HTML or Markdown.

## Delivery

- The fixed bundle is `versions/0.0.3/editor.js`.
- `latest/editor.js` contains the same bytes at release time.
- Production consumers should pin the verified 40-character Git commit SHA. The `latest` and `main` references are development channels, not production pins.
