const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");

const endpoint = process.env.SOLID_EDIT_WEBDRIVER_URL;
const root = path.resolve(__dirname, "..");
const outer = '<!doctype html><html><body style="margin:0"><iframe style="border:0;height:1800px" title="Editor contract"></iframe><script>const p=new URLSearchParams(location.search);const f=document.querySelector("iframe");f.style.width=p.get("width")+"px";f.src="/frame?"+p;</script></body></html>';
const frame = `<!doctype html><html lang="en"><head><style>body{margin:0!important;padding:12px!important;min-height:0!important}html[data-theme=dark] body{background:#101923!important}</style><script>window.CONTENT_EDITOR_AUTOSTART=false;window.CONTENT_EDITOR_AUTOINIT=false;const params=new URLSearchParams(location.search);document.documentElement.dataset.theme=params.get("theme");</script></head><body><textarea id="content"></textarea><script>const script=document.createElement("script");script.src="/editor?version="+params.get("version");script.onload=()=>{window.editor=window.mountContentEditor("#content",{toolbarSize:params.get("mode"),restoreDraft:false,html:"<h2>A document to edit</h2>"+"<p>Keep all formatting commands available while reducing the editor chrome.</p>".repeat(18)});window.ready=true;};document.head.appendChild(script);</script></body></html>`;

test("real full/mini editors preserve the released command set and compact viewport across narrow and dark layouts", { skip: !endpoint, timeout: 90000 }, async () => {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://localhost");
    let body;
    if (url.pathname === "/editor") {
      const version = url.searchParams.get("version") === "003" ? "0.0.3" : "0.0.4";
      body = fs.readFileSync(path.join(root, "versions", version, "editor.js"));
      response.setHeader("Content-Type", "application/javascript");
    } else {
      body = url.pathname === "/frame" ? frame : outer;
      response.setHeader("Content-Type", "text/html;charset=utf-8");
    }
    response.setHeader("Cache-Control", "no-store");
    response.end(body);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let session;
  async function call(method, route, payload, scoped = true) {
    const response = await fetch(endpoint.replace(/\/$/, "") + (scoped ? `/session/${session}` : "") + route, { method, headers: { "Content-Type": "application/json" }, ...(payload ? { body: JSON.stringify(payload) } : {}) });
    const result = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(result));
    return result.value;
  }
  const execute = (script) => call("POST", "/execute/sync", { script, args: [] });
  const frameScript = (script) => execute('const w=document.querySelector("iframe").contentWindow;return(function(){' + script + '}).call(w);');
  async function visit(version, mode, width, theme) {
    await call("POST", "/url", { url: `http://127.0.0.1:${server.address().port}/?version=${version}&mode=${mode}&width=${width}&theme=${theme}` });
    for (let i = 0; i < 200; i += 1) {
      if (await execute('return document.querySelector("iframe")?.contentWindow?.ready===true;')) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.equal(await execute('return document.querySelector("iframe")?.contentWindow?.ready===true;'), true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    return frameScript(`const r=this.editor.root,p=r.querySelector(".lre-editor-page"),t=r.querySelector("#lreEmbedToolbarHost");const buttons=Array.from(t.querySelectorAll(".lre-btn")).filter(b=>b.getClientRects().length&&this.getComputedStyle(b).display!=="none"&&!b.closest(".statkiss-toolbar-size-group"));return {commands:buttons.map(b=>b.dataset.action||b.dataset.align||b.title).sort(),width:this.innerWidth,overflow:this.document.documentElement.scrollWidth>this.innerWidth,pageHeight:p.clientHeight,scrollHeight:p.scrollHeight,pageOverflow:this.getComputedStyle(p).overflowY,colorScheme:this.getComputedStyle(p).colorScheme,buttons:buttons.map(b=>({width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height,border:this.getComputedStyle(b).borderWidth})),groupRadii:Array.from(t.querySelectorAll(".lre-group")).filter(g=>g.getClientRects().length).map(g=>this.getComputedStyle(g).borderRadius),ribbons:r.querySelectorAll("[data-ribbon-toggle]").length};`);
  }
  try {
    const created = await call("POST", "/session", { capabilities: { alwaysMatch: { browserName: "firefox", "moz:firefoxOptions": { args: ["-headless"] } } } }, false);
    session = created.sessionId;
    const baseline = await visit("003", "full", 500, "light");
    assert.ok(baseline.commands.includes("toggle-search"));
    assert.ok(baseline.commands.includes("toggle-outline"));
    for (const mode of ["full", "mini"]) for (const width of [500, 320]) for (const theme of ["light", "dark"]) {
      const result = await visit("004", mode, width, theme);
      const label = `${mode}/${width}/${theme}`;
      assert.deepEqual(result.commands, baseline.commands, `${label}: preserve content commands and embedded restrictions`);
      assert.equal(result.width, width);
      assert.equal(result.overflow, false, `${label}: horizontal overflow`);
      assert.equal(result.ribbons, 0);
      assert.equal(result.colorScheme, theme);
      assert.ok(result.groupRadii.every((radius) => radius === "0px"), `${label}: flat groups`);
      assert.ok(result.buttons.every((button) => button.width === (mode === "mini" ? 28 : 36) && button.height === button.width && button.border === "0px"), `${label}: consistent unboxed controls`);
      if (mode === "mini") {
        assert.equal(result.pageHeight, 320, `${label}: mini document viewport`);
        assert.ok(result.scrollHeight > result.pageHeight);
        assert.equal(result.pageOverflow, "auto");
      } else assert.ok(result.pageHeight >= 320);
      assert.equal(await frameScript('this.editor.setHTML("<p>Edited content</p>");return this.editor.getHTML().includes("Edited content")&&this.editor.getMarkdown().includes("Edited content");'), true);
    }
  } finally {
    if (session) await call("DELETE", "");
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
