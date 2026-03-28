# SolidEdit

> A reliable, offline-first rich text editor that runs directly from a single HTML file.

---

## 🌐 Language

- English (this file)
- [한국어 README 보기](./README.ko.md)

---

## Overview

**SolidEdit** is an offline-first rich text editor designed to run directly in the browser with minimal setup.

The project is intentionally built around a simple execution model:

- open locally
- run without a server when possible
- avoid unnecessary dependencies
- keep behavior stable and predictable
- prioritize real editing reliability over demo-style complexity

SolidEdit is aimed at people who want a practical editor that can be opened and used immediately, including local environments based on `file://`.

---

## Core Principles

- **Offline first**
- **Simple structure**
- **Low dependency footprint**
- **Stable editing behavior**
- **Predictable initialization**
- **Regression-resistant development**

---

## Main Features

### Rich Text Editing
- Bold, italic, underline, strike
- Paragraph and headings
- Blockquote
- Ordered list, unordered list, checklist
- Inline code
- Link insertion
- Clear formatting
- Text color and background color
- Horizontal rule

### Markdown
- Markdown panel toggle
- Apply Markdown to the editor
- WYSIWYG and Markdown synchronization
- Split view support

### Math
- Inline and block LaTeX support
- Initial render on load
- Raw math data preservation

### Code Blocks
- Language selection
- Syntax highlighting
- Raw code preservation
- Re-highlight after editing

### Images
- Paste, upload, drag and drop
- Base64 embedding
- Compression pipeline
- Basic alignment controls

### Tables
- Grid-based table picker
- Insert without alert/prompt dialogs
- Inspector-based controls

### Inspector
- Context-aware controls
- Minimal default state
- Only relevant sections shown for the selected node

### Persistence
- Auto-save
- Snapshot/version history
- Local storage based recovery

---

## Repository Layout

Recommended structure for the repository:

```text
solid-edit/
├── index.html
├── README.md
├── README.ko.md
├── latest/
│   └── editor.js
└── versions/
    └── 0.0.1/
        └── editor.js
```

### Why `versions/`?

The folder name **`versions`** is recommended for archived or fixed builds.

It is clearer than mixing multiple version directories at the repository root, and it keeps the structure easy to understand:

- `latest/` → current editor build intended for the newest usage example
- `versions/0.0.1/` → fixed historical build for version-specific access or archival reference

---

## Installation

### 1. Local Usage

Download the relevant files and open the HTML file directly.

Example local setup:

```text
index.html
latest/editor.js
```

Then open:

```text
file:///path/to/index.html
```

---

### 2. jsDelivr CDN

Because the actual editor file is stored inside a folder, the CDN path must include that folder path.

#### Latest build

```html
<script src="https://cdn.jsdelivr.net/gh/statground/solid-edit@main/latest/editor.js"></script>
```

#### Version 0.0.1 build

```html
<script src="https://cdn.jsdelivr.net/gh/statground/solid-edit@main/versions/0.0.1/editor.js"></script>
```

---

## CDN Versioning Notes

There are two practical ways to expose SolidEdit through jsDelivr:

### A. Branch-based paths
Useful while iterating on the repository.

```html
https://cdn.jsdelivr.net/gh/statground/solid-edit@main/latest/editor.js
https://cdn.jsdelivr.net/gh/statground/solid-edit@main/versions/0.0.1/editor.js
```

### B. Tag-based paths
Recommended for stable production usage.

If you create a Git tag named `0.0.1`, then the versioned file can also be served through a tag reference:

```html
https://cdn.jsdelivr.net/gh/statground/solid-edit@0.0.1/versions/0.0.1/editor.js
```

If your Git tag is `v0.0.1`, then use:

```html
https://cdn.jsdelivr.net/gh/statground/solid-edit@v0.0.1/versions/0.0.1/editor.js
```

### Recommendation

- Use `@main/latest/editor.js` for actively changing examples
- Use tag-based CDN paths for production documentation and stable embedding

---

## HTML Example

### Latest build

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SolidEdit - Latest</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; }
    #app { height: 100vh; }
  </style>
</head>
<body>
  <div id="app"></div>

  <script src="https://cdn.jsdelivr.net/gh/statground/solid-edit@main/latest/editor.js"></script>
  <script>
    window.addEventListener("DOMContentLoaded", function () {
      if (!window.SolidEdit || typeof window.SolidEdit.init !== "function") {
        console.error("SolidEdit failed to load.");
        return;
      }

      window.SolidEdit.init({
        container: "#app"
      });
    });
  </script>
</body>
</html>
```

### Version 0.0.1 build

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SolidEdit - 0.0.1</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; }
    #app { height: 100vh; }
  </style>
</head>
<body>
  <div id="app"></div>

  <script src="https://cdn.jsdelivr.net/gh/statground/solid-edit@main/versions/0.0.1/editor.js"></script>
  <script>
    window.addEventListener("DOMContentLoaded", function () {
      if (!window.SolidEdit || typeof window.SolidEdit.init !== "function") {
        console.error("SolidEdit failed to load.");
        return;
      }

      window.SolidEdit.init({
        container: "#app"
      });
    });
  </script>
</body>
</html>
```

---

## Initialization Contract

For CDN usage to work correctly, the editor bundle must expose a global object such as:

```javascript
window.SolidEdit = SolidEdit;
```

and provide an initialization entry point:

```javascript
SolidEdit.init({
  container: "#app"
});
```

Without a global export, the browser will load the file but `SolidEdit` will still be undefined.

---

## Contributing

Contributions are welcome, but changes should respect the project direction:

- avoid unnecessary external dependencies
- keep local execution in mind
- preserve editor data integrity
- minimize regressions
- prefer reliability over visual gimmicks

---

## License

MIT

---

## Author

**Statground**
