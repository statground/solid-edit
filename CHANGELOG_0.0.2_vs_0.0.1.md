# SolidEdit 0.0.2 vs 0.0.1

> This note compares the earlier 0.0.1 cycle with the finalized 0.0.2 release from the perspective of public integration, editor stability, and host-page usage.

---

## Quick comparison

| Area | 0.0.1 | 0.0.2 |
|---|---|---|
| Public docs API | Documented around `window.SolidEdit.init(...)` | Documented around `mountContentEditor(...)`, `initContentEditor(...)`, and `CONTENT_EDITOR_*` |
| Release paths | `latest/` and `versions/0.0.1/` examples | `latest/` and `versions/0.0.2/` examples |
| Host-page naming | Older docs could imply project-specific bootstrapping | Public examples use generic naming instead of `STATKISS_*` |
| Code blocks | Functional but less stable in edge cases | Duplicate insertion, unicode issues, and highlight re-application received focused fixes |
| Math | Core support existed | Initial render / re-render / host integration path documented more clearly |
| Inspector | Present | More stable selection handling and cleaner context-only behavior |
| Captions | Not consistently documented across node types | Numbered captions for image, table, formula, and code block |
| Images | Caption and alt handled separately in older flows | Image caption can double as alt text in the documented 0.0.2 behavior |
| Mobile host layout | Supported in principle | More explicit emphasis on responsive embedded usage |
| Example HTML | Simpler but outdated API wording | Generic CDN example aligned to the current public API |

---

## User-visible changes emphasized in the 0.0.2 cycle

### Code block stability
- Duplicate code-block insertion was treated as a release-blocking issue.
- Highlighting was stabilized so code can be rendered again after edits.
- Raw code preservation became more explicit in the public documentation.
- Highlight.js language breadth is now part of the documented usage path.

### Formula stability
- The release notes now treat “initial render” and “saved-content re-render” as first-class expectations.
- Formula editing and formula captions are documented as normal usage, not edge behavior.

### Inspector behavior
- The selection/inspector flow became a major stabilization target.
- The intent of the inspector is clearer: show only the section relevant to the selected node.
- Duplicate / accidental inspector controls were intentionally cleaned up during the 0.0.2 work.

### Caption system
- Captions are no longer only an image concern.
- Table, formula, and code blocks also participate in the caption model.
- Numbering behavior is now part of the expected editor UX.

### Public packaging
- The 0.0.2 release is packaged as a real reusable version instead of only a one-off host integration result.
- The docs now distinguish between:
  - `latest/` for the moving build
  - `versions/0.0.2/` for the frozen release build

---

## Screenshot gallery used in this package

The image files included in this docs package are:

- `docs/images/basic-layout.png`
- `docs/images/code-block.png`
- `docs/images/formula-caption.png`
- `docs/images/table-block.png`

These are reusable documentation filenames so the gallery can stay stable even if you later replace the underlying captures.

---

## Recommended public wording for 0.0.2

Use this wording in docs and examples:

- **SolidEdit is a reusable content editor**
- **Public host globals use `CONTENT_EDITOR_*` names**
- **Public mount APIs are `mountContentEditor(...)` and `initContentEditor(...)`**
- **`STATKISS_*` names remain backward-compatibility aliases, not the public naming system**

Avoid this wording in public docs:

- `window.SolidEdit.init(...)` unless the bundle truly exports it
- StatKISS-specific naming in generic examples
- Version examples that still stop at `0.0.1`

---

## Related files

- [README.md](./README.md)
- [README.ko.md](./README.ko.md)
- [CHATGPT_PROJECT_INSTRUCTIONS.ko.md](./CHATGPT_PROJECT_INSTRUCTIONS.ko.md)
- [examples/cdn-basic/index.html](./examples/cdn-basic/index.html)
