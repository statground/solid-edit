const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");
const latestPath = path.join(repoRoot, "latest", "editor.js");
const versionPath = path.join(repoRoot, "versions", "0.0.3", "editor.js");
const latest = fs.readFileSync(latestPath, "utf8");
const version = fs.readFileSync(versionPath, "utf8");
const patchMarker = "/* SolidEdit 0.0.3: always-visible tools and explicit mini mode. */";
const patchSource = latest.slice(latest.lastIndexOf(patchMarker));

function createHarness() {
  const appendedStyles = [];
  let nextEditor = null;

  const document = {
    getElementById(id) {
      return appendedStyles.find((style) => style.id === id) || null;
    },
    createElement(tagName) {
      return { tagName, id: "", textContent: "" };
    },
    head: {
      appendChild(node) {
        appendedStyles.push(node);
      },
    },
  };

  const window = {
    CONTENT_EDITOR_CONFIG: {},
    addEventListener() {},
    mountContentEditor() {
      return nextEditor;
    },
  };

  vm.runInNewContext(patchSource, { window, document, console });

  return {
    appendedStyles,
    mount(options) {
      const classes = new Set();
      const attributes = {};
      let ribbonRemoved = false;
      const ribbonGroup = {
        parentNode: {
          removeChild() {
            ribbonRemoved = true;
            ribbonGroup.parentNode = null;
          },
        },
        closest() {
          return ribbonGroup;
        },
      };
      const root = {
        classList: {
          add(...names) {
            names.forEach((name) => classes.add(name));
          },
        },
        dataset: { toolbarSize: "compact" },
        querySelectorAll() {
          return [ribbonGroup];
        },
        getAttribute(name) {
          return attributes[name] || null;
        },
        setAttribute(name, value) {
          attributes[name] = value;
        },
      };
      let layoutUpdates = 0;
      nextEditor = {
        root,
        state: { ribbonExpanded: false },
        getHTML() {
          return "<p>preserved</p>";
        },
        updateLayout() {
          layoutUpdates += 1;
        },
      };

      const editor = window.mountContentEditor("#target", options || {});
      return { editor, sourceEditor: nextEditor, classes, attributes, ribbonRemoved, layoutUpdates };
    },
    window,
  };
}

test("the fixed 0.0.3 bundle matches latest at release time", () => {
  assert.equal(version, latest);
  assert.ok(latest.lastIndexOf(patchMarker) > latest.indexOf("window.mountContentEditor"));
});

test("full mode removes the ribbon toggle and exposes all tool groups", () => {
  const harness = createHarness();
  const result = harness.mount({});

  assert.equal(result.attributes["data-solid-edit-mode"], "full");
  assert.equal(result.editor.state.ribbonExpanded, true);
  assert.equal(result.ribbonRemoved, true);
  assert.equal(result.classes.has("lre-tools-always-visible"), true);
  assert.match(harness.appendedStyles[0].textContent, /data-ribbon-group="advanced"/);
  assert.match(harness.appendedStyles[0].textContent, /display:inline-flex!important/);
});

test("mini toolbar uses fixed small controls without changing the editor API", () => {
  const harness = createHarness();
  const result = harness.mount({ toolbarSize: "mini" });

  assert.equal(result.editor, result.sourceEditor);
  assert.equal(result.editor.getHTML(), "<p>preserved</p>");
  assert.equal(result.attributes["data-solid-edit-mode"], "mini");
  assert.equal(result.editor.root.dataset.toolbarSize, "mini");
  assert.match(harness.appendedStyles[0].textContent, /width:32px!important/);
  assert.match(harness.appendedStyles[0].textContent, /width:16px!important/);
  assert.match(harness.appendedStyles[0].textContent, /statkiss-toolbar-size-group\{display:none!important/);
});
