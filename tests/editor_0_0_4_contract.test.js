const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootPath = path.resolve(__dirname, "..");
const latest = fs.readFileSync(path.join(rootPath, "latest/editor.js"), "utf8");
const version = fs.readFileSync(path.join(rootPath, "versions/0.0.4/editor.js"), "utf8");
const marker = "/* SolidEdit 0.0.4: flat formatting toolbar and compact document viewport. */";
const layer = version.slice(version.lastIndexOf(marker));

class Element {
  constructor(tagName = "div", classes = "") {
    this.tagName = tagName;
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.values = {};
    this.textContent = "";
    this.style = { setProperty: (key, value) => { this.values[key] = value; } };
    this.classes = new Set(classes.split(" ").filter(Boolean));
    this.classList = { add: (...names) => names.forEach((name) => this.classes.add(name)), contains: (name) => this.classes.has(name) };
  }
  set className(value) { this.classes = new Set(value.split(" ").filter(Boolean)); }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name.startsWith("data-")) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = String(value);
  }
  getAttribute(name) { return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; }
  appendChild(child) { child.remove(); this.children.push(child); child.parentElement = this; return child; }
  remove() {
    if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }
  replaceWith(child) {
    const parent = this.parentElement;
    parent.children[parent.children.indexOf(this)] = child;
    child.parentElement = parent;
    this.parentElement = null;
  }
  matches(selector) {
    if (selector.startsWith(".")) return this.classes.has(selector.slice(1));
    if (selector.startsWith("#")) return this.attributes.id === selector.slice(1);
    if (selector.startsWith("[")) return Object.hasOwn(this.attributes, selector.slice(1, -1));
    return this.tagName === selector;
  }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) || null; }
  querySelectorAll(selectors) {
    const out = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (selectors.split(",").some((selector) => {
          const parts = selector.trim().split(/\s+/);
          return child.matches(parts.at(-1)) && (parts.length === 1 || child.parentElement?.closest(parts[0]));
        })) out.push(child);
        visit(child);
      }
    };
    visit(this);
    return out;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

function editorFixture() {
  const root = new Element("div", "lre-root lre-embedded-content");
  root.setAttribute("lang", "ko");
  const host = root.appendChild(new Element());
  host.setAttribute("id", "lreEmbedToolbarHost");
  host.setAttribute("role", "toolbar");
  const toolbar = host.appendChild(new Element("div", "lre-toolbar"));
  const ribbon = toolbar.appendChild(new Element("div", "lre-group lre-ribbon-toggle-group"));
  const ribbonButton = ribbon.appendChild(new Element("button", "lre-btn"));
  ribbonButton.setAttribute("data-ribbon-toggle", "");
  toolbar.appendChild(new Element("div", "lre-group statkiss-toolbar-size-group"));
  const group = toolbar.appendChild(new Element("div", "lre-group"));
  group.hidden = true;
  const button = group.appendChild(new Element("button", "lre-btn"));
  button.setAttribute("aria-label", "Heading 1");
  button.onclick = () => "format-heading";
  const svg = button.appendChild(new Element("svg"));
  svg.appendChild(new Element("text")).textContent = "H1";
  const align = host.appendChild(new Element("div", "lre-group statkiss-text-align-group"));
  let html = "<p>My content</p>";
  return { root, host, toolbar, group, button, align, state: {}, getHTML: () => html, setHTML: (value) => { html = value; }, getMarkdown: () => "My content" };
}

function harness() {
  const styles = [];
  const observers = [];
  const events = {};
  let next;
  const document = {
    getElementById: (id) => styles.find((style) => style.id === id) || null,
    createElement: (tag) => new Element(tag),
    head: { appendChild: (node) => styles.push(node) },
  };
  class MutationObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target, options) { this.target = target; this.options = options; }
    disconnect() { this.disconnected = true; }
  }
  const window = {
    mountContentEditor: () => next,
    mountLocalRichEditor: () => next,
    destroyLocalRichEditor: (editor) => { editor.destroyed = true; return true; },
    addEventListener: (event, callback) => { events[event] = callback; },
  };
  vm.runInNewContext(layer, { window, document, MutationObserver });
  return { window, styles, observers, events, mount(options = {}, editor = editorFixture()) { next = editor; return window.mountContentEditor("#content", options); }, asyncMount(options = {}) { next = Promise.resolve(editorFixture()); return window.mountContentEditor("#content", options); } };
}

test("0.0.4 replaces the prior UI layer and latest is byte-identical", () => {
  assert.equal(latest, version);
  assert.ok(version.includes(marker));
  assert.ok(!version.includes("/* SolidEdit 0.0.3:"));
});

test("flat toolbar keeps existing controls and content APIs while removing obsolete size/disclosure controls", () => {
  const h = harness();
  const fixture = editorFixture();
  const editor = h.mount({}, fixture);
  assert.equal(editor, fixture);
  assert.equal(editor.root.dataset.solidEditMode, "full");
  assert.equal(editor.root.dataset.solidEditUi, "0.0.4");
  assert.equal(editor.state.ribbonExpanded, true);
  assert.equal(editor.toolbar.querySelectorAll(".lre-ribbon-toggle-group, .statkiss-toolbar-size-group").length, 0);
  assert.equal(editor.group.hidden, false);
  assert.equal(editor.align.parentElement, editor.toolbar);
  assert.equal(editor.button.getAttribute("aria-label"), "Heading 1");
  assert.equal(editor.button.onclick(), "format-heading");
  assert.equal(editor.button.querySelector(".solid-edit-tool-label").textContent, "H1");
  editor.setHTML("<p>Still editable</p>");
  assert.equal(editor.getHTML(), "<p>Still editable</p>");
});

test("full and mini have independent content viewports and validated host height options", () => {
  const h = harness();
  const full = h.mount();
  const mini = h.mount({ toolbarSize: "mini" });
  assert.equal(full.root.values["--solid-edit-content-min"], "320px");
  assert.equal(full.root.values["--solid-edit-content-max"], "none");
  assert.equal(mini.root.values["--solid-edit-content-min"], "160px");
  assert.equal(mini.root.values["--solid-edit-content-max"], "320px");
  const custom = h.mount({ toolbarSize: "mini", minHeight: 240, maxHeight: 480 });
  assert.equal(custom.root.values["--solid-edit-content-min"], "240px");
  assert.equal(custom.root.values["--solid-edit-content-max"], "480px");
  const bounded = h.mount({ toolbarSize: "mini", minHeight: 9999, maxHeight: 20 });
  assert.equal(bounded.root.values["--solid-edit-content-max"], "2400px");
  const invalid = h.mount({ minHeight: "url(unsafe)", maxHeight: Infinity });
  assert.equal(invalid.root.values["--solid-edit-content-min"], "320px");
  assert.equal(invalid.root.values["--solid-edit-content-max"], "none");
  assert.equal(h.styles.length, 1, "styles are shared without cross-editor state");
});

test("late legacy toolbar inserts are normalized and the observer is disconnected on destroy", () => {
  const h = harness();
  const editor = h.mount({ toolbarSize: "mini" });
  const observer = h.observers[0];
  editor.toolbar.appendChild(new Element("div", "lre-group statkiss-toolbar-size-group"));
  observer.callback();
  assert.equal(editor.toolbar.querySelector(".statkiss-toolbar-size-group"), null);
  assert.equal(observer.target, editor.toolbar);
  assert.equal(editor.root.dataset.solidEditMode, "mini");
  assert.equal(h.window.destroyLocalRichEditor(editor), true);
  assert.equal(observer.disconnected, true);
  assert.equal(editor.destroyed, true);
  assert.equal(editor.__solidEditUiObserver, undefined);
});

test("promise-returning mounts retain options and the same editor instance", async () => {
  const h = harness();
  const editor = await h.asyncMount({ toolbarSize: "mini", minHeight: 120, maxHeight: 220 });
  assert.equal(editor.root.dataset.solidEditMode, "mini");
  assert.equal(editor.root.values["--solid-edit-content-max"], "220px");
  assert.equal(editor.getHTML(), "<p>My content</p>");
});
