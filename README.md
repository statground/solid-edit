# SolidEdit

> A reusable, offline-first rich text editor for local files, embedded host pages, and CDN delivery.

---

## 🌐 Language

- English (this file)
- [한국어 README 보기](./README.ko.md)

---

## Overview

**SolidEdit 0.0.2** is the stabilized reusable release of the editor that was previously documented as a simple local `index.html + editor.js` editor.

This release keeps the same product direction — local-first editing, predictable behavior, minimal host-page friction — but formalizes the project as a **generic embeddable editor** rather than a StatKISS-specific page script.

The current public documentation assumes:

- a moving **latest** channel
- a fixed **versions/0.0.2** release channel
- a generic host-page API based on `mountContentEditor`, `initContentEditor`, and `CONTENT_EDITOR_*` globals
- backward compatibility for older `STATKISS_*` host globals, without using that naming in public examples

---

## 0.0.2 Release Highlights

- Generic embeddable public API
- Stable CDN examples for both `latest/` and `versions/0.0.2/`
- Context-aware inspector behavior for image, table, formula, and code block nodes
- Caption support with numbering for image, table, formula, and code blocks
- Image caption-as-alt behavior
- More stable MathJax rendering and re-rendering
- More stable code block insertion, highlighting, and raw-code preservation
- Better mobile behavior for the embedded host layout

---

## Feature Snapshot

### Rich text editing
- Bold, italic, underline, strike
- Paragraph, H1, H2, H3
- Blockquote
- Ordered list, unordered list, checklist
- Inline code
- Link insertion
- Clear formatting
- Text color / background color
- Horizontal rule

### Markdown
- Markdown panel toggle
- Markdown source editing
- Markdown apply / refresh flow
- Split view support

### Math
- Inline and block formulas
- MathJax rendering
- Source preservation for existing formulas
- Re-render after editing

### Code blocks
- Language selection
- Highlight.js-based highlighting
- Raw code preservation
- Re-highlight after editing
- Safer handling for previously broken unicode / injected markup cases

### Media and structure
- Image paste / upload / drag-and-drop
- Base64 image handling with compression
- Table insertion and table controls
- Context-only inspector panels
- Auto-save and snapshot history

---

## Screenshots

> The gallery below uses the accessible PNG captures available during the 0.0.2 stabilization cycle. They are already renamed to reusable documentation filenames under `docs/images/`.

<p align="center">
  <img src="./docs/images/basic-layout.png" alt="SolidEdit embedded layout example" width="49%">
  <img src="./docs/images/code-block.png" alt="SolidEdit code block example" width="49%">
</p>

<p align="center">
  <img src="./docs/images/formula-caption.png" alt="SolidEdit formula caption example" width="49%">
  <img src="./docs/images/table-block.png" alt="SolidEdit table block example" width="49%">
</p>

---

## What changed from 0.0.1?

This is mainly a **stabilization and packaging release** rather than a full conceptual rewrite.

### 1. Public integration API was clarified
Older documentation described a `window.SolidEdit.init(...)` style API.  
For **0.0.2**, the public docs should use:

- `window.mountContentEditor(target, options)`
- `window.initContentEditor(options)`
- `window.CONTENT_EDITOR_*` host globals

The older `STATKISS_*` names are still treated as compatibility aliases, but they should not be used in public-facing examples.

### 2. CDN release structure is now explicit
The project now documents two channels:

- `latest/` for the moving current build
- `versions/0.0.2/` for the fixed 0.0.2 build

### 3. Code blocks were stabilized
Compared with the earlier 0.0.1 cycle, the 0.0.2 release emphasizes:

- no duplicate code-block insertion
- safer raw code retention
- safer unicode handling
- highlight re-application after edits
- broader language support through Highlight.js delivery options

### 4. Math rendering became more reliable
The 0.0.2 release documents and preserves the path for:

- first render on load
- re-render after editing
- preservation of stored formula source
- better host-page setup for MathJax CDN configuration

### 5. Inspector behavior became more predictable
The 0.0.2 cycle focused heavily on:

- removing unstable click-to-select behavior
- keeping the selected node from immediately losing inspector state
- avoiding generic always-open inspector sections
- cleaning up duplicate / accidental inspector controls

### 6. Caption support was expanded
0.0.2 adds or formalizes:

- image captions with numbering
- table captions with numbering
- formula captions with numbering
- code-block captions with numbering
- image caption reuse as accessible alt text

### 7. Mobile and host integration improved
This release is more deliberate about:

- keeping host-page `index.html` minimal
- moving editor logic into the editor bundle or host integration script
- making the embedded layout friendlier on smaller screens

For a condensed comparison list, see [CHANGELOG_0.0.2_vs_0.0.1.md](./CHANGELOG_0.0.2_vs_0.0.1.md).

---

## Repository Layout

A practical 0.0.2 repository layout can look like this:

```text
solid-edit/
├── README.md
├── README.ko.md
├── CHANGELOG_0.0.2_vs_0.0.1.md
├── CHATGPT_PROJECT_INSTRUCTIONS.ko.md
├── docs/
│   └── images/
│       ├── basic-layout.png
│       ├── code-block.png
│       ├── formula-caption.png
│       └── table-block.png
├── examples/
│   └── cdn-basic/
│       └── index.html
├── latest/
│   └── editor.js
└── versions/
    └── 0.0.2/
        └── editor.js
```

---

## CDN Paths

### Latest channel
```html
<script src="https://cdn.jsdelivr.net/gh/statground/solid-edit@main/latest/editor.js"></script>
```

### Fixed 0.0.2 release
```html
<script src="https://cdn.jsdelivr.net/gh/statground/solid-edit@0.0.2/versions/0.0.2/editor.js"></script>
```

### Pre-tag fallback for the same 0.0.2 folder
```html
<script src="https://cdn.jsdelivr.net/gh/statground/solid-edit@main/versions/0.0.2/editor.js"></script>
```

---

## Public API

### Explicit mount
```javascript
window.mountContentEditor(target, options);
```

Typical usage:

```javascript
window.mountContentEditor("#postBody", {
  placeholder: "Write your content here.",
  titleField: "#postTitle",
  storageKey: "solid-edit-demo-0.0.2"
});
```

### Auto-init / observer-based mount
```javascript
window.initContentEditor({
  target: "#postBody"
});
```

---

## Generic host globals

Public examples should use the **generic** host globals:

```javascript
window.CONTENT_EDITOR_AUTOSTART = false;
window.CONTENT_EDITOR_AUTOINIT = false;
window.CONTENT_EDITOR_CONFIG = {
  placeholder: "Write your content here."
};
window.CONTENT_EDITOR_MATHJAX_CDN_URL = "https://cdn.jsdelivr.net/gh/mathjax/MathJax@3.2.2/es5/tex-svg.js";
window.CONTENT_EDITOR_HLJS_SCRIPT_SRC = "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/highlight.min.js";
window.CONTENT_EDITOR_HLJS_STYLE_HREF = "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/styles/github.min.css";
```

Legacy `STATKISS_*` globals remain compatibility aliases for older host pages, but they are not the recommended public naming for SolidEdit documentation.

---

## Basic CDN Example

A standalone generic example is included at:

```text
examples/cdn-basic/index.html
```

It demonstrates:

- a neutral host page
- a title field
- a textarea target
- explicit `mountContentEditor(...)`
- generic `CONTENT_EDITOR_*` configuration
- a fixed 0.0.2 CDN path, plus commented alternatives

---

## Notes for self-hosting

If you self-host the editor instead of using jsDelivr:

- keep the editor bundle path stable
- keep host-page globals generic
- keep the example and README aligned with the actual exported API
- do not document `window.SolidEdit.init(...)` unless the bundle really exports it

---

## License

MIT

---

## Author

**Statground**
