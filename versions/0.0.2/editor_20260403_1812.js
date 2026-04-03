/* StatKISS merged editor package 20260403: core + codeblock option + MathJax/highlight.js CDN support */
if (typeof window !== 'undefined') {
  window.MathJax = window.MathJax || {
    tex: {
      inlineMath: [],
      displayMath: [['$$', '$$'], ['\\[', '\\]']],
      processEscapes: true
    },
    svg: { fontCache: 'none' },
    startup: { typeset: false },
    options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'] }
  };
}
;(function () {
  'use strict';

  const BUILD = '20260330-purejs-01';
  const STORAGE_KEY = 'local-rich-editor-state-v8';
  const SNAPSHOT_KEY = 'local-rich-editor-snapshots-v8';
  const MAX_IMAGE_SIDE = 1600;
  const IMAGE_QUALITY = 0.82;
  const AUTOSAVE_DELAY = 700;

  function log(...args) {
    try { console.info('[LocalRichEditor]', ...args); } catch (error) {}
  }
  log(`build ${BUILD} loaded`);

  const CODE_LANGUAGES = [
    ['plaintext', 'Plain text'],
    ['javascript', 'JavaScript'],
    ['typescript', 'TypeScript'],
    ['html', 'HTML'],
    ['css', 'CSS'],
    ['json', 'JSON'],
    ['bash', 'Bash'],
    ['python', 'Python'],
    ['java', 'Java'],
    ['c', 'C'],
    ['cpp', 'C++'],
    ['csharp', 'C#'],
    ['go', 'Go'],
    ['rust', 'Rust'],
    ['php', 'PHP'],
    ['ruby', 'Ruby'],
    ['swift', 'Swift'],
    ['kotlin', 'Kotlin'],
    ['sql', 'SQL'],
    ['yaml', 'YAML'],
    ['xml', 'XML'],
    ['markdown', 'Markdown'],
    ['diff', 'Diff']
  ];

  const LANG_ALIAS = {
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    yml: 'yaml',
    md: 'markdown',
    htm: 'html',
    svg: 'xml',
    cc: 'cpp',
    cxx: 'cpp',
    hpp: 'cpp',
    cs: 'csharp',
    rs: 'rust'
  };

  const COLOR_PRESETS = [
    '#111827', '#374151', '#6b7280', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#ffffff'
  ];

  function normalizeLang(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return 'plaintext';
    return LANG_ALIAS[raw] || raw;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function debounce(fn, delay) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function uid(prefix = 'id') {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function downloadText(filename, content, type = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 400);
  }

  function ensureStyle(id, css) {
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      style.textContent = css;
      document.head.appendChild(style);
    }
    return style;
  }

  function svg(inner, viewBox = '0 0 24 24', filled = false, className = 'lre-icon') {
    const attrs = filled
      ? `class="${className}" viewBox="${viewBox}" aria-hidden="true"`
      : `class="${className}" viewBox="${viewBox}" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9"`;
    return `<svg ${attrs}>${inner}</svg>`;
  }

  function textIcon(label, size = 12, weight = 700, viewBox = '0 0 32 24') {
    return `<svg class="lre-icon lre-icon-text" viewBox="${viewBox}" aria-hidden="true"><text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" font-size="${size}" font-weight="${weight}" fill="currentColor">${escapeHtml(label)}</text></svg>`;
  }

  const ICONS = {
    new: { label: 'New', svg: svg('<path d="M12 5v14M5 12h14" />') },
    import: { label: 'Import', svg: svg('<path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />') },
    snapshot: { label: 'Snapshot', svg: svg('<path d="M5 19h14" /><path d="M12 5v10" /><path d="m7 10 5-5 5 5" />') },
    undo: { label: 'Undo', svg: svg('<path d="M9 9H5V5" /><path d="M5 9a8 8 0 1 1 2.3 5.7" />') },
    redo: { label: 'Redo', svg: svg('<path d="M15 9h4V5" /><path d="M19 9a8 8 0 1 0-2.3 5.7" />') },
    bold: { label: 'Bold', svg: svg('<path d="M8 6h5a3 3 0 1 1 0 6H8z" /><path d="M8 12h6a3 3 0 1 1 0 6H8z" />') },
    italic: { label: 'Italic', svg: svg('<path d="M14 4h6" /><path d="M4 20h6" /><path d="m14 4-4 16" />') },
    underline: { label: 'Underline', svg: svg('<path d="M8 4v7a4 4 0 0 0 8 0V4" /><path d="M5 20h14" />') },
    strike: { label: 'Strikethrough', svg: svg('<path d="M4 12h16" /><path d="M8.5 7.5C8.5 5.6 10 4 12.5 4c2.5 0 4 1.3 4 3" /><path d="M16 16.5c0 1.9-1.7 3.5-4 3.5-2.6 0-4.3-1.4-4.5-3.5" />') },
    inlineCode: { label: 'Inline code', svg: svg('<path d="m9 8-4 4 4 4" /><path d="m15 8 4 4-4 4" /><path d="m13 5-2 14" />') },
    clear: { label: 'Clear format', svg: svg('<path d="M4 20h16" /><path d="m8 4 8 8" /><path d="m16 4-4 4" /><path d="m10 10-6 6" />') },
    paragraph: { label: 'Paragraph', svg: textIcon('P', 14, 700) },
    h1: { label: 'Heading 1', svg: textIcon('H1', 11, 700) },
    h2: { label: 'Heading 2', svg: textIcon('H2', 11, 700) },
    h3: { label: 'Heading 3', svg: textIcon('H3', 11, 700) },
    quote: { label: 'Quote', svg: svg('<path d="M8 9H6a2 2 0 0 0-2 2v3h4V9Zm10 0h-2a2 2 0 0 0-2 2v3h4V9Z" />') },
    bullet: { label: 'Bulleted list', svg: svg('<circle cx="6" cy="7" r="1.2" fill="currentColor" stroke="none" /><circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="6" cy="17" r="1.2" fill="currentColor" stroke="none" /><path d="M10 7h9M10 12h9M10 17h9" />') },
    ordered: { label: 'Numbered list', svg: svg('<path d="M5 7h1V5" /><path d="M5 7h2" /><path d="M5 11.5c0-.8.6-1.5 1.5-1.5S8 10.7 8 11.5c0 .4-.2.8-.5 1l-2.5 2h3" /><path d="M10 7h9M10 12h9M10 17h9" />') },
    checklist: { label: 'Checklist', svg: svg('<rect x="4" y="5" width="3" height="3" rx=".4" /><rect x="4" y="10.5" width="3" height="3" rx=".4" /><rect x="4" y="16" width="3" height="3" rx=".4" /><path d="M10 6.5h9M10 12h9M10 17.5h9" /><path d="m4.9 12 1 1 1.8-2" />') },
    link: { label: 'Link', svg: svg('<path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" /><path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />') },
    comment: { label: 'Comment', svg: svg('<path d="M5 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H7a2 2 0 0 1-2-2Z" />') },
    textColor: { label: 'Text color', svg: svg('<path d="M8 18h8" /><path d="m12 4-4 10" /><path d="m12 4 4 10" /><path d="M9 11h6" /><circle cx="18" cy="18" r="2.6" fill="currentColor" stroke="none" />') },
    bgColor: { label: 'Background color', svg: svg('<path d="M8 18h8" /><path d="m12 4-4 10" /><path d="m12 4 4 10" /><path d="M9 11h6" /><rect x="16" y="15" width="5" height="5" rx="1" fill="currentColor" stroke="none" opacity=".9" />') },
    table: { label: 'Table', svg: svg('<rect x="4" y="5" width="16" height="14" rx="1.2" /><path d="M4 10h16M4 14.5h16M9.3 5v14M14.7 5v14" />') },
    image: { label: 'Image', svg: svg('<rect x="4" y="5" width="16" height="14" rx="1.6" /><circle cx="9" cy="10" r="1.5" /><path d="m7 17 4-4 3 3 3-5 3 6" />') },
    codeBlock: { label: 'Code block', svg: svg('<path d="m9 8-4 4 4 4" /><path d="m15 8 4 4-4 4" /><path d="m13 5-2 14" />') },
    inlineMath: { label: 'Inline math', svg: textIcon('∑x', 12, 700, '0 0 32 24') },
    blockMath: { label: 'Block math', svg: textIcon('∫dx', 11, 700, '0 0 36 24') },
    hr: { label: 'Horizontal rule', svg: svg('<path d="M4 12h16" /><path d="M9 9v6M15 9v6" />') },
    markdown: { label: 'Markdown panel', svg: textIcon('MD', 12, 700) },
    split: { label: 'Split view', svg: svg('<rect x="4" y="5" width="16" height="14" rx="1.5" /><path d="M12 5v14" />') },
    search: { label: 'Search', svg: svg('<circle cx="11" cy="11" r="6" /><path d="m20 20-4-4" />') },
    outline: { label: 'Outline', svg: svg('<path d="M5 7h4M5 12h8M5 17h6" /><circle cx="18" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="18" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="18" cy="17" r="1" fill="currentColor" stroke="none" />') },
    inspector: { label: 'Inspector', svg: svg('<circle cx="12" cy="12" r="8" /><path d="M12 9v6" /><path d="M9 12h6" />') },
    dark: { label: 'Dark mode', svg: svg('<path d="M18 13a6 6 0 1 1-7-7 7 7 0 1 0 7 7Z" />') },
    exportMd: { label: 'Export Markdown', svg: textIcon('MD', 12, 700) },
    exportHtml: { label: 'Export HTML', svg: textIcon('HTML', 8.4, 700, '0 0 42 24') },
    exportJson: { label: 'Export JSON', svg: textIcon('JSON', 8.4, 700, '0 0 42 24') },
    alignLeft: { label: 'Align left', svg: svg('<path d="M5 7h10M5 12h14M5 17h10" />') },
    alignCenter: { label: 'Align center', svg: svg('<path d="M7 7h10M5 12h14M7 17h10" />') },
    alignRight: { label: 'Align right', svg: svg('<path d="M9 7h10M5 12h14M9 17h10" />') },
    rowAdd: { label: 'Add row', svg: svg('<rect x="4" y="6" width="10" height="10" rx="1" /><path d="M4 11h10M9 6v10" /><path d="M18 8v8M14 12h8" />') },
    colAdd: { label: 'Add column', svg: svg('<rect x="4" y="6" width="10" height="10" rx="1" /><path d="M9 6v10M4 11h10" /><path d="M16 4v16M12 8h8" />') },
    rowDel: { label: 'Delete row', svg: svg('<rect x="4" y="6" width="10" height="10" rx="1" /><path d="M4 11h10M9 6v10" /><path d="M14 12h6" />') },
    colDel: { label: 'Delete column', svg: svg('<rect x="4" y="6" width="10" height="10" rx="1" /><path d="M9 6v10M4 11h10" /><path d="M16 12h4" />') },
    tableRemove: { label: 'Delete table', svg: svg('<rect x="4" y="6" width="10" height="10" rx="1" /><path d="M4 11h10M9 6v10" /><path d="m16 8 4 8" /><path d="m20 8-4 8" />') },
    refresh: { label: 'Refresh', svg: svg('<path d="M20 11a8 8 0 1 1-2.3-5.7" /><path d="M20 4v5h-5" />') },
    edit: { label: 'Edit', svg: svg('<path d="m4 20 4.5-1 9.8-9.8a1.8 1.8 0 0 0 0-2.5l-1-1a1.8 1.8 0 0 0-2.5 0L5 15.5 4 20Z" />') },
    delete: { label: 'Delete', svg: svg('<path d="M5 7h14" /><path d="M9 7V5h6v2" /><path d="M8 7l1 12h6l1-12" />') },
    help: { label: 'Help', svg: svg('<circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4.5 1.5c-.8 1-2 1.3-2 2.5" /><circle cx="12" cy="17" r=".8" fill="currentColor" stroke="none" />') }
  };

  const STYLE = `
    :root {
      --lre-bg: #f3f5f9;
      --lre-card: #ffffff;
      --lre-border: #d7ddea;
      --lre-muted: #6b7280;
      --lre-text: #0f172a;
      --lre-primary: #2563eb;
      --lre-primary-soft: rgba(37, 99, 235, .12);
      --lre-shadow: 0 18px 45px rgba(15, 23, 42, .08);
      --lre-radius: 18px;
      --lre-btn-radius: 13px;
      --lre-code-bg: #f8fafc;
      --lre-code-fg: #10213f;
      --lre-code-border: #cfd9ec;
      --tok-keyword: #7c3aed;
      --tok-string: #0f766e;
      --tok-number: #b45309;
      --tok-comment: #64748b;
      --tok-function: #1d4ed8;
      --tok-builtin: #be185d;
      --tok-operator: #334155;
      --tok-punct: #475569;
      --tok-attr: #1d4ed8;
      --tok-tag: #c2410c;
      --tok-prop: #0f766e;
      --tok-var: #9333ea;
      --tok-heading: #1d4ed8;
      --tok-emph: #be185d;
      --tok-strong: #0f172a;
    }
    body.lre-dark {
      --lre-bg: #0b1221;
      --lre-card: #121b2e;
      --lre-border: #24304a;
      --lre-muted: #9ca3af;
      --lre-text: #e5eefc;
      --lre-primary: #60a5fa;
      --lre-primary-soft: rgba(96, 165, 250, .15);
      --lre-shadow: 0 18px 45px rgba(0, 0, 0, .3);
      --lre-code-bg: #0f172a;
      --lre-code-fg: #e5eefc;
      --lre-code-border: #22304a;
      --tok-keyword: #c084fc;
      --tok-string: #5eead4;
      --tok-number: #f59e0b;
      --tok-comment: #94a3b8;
      --tok-function: #93c5fd;
      --tok-builtin: #f472b6;
      --tok-operator: #cbd5e1;
      --tok-punct: #cbd5e1;
      --tok-attr: #93c5fd;
      --tok-tag: #fb923c;
      --tok-prop: #67e8f9;
      --tok-var: #d8b4fe;
      --tok-heading: #93c5fd;
      --tok-emph: #f9a8d4;
      --tok-strong: #ffffff;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--lre-bg); color: var(--lre-text); font: 16px/1.55 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    body { min-height: 100vh; }
    button, input, select, textarea { font: inherit; color: inherit; }
    .lre-root { min-height: 100vh; padding: 16px; }
    .lre-app { max-width: 1600px; margin: 0 auto; display: grid; gap: 12px; }
    .lre-topbar, .lre-statusbar, .lre-panel, .lre-surface, .lre-source-panel, .lre-dialog-card, .lre-color-popover { background: var(--lre-card); border: 1px solid var(--lre-border); border-radius: var(--lre-radius); box-shadow: var(--lre-shadow); }
    .lre-topbar { padding: 12px; display: grid; gap: 10px; position: sticky; top: 0; z-index: 30; }
    .lre-docbar { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .lre-doc-title { flex: 1 1 auto; min-width: 160px; border: 1px solid transparent; background: transparent; border-radius: 12px; padding: 10px 12px; font-size: 22px; font-weight: 700; outline: none; }
    .lre-doc-title:focus { border-color: var(--lre-primary); background: var(--lre-primary-soft); }
    .lre-toolbar-scroll { overflow: visible; padding-bottom: 2px; }
    .lre-toolbar { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 10px; min-width: 0; width: 100%; }
    .lre-group { display: inline-flex; flex-wrap: wrap; align-items: center; max-width: 100%; gap: 6px; padding: 8px; border: 1px solid var(--lre-border); border-radius: 16px; background: color-mix(in srgb, var(--lre-card) 85%, transparent); }
    .lre-root:not(.lre-ribbon-expanded) .lre-group[data-ribbon-group="advanced"] { display: none; }
    .lre-ribbon-toggle-group { margin-right: 2px; }
    .lre-ribbon-toggle { position: relative; }
    .lre-ribbon-toggle::after { content: ''; position: absolute; right: 7px; bottom: 7px; width: 6px; height: 6px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(45deg); transition: transform .18s ease; }
    .lre-root.lre-ribbon-expanded .lre-ribbon-toggle::after { transform: rotate(-135deg) translateY(-1px); }
    .lre-btn { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; border: 1px solid var(--lre-border); border-radius: var(--lre-btn-radius); background: transparent; color: var(--lre-text); cursor: pointer; transition: .18s ease; flex: 0 0 auto; }
    .lre-btn:hover { border-color: var(--lre-primary); background: var(--lre-primary-soft); color: var(--lre-primary); }
    .lre-btn.is-active { border-color: var(--lre-primary); background: var(--lre-primary-soft); color: var(--lre-primary); }
    .lre-btn svg { width: 22px; height: 22px; }
    .lre-icon-text { width: 26px !important; height: 24px !important; overflow: visible; }
    .lre-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; clip-path: inset(50%); }
    .lre-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
    .lre-main-wrap { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
    .lre-main-wrap.has-outline { grid-template-columns: 280px minmax(0, 1fr); }
    .lre-main-wrap.has-inspector { grid-template-columns: minmax(0, 1fr) 320px; }
    .lre-main-wrap.has-outline.has-inspector { grid-template-columns: 280px minmax(0, 1fr) 320px; }
    .lre-panel { padding: 14px; min-width: 0; }
    .lre-panel[hidden] { display: none !important; }
    .lre-panel h2, .lre-panel h3 { margin: 0 0 10px; font-size: 18px; }
    .lre-panel p { margin: 0 0 10px; color: var(--lre-muted); }
    .lre-outline-list, .lre-version-list, .lre-comment-list { display: grid; gap: 8px; }
    .lre-outline-item, .lre-version-item, .lre-comment-item { border: 1px solid var(--lre-border); border-radius: 12px; padding: 10px 12px; background: rgba(148, 163, 184, .06); }
    .lre-outline-item button, .lre-version-item button { border: 0; background: none; color: inherit; padding: 0; cursor: pointer; text-align: left; width: 100%; }
    .lre-searchbar { display: none; gap: 8px; padding: 12px; align-items: center; }
    .lre-searchbar.is-open { display: flex; }
    .lre-searchbar input { min-width: 0; flex: 1 1 160px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--lre-border); background: transparent; }
    .lre-searchbar .lre-search-count { white-space: nowrap; color: var(--lre-muted); font-size: 14px; }
    .lre-surface { position: relative; padding: 18px; }
    .lre-editor-shell { display: grid; gap: 12px; }
    .lre-editor-shell.is-split { grid-template-columns: minmax(0, 1fr) minmax(280px, 38%); align-items: start; }
    .lre-editor-page { min-height: 68vh; width: min(100%, 980px); margin: 0 auto; padding: 40px 48px; border: 1px solid var(--lre-border); border-radius: 24px; background: color-mix(in srgb, var(--lre-card) 95%, white 5%); outline: none; box-shadow: inset 0 1px 0 rgba(255,255,255,.25); }
    body.lre-dark .lre-editor-page { background: rgba(255,255,255,.02); }
    .lre-editor-page:empty::before { content: attr(data-placeholder); color: var(--lre-muted); }
    .lre-editor-page h1, .lre-editor-page h2, .lre-editor-page h3 { line-height: 1.2; margin: 1.2em 0 .55em; }
    .lre-editor-page h1 { font-size: 2.4rem; }
    .lre-editor-page h2 { font-size: 1.8rem; }
    .lre-editor-page h3 { font-size: 1.4rem; }
    .lre-editor-page p { margin: .75em 0; }
    .lre-editor-page blockquote { margin: 1rem 0; padding: 14px 16px; border-left: 4px solid var(--lre-primary); background: var(--lre-primary-soft); border-radius: 0 16px 16px 0; }
    .lre-editor-page hr { border: 0; border-top: 1px solid var(--lre-border); margin: 1.4rem 0; }
    .lre-editor-page a { color: var(--lre-primary); }
    .lre-editor-page img { max-width: 100%; display: block; }
    .lre-editor-page table { width: 100%; border-collapse: collapse; margin: 1rem 0; overflow: hidden; border-radius: 16px; }
    .lre-editor-page th, .lre-editor-page td { border: 1px solid var(--lre-border); padding: 12px 14px; vertical-align: top; }
    .lre-editor-page th { background: rgba(148, 163, 184, .14); }
    .lre-editor-page ul[data-checklist="true"] { list-style: none; padding-left: 1.2rem; }
    .lre-editor-page ul[data-checklist="true"] li { position: relative; }
    .lre-editor-page ul[data-checklist="true"] li::before { content: '☐'; position: absolute; left: -1.2rem; top: 0; }
    .lre-inline-code { padding: .15em .45em; border-radius: 8px; background: rgba(148, 163, 184, .16); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .lre-code-node, .lre-image-node, .lre-math-node.block { position: relative; border: 1px solid var(--lre-code-border); border-radius: 20px; background: var(--lre-code-bg); color: var(--lre-code-fg); overflow: hidden; margin: 1rem 0; }
    .lre-code-node.is-selected, .lre-image-node.is-selected, .lre-math-node.is-selected, .lre-editor-page table.is-selected { outline: 2px solid var(--lre-primary); outline-offset: 2px; }
    .lre-code-head, .lre-node-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 12px 0; }
    .lre-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 30px; padding: 0 10px; border: 1px solid color-mix(in srgb, var(--lre-primary) 28%, var(--lre-border)); border-radius: 999px; color: var(--lre-primary); background: color-mix(in srgb, var(--lre-primary-soft) 86%, transparent); font-size: 13px; }
    .lre-code-node pre { margin: 0; padding: 18px 22px 22px; background: transparent; overflow: auto; }
    .lre-code-node code { display: block; white-space: pre; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 15px; line-height: 1.75; color: var(--lre-code-fg); }
    .lre-tok-keyword { color: var(--tok-keyword); font-weight: 700; }
    .lre-tok-string { color: var(--tok-string); }
    .lre-tok-number { color: var(--tok-number); }
    .lre-tok-comment { color: var(--tok-comment); font-style: italic; }
    .lre-tok-function { color: var(--tok-function); }
    .lre-tok-builtin { color: var(--tok-builtin); }
    .lre-tok-operator { color: var(--tok-operator); }
    .lre-tok-punct { color: var(--tok-punct); }
    .lre-tok-tag { color: var(--tok-tag); }
    .lre-tok-attr { color: var(--tok-attr); }
    .lre-tok-prop { color: var(--tok-prop); }
    .lre-tok-var { color: var(--tok-var); }
    .lre-tok-heading { color: var(--tok-heading); font-weight: 700; }
    .lre-tok-emph { color: var(--tok-emph); }
    .lre-tok-strong { color: var(--tok-strong); font-weight: 700; }
    .lre-image-node { padding: 14px; background: transparent; color: inherit; }
    .lre-image-node figure, .lre-image-node img { margin: 0; }
    .lre-image-node .lre-figure-wrap { display: flex; justify-content: center; }
    .lre-image-node.align-left .lre-figure-wrap { justify-content: flex-start; }
    .lre-image-node.align-center .lre-figure-wrap { justify-content: center; }
    .lre-image-node.align-right .lre-figure-wrap { justify-content: flex-end; }
    .lre-image-node figcaption { margin-top: 10px; font-size: 14px; color: var(--lre-muted); text-align: center; }
    .lre-math-node.inline { display: inline-block; padding: .2em .5em; border-radius: 10px; background: var(--lre-primary-soft); border: 1px solid rgba(37,99,235,.18); }
    .lre-math-node.block { padding: 20px 24px; text-align: center; }
    .lre-math-node.is-error { color: #dc2626; }
    .lre-source-panel { display: none; min-height: 100%; padding: 14px; gap: 12px; }
    .lre-source-panel.is-open { display: grid; }
    .lre-editor-shell.is-split .lre-source-panel.is-open { display: grid; align-self: stretch; }
    .lre-source-card { border: 1px solid var(--lre-border); border-radius: 16px; overflow: hidden; background: rgba(148,163,184,.05); }
    .lre-source-card header { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--lre-border); }
    .lre-source-card strong { font-size: 14px; }
    .lre-source-card textarea, .lre-source-preview { display: block; width: 100%; min-height: 260px; padding: 14px; border: 0; resize: vertical; background: transparent; }
    .lre-source-preview { overflow: auto; }
    .lre-floating, .lre-slash-menu, .lre-color-popover { position: fixed; z-index: 50; }
    .lre-floating { display: none; gap: 6px; padding: 8px; background: var(--lre-card); border: 1px solid var(--lre-border); border-radius: 16px; box-shadow: var(--lre-shadow); }
    .lre-floating.is-open { display: flex; }
    .lre-floating .lre-btn { width: 38px; height: 38px; }
    .lre-slash-menu { display: none; min-width: 240px; max-width: 320px; padding: 8px; background: var(--lre-card); border: 1px solid var(--lre-border); border-radius: 16px; box-shadow: var(--lre-shadow); opacity: 1; transition: opacity .45s ease; }
    .lre-slash-menu.is-open { display: grid; gap: 4px; }
    .lre-slash-menu.is-fading { opacity: 0; }
    .lre-slash-item { display: grid; grid-template-columns: 28px minmax(0,1fr); gap: 10px; align-items: center; border-radius: 12px; padding: 10px; cursor: pointer; }
    .lre-slash-item:hover, .lre-slash-item.is-active { background: var(--lre-primary-soft); color: var(--lre-primary); }
    .lre-slash-item small { display: block; color: var(--lre-muted); }
    .lre-color-popover { display: none; width: 240px; padding: 12px; }
    .lre-color-popover.is-open { display: grid; gap: 10px; }
    .lre-swatch-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
    .lre-swatch { width: 100%; aspect-ratio: 1; border-radius: 10px; border: 1px solid var(--lre-border); cursor: pointer; }
    .lre-inspector-section { display: none; gap: 10px; margin-top: 12px; }
    .lre-inspector-section.is-open { display: grid; }
    .lre-field { display: grid; gap: 6px; }
    .lre-field input, .lre-field select, .lre-field textarea { padding: 10px 12px; border-radius: 12px; border: 1px solid var(--lre-border); background: transparent; }
    .lre-range-row { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px; }
    .lre-icon-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .lre-icon-row .lre-btn { width: 42px; height: 42px; }
    .lre-danger { color: #dc2626; border-color: rgba(220,38,38,.25); }
    .lre-statusbar { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px 18px; padding: 12px 14px; }
    .lre-status-items { display: flex; flex-wrap: wrap; gap: 12px; color: var(--lre-muted); font-size: 14px; }
    .lre-dialog::backdrop { background: rgba(2, 6, 23, .5); }
    .lre-dialog { border: 0; background: transparent; padding: 0; width: min(760px, calc(100vw - 24px)); }
    .lre-dialog-card { padding: 16px; display: grid; gap: 12px; }
    .lre-dialog-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    .lre-dialog-body { display: grid; gap: 12px; }
    .lre-dialog-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
    .lre-dialog textarea { width: 100%; min-height: 260px; border: 1px solid var(--lre-border); border-radius: 14px; padding: 12px; background: transparent; resize: vertical; }
    .lre-actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
    .lre-primary { background: var(--lre-primary); color: white; border-color: transparent; }
    .lre-muted-btn { background: transparent; }
    .lre-note { font-size: 13px; color: var(--lre-muted); }
    .lre-comment-mark { background: rgba(250, 204, 21, .35); border-bottom: 1px dashed rgba(180, 83, 9, .55); }
    .lre-hidden { display: none !important; }
    @media (max-width: 1180px) {
      .lre-main-wrap.has-outline.has-inspector, .lre-main-wrap.has-outline, .lre-main-wrap.has-inspector { grid-template-columns: minmax(0, 1fr); }
      .lre-panel { order: 2; }
      .lre-surface { order: 1; }
    }
    @media (max-width: 900px) {
      .lre-editor-shell.is-split { grid-template-columns: minmax(0, 1fr); }
      .lre-editor-page { padding: 26px 22px; min-height: 58vh; }
      .lre-doc-title { font-size: 18px; }
    }
    @media (max-width: 720px) {
      .lre-root { padding: 10px; }
      .lre-topbar { padding: 10px; }
      .lre-docbar { align-items: stretch; flex-wrap: wrap; }
      .lre-searchbar.is-open { display: grid; grid-template-columns: minmax(0,1fr); }
      .lre-group { padding: 6px; border-radius: 14px; }
      .lre-btn { width: 38px; height: 38px; }
      .lre-btn svg { width: 21px; height: 21px; }
      .lre-icon-text { width: 24px !important; height: 22px !important; }
      .lre-statusbar { font-size: 13px; }
      .lre-dialog-grid { grid-template-columns: minmax(0,1fr); }
    }
  `;

  function createButton(action, iconName, title, extra = '') {
    const icon = ICONS[iconName] || ICONS[action] || { label: title || action, svg: textIcon(String(title || action).slice(0, 2).toUpperCase()) };
    return `<button class="lre-btn ${extra}" type="button" data-action="${action}" title="${escapeHtml(title || icon.label)}" aria-label="${escapeHtml(title || icon.label)}">${icon.svg}<span class="lre-sr">${escapeHtml(title || icon.label)}</span></button>`;
  }

  function createRibbonToggleButton() {
    return `<button class="lre-btn lre-ribbon-toggle" type="button" data-ribbon-toggle="true" aria-expanded="false" title="Show extra tools" aria-label="Show extra tools">${ICONS.outline.svg}<span class="lre-sr lre-ribbon-toggle-label">Show tools</span></button>`;
  }

  const TEMPLATE = `
    <div class="lre-root" id="lreRoot">
      <div class="lre-app" id="lreApp">
        <header class="lre-topbar">
          <div class="lre-docbar">
            <input id="lreDocTitle" class="lre-doc-title" type="text" value="Untitled document" aria-label="Document title">
          </div>
          <div class="lre-toolbar-scroll">
            <div class="lre-toolbar" id="lreToolbar">
              <div class="lre-group lre-ribbon-toggle-group" data-ribbon-group="controls">
                ${createRibbonToggleButton()}
              </div>
              <div class="lre-group" data-ribbon-group="primary">
                ${createButton('new-doc', 'new')}
                ${createButton('import-file', 'import')}
                ${createButton('export-md', 'exportMd', 'Export Markdown')}
                ${createButton('export-html', 'exportHtml', 'Export HTML')}
                ${createButton('export-json', 'exportJson', 'Export JSON')}
                ${createButton('snapshot', 'snapshot', 'Save snapshot')}
              </div>
              <div class="lre-group" data-ribbon-group="primary">
                ${createButton('undo', 'undo')}
                ${createButton('redo', 'redo')}
              </div>
              <div class="lre-group" data-ribbon-group="primary">
                ${createButton('bold', 'bold')}
                ${createButton('italic', 'italic')}
                ${createButton('underline', 'underline')}
                ${createButton('strike', 'strike')}
                ${createButton('inline-code', 'inlineCode')}
                ${createButton('clear-format', 'clear', 'Clear formatting')}
              </div>
              <div class="lre-group" data-ribbon-group="primary">
                ${createButton('paragraph', 'paragraph')}
                ${createButton('h1', 'h1')}
                ${createButton('h2', 'h2')}
                ${createButton('h3', 'h3')}
                ${createButton('quote', 'quote')}
                ${createButton('bullet-list', 'bullet')}
                ${createButton('ordered-list', 'ordered')}
                ${createButton('check-list', 'checklist')}
              </div>
              <div class="lre-group" data-ribbon-group="advanced">
                ${createButton('link', 'link')}
                ${createButton('comment', 'comment')}
                ${createButton('text-color', 'textColor', 'Text color')}
                ${createButton('bg-color', 'bgColor', 'Background color')}
                ${createButton('table', 'table')}
                ${createButton('image', 'image')}
                ${createButton('code-block', 'codeBlock')}
                ${createButton('inline-math', 'inlineMath')}
                ${createButton('block-math', 'blockMath')}
                ${createButton('hr', 'hr')}
              </div>
              <div class="lre-group" data-ribbon-group="advanced">
                ${createButton('toggle-source', 'markdown', 'Markdown panel')}
                ${createButton('toggle-split', 'split', 'Split view')}
                ${createButton('toggle-search', 'search', 'Search and replace')}
                ${createButton('toggle-outline', 'outline', 'Outline')}
                ${createButton('toggle-inspector', 'inspector', 'Inspector')}
                ${createButton('toggle-dark', 'dark', 'Toggle dark mode')}
              </div>
            </div>
          </div>
        </header>

        <div class="lre-main-wrap" id="lreMainWrap">
          <aside class="lre-panel" id="lreOutlinePanel" hidden>
            <h2>Outline</h2>
            <p>Headings appear here.</p>
            <div class="lre-outline-list" id="lreOutlineList"></div>
            <h3>Snapshots</h3>
            <p>Manual snapshots are listed here.</p>
            <div class="lre-version-list" id="lreVersionList"></div>
          </aside>

          <section class="lre-surface">
            <div class="lre-searchbar" id="lreSearchbar">
              <input id="lreSearchInput" type="search" placeholder="Search in document">
              <input id="lreReplaceInput" type="text" placeholder="Replace with">
              ${createButton('search-prev', 'search', 'Find previous')}
              ${createButton('search-next', 'search', 'Find next')}
              ${createButton('replace-current', 'edit', 'Replace current')}
              ${createButton('replace-all', 'refresh', 'Replace all')}
              <div class="lre-search-count" id="lreSearchCount">0 matches</div>
            </div>

            <div class="lre-editor-shell" id="lreEditorShell">
              <div>
                <div class="lre-floating" id="lreBubbleToolbar">
                  ${createButton('bold', 'bold')}
                  ${createButton('italic', 'italic')}
                  ${createButton('underline', 'underline')}
                  ${createButton('link', 'link')}
                  ${createButton('comment', 'comment')}
                </div>
                <div class="lre-slash-menu" id="lreSlashMenu"></div>
                <article id="lreEditor" class="lre-editor-page" contenteditable="true" spellcheck="true" data-placeholder="Type here. Use / for commands."></article>
              </div>
              <section class="lre-source-panel" id="lreSourcePanel">
                <div class="lre-source-card">
                  <header><strong>Markdown source</strong><span class="lre-chip">editable</span></header>
                  <textarea id="lreMarkdownSource" placeholder="# Markdown"></textarea>
                </div>
                <div class="lre-source-card">
                  <header><strong>Rendered preview</strong><span class="lre-chip">sanitized</span></header>
                  <div class="lre-source-preview" id="lreMarkdownPreview"></div>
                </div>
              </section>
            </div>
          </section>

          <aside class="lre-panel" id="lreInspectorPanel" hidden>
            <h2>Inspector</h2>
            <p id="lreInspectorHint">Select an image, table, formula, or code block.</p>

            <section class="lre-inspector-section" id="lreImageInspector">
              <h3>Image</h3>
              <label class="lre-field">Caption<input id="lreImageCaption" type="text" placeholder="Caption"></label>
              <label class="lre-field">Alt text<input id="lreImageAlt" type="text" placeholder="Alt text"></label>
              <div class="lre-field">
                <span>Width</span>
                <div class="lre-range-row"><input id="lreImageWidth" type="range" min="20" max="100" step="1" value="100"><strong id="lreImageWidthLabel">100%</strong></div>
              </div>
              <div class="lre-field"><span>Align</span><div class="lre-icon-row">
                ${createButton('image-align-left', 'alignLeft', 'Align left')}
                ${createButton('image-align-center', 'alignCenter', 'Align center')}
                ${createButton('image-align-right', 'alignRight', 'Align right')}
              </div></div>
            </section>

            <section class="lre-inspector-section" id="lreTableInspector">
              <h3>Table</h3>
              <p id="lreTableInfo">0 rows × 0 columns</p>
              <div class="lre-icon-row">
                ${createButton('table-add-row', 'rowAdd', 'Add row')}
                ${createButton('table-add-col', 'colAdd', 'Add column')}
                ${createButton('table-del-row', 'rowDel', 'Delete row')}
                ${createButton('table-del-col', 'colDel', 'Delete column')}
                ${createButton('table-remove', 'tableRemove', 'Delete table', 'lre-danger')}
              </div>
            </section>

            <section class="lre-inspector-section" id="lreMathInspector">
              <h3>Formula</h3>
              <div class="lre-field"><textarea id="lreMathText" rows="4" placeholder="TeX formula"></textarea></div>
              <div class="lre-actions">
                <button class="lre-btn lre-muted-btn" type="button" data-action="edit-math">${ICONS.edit.svg}<span class="lre-sr">Edit formula</span></button>
              </div>
            </section>

            <section class="lre-inspector-section" id="lreCodeInspector">
              <h3>Code block</h3>
              <label class="lre-field">Language<select id="lreCodeLanguageSelect">${CODE_LANGUAGES.map(([v, label]) => `<option value="${v}">${label}</option>`).join('')}</select></label>
              <p id="lreCodeInfo">0 lines</p>
              <div class="lre-icon-row">
                ${createButton('edit-code', 'edit', 'Edit code')}
                ${createButton('refresh-code', 'refresh', 'Refresh highlighting')}
              </div>
            </section>

            <section class="lre-inspector-section is-open">
              <h3>Comments</h3>
              <div class="lre-comment-list" id="lreCommentList"></div>
            </section>

            <div class="lre-actions">
              <button class="lre-btn lre-danger" type="button" data-action="delete-node">${ICONS.delete.svg}<span class="lre-sr">Delete selected node</span></button>
            </div>
          </aside>
        </div>

        <footer class="lre-statusbar">
          <div class="lre-status-items">
            <span id="lreStatusDirty">Saved</span>
            <span id="lreStatusSaved">Never saved</span>
          </div>
          <div class="lre-status-items">
            <span id="lreStatusWords">0 words</span>
            <span id="lreStatusChars">0 chars</span>
            <span id="lreStatusImages">0 images</span>
            <span id="lreStatusSize">0.00 MB</span>
          </div>
        </footer>

        <input id="lreImportInput" type="file" accept=".md,.markdown,.txt,.html,.htm,.json" hidden>
        <input id="lreImageInput" type="file" accept="image/*" hidden>

        <dialog class="lre-dialog" id="lreCodeDialog">
          <div class="lre-dialog-card">
            <div class="lre-dialog-head"><h2>Code block</h2><button class="lre-btn" type="button" data-close-dialog="lreCodeDialog">${ICONS.delete.svg}<span class="lre-sr">Close</span></button></div>
            <div class="lre-dialog-body">
              <div class="lre-dialog-grid">
                <label class="lre-field">Language<select id="lreCodeDialogLang">${CODE_LANGUAGES.map(([v, label]) => `<option value="${v}">${label}</option>`).join('')}</select></label>
                <div class="lre-field"><span>Tip</span><div class="lre-note">Double-click a code block or use the inspector to edit it.</div></div>
              </div>
              <textarea id="lreCodeDialogText" spellcheck="false" placeholder="Paste code here"></textarea>
            </div>
            <div class="lre-actions"><button class="lre-btn" type="button" data-close-dialog="lreCodeDialog">${ICONS.delete.svg}<span class="lre-sr">Cancel</span></button><button class="lre-btn lre-primary" type="button" data-action="save-code-dialog">${ICONS.edit.svg}<span class="lre-sr">Save code</span></button></div>
          </div>
        </dialog>

        <dialog class="lre-dialog" id="lreMathDialog">
          <div class="lre-dialog-card">
            <div class="lre-dialog-head"><h2>Formula</h2><button class="lre-btn" type="button" data-close-dialog="lreMathDialog">${ICONS.delete.svg}<span class="lre-sr">Close</span></button></div>
            <div class="lre-dialog-body">
              <div class="lre-dialog-grid">
                <label class="lre-field">Display mode<select id="lreMathDialogDisplay"><option value="inline">Inline</option><option value="block">Block</option></select></label>
                <div class="lre-field"><span>TeX</span><div class="lre-note">MathJax runs locally from the embedded bundle.</div></div>
              </div>
              <textarea id="lreMathDialogText" spellcheck="false" placeholder="e.g. \\int_0^1 x^2 \\mathrm{d}x = \\frac{1}{3}"></textarea>
            </div>
            <div class="lre-actions"><button class="lre-btn" type="button" data-close-dialog="lreMathDialog">${ICONS.delete.svg}<span class="lre-sr">Cancel</span></button><button class="lre-btn lre-primary" type="button" data-action="save-math-dialog">${ICONS.edit.svg}<span class="lre-sr">Save formula</span></button></div>
          </div>
        </dialog>
      </div>

      <div class="lre-color-popover" id="lreColorPopover">
        <strong id="lreColorPopoverTitle">Text color</strong>
        <div class="lre-swatch-grid" id="lreSwatchGrid"></div>
        <label class="lre-field">Detailed color<input id="lreColorPicker" type="color" value="#2563eb"></label>
      </div>
    </div>
  `;

  function createTextNodeWalker(root) {
    return document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentNode;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest && (parent.closest('.lre-code-node') || parent.closest('.lre-math-node') || parent.closest('#lreSourcePanel'))) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
  }

  function htmlToText(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || '';
  }

  function isLetter(ch) {
    return /[A-Za-z_$]/.test(ch);
  }

  function isWord(ch) {
    return /[A-Za-z0-9_$]/.test(ch);
  }

  const JS_KEYWORDS = new Set('as async await break case catch class const continue debugger default delete do else enum export extends false finally for from function if implements import in instanceof interface let new null package private protected public return static super switch this throw true try typeof undefined var void while with yield type of'.split(' '));
  const JS_BUILTINS = new Set('Array Boolean Date Error Function JSON Map Math Number Object Promise RegExp Set String Symbol console document window globalThis process fetch Intl URL URLSearchParams'.split(' '));
  const PY_KEYWORDS = new Set('and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield'.split(' '));
  const BASH_KEYWORDS = new Set('if then else elif fi for do done case esac function in local export unset readonly select while until time'.split(' '));
  const SQL_KEYWORDS = new Set('select from where group by order having insert into update delete create alter drop join left right inner outer on as and or not null true false union all distinct limit offset values set case when then end like ilike between exists table view index primary key foreign constraint'.split(' '));

  function wrapTok(cls, text) {
    return `<span class="lre-tok-${cls}">${escapeHtml(text)}</span>`;
  }

  function scanQuoted(code, start, quote) {
    let i = start + 1;
    while (i < code.length) {
      const ch = code[i];
      if (ch === '\\') { i += 2; continue; }
      if (quote === '`' && ch === '$' && code[i + 1] === '{') {
        i += 2;
        let depth = 1;
        while (i < code.length && depth > 0) {
          if (code[i] === '\\') { i += 2; continue; }
          if (code[i] === '{') depth += 1;
          else if (code[i] === '}') depth -= 1;
          i += 1;
        }
        continue;
      }
      if (ch === quote) { i += 1; break; }
      i += 1;
    }
    return i;
  }

  function scanNumber(code, start) {
    let i = start;
    if (code[i] === '0' && (code[i + 1] === 'x' || code[i + 1] === 'X')) {
      i += 2;
      while (/[0-9a-fA-F]/.test(code[i] || '')) i += 1;
      return i;
    }
    if (code[i] === '0' && (code[i + 1] === 'b' || code[i + 1] === 'B')) {
      i += 2;
      while (/[01]/.test(code[i] || '')) i += 1;
      return i;
    }
    if (code[i] === '0' && (code[i + 1] === 'o' || code[i + 1] === 'O')) {
      i += 2;
      while (/[0-7]/.test(code[i] || '')) i += 1;
      return i;
    }
    while (/[0-9_]/.test(code[i] || '')) i += 1;
    if (code[i] === '.' && /[0-9]/.test(code[i + 1] || '')) {
      i += 1;
      while (/[0-9_]/.test(code[i] || '')) i += 1;
    }
    if ((code[i] === 'e' || code[i] === 'E') && /[0-9+-]/.test(code[i + 1] || '')) {
      i += 1;
      if (code[i] === '+' || code[i] === '-') i += 1;
      while (/[0-9_]/.test(code[i] || '')) i += 1;
    }
    return i;
  }

  function highlightJsLike(code, keywords = JS_KEYWORDS, builtins = JS_BUILTINS) {
    let out = '';
    let i = 0;
    while (i < code.length) {
      const ch = code[i];
      const next = code[i + 1];
      if (ch === '/' && next === '/') {
        let j = i + 2;
        while (j < code.length && code[j] !== '\n') j += 1;
        out += wrapTok('comment', code.slice(i, j));
        i = j;
        continue;
      }
      if (ch === '/' && next === '*') {
        let j = i + 2;
        while (j < code.length && !(code[j] === '*' && code[j + 1] === '/')) j += 1;
        j = Math.min(code.length, j + 2);
        out += wrapTok('comment', code.slice(i, j));
        i = j;
        continue;
      }
      if (ch === '"' || ch === '\'' || ch === '`') {
        const j = scanQuoted(code, i, ch);
        out += wrapTok('string', code.slice(i, j));
        i = j;
        continue;
      }
      if (/[0-9]/.test(ch)) {
        const j = scanNumber(code, i);
        out += wrapTok('number', code.slice(i, j));
        i = j;
        continue;
      }
      if (isLetter(ch)) {
        let j = i + 1;
        while (isWord(code[j] || '')) j += 1;
        const word = code.slice(i, j);
        if (keywords.has(word)) out += wrapTok('keyword', word);
        else if (builtins.has(word)) out += wrapTok('builtin', word);
        else {
          let k = j;
          while (/\s/.test(code[k] || '')) k += 1;
          if (code[k] === '(') out += wrapTok('function', word);
          else out += escapeHtml(word);
        }
        i = j;
        continue;
      }
      const triple = code.slice(i, i + 3);
      const double = code.slice(i, i + 2);
      if (['===', '!==', '>>>'].includes(triple)) {
        out += wrapTok('operator', triple);
        i += 3;
        continue;
      }
      if (['=>', '==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=', '??'].includes(double)) {
        out += wrapTok('operator', double);
        i += 2;
        continue;
      }
      if ('+-*/%=&|!:?~^'.includes(ch)) {
        out += wrapTok('operator', ch);
        i += 1;
        continue;
      }
      if ('{}()[];:.,'.includes(ch)) {
        out += wrapTok('punct', ch);
        i += 1;
        continue;
      }
      out += escapeHtml(ch);
      i += 1;
    }
    return out;
  }

  function highlightPython(code) {
    let out = '';
    let i = 0;
    while (i < code.length) {
      const ch = code[i];
      if (ch === '#') {
        let j = i + 1;
        while (j < code.length && code[j] !== '\n') j += 1;
        out += wrapTok('comment', code.slice(i, j));
        i = j;
        continue;
      }
      if (code.slice(i, i + 3) === '"""' || code.slice(i, i + 3) === '\'\'\'') {
        const q = code.slice(i, i + 3);
        let j = i + 3;
        while (j < code.length && code.slice(j, j + 3) !== q) j += 1;
        j = Math.min(code.length, j + 3);
        out += wrapTok('string', code.slice(i, j));
        i = j;
        continue;
      }
      if (ch === '"' || ch === '\'') {
        const j = scanQuoted(code, i, ch);
        out += wrapTok('string', code.slice(i, j));
        i = j;
        continue;
      }
      if (/[0-9]/.test(ch)) {
        const j = scanNumber(code, i);
        out += wrapTok('number', code.slice(i, j));
        i = j;
        continue;
      }
      if (isLetter(ch)) {
        let j = i + 1;
        while (/[A-Za-z0-9_]/.test(code[j] || '')) j += 1;
        const word = code.slice(i, j);
        if (PY_KEYWORDS.has(word)) out += wrapTok('keyword', word);
        else if (['print', 'len', 'range', 'list', 'dict', 'set', 'tuple', 'str', 'int', 'float', 'bool'].includes(word)) out += wrapTok('builtin', word);
        else {
          let k = j;
          while (/\s/.test(code[k] || '')) k += 1;
          if (code[k] === '(') out += wrapTok('function', word);
          else out += escapeHtml(word);
        }
        i = j;
        continue;
      }
      if ('+-*/%=<>!&|^'.includes(ch)) { out += wrapTok('operator', ch); i += 1; continue; }
      if ('{}()[];:.,'.includes(ch)) { out += wrapTok('punct', ch); i += 1; continue; }
      out += escapeHtml(ch); i += 1;
    }
    return out;
  }

  function highlightBash(code) {
    let out = '';
    let i = 0;
    while (i < code.length) {
      const ch = code[i];
      if (ch === '#') {
        let j = i + 1;
        while (j < code.length && code[j] !== '\n') j += 1;
        out += wrapTok('comment', code.slice(i, j));
        i = j;
        continue;
      }
      if (ch === '"' || ch === '\'' || ch === '`') {
        const j = scanQuoted(code, i, ch);
        out += wrapTok('string', code.slice(i, j));
        i = j;
        continue;
      }
      if (ch === '$') {
        let j = i + 1;
        if (code[j] === '{') {
          j += 1;
          while (j < code.length && code[j] !== '}') j += 1;
          j += 1;
        } else {
          while (/[A-Za-z0-9_?@*$#!-]/.test(code[j] || '')) j += 1;
        }
        out += wrapTok('var', code.slice(i, j));
        i = j;
        continue;
      }
      if (isLetter(ch)) {
        let j = i + 1;
        while (/[A-Za-z0-9_-]/.test(code[j] || '')) j += 1;
        const word = code.slice(i, j);
        if (BASH_KEYWORDS.has(word)) out += wrapTok('keyword', word);
        else out += escapeHtml(word);
        i = j;
        continue;
      }
      if ('|&;<>='.includes(ch)) { out += wrapTok('operator', ch); i += 1; continue; }
      if ('{}()[]'.includes(ch)) { out += wrapTok('punct', ch); i += 1; continue; }
      out += escapeHtml(ch); i += 1;
    }
    return out;
  }

  function highlightJSON(code) {
    let out = '';
    let i = 0;
    while (i < code.length) {
      const ch = code[i];
      if (ch === '"') {
        const j = scanQuoted(code, i, '"');
        let token = code.slice(i, j);
        let k = j;
        while (/\s/.test(code[k] || '')) k += 1;
        if (code[k] === ':') out += wrapTok('attr', token);
        else out += wrapTok('string', token);
        i = j;
        continue;
      }
      if (/[0-9-]/.test(ch)) {
        const j = scanNumber(code, i);
        out += wrapTok('number', code.slice(i, j));
        i = j;
        continue;
      }
      if (code.startsWith('true', i) || code.startsWith('false', i) || code.startsWith('null', i)) {
        const word = code.startsWith('true', i) ? 'true' : code.startsWith('false', i) ? 'false' : 'null';
        out += wrapTok('keyword', word);
        i += word.length;
        continue;
      }
      if ('{}[],:'.includes(ch)) { out += wrapTok('punct', ch); i += 1; continue; }
      out += escapeHtml(ch); i += 1;
    }
    return out;
  }

  function highlightHtmlLike(code) {
    let out = '';
    let i = 0;
    while (i < code.length) {
      if (code.startsWith('<!--', i)) {
        let j = i + 4;
        while (j < code.length && !code.startsWith('-->', j)) j += 1;
        j = Math.min(code.length, j + 3);
        out += wrapTok('comment', code.slice(i, j));
        i = j;
        continue;
      }
      if (code[i] === '<') {
        let j = i + 1;
        let chunk = '&lt;';
        if (code[j] === '/' || code[j] === '!') { chunk += escapeHtml(code[j]); j += 1; }
        let nameStart = j;
        while (/[A-Za-z0-9:_-]/.test(code[j] || '')) j += 1;
        if (j > nameStart) chunk += `<span class="lre-tok-tag">${escapeHtml(code.slice(nameStart, j))}</span>`;
        while (j < code.length && code[j] !== '>') {
          if (/\s/.test(code[j])) { chunk += escapeHtml(code[j]); j += 1; continue; }
          if (code[j] === '/' || code[j] === '=') { chunk += wrapTok('operator', code[j]); j += 1; continue; }
          if (code[j] === '"' || code[j] === '\'') {
            const q = code[j];
            const k = scanQuoted(code, j, q);
            chunk += wrapTok('string', code.slice(j, k));
            j = k;
            continue;
          }
          const aStart = j;
          while (/[A-Za-z0-9:_-]/.test(code[j] || '')) j += 1;
          chunk += `<span class="lre-tok-attr">${escapeHtml(code.slice(aStart, j))}</span>`;
        }
        if (code[j] === '>') { chunk += '&gt;'; j += 1; }
        out += chunk;
        i = j;
        continue;
      }
      out += escapeHtml(code[i]);
      i += 1;
    }
    return out;
  }

  function highlightCss(code) {
    return escapeHtml(code)
      .replace(/\/\*[\s\S]*?\*\//g, (m) => `<span class="lre-tok-comment">${m}</span>`)
      .replace(/([.#]?[a-zA-Z_][a-zA-Z0-9_\-\s,:>+~\[\]="']*)\{/g, (_, sel) => `<span class="lre-tok-tag">${sel}</span>{`)
      .replace(/([a-zA-Z\-]+)(\s*:)/g, (_, prop, colon) => `<span class="lre-tok-prop">${prop}</span>${colon}`)
      .replace(/(#(?:[0-9a-fA-F]{3,8})\b|\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|s|ms)?\b)/g, '<span class="lre-tok-number">$1</span>')
      .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="lre-tok-string">$1</span>');
  }

  function highlightSql(code) {
    return escapeHtml(code)
      .replace(/(--.*$)/gm, '<span class="lre-tok-comment">$1</span>')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="lre-tok-comment">$1</span>')
      .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="lre-tok-string">$1</span>')
      .replace(/\b([0-9]+(?:\.[0-9]+)?)\b/g, '<span class="lre-tok-number">$1</span>')
      .replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g, (m, word) => SQL_KEYWORDS.has(word.toLowerCase()) ? `<span class="lre-tok-keyword">${word}</span>` : m);
  }

  function highlightYaml(code) {
    return escapeHtml(code)
      .replace(/(#.*$)/gm, '<span class="lre-tok-comment">$1</span>')
      .replace(/^(\s*)([A-Za-z0-9_\-"']+)(\s*:)/gm, '$1<span class="lre-tok-attr">$2</span>$3')
      .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="lre-tok-string">$1</span>')
      .replace(/\b([0-9]+(?:\.[0-9]+)?)\b/g, '<span class="lre-tok-number">$1</span>');
  }

  function highlightMarkdown(code) {
    return escapeHtml(code)
      .replace(/^```.*$/gm, '<span class="lre-tok-comment">$&</span>')
      .replace(/^(#{1,6} .*?$)/gm, '<span class="lre-tok-heading">$1</span>')
      .replace(/(^> .*?$)/gm, '<span class="lre-tok-comment">$1</span>')
      .replace(/(`[^`]+`)/g, '<span class="lre-tok-string">$1</span>')
      .replace(/(\*\*[^*]+\*\*)/g, '<span class="lre-tok-strong">$1</span>')
      .replace(/(\*[^*]+\*)/g, '<span class="lre-tok-emph">$1</span>');
  }

  function highlightDiff(code) {
    return escapeHtml(code)
      .replace(/^(\+.*)$/gm, '<span class="lre-tok-string">$1</span>')
      .replace(/^(\-.*)$/gm, '<span class="lre-tok-comment">$1</span>')
      .replace(/^(@@.*@@)$/gm, '<span class="lre-tok-keyword">$1</span>');
  }

  function highlightCode(code, lang) {
    const normalized = normalizeLang(lang);
    switch (normalized) {
      case 'javascript':
      case 'typescript':
      case 'java':
      case 'c':
      case 'cpp':
      case 'csharp':
      case 'go':
      case 'rust':
      case 'php':
      case 'ruby':
      case 'swift':
      case 'kotlin':
        return highlightJsLike(code);
      case 'python':
        return highlightPython(code);
      case 'bash':
        return highlightBash(code);
      case 'json':
        return highlightJSON(code);
      case 'html':
      case 'xml':
        return highlightHtmlLike(code);
      case 'css':
        return highlightCss(code);
      case 'sql':
        return highlightSql(code);
      case 'yaml':
        return highlightYaml(code);
      case 'markdown':
        return highlightMarkdown(code);
      case 'diff':
        return highlightDiff(code);
      default:
        return escapeHtml(code);
    }
  }

  function ensureMathJaxReady() {
    return new Promise((resolve) => {
      const ready = () => {
        const mj = window.MathJax;
        if (mj && typeof mj.tex2svgPromise === 'function') {
          if (mj.startup && mj.startup.promise && typeof mj.startup.promise.then === 'function') {
            mj.startup.promise.then(() => resolve(mj)).catch(() => resolve(mj));
          } else {
            resolve(mj);
          }
          return true;
        }
        return false;
      };
      if (ready()) return;
      let attempts = 0;
      const timer = setInterval(() => {
        attempts += 1;
        if (ready() || attempts > 240) {
          clearInterval(timer);
          resolve(window.MathJax || null);
        }
      }, 25);
    });
  }

  function dataUrlSizeMB(dataUrl) {
    return (new Blob([String(dataUrl || '')]).size / (1024 * 1024));
  }

  async function compressImageFile(file) {
    const imageBitmapSupported = typeof createImageBitmap === 'function';
    let bitmap = null;
    let img = null;
    try {
      if (imageBitmapSupported) {
        bitmap = await createImageBitmap(file);
      } else {
        img = await new Promise((resolve, reject) => {
          const objectUrl = URL.createObjectURL(file);
          const image = new Image();
          image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
          };
          image.onerror = (error) => {
            URL.revokeObjectURL(objectUrl);
            reject(error);
          };
          image.src = objectUrl;
        });
      }
      const width = bitmap ? bitmap.width : img.naturalWidth;
      const height = bitmap ? bitmap.height : img.naturalHeight;
      const ratio = Math.min(1, MAX_IMAGE_SIDE / Math.max(width, height));
      const targetW = Math.max(1, Math.round(width * ratio));
      const targetH = Math.max(1, Math.round(height * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(bitmap || img, 0, 0, targetW, targetH);
      let quality = IMAGE_QUALITY;
      let dataUrl = canvas.toDataURL('image/webp', quality);
      while (dataUrl.length > 850000 && quality > 0.45) {
        quality -= 0.07;
        dataUrl = canvas.toDataURL('image/webp', quality);
      }
      return { dataUrl, width: targetW, height: targetH };
    } finally {
      if (bitmap && bitmap.close) bitmap.close();
    }
  }

  class LocalRichEditor {
    constructor(root) {
      this.root = root;
      this.toolbar = root.querySelector('#lreToolbar');
      this.editor = root.querySelector('#lreEditor');
      this.docTitle = root.querySelector('#lreDocTitle');
      this.searchbar = root.querySelector('#lreSearchbar');
      this.searchInput = root.querySelector('#lreSearchInput');
      this.replaceInput = root.querySelector('#lreReplaceInput');
      this.searchCount = root.querySelector('#lreSearchCount');
      this.sourcePanel = root.querySelector('#lreSourcePanel');
      this.sourceText = root.querySelector('#lreMarkdownSource');
      this.sourcePreview = root.querySelector('#lreMarkdownPreview');
      this.editorShell = root.querySelector('#lreEditorShell');
      this.mainWrap = root.querySelector('#lreMainWrap');
      this.outlinePanel = root.querySelector('#lreOutlinePanel');
      this.outlineList = root.querySelector('#lreOutlineList');
      this.versionList = root.querySelector('#lreVersionList');
      this.inspectorPanel = root.querySelector('#lreInspectorPanel');
      this.inspectorHint = root.querySelector('#lreInspectorHint');
      this.imageInspector = root.querySelector('#lreImageInspector');
      this.imageCaption = root.querySelector('#lreImageCaption');
      this.imageAlt = root.querySelector('#lreImageAlt');
      this.imageWidth = root.querySelector('#lreImageWidth');
      this.imageWidthLabel = root.querySelector('#lreImageWidthLabel');
      this.tableInspector = root.querySelector('#lreTableInspector');
      this.tableInfo = root.querySelector('#lreTableInfo');
      this.mathInspector = root.querySelector('#lreMathInspector');
      this.mathText = root.querySelector('#lreMathText');
      this.codeInspector = root.querySelector('#lreCodeInspector');
      this.codeLanguageSelect = root.querySelector('#lreCodeLanguageSelect');
      this.codeInfo = root.querySelector('#lreCodeInfo');
      this.commentList = root.querySelector('#lreCommentList');
      this.statusDirty = root.querySelector('#lreStatusDirty');
      this.statusSaved = root.querySelector('#lreStatusSaved');
      this.statusWords = root.querySelector('#lreStatusWords');
      this.statusChars = root.querySelector('#lreStatusChars');
      this.statusImages = root.querySelector('#lreStatusImages');
      this.statusSize = root.querySelector('#lreStatusSize');
      this.bubble = root.querySelector('#lreBubbleToolbar');
      this.slashMenu = root.querySelector('#lreSlashMenu');
      this.importInput = root.querySelector('#lreImportInput');
      this.imageInput = root.querySelector('#lreImageInput');
      this.codeDialog = root.querySelector('#lreCodeDialog');
      this.codeDialogLang = root.querySelector('#lreCodeDialogLang');
      this.codeDialogText = root.querySelector('#lreCodeDialogText');
      this.mathDialog = root.querySelector('#lreMathDialog');
      this.mathDialogDisplay = root.querySelector('#lreMathDialogDisplay');
      this.mathDialogText = root.querySelector('#lreMathDialogText');
      this.colorPopover = root.querySelector('#lreColorPopover');
      this.colorPopoverTitle = root.querySelector('#lreColorPopoverTitle');
      this.swatchGrid = root.querySelector('#lreSwatchGrid');
      this.colorPicker = root.querySelector('#lreColorPicker');
      this.savedRange = null;
      this.selectedNode = null;
      this.editingCodeNode = null;
      this.editingMathNode = null;
      this.activeColorMode = 'foreColor';
      this.searchHits = [];
      this.searchIndex = -1;
      this.comments = [];
      this.state = {
        dark: false,
        sourceOpen: false,
        split: false,
        outlineOpen: false,
        inspectorPinned: false,
        dirty: false,
        lastSavedAt: null
      };
      this.autosave = debounce(() => this.saveState(), AUTOSAVE_DELAY);
      this.slashHideTimer = null;
    }

    init() {
      this.renderColorSwatches();
      this.bindEvents();
      this.loadState();
      this.updateLayout();
      this.updateOutline();
      this.updateSnapshots();
      this.updateCommentList();
      this.updateSourceView();
      this.updateStatus();
      this.renderAllMath();
      this.renderAllCodeBlocks();
    }

    bindEvents() {
      this.toolbar.addEventListener('mousedown', (event) => {
        if (event.target.closest('button')) {
          this.saveSelection();
          event.preventDefault();
        }
      });
      this.toolbar.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        this.handleAction(button.dataset.action, button);
      });

      this.bubble.addEventListener('mousedown', (event) => {
        if (event.target.closest('button')) event.preventDefault();
      });
      this.bubble.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        this.handleAction(button.dataset.action, button);
      });

      this.root.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (button && !this.toolbar.contains(button) && !this.bubble.contains(button)) {
          this.handleAction(button.dataset.action, button);
        }
        const close = event.target.closest('[data-close-dialog]');
        if (close) {
          const dialog = this.root.querySelector(`#${close.dataset.closeDialog}`);
          if (dialog) dialog.close();
        }
      });

      this.docTitle.addEventListener('input', () => this.markDirty());
      this.sourceText.addEventListener('input', () => this.updateMarkdownPreview());
      this.searchInput.addEventListener('input', () => this.refreshSearch());
      this.replaceInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') this.replaceCurrent(); });
      this.importInput.addEventListener('change', () => {
        const file = this.importInput.files && this.importInput.files[0];
        if (file) this.importFile(file);
        this.importInput.value = '';
      });
      this.imageInput.addEventListener('change', async () => {
        const file = this.imageInput.files && this.imageInput.files[0];
        if (file) await this.insertImageFile(file);
        this.imageInput.value = '';
      });

      this.editor.addEventListener('input', () => {
        this.normalizeInlineCode();
        this.markDirty();
        this.updateOutline();
        this.updateStatus();
        this.updateSourceView();
      });
      this.editor.addEventListener('keydown', (event) => this.handleEditorKeydown(event));
      this.editor.addEventListener('keyup', () => this.handleSlashMenu());
      this.editor.addEventListener('mouseup', () => this.updateFloatingToolbar());
      this.editor.addEventListener('paste', (event) => this.handlePaste(event));
      this.editor.addEventListener('drop', (event) => this.handleDrop(event));
      this.editor.addEventListener('dragover', (event) => event.preventDefault());
      this.editor.addEventListener('click', (event) => this.handleEditorClick(event));
      this.editor.addEventListener('dblclick', (event) => this.handleEditorDoubleClick(event));

      document.addEventListener('selectionchange', () => {
        this.saveSelection();
        this.updateFloatingToolbar();
        this.updateSelectedContextFromSelection();
      });

      this.imageCaption.addEventListener('input', () => {
        const node = this.getSelectedImageNode();
        if (!node) return;
        const caption = node.querySelector('figcaption');
        if (caption) caption.textContent = this.imageCaption.value.trim();
        this.markDirty();
      });
      this.imageAlt.addEventListener('input', () => {
        const node = this.getSelectedImageNode();
        const image = node && node.querySelector('img');
        if (!image) return;
        image.alt = this.imageAlt.value.trim();
        this.markDirty();
      });
      this.imageWidth.addEventListener('input', () => {
        const node = this.getSelectedImageNode();
        const image = node && node.querySelector('img');
        if (!image) return;
        image.style.width = `${this.imageWidth.value}%`;
        this.imageWidthLabel.textContent = `${this.imageWidth.value}%`;
        this.markDirty();
      });

      this.codeLanguageSelect.addEventListener('change', () => {
        const node = this.getSelectedCodeNode();
        if (!node) return;
        node.dataset.language = normalizeLang(this.codeLanguageSelect.value);
        this.renderCodeNode(node);
        this.populateCodeInspector(node);
        this.markDirty();
      });
      this.mathText.addEventListener('input', () => {
        const node = this.getSelectedMathNode();
        if (!node) return;
        node.dataset.tex = this.mathText.value;
        this.renderMathNode(node);
        this.markDirty();
      });

      this.swatchGrid.addEventListener('click', (event) => {
        const sw = event.target.closest('.lre-swatch');
        if (!sw) return;
        this.applyColor(sw.dataset.color);
      });
      this.colorPicker.addEventListener('input', () => this.applyColor(this.colorPicker.value));
      document.addEventListener('click', (event) => {
        if (!this.colorPopover.classList.contains('is-open')) return;
        if (this.colorPopover.contains(event.target)) return;
        if (event.target.closest('[data-action="text-color"], [data-action="bg-color"]')) return;
        this.closeColorPopover();
      });

      this.slashMenu.addEventListener('click', (event) => {
        const item = event.target.closest('.lre-slash-item');
        if (!item) return;
        this.applySlashCommand(item.dataset.command);
      });
    }

    renderColorSwatches() {
      this.swatchGrid.innerHTML = COLOR_PRESETS.map((color) => `<button type="button" class="lre-swatch" data-color="${color}" title="${color}" style="background:${color}"></button>`).join('');
    }

    saveSelection() {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (!this.editor.contains(range.commonAncestorContainer)) return;
      this.savedRange = range.cloneRange();
    }

    restoreSelection() {
      if (!this.savedRange) {
        this.editor.focus({ preventScroll: true });
        return;
      }
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(this.savedRange);
      this.editor.focus({ preventScroll: true });
    }

    handleAction(action, button) {
      switch (action) {
        case 'new-doc': this.newDocument(); break;
        case 'import-file': this.importInput.click(); break;
        case 'export-md': this.exportMarkdown(); break;
        case 'export-html': this.exportHTML(); break;
        case 'export-json': this.exportJSON(); break;
        case 'snapshot': this.snapshot(); break;
        case 'undo': this.restoreSelection(); document.execCommand('undo'); this.markDirty(); break;
        case 'redo': this.restoreSelection(); document.execCommand('redo'); this.markDirty(); break;
        case 'bold': this.execSimple('bold'); break;
        case 'italic': this.execSimple('italic'); break;
        case 'underline': this.execSimple('underline'); break;
        case 'strike': this.execSimple('strikeThrough'); break;
        case 'inline-code': this.wrapInlineCode(); break;
        case 'clear-format': this.execSimple('removeFormat'); break;
        case 'paragraph': this.formatBlock('p'); break;
        case 'h1': this.formatBlock('h1'); break;
        case 'h2': this.formatBlock('h2'); break;
        case 'h3': this.formatBlock('h3'); break;
        case 'quote': this.formatBlock('blockquote'); break;
        case 'bullet-list': this.execSimple('insertUnorderedList'); break;
        case 'ordered-list': this.execSimple('insertOrderedList'); break;
        case 'check-list': this.insertChecklist(); break;
        case 'link': this.insertLink(); break;
        case 'comment': this.addComment(); break;
        case 'text-color': this.openColorPopover(button, 'foreColor', 'Text color'); break;
        case 'bg-color': this.openColorPopover(button, 'hiliteColor', 'Background color'); break;
        case 'table': this.insertTablePrompt(); break;
        case 'image': this.imageInput.click(); break;
        case 'code-block': this.openCodeDialog(); break;
        case 'inline-math': this.openMathDialog('inline'); break;
        case 'block-math': this.openMathDialog('block'); break;
        case 'hr': this.insertHTML('<hr>'); break;
        case 'toggle-source': this.toggleSourcePanel(); break;
        case 'toggle-split': this.toggleSplitView(); break;
        case 'toggle-search': this.toggleSearch(); break;
        case 'toggle-outline': this.state.outlineOpen = !this.state.outlineOpen; this.updateLayout(); break;
        case 'toggle-inspector': this.state.inspectorPinned = !this.state.inspectorPinned; this.updateLayout(); break;
        case 'toggle-dark': this.toggleDarkMode(); break;
        case 'search-next': this.findNext(); break;
        case 'search-prev': this.findPrev(); break;
        case 'replace-current': this.replaceCurrent(); break;
        case 'replace-all': this.replaceAll(); break;
        case 'save-code-dialog': this.saveCodeDialog(); break;
        case 'save-math-dialog': this.saveMathDialog(); break;
        case 'image-align-left': this.setImageAlign('left'); break;
        case 'image-align-center': this.setImageAlign('center'); break;
        case 'image-align-right': this.setImageAlign('right'); break;
        case 'table-add-row': this.tableAddRow(); break;
        case 'table-add-col': this.tableAddCol(); break;
        case 'table-del-row': this.tableDeleteRow(); break;
        case 'table-del-col': this.tableDeleteCol(); break;
        case 'table-remove': this.deleteSelectedTable(); break;
        case 'edit-math': this.openMathDialogForSelected(); break;
        case 'edit-code': this.openCodeDialogForSelected(); break;
        case 'refresh-code': this.refreshSelectedCode(); break;
        case 'delete-node': this.deleteSelectedNode(); break;
        default:
          break;
      }
    }

    execSimple(command, value = null) {
      this.restoreSelection();
      document.execCommand(command, false, value);
      this.editor.focus({ preventScroll: true });
      this.normalizeInlineCode();
      this.markDirty();
      this.updateOutline();
      this.updateStatus();
      this.updateSourceView();
    }

    formatBlock(tagName) {
      this.restoreSelection();
      document.execCommand('formatBlock', false, `<${tagName.toUpperCase()}>`);
      this.markDirty();
      this.updateOutline();
      this.updateStatus();
      this.updateSourceView();
    }

    insertHTML(html) {
      this.restoreSelection();
      document.execCommand('insertHTML', false, html);
      this.markDirty();
      this.updateOutline();
      this.updateStatus();
      this.updateSourceView();
    }

    insertNode(node) {
      this.restoreSelection();
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) {
        this.editor.appendChild(node);
      } else {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(node);
        range.setStartAfter(node);
        range.setEndAfter(node);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      this.markDirty();
      this.updateOutline();
      this.updateStatus();
      this.updateSourceView();
    }

    normalizeInlineCode() {
      this.editor.querySelectorAll('code').forEach((code) => {
        if (code.closest('.lre-code-node')) return;
        code.classList.add('lre-inline-code');
      });
    }

    wrapInlineCode() {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || sel.isCollapsed) {
        this.insertHTML('<code class="lre-inline-code">code</code>');
        return;
      }
      const range = sel.getRangeAt(0);
      if (!this.editor.contains(range.commonAncestorContainer)) return;
      const code = document.createElement('code');
      code.className = 'lre-inline-code';
      try {
        range.surroundContents(code);
      } catch (error) {
        const fragment = range.extractContents();
        code.appendChild(fragment);
        range.insertNode(code);
      }
      this.markDirty();
      this.updateSourceView();
    }

    insertChecklist() {
      this.restoreSelection();
      document.execCommand('insertUnorderedList');
      const list = this.closestBlock('UL');
      if (list) list.dataset.checklist = 'true';
      this.markDirty();
      this.updateSourceView();
    }

    closestBlock(tag) {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return null;
      let node = sel.getRangeAt(0).startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
      return node && node.closest ? node.closest(tag) : null;
    }

    insertLink() {
      this.restoreSelection();
      const sel = window.getSelection();
      const currentText = sel && sel.rangeCount ? sel.toString() : '';
      const url = window.prompt('URL', 'https://');
      if (!url) return;
      if (currentText) {
        document.execCommand('createLink', false, url);
      } else {
        const label = window.prompt('Link text', url) || url;
        this.insertHTML(`<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`);
      }
      this.markDirty();
      this.updateSourceView();
    }

    addComment() {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || sel.isCollapsed) {
        window.alert('Select some text first.');
        return;
      }
      const text = sel.toString();
      const note = window.prompt('Comment', text.slice(0, 60));
      if (note == null) return;
      const id = uid('comment');
      const range = sel.getRangeAt(0);
      const span = document.createElement('span');
      span.className = 'lre-comment-mark';
      span.dataset.commentId = id;
      try {
        range.surroundContents(span);
      } catch (error) {
        const fragment = range.extractContents();
        span.appendChild(fragment);
        range.insertNode(span);
      }
      this.comments.push({ id, note, text, createdAt: new Date().toISOString() });
      this.updateCommentList();
      this.markDirty();
    }

    openColorPopover(button, mode, title) {
      this.activeColorMode = mode;
      this.colorPopoverTitle.textContent = title;
      const rect = button.getBoundingClientRect();
      this.colorPopover.style.left = `${Math.max(10, rect.left)}px`;
      this.colorPopover.style.top = `${rect.bottom + 8}px`;
      this.colorPopover.classList.add('is-open');
    }

    closeColorPopover() {
      this.colorPopover.classList.remove('is-open');
    }

    applyColor(color) {
      this.restoreSelection();
      document.execCommand(this.activeColorMode, false, color);
      this.closeColorPopover();
      this.markDirty();
      this.updateSourceView();
    }

    insertTablePrompt() {
      const rows = Math.max(1, parseInt(window.prompt('Rows', '3') || '3', 10) || 3);
      const cols = Math.max(1, parseInt(window.prompt('Columns', '3') || '3', 10) || 3);
      const table = this.createTable(rows, cols);
      this.insertNode(table);
      this.selectNode(table);
    }

    createTable(rows, cols) {
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      const tbody = document.createElement('tbody');
      const headRow = document.createElement('tr');
      for (let c = 0; c < cols; c += 1) {
        const th = document.createElement('th');
        th.contentEditable = 'true';
        th.textContent = `Header ${c + 1}`;
        headRow.appendChild(th);
      }
      thead.appendChild(headRow);
      for (let r = 0; r < rows - 1; r += 1) {
        const tr = document.createElement('tr');
        for (let c = 0; c < cols; c += 1) {
          const td = document.createElement('td');
          td.contentEditable = 'true';
          td.textContent = `Cell ${r + 1}-${c + 1}`;
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(thead);
      table.appendChild(tbody);
      return table;
    }

    async insertImageFile(file) {
      const { dataUrl, width } = await compressImageFile(file);
      const figure = document.createElement('figure');
      figure.className = 'lre-image-node align-center';
      figure.contentEditable = 'false';
      figure.dataset.type = 'image';
      figure.innerHTML = `
        <div class="lre-node-head"><span class="lre-chip">image</span></div>
        <div class="lre-figure-wrap"><img src="${dataUrl}" alt="" style="width:100%"></div>
        <figcaption></figcaption>
      `;
      figure.dataset.originalWidth = String(width);
      this.insertNode(figure);
      this.selectNode(figure);
      this.updateStatus();
    }

    openCodeDialog(language = 'javascript', code = '') {
      this.editingCodeNode = null;
      this.codeDialogLang.value = normalizeLang(language);
      this.codeDialogText.value = code;
      this.codeDialog.showModal();
    }

    openCodeDialogForSelected() {
      const node = this.getSelectedCodeNode();
      if (!node) return;
      this.editingCodeNode = node;
      this.codeDialogLang.value = normalizeLang(node.dataset.language || 'javascript');
      this.codeDialogText.value = node.dataset.code || htmlToText(node.querySelector('code')?.innerHTML || '');
      this.codeDialog.showModal();
    }

    saveCodeDialog() {
      const lang = normalizeLang(this.codeDialogLang.value || 'plaintext');
      const code = this.codeDialogText.value || '';
      if (this.editingCodeNode) {
        this.editingCodeNode.dataset.language = lang;
        this.editingCodeNode.dataset.code = code;
        this.renderCodeNode(this.editingCodeNode);
        this.selectNode(this.editingCodeNode);
      } else {
        const node = this.createCodeNode(lang, code);
        this.insertNode(node);
        this.selectNode(node);
      }
      this.codeDialog.close();
      this.editingCodeNode = null;
      this.markDirty();
    }

    createCodeNode(lang, code) {
      const figure = document.createElement('figure');
      figure.className = 'lre-code-node';
      figure.contentEditable = 'false';
      figure.dataset.type = 'code';
      figure.dataset.language = normalizeLang(lang);
      figure.dataset.code = code;
      figure.innerHTML = `
        <div class="lre-code-head"><span class="lre-chip"></span></div>
        <pre><code></code></pre>
      `;
      this.renderCodeNode(figure);
      return figure;
    }

    renderCodeNode(node) {
      if (!node) return;
      const lang = normalizeLang(node.dataset.language || 'plaintext');
      const code = String(node.dataset.code || '');
      const chip = node.querySelector('.lre-chip');
      const codeEl = node.querySelector('code');
      if (chip) chip.textContent = lang;
      if (codeEl) codeEl.innerHTML = highlightCode(code, lang);
      this.populateCodeInspector(node);
    }

    refreshSelectedCode() {
      const node = this.getSelectedCodeNode();
      if (!node) return;
      this.renderCodeNode(node);
      this.markDirty();
    }

    openMathDialog(mode = 'inline', tex = '') {
      this.editingMathNode = null;
      this.mathDialogDisplay.value = mode;
      this.mathDialogText.value = tex;
      this.mathDialog.showModal();
    }

    openMathDialogForSelected() {
      const node = this.getSelectedMathNode();
      if (!node) return;
      this.editingMathNode = node;
      this.mathDialogDisplay.value = node.classList.contains('block') ? 'block' : 'inline';
      this.mathDialogText.value = node.dataset.tex || '';
      this.mathDialog.showModal();
    }

    saveMathDialog() {
      const display = this.mathDialogDisplay.value === 'block';
      const tex = this.mathDialogText.value.trim();
      if (!tex) {
        this.mathDialog.close();
        return;
      }
      if (this.editingMathNode) {
        this.editingMathNode.dataset.tex = tex;
        this.editingMathNode.dataset.display = String(display);
        this.editingMathNode.classList.toggle('block', display);
        this.editingMathNode.classList.toggle('inline', !display);
        this.renderMathNode(this.editingMathNode);
        this.selectNode(this.editingMathNode);
      } else {
        const node = document.createElement(display ? 'div' : 'span');
        node.className = `lre-math-node ${display ? 'block' : 'inline'}`;
        node.contentEditable = 'false';
        node.dataset.type = 'math';
        node.dataset.tex = tex;
        node.dataset.display = String(display);
        this.insertNode(node);
        this.renderMathNode(node);
        this.selectNode(node);
      }
      this.mathDialog.close();
      this.editingMathNode = null;
      this.markDirty();
    }

    renderAllMath() {
      this.editor.querySelectorAll('.lre-math-node').forEach((node) => this.renderMathNode(node));
      this.sourcePreview.querySelectorAll('.lre-math-node').forEach((node) => this.renderMathNode(node));
    }

    async renderMathNode(node) {
      if (!node) return;
      const tex = node.dataset.tex || '';
      const display = node.dataset.display === 'true' || node.classList.contains('block');
      node.classList.remove('is-error');
      const mj = await ensureMathJaxReady();
      if (!mj || typeof mj.tex2svgPromise !== 'function') {
        node.innerHTML = display ? `$$${escapeHtml(tex)}$$` : `$${escapeHtml(tex)}$`;
        node.classList.add('is-error');
        return;
      }
      try {
        const svgNode = await mj.tex2svgPromise(tex, { display });
        node.innerHTML = '';
        if (svgNode instanceof Element) node.appendChild(svgNode);
        else if (svgNode && typeof svgNode.outerHTML === 'string') node.innerHTML = svgNode.outerHTML;
      } catch (error) {
        node.classList.add('is-error');
        node.textContent = display ? `$$${tex}$$` : `$${tex}$`;
      }
      this.populateMathInspector(node);
    }

    handleEditorKeydown(event) {
      if (event.key === 'Tab') {
        document.execCommand('insertHTML', false, '&emsp;');
        event.preventDefault();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        this.saveState();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        this.handleAction('bold');
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        this.handleAction('link');
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        this.toggleSearch(true);
        return;
      }
      if (event.key === 'Escape') {
        this.hideSlashMenu(true);
      }
    }

    handlePaste(event) {
      const clipboard = event.clipboardData;
      if (!clipboard) return;
      const items = Array.from(clipboard.items || []);
      const imageItem = items.find((item) => item.type && item.type.startsWith('image/'));
      if (imageItem) {
        event.preventDefault();
        const file = imageItem.getAsFile();
        if (file) this.insertImageFile(file);
        return;
      }
      const html = clipboard.getData('text/html');
      if (html) {
        event.preventDefault();
        const sanitized = this.sanitizeHTML(html);
        this.insertHTML(sanitized);
        return;
      }
    }

    handleDrop(event) {
      event.preventDefault();
      const files = Array.from(event.dataTransfer?.files || []);
      const image = files.find((file) => file.type.startsWith('image/'));
      if (image) this.insertImageFile(image);
    }

    sanitizeHTML(html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      doc.querySelectorAll('script, style, iframe, object, embed').forEach((node) => node.remove());
      doc.querySelectorAll('*').forEach((el) => {
        [...el.attributes].forEach((attr) => {
          const name = attr.name.toLowerCase();
          if (name.startsWith('on') || name === 'style') el.removeAttribute(attr.name);
        });
      });
      return doc.body.innerHTML;
    }

    handleEditorClick(event) {
      const codeNode = event.target.closest('.lre-code-node');
      const imageNode = event.target.closest('.lre-image-node');
      const mathNode = event.target.closest('.lre-math-node');
      const table = event.target.closest('table');
      if (codeNode) { this.selectNode(codeNode); return; }
      if (imageNode) { this.selectNode(imageNode); return; }
      if (mathNode) { this.selectNode(mathNode); return; }
      if (table) { this.selectNode(table); return; }
      this.clearNodeSelection();
    }

    handleEditorDoubleClick(event) {
      const codeNode = event.target.closest('.lre-code-node');
      const mathNode = event.target.closest('.lre-math-node');
      if (codeNode) this.openCodeDialogForNode(codeNode);
      if (mathNode) this.openMathDialogForNode(mathNode);
    }

    openCodeDialogForNode(node) {
      this.selectNode(node);
      this.editingCodeNode = node;
      this.codeDialogLang.value = normalizeLang(node.dataset.language || 'plaintext');
      this.codeDialogText.value = node.dataset.code || '';
      this.codeDialog.showModal();
    }

    openMathDialogForNode(node) {
      this.selectNode(node);
      this.editingMathNode = node;
      this.mathDialogDisplay.value = node.classList.contains('block') ? 'block' : 'inline';
      this.mathDialogText.value = node.dataset.tex || '';
      this.mathDialog.showModal();
    }

    updateSelectedContextFromSelection() {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (!this.editor.contains(range.commonAncestorContainer)) {
        this.hideSlashMenu(true);
        this.hideBubbleToolbar();
        return;
      }
      let node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
      const image = node.closest && node.closest('.lre-image-node');
      const code = node.closest && node.closest('.lre-code-node');
      const math = node.closest && node.closest('.lre-math-node');
      const table = node.closest && node.closest('table');
      if (image || code || math || table) this.selectNode(image || code || math || table);
    }

    updateFloatingToolbar() {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || sel.isCollapsed) {
        this.hideBubbleToolbar();
        return;
      }
      const range = sel.getRangeAt(0);
      if (!this.editor.contains(range.commonAncestorContainer)) {
        this.hideBubbleToolbar();
        return;
      }
      const rect = range.getBoundingClientRect();
      if (!rect || (!rect.width && !rect.height)) {
        this.hideBubbleToolbar();
        return;
      }
      this.bubble.style.left = `${Math.max(10, rect.left + rect.width / 2 - this.bubble.offsetWidth / 2)}px`;
      this.bubble.style.top = `${rect.top - 54}px`;
      this.bubble.classList.add('is-open');
    }

    hideBubbleToolbar() {
      this.bubble.classList.remove('is-open');
    }

    handleSlashMenu() {
      const context = this.getSlashContext();
      if (!context) {
        this.hideSlashMenu(true);
        return;
      }
      const query = context.query.toLowerCase();
      const commands = this.getSlashCommands().filter((item) => item.name.includes(query) || item.label.toLowerCase().includes(query));
      this.showSlashMenu(commands, context.rect, query);
    }

    getSlashContext() {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || !sel.isCollapsed) return null;
      const range = sel.getRangeAt(0);
      if (!this.editor.contains(range.startContainer)) return null;
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) return null;
      const text = node.nodeValue || '';
      const before = text.slice(0, range.startOffset);
      const match = before.match(/(?:^|\s)\/([a-z0-9-]*)$/i);
      if (!match) return null;
      const rect = range.getBoundingClientRect();
      return { query: match[1] || '', textNode: node, from: before.length - match[0].length + match[0].indexOf('/'), to: before.length, rect };
    }

    getSlashCommands() {
      return [
        { name: 'h1', label: 'Heading 1', icon: 'h1', action: () => this.handleAction('h1') },
        { name: 'h2', label: 'Heading 2', icon: 'h2', action: () => this.handleAction('h2') },
        { name: 'h3', label: 'Heading 3', icon: 'h3', action: () => this.handleAction('h3') },
        { name: 'quote', label: 'Quote', icon: 'quote', action: () => this.handleAction('quote') },
        { name: 'bullet', label: 'Bulleted list', icon: 'bullet', action: () => this.handleAction('bullet-list') },
        { name: 'number', label: 'Numbered list', icon: 'ordered', action: () => this.handleAction('ordered-list') },
        { name: 'table', label: 'Table', icon: 'table', action: () => this.handleAction('table') },
        { name: 'image', label: 'Image', icon: 'image', action: () => this.handleAction('image') },
        { name: 'code', label: 'Code block', icon: 'codeBlock', action: () => this.handleAction('code-block') },
        { name: 'math', label: 'Formula', icon: 'inlineMath', action: () => this.handleAction('inline-math') },
        { name: 'hr', label: 'Horizontal rule', icon: 'hr', action: () => this.handleAction('hr') }
      ];
    }

    showSlashMenu(commands, rect, query) {
      clearTimeout(this.slashHideTimer);
      this.slashMenu.classList.remove('is-fading');
      if (!commands.length) {
        this.slashMenu.innerHTML = `<div class="lre-slash-item"><div>${ICONS.help.svg}</div><div><strong>No matching command</strong><small>Move the cursor or keep typing.</small></div></div>`;
        this.openSlashMenuAt(rect);
        this.slashHideTimer = setTimeout(() => this.hideSlashMenu(false), 5000);
        return;
      }
      this.slashMenu.innerHTML = commands.map((cmd) => `<div class="lre-slash-item" data-command="${cmd.name}">${ICONS[cmd.icon].svg}<div><strong>${escapeHtml(cmd.label)}</strong><small>/${escapeHtml(cmd.name)}</small></div></div>`).join('');
      this.openSlashMenuAt(rect);
    }

    openSlashMenuAt(rect) {
      const left = rect && rect.left ? rect.left : 80;
      const top = rect && rect.bottom ? rect.bottom : 120;
      this.slashMenu.style.left = `${Math.max(10, left)}px`;
      this.slashMenu.style.top = `${top + 8}px`;
      this.slashMenu.classList.add('is-open');
    }

    hideSlashMenu(immediate = false) {
      clearTimeout(this.slashHideTimer);
      if (immediate) {
        this.slashMenu.classList.remove('is-open', 'is-fading');
        return;
      }
      this.slashMenu.classList.add('is-fading');
      this.slashHideTimer = setTimeout(() => this.slashMenu.classList.remove('is-open', 'is-fading'), 450);
    }

    applySlashCommand(name) {
      const command = this.getSlashCommands().find((item) => item.name === name);
      const context = this.getSlashContext();
      if (context) {
        const range = document.createRange();
        range.setStart(context.textNode, context.from);
        range.setEnd(context.textNode, context.to);
        range.deleteContents();
      }
      this.hideSlashMenu(true);
      if (command) command.action();
    }

    toggleSourcePanel(force) {
      if (typeof force === 'boolean') this.state.sourceOpen = force;
      else this.state.sourceOpen = !this.state.sourceOpen;
      if (!this.state.sourceOpen) this.state.split = false;
      this.updateSourceView();
    }

    toggleSplitView() {
      if (this.state.split) {
        this.state.split = false;
        this.state.sourceOpen = false;
      } else {
        this.state.sourceOpen = true;
        this.state.split = true;
      }
      this.updateSourceView();
    }

    updateSourceView() {
      this.sourcePanel.classList.toggle('is-open', this.state.sourceOpen);
      this.editorShell.classList.toggle('is-split', this.state.split);
      if (this.state.sourceOpen) {
        this.sourceText.value = this.toMarkdown();
        this.updateMarkdownPreview();
      }
      this.updateToolbarActiveState();
    }

    updateMarkdownPreview() {
      this.sourcePreview.innerHTML = this.parseMarkdown(this.sourceText.value || '');
      this.sourcePreview.querySelectorAll('.lre-code-node').forEach((node) => this.renderCodeNode(node));
      this.sourcePreview.querySelectorAll('.lre-math-node').forEach((node) => this.renderMathNode(node));
    }

    toggleSearch(force) {
      const open = typeof force === 'boolean' ? force : !this.searchbar.classList.contains('is-open');
      this.searchbar.classList.toggle('is-open', open);
      if (open) this.searchInput.focus();
      else this.clearSearchHighlights();
    }

    refreshSearch() {
      this.clearSearchHighlights();
      const term = this.searchInput.value;
      if (!term) {
        this.searchCount.textContent = '0 matches';
        return;
      }
      const walker = createTextNodeWalker(this.editor);
      let node;
      while ((node = walker.nextNode())) {
        const text = node.nodeValue;
        const lower = text.toLowerCase();
        const target = term.toLowerCase();
        let index = 0;
        let currentNode = node;
        while ((index = lower.indexOf(target, index)) !== -1) {
          const range = document.createRange();
          range.setStart(currentNode, index);
          range.setEnd(currentNode, index + target.length);
          const mark = document.createElement('mark');
          mark.className = 'lre-search-hit';
          try { range.surroundContents(mark); } catch (error) { break; }
          this.searchHits.push(mark);
          currentNode = mark.nextSibling;
          if (!currentNode || currentNode.nodeType !== Node.TEXT_NODE) break;
          index = 0;
        }
      }
      this.searchIndex = this.searchHits.length ? 0 : -1;
      this.updateSearchCount();
      this.focusSearchHit();
    }

    clearSearchHighlights() {
      this.searchHits.forEach((mark) => {
        const parent = mark.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      });
      this.searchHits = [];
      this.searchIndex = -1;
      this.updateSearchCount();
    }

    updateSearchCount() {
      const total = this.searchHits.length;
      const current = total && this.searchIndex >= 0 ? this.searchIndex + 1 : 0;
      this.searchCount.textContent = `${current}/${total} matches`;
    }

    focusSearchHit() {
      const hit = this.searchHits[this.searchIndex];
      if (!hit) return;
      hit.scrollIntoView({ block: 'center', behavior: 'smooth' });
      this.searchHits.forEach((node, idx) => node.style.background = idx === this.searchIndex ? 'rgba(245, 158, 11, .45)' : 'rgba(250, 204, 21, .28)');
    }

    findNext() {
      if (!this.searchHits.length) this.refreshSearch();
      if (!this.searchHits.length) return;
      this.searchIndex = (this.searchIndex + 1) % this.searchHits.length;
      this.updateSearchCount();
      this.focusSearchHit();
    }

    findPrev() {
      if (!this.searchHits.length) this.refreshSearch();
      if (!this.searchHits.length) return;
      this.searchIndex = (this.searchIndex - 1 + this.searchHits.length) % this.searchHits.length;
      this.updateSearchCount();
      this.focusSearchHit();
    }

    replaceCurrent() {
      const hit = this.searchHits[this.searchIndex];
      if (!hit) return;
      hit.replaceWith(document.createTextNode(this.replaceInput.value));
      this.refreshSearch();
      this.markDirty();
    }

    replaceAll() {
      if (!this.searchInput.value) return;
      const target = this.searchInput.value;
      const replacement = this.replaceInput.value;
      const walker = createTextNodeWalker(this.editor);
      let node;
      while ((node = walker.nextNode())) {
        node.nodeValue = node.nodeValue.replaceAll(target, replacement);
      }
      this.refreshSearch();
      this.markDirty();
      this.updateSourceView();
    }

    selectNode(node) {
      this.clearNodeSelection();
      this.selectedNode = node;
      node.classList.add('is-selected');
      this.state.inspectorPinned = true;
      this.updateLayout();
      this.updateInspector();
    }

    clearNodeSelection() {
      if (this.selectedNode) this.selectedNode.classList.remove('is-selected');
      this.editor.querySelectorAll('table.is-selected').forEach((table) => table.classList.remove('is-selected'));
      this.selectedNode = null;
      this.updateInspector();
    }

    updateInspector() {
      const image = this.getSelectedImageNode();
      const table = this.getSelectedTable();
      const math = this.getSelectedMathNode();
      const code = this.getSelectedCodeNode();
      this.imageInspector.classList.toggle('is-open', !!image);
      this.tableInspector.classList.toggle('is-open', !!table);
      this.mathInspector.classList.toggle('is-open', !!math);
      this.codeInspector.classList.toggle('is-open', !!code);
      const visible = !!(image || table || math || code || this.comments.length || this.state.inspectorPinned);
      this.inspectorPanel.hidden = !visible && !this.state.inspectorPinned;
      if (image) this.populateImageInspector(image);
      if (table) this.populateTableInspector(table);
      if (math) this.populateMathInspector(math);
      if (code) this.populateCodeInspector(code);
      if (!image && !table && !math && !code) this.inspectorHint.textContent = 'Select an image, table, formula, or code block.';
    }

    getSelectedImageNode() { return this.selectedNode && this.selectedNode.classList.contains('lre-image-node') ? this.selectedNode : null; }
    getSelectedTable() { return this.selectedNode && this.selectedNode.tagName === 'TABLE' ? this.selectedNode : null; }
    getSelectedMathNode() { return this.selectedNode && this.selectedNode.classList.contains('lre-math-node') ? this.selectedNode : null; }
    getSelectedCodeNode() { return this.selectedNode && this.selectedNode.classList.contains('lre-code-node') ? this.selectedNode : null; }

    populateImageInspector(node) {
      const image = node.querySelector('img');
      const caption = node.querySelector('figcaption');
      if (!image) return;
      this.inspectorHint.textContent = 'Image selected.';
      this.imageCaption.value = caption ? caption.textContent : '';
      this.imageAlt.value = image.alt || '';
      const width = parseInt(image.style.width || '100', 10) || 100;
      this.imageWidth.value = String(width);
      this.imageWidthLabel.textContent = `${width}%`;
    }

    setImageAlign(align) {
      const node = this.getSelectedImageNode();
      if (!node) return;
      node.classList.remove('align-left', 'align-center', 'align-right');
      node.classList.add(`align-${align}`);
      this.markDirty();
    }

    populateTableInspector(table) {
      const rows = table.rows.length;
      const cols = rows ? table.rows[0].cells.length : 0;
      table.classList.add('is-selected');
      this.inspectorHint.textContent = 'Table selected.';
      this.tableInfo.textContent = `${rows} rows × ${cols} columns`;
    }

    getActiveCell() {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return null;
      let node = sel.getRangeAt(0).startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
      return node && node.closest ? node.closest('td,th') : null;
    }

    tableAddRow() {
      const table = this.getSelectedTable();
      if (!table) return;
      const cols = table.rows[0] ? table.rows[0].cells.length : 1;
      const tr = document.createElement('tr');
      for (let i = 0; i < cols; i += 1) {
        const td = document.createElement('td');
        td.contentEditable = 'true';
        td.textContent = 'New cell';
        tr.appendChild(td);
      }
      (table.tBodies[0] || table.appendChild(document.createElement('tbody'))).appendChild(tr);
      this.populateTableInspector(table);
      this.markDirty();
    }

    tableAddCol() {
      const table = this.getSelectedTable();
      if (!table) return;
      Array.from(table.rows).forEach((row, index) => {
        const cell = document.createElement(index === 0 ? 'th' : 'td');
        cell.contentEditable = 'true';
        cell.textContent = index === 0 ? `Header ${row.cells.length + 1}` : 'New cell';
        row.appendChild(cell);
      });
      this.populateTableInspector(table);
      this.markDirty();
    }

    tableDeleteRow() {
      const table = this.getSelectedTable();
      if (!table) return;
      const cell = this.getActiveCell();
      const row = cell ? cell.parentElement : table.rows[table.rows.length - 1];
      if (row && table.rows.length > 1) row.remove();
      this.populateTableInspector(table);
      this.markDirty();
    }

    tableDeleteCol() {
      const table = this.getSelectedTable();
      if (!table) return;
      const cell = this.getActiveCell();
      const index = cell ? cell.cellIndex : (table.rows[0]?.cells.length || 1) - 1;
      Array.from(table.rows).forEach((row) => { if (row.cells[index]) row.deleteCell(index); });
      this.populateTableInspector(table);
      this.markDirty();
    }

    deleteSelectedTable() {
      const table = this.getSelectedTable();
      if (!table) return;
      table.remove();
      this.clearNodeSelection();
      this.markDirty();
    }

    populateMathInspector(node) {
      this.inspectorHint.textContent = 'Formula selected.';
      this.mathText.value = node.dataset.tex || '';
    }

    populateCodeInspector(node) {
      this.inspectorHint.textContent = 'Code block selected.';
      const code = String(node.dataset.code || '');
      this.codeLanguageSelect.value = normalizeLang(node.dataset.language || 'plaintext');
      const lines = code.split(/\r?\n/).length;
      this.codeInfo.textContent = `${this.codeLanguageSelect.value} · ${lines} line${lines === 1 ? '' : 's'}`;
    }

    deleteSelectedNode() {
      if (!this.selectedNode) return;
      const target = this.selectedNode;
      this.clearNodeSelection();
      target.remove();
      this.markDirty();
      this.updateSourceView();
      this.updateStatus();
    }

    updateLayout() {
      this.outlinePanel.hidden = !this.state.outlineOpen;
      if (!this.selectedNode && !this.comments.length && !this.state.inspectorPinned) this.inspectorPanel.hidden = true;
      else this.inspectorPanel.hidden = false;
      this.mainWrap.classList.toggle('has-outline', this.state.outlineOpen);
      this.mainWrap.classList.toggle('has-inspector', !this.inspectorPanel.hidden);
      this.updateToolbarActiveState();
    }

    updateToolbarActiveState() {
      const set = (action, state) => {
        const button = this.root.querySelector(`[data-action="${action}"]`);
        if (button) button.classList.toggle('is-active', !!state);
      };
      set('toggle-source', this.state.sourceOpen);
      set('toggle-split', this.state.split);
      set('toggle-outline', this.state.outlineOpen);
      set('toggle-inspector', !this.inspectorPanel.hidden);
      set('toggle-dark', this.state.dark);
    }

    updateOutline() {
      const headings = Array.from(this.editor.querySelectorAll('h1, h2, h3'));
      this.outlineList.innerHTML = headings.map((heading, index) => {
        heading.id = heading.id || `lre-heading-${index + 1}`;
        const level = Number(heading.tagName.slice(1));
        return `<div class="lre-outline-item" style="padding-left:${(level - 1) * 14 + 12}px"><button type="button" data-outline-target="${heading.id}">${escapeHtml(heading.textContent || 'Untitled')}</button></div>`;
      }).join('');
      this.outlineList.querySelectorAll('button[data-outline-target]').forEach((button) => {
        button.addEventListener('click', () => {
          const target = this.editor.querySelector(`#${button.dataset.outlineTarget}`);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      });
    }

    updateCommentList() {
      this.commentList.innerHTML = this.comments.map((comment) => `<div class="lre-comment-item"><strong>${escapeHtml(comment.note)}</strong><div class="lre-note">${escapeHtml(comment.text)}</div></div>`).join('') || '<div class="lre-comment-item lre-note">No comments yet.</div>';
      this.updateInspector();
    }

    snapshot() {
      const snapshots = this.loadSnapshots();
      snapshots.unshift({
        id: uid('snap'),
        title: this.docTitle.value.trim() || 'Untitled document',
        html: this.editor.innerHTML,
        comments: this.comments,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots.slice(0, 25)));
      this.updateSnapshots();
      this.saveState();
    }

    loadSnapshots() {
      try {
        return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '[]');
      } catch (error) {
        return [];
      }
    }

    updateSnapshots() {
      const snapshots = this.loadSnapshots();
      this.versionList.innerHTML = snapshots.map((snap) => `<div class="lre-version-item"><button type="button" data-snapshot-id="${snap.id}"><strong>${escapeHtml(snap.title)}</strong><div class="lre-note">${new Date(snap.createdAt).toLocaleString()}</div></button></div>`).join('') || '<div class="lre-version-item lre-note">No snapshots yet.</div>';
      this.versionList.querySelectorAll('button[data-snapshot-id]').forEach((button) => {
        button.addEventListener('click', () => this.applySnapshot(button.dataset.snapshotId));
      });
    }

    applySnapshot(id) {
      const snap = this.loadSnapshots().find((item) => item.id === id);
      if (!snap) return;
      this.docTitle.value = snap.title || 'Untitled document';
      this.editor.innerHTML = snap.html || '';
      this.comments = Array.isArray(snap.comments) ? snap.comments : [];
      this.normalizeAfterImport();
      this.markDirty();
      this.saveState();
    }

    markDirty() {
      this.state.dirty = true;
      this.statusDirty.textContent = 'Unsaved changes';
      this.autosave();
    }

    saveState() {
      const payload = {
        title: this.docTitle.value,
        html: this.editor.innerHTML,
        comments: this.comments,
        dark: this.state.dark,
        sourceOpen: this.state.sourceOpen,
        split: this.state.split,
        outlineOpen: this.state.outlineOpen,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      this.state.dirty = false;
      this.state.lastSavedAt = payload.savedAt;
      this.statusDirty.textContent = 'Saved';
      this.statusSaved.textContent = `Saved ${new Date(payload.savedAt).toLocaleTimeString()}`;
      this.updateStatus();
    }

    loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return this.installDefaultDocument();
        const payload = JSON.parse(raw);
        this.docTitle.value = payload.title || 'Untitled document';
        this.editor.innerHTML = payload.html || '';
        this.comments = Array.isArray(payload.comments) ? payload.comments : [];
        this.state.dark = !!payload.dark;
        this.state.sourceOpen = !!payload.sourceOpen;
        this.state.split = !!payload.split;
        this.state.outlineOpen = !!payload.outlineOpen;
        this.state.lastSavedAt = payload.savedAt || null;
        if (this.state.dark) document.body.classList.add('lre-dark');
        if (this.state.lastSavedAt) this.statusSaved.textContent = `Saved ${new Date(this.state.lastSavedAt).toLocaleTimeString()}`;
        this.normalizeAfterImport();
      } catch (error) {
        console.error(error);
        this.installDefaultDocument();
      }
    }

    installDefaultDocument() {
      this.docTitle.value = 'Untitled document';
      this.editor.innerHTML = '';
      this.comments = [];
    }

    normalizeAfterImport() {
      this.normalizeInlineCode();
      this.editor.querySelectorAll('.lre-code-node').forEach((node) => this.renderCodeNode(node));
      this.editor.querySelectorAll('.lre-math-node').forEach((node) => this.renderMathNode(node));
      this.updateCommentList();
      this.updateOutline();
      this.updateSourceView();
      this.updateStatus();
      this.updateLayout();
    }

    updateStatus() {
      const text = this.editor.textContent || '';
      const words = (text.trim().match(/\S+/g) || []).length;
      const chars = text.length;
      const images = this.editor.querySelectorAll('img').length;
      const size = new Blob([this.editor.innerHTML]).size / (1024 * 1024);
      this.statusWords.textContent = `${words} words`;
      this.statusChars.textContent = `${chars} chars`;
      this.statusImages.textContent = `${images} images`;
      this.statusSize.textContent = `${size.toFixed(2)} MB`;
    }

    toggleDarkMode() {
      this.state.dark = !this.state.dark;
      document.body.classList.toggle('lre-dark', this.state.dark);
      this.updateToolbarActiveState();
      this.markDirty();
      this.renderAllCodeBlocks();
    }

    renderAllCodeBlocks() {
      this.editor.querySelectorAll('.lre-code-node').forEach((node) => this.renderCodeNode(node));
      this.sourcePreview.querySelectorAll('.lre-code-node').forEach((node) => this.renderCodeNode(node));
    }

    newDocument() {
      if (!window.confirm('Start a new document? Unsaved changes in the current editor may be lost.')) return;
      localStorage.removeItem(STORAGE_KEY);
      this.docTitle.value = 'Untitled document';
      this.editor.innerHTML = '';
      this.comments = [];
      this.state.sourceOpen = false;
      this.state.split = false;
      this.state.outlineOpen = false;
      this.state.inspectorPinned = false;
      this.clearNodeSelection();
      this.normalizeAfterImport();
      this.saveState();
    }

    exportHTML() {
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(this.docTitle.value)}</title></head><body>${this.editor.innerHTML}</body></html>`;
      downloadText(`${this.safeFilename()}.html`, html, 'text/html;charset=utf-8');
    }

    exportJSON() {
      const payload = {
        title: this.docTitle.value,
        html: this.editor.innerHTML,
        comments: this.comments,
        exportedAt: new Date().toISOString()
      };
      downloadText(`${this.safeFilename()}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
    }

    exportMarkdown() {
      downloadText(`${this.safeFilename()}.md`, this.toMarkdown(), 'text/markdown;charset=utf-8');
    }

    safeFilename() {
      return (this.docTitle.value || 'document').trim().replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80) || 'document';
    }

    async importFile(file) {
      const text = await file.text();
      const name = file.name.toLowerCase();
      if (name.endsWith('.json')) {
        const payload = JSON.parse(text);
        this.docTitle.value = payload.title || 'Imported document';
        this.editor.innerHTML = payload.html || '';
        this.comments = Array.isArray(payload.comments) ? payload.comments : [];
      } else if (name.endsWith('.html') || name.endsWith('.htm')) {
        this.docTitle.value = file.name.replace(/\.[^.]+$/, '');
        this.editor.innerHTML = this.sanitizeHTML(text);
      } else {
        this.docTitle.value = file.name.replace(/\.[^.]+$/, '');
        this.editor.innerHTML = this.parseMarkdown(text);
      }
      this.normalizeAfterImport();
      this.markDirty();
    }

    toMarkdown() {
      const walk = (node) => {
        if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
        if (node.nodeType !== Node.ELEMENT_NODE) return '';
        const el = node;
        if (el.classList.contains('lre-code-node')) {
          return `\n\n${'```'}${el.dataset.language || 'plaintext'}\n${el.dataset.code || ''}\n${'```'}\n\n`;
        }
        if (el.classList.contains('lre-math-node')) {
          const tex = el.dataset.tex || '';
          return el.classList.contains('block') ? `\n\n$$\n${tex}\n$$\n\n` : `$${tex}$`;
        }
        if (el.classList.contains('lre-image-node')) {
          const img = el.querySelector('img');
          const cap = el.querySelector('figcaption')?.textContent || '';
          return `\n\n![${img?.alt || cap}](${img?.src || ''})\n\n`;
        }
        switch (el.tagName) {
          case 'H1': return `\n# ${walkChildren(el)}\n`;
          case 'H2': return `\n## ${walkChildren(el)}\n`;
          case 'H3': return `\n### ${walkChildren(el)}\n`;
          case 'P': return `\n${walkChildren(el)}\n`;
          case 'STRONG': case 'B': return `**${walkChildren(el)}**`;
          case 'EM': case 'I': return `*${walkChildren(el)}*`;
          case 'U': return `<u>${walkChildren(el)}</u>`;
          case 'S': case 'STRIKE': return `~~${walkChildren(el)}~~`;
          case 'A': return `[${walkChildren(el)}](${el.getAttribute('href') || ''})`;
          case 'CODE': return `\`${walkChildren(el)}\``;
          case 'BLOCKQUOTE': return `\n> ${walkChildren(el)}\n`;
          case 'UL': {
            const check = el.dataset.checklist === 'true';
            return `\n${Array.from(el.children).map((li) => `${check ? '- [ ]' : '-'} ${walkChildren(li)}`).join('\n')}\n`;
          }
          case 'OL': return `\n${Array.from(el.children).map((li, i) => `${i + 1}. ${walkChildren(li)}`).join('\n')}\n`;
          case 'LI': return walkChildren(el);
          case 'HR': return '\n---\n';
          case 'TABLE': return this.tableToMarkdown(el);
          default: return walkChildren(el);
        }
      };
      const walkChildren = (el) => Array.from(el.childNodes).map(walk).join('');
      return Array.from(this.editor.childNodes).map(walk).join('').replace(/\n{3,}/g, '\n\n').trim() + '\n';
    }

    tableToMarkdown(table) {
      const rows = Array.from(table.rows).map((row) => Array.from(row.cells).map((cell) => (cell.textContent || '').trim()));
      if (!rows.length) return '';
      const header = `| ${rows[0].join(' | ')} |`;
      const divider = `| ${rows[0].map(() => '---').join(' | ')} |`;
      const body = rows.slice(1).map((row) => `| ${row.join(' | ')} |`).join('\n');
      return `\n${header}\n${divider}${body ? `\n${body}` : ''}\n`;
    }

    parseMarkdown(md) {
      const lines = String(md || '').replace(/\r/g, '').split('\n');
      let html = '';
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        if (!line.trim()) { i += 1; continue; }
        if (/^```/.test(line)) {
          const lang = normalizeLang(line.replace(/^```/, '').trim() || 'plaintext');
          const buffer = [];
          i += 1;
          while (i < lines.length && !/^```/.test(lines[i])) { buffer.push(lines[i]); i += 1; }
          i += 1;
          const node = this.createCodeNode(lang, buffer.join('\n'));
          html += node.outerHTML;
          continue;
        }
        if (/^\$\$$/.test(line.trim())) {
          const buffer = [];
          i += 1;
          while (i < lines.length && !/^\$\$$/.test(lines[i].trim())) { buffer.push(lines[i]); i += 1; }
          i += 1;
          html += `<div class="lre-math-node block" contenteditable="false" data-type="math" data-display="true" data-tex="${escapeHtml(buffer.join('\n'))}"></div>`;
          continue;
        }
        if (/^#{1,3}\s/.test(line)) {
          const level = line.match(/^#+/)[0].length;
          html += `<h${level}>${this.parseInlineMarkdown(line.replace(/^#{1,3}\s*/, ''))}</h${level}>`;
          i += 1;
          continue;
        }
        if (/^>\s/.test(line)) {
          html += `<blockquote>${this.parseInlineMarkdown(line.replace(/^>\s*/, ''))}</blockquote>`;
          i += 1;
          continue;
        }
        if (/^---+$/.test(line.trim())) {
          html += '<hr>';
          i += 1;
          continue;
        }
        if (/^\|/.test(line) && /^\|/.test(lines[i + 1] || '') && /---/.test(lines[i + 1] || '')) {
          const head = line.split('|').slice(1, -1).map((cell) => cell.trim());
          i += 2;
          const body = [];
          while (i < lines.length && /^\|/.test(lines[i])) {
            body.push(lines[i].split('|').slice(1, -1).map((cell) => cell.trim()));
            i += 1;
          }
          html += '<table><thead><tr>' + head.map((cell) => `<th contenteditable="true">${this.parseInlineMarkdown(cell)}</th>`).join('') + '</tr></thead><tbody>' + body.map((row) => `<tr>${row.map((cell) => `<td contenteditable="true">${this.parseInlineMarkdown(cell)}</td>`).join('')}</tr>`).join('') + '</tbody></table>';
          continue;
        }
        if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) {
          const ordered = /^\d+\.\s/.test(line);
          const items = [];
          while (i < lines.length && (ordered ? /^\d+\.\s/.test(lines[i]) : /^[-*]\s/.test(lines[i]))) {
            items.push(lines[i].replace(ordered ? /^\d+\.\s*/ : /^[-*]\s*/, ''));
            i += 1;
          }
          html += ordered
            ? `<ol>${items.map((item) => `<li>${this.parseInlineMarkdown(item)}</li>`).join('')}</ol>`
            : `<ul>${items.map((item) => `<li>${this.parseInlineMarkdown(item)}</li>`).join('')}</ul>`;
          continue;
        }
        html += `<p>${this.parseInlineMarkdown(line)}</p>`;
        i += 1;
      }
      return html || '<p></p>';
    }

    parseInlineMarkdown(text) {
      return escapeHtml(text)
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure class="lre-image-node align-center" contenteditable="false" data-type="image"><div class="lre-node-head"><span class="lre-chip">image</span></div><div class="lre-figure-wrap"><img src="$2" alt="$1" style="width:100%"></div><figcaption>$1</figcaption></figure>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/~~([^~]+)~~/g, '<s>$1</s>')
        .replace(/`([^`]+)`/g, '<code class="lre-inline-code">$1</code>')
        .replace(/\$([^$]+)\$/g, '<span class="lre-math-node inline" contenteditable="false" data-type="math" data-display="false" data-tex="$1"></span>');
    }
  }

  function cloneTemplateRoot() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = TEMPLATE.trim();
    return wrapper.firstElementChild || null;
  }

  function hasVisibleAdvancedRibbonGroups(editor) {
    if (!editor || !editor.root) return false;
    return Array.from(editor.root.querySelectorAll('.lre-group[data-ribbon-group="advanced"]')).some(function(group){
      return group.getAttribute('data-embed-empty') !== 'true' && group.hidden !== true;
    });
  }

  function syncRibbonControls(editor) {
    const button = editor && editor.root ? editor.root.querySelector('[data-ribbon-toggle]') : null;
    if (!button) return;
    const buttonGroup = button.closest('.lre-group');
    const hasAdvanced = hasVisibleAdvancedRibbonGroups(editor);
    if (buttonGroup) buttonGroup.hidden = !hasAdvanced;
    const expanded = hasAdvanced && !!(editor.state && editor.state.ribbonExpanded);
    editor.root.classList.toggle('lre-ribbon-expanded', expanded);
    button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    button.setAttribute('title', expanded ? 'Hide extra tools' : 'Show extra tools');
    button.setAttribute('aria-label', expanded ? 'Hide extra tools' : 'Show extra tools');
    const label = button.querySelector('.lre-ribbon-toggle-label');
    if (label) label.textContent = expanded ? 'Hide tools' : 'Show tools';
  }

  function ensureRibbonControls(editor, options) {
    if (!editor || !editor.root) return;
    editor.state = editor.state || {};
    if (typeof editor.state.ribbonExpanded !== 'boolean') {
      editor.state.ribbonExpanded = !!(options && options.ribbonExpanded);
    }
    const button = editor.root.querySelector('[data-ribbon-toggle]');
    if (!button) return;
    if (!editor.__ribbonControlsInstalled) {
      button.addEventListener('click', function(event){
        event.preventDefault();
        event.stopPropagation();
        editor.state.ribbonExpanded = !editor.state.ribbonExpanded;
        syncRibbonControls(editor);
        if (typeof editor.updateLayout === 'function') editor.updateLayout();
      });
      editor.__ribbonControlsInstalled = true;
    }
    syncRibbonControls(editor);
  }

  function resolveMountTarget(options) {
    const target = options && (options.target || options.mount || options.host || options.container);
    if (!target) return null;
    if (typeof target === 'string') return document.querySelector(target);
    return target && target.nodeType === Node.ELEMENT_NODE ? target : null;
  }

  function isEmbeddedMount(options) {
    if (!options) return false;
    if (options.persist === false) return true;
    return !!resolveMountTarget(options);
  }

  function disablePersistenceForEmbeddedMount(editor) {
    editor.autosave = function noopAutosave() {};
    editor.saveState = function embeddedSaveState() {
      this.state.dirty = false;
      this.state.lastSavedAt = null;
      if (this.statusDirty) this.statusDirty.textContent = 'Ready';
      if (this.statusSaved) this.statusSaved.textContent = 'Autosave off';
      this.updateStatus && this.updateStatus();
    };
    editor.loadState = function embeddedLoadState() {
      this.installDefaultDocument();
      this.state.dark = false;
      this.state.sourceOpen = false;
      this.state.split = false;
      this.state.outlineOpen = false;
      this.state.lastSavedAt = null;
      if (this.statusDirty) this.statusDirty.textContent = 'Ready';
      if (this.statusSaved) this.statusSaved.textContent = 'Autosave off';
      this.updateStatus && this.updateStatus();
    };
  }

  function applyMountOptions(editor, options) {
    const opts = options || {};
    if (typeof opts.title === 'string') {
      editor.docTitle.value = opts.title;
    }
    if (typeof opts.placeholder === 'string' && editor.editor) {
      editor.editor.setAttribute('data-placeholder', opts.placeholder);
    }
    if (typeof opts.html === 'string') {
      editor.editor.innerHTML = opts.html;
      editor.comments = Array.isArray(opts.comments) ? opts.comments.slice() : [];
      editor.normalizeAfterImport();
    } else if (typeof opts.markdown === 'string') {
      editor.editor.innerHTML = editor.parseMarkdown(opts.markdown);
      editor.comments = Array.isArray(opts.comments) ? opts.comments.slice() : [];
      editor.normalizeAfterImport();
    } else if (Array.isArray(opts.comments)) {
      editor.comments = opts.comments.slice();
      editor.updateCommentList();
    }
    if (opts.dark === true && !editor.state.dark) {
      editor.toggleDarkMode();
    } else if (opts.dark === false && editor.state.dark) {
      editor.toggleDarkMode();
    }
    editor.state.dirty = false;
    if (isEmbeddedMount(opts)) {
      if (editor.statusDirty) editor.statusDirty.textContent = 'Ready';
      if (editor.statusSaved) editor.statusSaved.textContent = 'Autosave off';
    }
    editor.updateOutline();
    editor.updateSourceView();
    editor.updateStatus();
  }

  function createEditorInstance(options) {
    const opts = options || {};
    const target = resolveMountTarget(opts);
    ensureStyle('lre-style', STYLE);
    window.LocalRichEditor = LocalRichEditor;

    let root = null;
    if (target) {
      root = cloneTemplateRoot();
      if (!root) throw new Error('Failed to create LocalRichEditor root.');
      if (root.id) root.id = uid('lreRoot');
      if (opts.replace !== false) target.innerHTML = '';
      target.appendChild(root);
    } else {
      root = document.getElementById('lreRoot');
      if (!root) {
        document.documentElement.lang = typeof opts.lang === 'string' && opts.lang.trim() ? opts.lang.trim() : 'en';
        document.body.insertAdjacentHTML('afterbegin', TEMPLATE);
        root = document.getElementById('lreRoot');
      }
    }

    if (!root) throw new Error('LocalRichEditor root was not found.');
    if (typeof opts.lang === 'string' && opts.lang.trim()) {
      root.setAttribute('lang', opts.lang.trim());
    }

    const editor = new LocalRichEditor(root);
    if (isEmbeddedMount(opts)) disablePersistenceForEmbeddedMount(editor);
    editor.init();
    applyMountOptions(editor, opts);
    ensureRibbonControls(editor, opts);

    editor.getHTML = function getHTML() { return this.editor.innerHTML; };
    editor.setHTML = function setHTML(html) {
      this.editor.innerHTML = String(html || '');
      this.normalizeAfterImport();
      this.state.dirty = false;
      this.updateStatus();
      if (typeof this.__hostMirrorNow === 'function') this.__hostMirrorNow(true);
    };
    editor.getMarkdown = function getMarkdown() { return this.toMarkdown(); };
    editor.setMarkdown = function setMarkdown(markdown) {
      this.editor.innerHTML = this.parseMarkdown(String(markdown || ''));
      this.normalizeAfterImport();
      this.state.dirty = false;
      this.updateStatus();
      if (typeof this.__hostMirrorNow === 'function') this.__hostMirrorNow(true);
    };
    editor.getTitle = function getTitle() { return this.docTitle.value; };
    editor.setTitle = function setTitle(title) {
      this.docTitle.value = String(title || '');
      this.updateStatus();
    };

    window.__localRichEditor = editor;
    window.localRichEditor = editor;
    try {
      window.dispatchEvent(new CustomEvent('local-rich-editor:ready', { detail: { editor } }));
    } catch (error) {}
    return editor;
  }

  function destroyEditorInstance(editor) {
    const instance = editor || window.localRichEditor || window.__localRichEditor;
    if (!instance || !instance.root) return false;
    try { instance.codeDialog && instance.codeDialog.close && instance.codeDialog.close(); } catch (error) {}
    try { instance.mathDialog && instance.mathDialog.close && instance.mathDialog.close(); } catch (error) {}
    try { instance.__hostDraftObserver && instance.__hostDraftObserver.disconnect && instance.__hostDraftObserver.disconnect(); } catch (error) {}
    const hostTextarea = instance.__hostTextarea || null;
    const rootParent = instance.root.parentNode;
    if (instance.root.parentNode) instance.root.parentNode.removeChild(instance.root);
    if (hostTextarea) {
      try { hostTextarea.dataset.solidEditorMounted = 'false'; } catch (error) {}
      try { delete hostTextarea.__solidEditorInstance; } catch (error) { hostTextarea.__solidEditorInstance = null; }
      try { hostTextarea.classList.remove('lre-host-textarea'); } catch (error) {}
      if (rootParent && rootParent.classList && rootParent.classList.contains('solid-embedded-editor-host') && !rootParent.childElementCount) {
        rootParent.remove();
      }
    }
    if (window.localRichEditor === instance) window.localRichEditor = null;
    if (window.__localRichEditor === instance) window.__localRichEditor = null;
    return true;
  }

  function boot() {
    return createEditorInstance({ persist: true });
  }

  window.LocalRichEditor = LocalRichEditor;
  window.mountLocalRichEditor = createEditorInstance;
  window.createLocalRichEditor = createEditorInstance;
  window.destroyLocalRichEditor = destroyEditorInstance;

  if (window.LOCAL_RICH_EDITOR_AUTOSTART !== false) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }
})();
/* Final hotfix: inspector/code highlight/table picker/icon cleanup */
(function(){
  'use strict';
  const HOTFIX_BUILD = '20260328-hotfix-15';

  function waitForEditor(cb){
    if (window.localRichEditor) return cb(window.localRichEditor);
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (window.localRichEditor) {
        clearInterval(timer);
        cb(window.localRichEditor);
      } else if (tries > 300) {
        clearInterval(timer);
      }
    }, 40);
  }

  function ensureStyle(id, cssText){
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = cssText;
    return style;
  }

  function esc(v){
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function svg(inner, viewBox='0 0 24 24', filled=false){
    const attrs = filled ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9"';
    return `<svg class="tool-icon" viewBox="${viewBox}" aria-hidden="true" ${attrs}>${inner}</svg>`;
  }

  function labelIcon(text, width=28, size=11.8){
    return `<svg class="tool-icon tool-icon-label" viewBox="0 0 ${width} 24" aria-hidden="true"><text x="${width/2}" y="15" text-anchor="middle" font-size="${size}" font-weight="700" font-family="Inter, Arial, sans-serif">${esc(text)}</text></svg>`;
  }

  const ICONS = {
    help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.9.8-1.7 1.3-1.7 2.7"/><path d="M12 17h.01"/>'),
    'new-doc': svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M12 18v-6"/><path d="M9 15h6"/>'),
    import: svg('<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z"/><path d="M12 9v6"/><path d="m9.5 12.5 2.5 2.5 2.5-2.5"/>'),
    'export-md': labelIcon('MD', 28, 13.4),
    'export-html': labelIcon('HTML', 42, 9.5),
    'export-json': labelIcon('JSON', 42, 9.5),
    undo: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h9a7 7 0 1 1 0 14h-2"/>'),
    redo: svg('<path d="m15 14 5-5-5-5"/><path d="M20 9h-9a7 7 0 1 0 0 14h2"/>'),
    'save-snapshot': svg('<path d="M5 4h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M7 4v6h8V4"/><path d="M8 18h8"/>'),
    bold: labelIcon('B', 24, 17),
    italic: labelIcon('I', 24, 17),
    underline: labelIcon('U', 24, 17),
    strike: labelIcon('S', 24, 17),
    'inline-code': svg('<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/><path d="m14 4-4 16"/>'),
    'clear-format': svg('<path d="m4 20 16-16"/><path d="m14 5 5 5"/><path d="M8 7l8 8"/><path d="M5 5h6"/><path d="M10 5v2"/>'),
    paragraph: labelIcon('P', 24, 17),
    h1: labelIcon('H1', 28, 13.2),
    h2: labelIcon('H2', 28, 13.2),
    h3: labelIcon('H3', 28, 13.2),
    blockquote: svg('<path d="M6 10h5v8H3v-6a7 7 0 0 1 7-7"/><path d="M17 10h4v8h-8v-6a7 7 0 0 1 7-7"/>'),
    'code-block': svg('<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/><path d="m14 4-4 16"/>'),
    ul: svg('<path d="M9 6h12"/><path d="M9 12h12"/><path d="M9 18h12"/><circle cx="4" cy="6" r="1.2"/><circle cx="4" cy="12" r="1.2"/><circle cx="4" cy="18" r="1.2"/>'),
    ol: svg('<path d="M10 6h11"/><path d="M10 12h11"/><path d="M10 18h11"/><path d="M4 6h1v4"/><path d="M3.5 18h3L4 15.5A1.6 1.6 0 0 0 6 13"/><path d="M4 12h1.5"/>'),
    task: svg('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 2.5 2.5L16 9"/>'),
    link: svg('<path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L10 4"/><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 1 0 7.07 7.07L14 20"/>'),
    comment: svg('<path d="M7 18l-4 3V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7z"/><path d="M8 9h8"/><path d="M8 13h5"/>'),
    'align-left': svg('<path d="M4 6h16"/><path d="M4 12h10"/><path d="M4 18h14"/>'),
    'align-center': svg('<path d="M4 6h16"/><path d="M7 12h10"/><path d="M5 18h14"/>'),
    'align-right': svg('<path d="M4 6h16"/><path d="M10 12h10"/><path d="M6 18h14"/>'),
    table: svg('<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 10h18"/><path d="M9 5v14"/><path d="M15 5v14"/>'),
    image: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m21 16-5.5-5.5L8 18"/>'),
    'latex-inline': labelIcon('Σ', 24, 18),
    'latex-block': labelIcon('∫', 24, 18.5),
    hr: svg('<path d="M4 12h16"/><path d="M12 8v8"/>'),
    'toggle-source': labelIcon('MD', 28, 13.4),
    'apply-source': svg('<path d="m5 12 4 4L19 6"/>'),
    'sync-source': svg('<path d="M20 11a8 8 0 0 0-14.9-4"/><path d="M4 5v5h5"/><path d="M4 13a8 8 0 0 0 14.9 4"/><path d="M20 19v-5h-5"/>'),
    'split-view': svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14"/>'),
    'search-panel': svg('<circle cx="11" cy="11" r="6"/><path d="m20 20-3.5-3.5"/>'),
    'toggle-dark': svg('<path d="M12 3a7 7 0 1 0 9 9 9 9 0 1 1-9-9z"/>'),
    'toggle-outline': svg('<path d="M4 6h5"/><path d="M4 12h5"/><path d="M4 18h5"/><path d="M12 5h8"/><path d="M12 11h8"/><path d="M12 17h8"/>'),
    'toggle-inspector': svg('<path d="M6 4v8"/><path d="M6 16v4"/><path d="M12 4v4"/><path d="M12 12v8"/><path d="M18 4v11"/><path d="M18 19v1"/><circle cx="6" cy="14" r="2"/><circle cx="12" cy="10" r="2"/><circle cx="18" cy="17" r="2"/>'),
    'search-prev': svg('<path d="m15 18-6-6 6-6"/>'),
    'search-next': svg('<path d="m9 6 6 6-6 6"/>'),
    'replace-current': svg('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'),
    'replace-all': svg('<path d="M4 7h10"/><path d="M4 12h16"/><path d="M4 17h10"/><path d="m14 6 6 6-6 6"/>'),
    'refresh-code-highlight': svg('<path d="M20 11a8 8 0 0 0-14.9-4"/><path d="M4 5v5h5"/><path d="M4 13a8 8 0 0 0 14.9 4"/><path d="M20 19v-5h-5"/>'),
    'align-image-left': svg('<path d="M4 5v14"/><rect x="7.5" y="6.5" width="11" height="11" rx="2"/><path d="m10.5 14 2.1-2.5 2 2.3 2-2.3 1.9 2.5"/>'),
    'align-image-center': svg('<path d="M12 4v16"/><rect x="6.5" y="6.5" width="11" height="11" rx="2"/><path d="m9.5 14 2.1-2.5 2 2.3 2-2.3 1.9 2.5"/>'),
    'align-image-right': svg('<path d="M20 5v14"/><rect x="5.5" y="6.5" width="11" height="11" rx="2"/><path d="m8.5 14 2.1-2.5 2 2.3 2-2.3 1.9 2.5"/>'),
    'table-add-row': svg('<rect x="4" y="5" width="12" height="14" rx="1.5"/><path d="M4 10h12"/><path d="M9 5v14"/><path d="M19 15v6"/><path d="M16 18h6"/>'),
    'table-add-col': svg('<rect x="4" y="5" width="12" height="14" rx="1.5"/><path d="M4 10h12"/><path d="M9 5v14"/><path d="M18 13v8"/><path d="M14 17h8"/>'),
    'table-del-row': svg('<rect x="4" y="5" width="12" height="14" rx="1.5"/><path d="M4 10h12"/><path d="M9 5v14"/><path d="M16 18h6"/>'),
    'table-del-col': svg('<rect x="4" y="5" width="12" height="14" rx="1.5"/><path d="M4 10h12"/><path d="M9 5v14"/><path d="M18 13v8"/>'),
    'table-remove': svg('<rect x="4" y="5" width="12" height="14" rx="1.5"/><path d="M4 10h12"/><path d="M9 5v14"/><path d="m17 8 5 8"/><path d="m22 8-5 8"/>'),
    'remove-selected-node': svg('<path d="M5 7h14"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M7 7l1 13a1 1 0 0 0 1 .9h6a1 1 0 0 0 1-.9L17 7"/>')
  };

  const PATCH_STYLE = `
    #app .topbar-right > #langPickerWrap,
    #app .topbar-right > #modeBadge { display:none !important; }
    #app .toolbar button,
    #app .topbar-right button,
    #app .floating-toolbar button,
    #app #searchPanel button,
    #app #tablePicker button,
    #app #nodeInspector button { position: relative; }
    #app .tool-icon { width: 18px; height: 18px; display: block; }
    #app .tool-icon-label { width: auto; height: 18px; }
    #app .toolbar button,
    #app .topbar-right button,
    #app .floating-toolbar button,
    #app #searchPanel button {
      display:inline-flex; align-items:center; justify-content:center;
      min-width: 34px; min-height: 34px; gap:0; padding: 8px;
    }
    #app .toolbar button > strong,
    #app .toolbar button > em,
    #app .toolbar button > u,
    #app .toolbar button > s,
    #app .toolbar button > code,
    #app .toolbar button > span:not(.sr-only):not(.tool-icon),
    #app .topbar-right button > span:not(.sr-only):not(.tool-icon),
    #app .floating-toolbar button > strong,
    #app .floating-toolbar button > em,
    #app .floating-toolbar button > u,
    #app .floating-toolbar button > span:not(.sr-only):not(.tool-icon),
    #app #searchPanel button > span:not(.sr-only):not(.tool-icon) { display:none !important; }
    #app .sr-only { position:absolute !important; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); border:0; }
    #app #inspectorPanel .panel-body > .section:not(#nodeInspector) { display:none !important; }
    #app #nodeInspector > p { display:none !important; }
    #app #nodeInspector > .section { display:none !important; }
    #app #nodeInspector > .section.active { display:grid !important; }
    #app #nodeInspector[hidden] { display:none !important; }
    #app #nodeInspector.is-visible { display:grid !important; gap:16px; }
    #app .inspector-align-row,
    #app .inspector-table-row { display:flex; flex-wrap:wrap; gap:8px; }
    #app .inspector-icon-btn { display:inline-flex; align-items:center; justify-content:center; min-width:38px; min-height:38px; padding:8px; }
    #app .inspector-icon-btn .tool-icon { width:18px; height:18px; }
    #app .inspector-icon-btn.is-active { background: var(--accent-soft); color: var(--accent); border-color: color-mix(in srgb, var(--accent) 42%, var(--border)); }
    #app .inspector-danger { color: var(--danger); }
    #app .code-block-shell { background: #f7fafc !important; border:1px solid #d9e2ec !important; }
    body.dark #app .code-block-shell { background:#0f172a !important; border-color:#23314f !important; }
    #app .code-block-shell code.code-syntax { display:block; white-space:pre; word-break:normal; color:#0f172a !important; background:transparent !important; }
    body.dark #app .code-block-shell code.code-syntax { color:#e5eefc !important; }
    #app .code-syntax .tok-key { color:#b42318; font-weight:600; }
    #app .code-syntax .tok-fn { color:#175cd3; }
    #app .code-syntax .tok-string { color:#067647; }
    #app .code-syntax .tok-number { color:#9a3412; }
    #app .code-syntax .tok-comment { color:#667085; font-style:italic; }
    #app .code-syntax .tok-attr { color:#7c3aed; }
    #app .code-syntax .tok-tag { color:#b42318; }
    #app .code-syntax .tok-type { color:#7c3aed; }
    #app .code-syntax .tok-op, #app .code-syntax .tok-punct { color:#334155; }
    body.dark #app .code-syntax .tok-key { color:#ff7b72; }
    body.dark #app .code-syntax .tok-fn { color:#79c0ff; }
    body.dark #app .code-syntax .tok-string { color:#a5d6a7; }
    body.dark #app .code-syntax .tok-number { color:#f2cc60; }
    body.dark #app .code-syntax .tok-comment { color:#93a4c3; }
    body.dark #app .code-syntax .tok-attr { color:#d2a8ff; }
    body.dark #app .code-syntax .tok-tag { color:#ff7b72; }
    body.dark #app .code-syntax .tok-type { color:#d2a8ff; }
    body.dark #app .code-syntax .tok-op, body.dark #app .code-syntax .tok-punct { color:#c9d1d9; }
    #app .table-picker {
      position: fixed; z-index: 120; width: 280px; padding: 14px; border-radius: 16px;
      border:1px solid var(--border); background:var(--paper); box-shadow: var(--shadow);
      display:grid; gap:12px;
    }
    #app .table-picker[hidden] { display:none !important; }
    #app .table-picker-grid { display:grid; grid-template-columns: repeat(8, 1fr); gap:2px; padding:2px; background:var(--paper-2); border-radius:10px; }
    #app .table-picker-cell {
      width: 28px; height: 22px; border:1px solid var(--border); background:var(--paper); border-radius:4px; padding:0; cursor:pointer;
    }
    #app .table-picker-cell.is-hot { background: var(--selection); border-color: var(--accent); }
    #app .table-picker-meta { text-align:center; font-weight:700; }
    #app .table-picker-manual { display:grid; grid-template-columns: 1fr 1fr auto; gap:8px; align-items:end; }
    #app .table-picker-manual label { display:grid; gap:6px; font-size:.86rem; color:var(--muted); }
    #app .table-picker-manual input { width:100%; border:1px solid var(--border); background:var(--paper); border-radius:10px; padding:8px 10px; }
    #app .table-picker-actions { display:flex; justify-content:space-between; gap:8px; }
    #app .table-picker-actions button { flex:1 1 auto; display:inline-flex; align-items:center; justify-content:center; gap:8px; }
    @media (max-width: 760px) {
      #app .toolbar { flex-wrap:nowrap !important; overflow-x:auto; }
      #app .toolbar-group { flex: 0 0 auto; }
      #app .toolbar button { min-width:32px; min-height:32px; padding:7px; }
      #app .tool-icon { width:17px; height:17px; }
    }
  `;

  function removeLangAndMode(root, editor){
    localStorage.removeItem('local-rich-editor-lang');
    if (editor) {
      editor.currentLang = 'en';
      try { editor.applyI18n && editor.applyI18n(); } catch (e) {}
    }
    root.querySelector('#langPickerWrap')?.remove();
    root.querySelector('#modeBadge')?.remove();
    root.querySelector('.topbar > .pill-row')?.remove();
    root.querySelector('.inline-banner')?.remove();
    root.querySelectorAll('[data-action="toggle-readonly"]').forEach((el) => el.remove());
    root.querySelector('#readonlyBadge')?.remove();
  }

  function setIcon(button, key, title){
    const icon = ICONS[key];
    if (!button || !icon) return;
    const label = title || button.getAttribute('aria-label') || button.title || button.textContent.trim() || key;
    button.innerHTML = `${icon}<span class="sr-only">${esc(label)}</span>`;
    button.title = label;
    button.setAttribute('aria-label', label);
  }

  function applyToolbarIcons(root){
    const actionMap = {
      'new-doc':'new-doc','import':'import','export-md':'export-md','export-html':'export-html','export-json':'export-json','undo':'undo','redo':'redo','save-snapshot':'save-snapshot',
      'inline-code':'inline-code','clear-format':'clear-format','paragraph':'paragraph','h1':'h1','h2':'h2','h3':'h3','blockquote':'blockquote','code-block':'code-block',
      'ul':'ul','ol':'ol','task':'task','link':'link','comment':'comment','align-left':'align-left','align-center':'align-center','align-right':'align-right',
      'table':'table','image':'image','latex-inline':'latex-inline','latex-block':'latex-block','hr':'hr','toggle-source':'toggle-source','apply-source':'apply-source',
      'sync-source':'sync-source','split-view':'split-view','search-panel':'search-panel','toggle-dark':'toggle-dark','help':'help','toggle-outline':'toggle-outline','toggle-inspector':'toggle-inspector',
      'search-prev':'search-prev','search-next':'search-next','replace-current':'replace-current','replace-all':'replace-all','refresh-code-highlight':'refresh-code-highlight','remove-selected-node':'remove-selected-node'
    };
    root.querySelectorAll('.toolbar [data-action], .topbar-right [data-action], #searchPanel [data-action], #nodeInspector [data-action], #floatingToolbar [data-bubble-action]').forEach((button) => {
      const bubble = button.dataset.bubbleAction;
      const action = button.dataset.action || bubble || button.dataset.format;
      const key = actionMap[action] || action;
      if (ICONS[key]) setIcon(button, key);
    });
    root.querySelectorAll('.toolbar [data-format], #floatingToolbar [data-bubble-action]').forEach((button) => {
      const key = button.dataset.format || button.dataset.bubbleAction;
      if (ICONS[key]) setIcon(button, key);
    });
  }

  function buildTableHTML(rows, cols){
    let html = '<table><thead><tr>';
    for (let c = 0; c < cols; c += 1) html += `<th>Header ${c + 1}</th>`;
    html += '</tr></thead><tbody>';
    const bodyRows = Math.max(rows - 1, 1);
    for (let r = 0; r < bodyRows; r += 1) {
      html += '<tr>';
      for (let c = 0; c < cols; c += 1) html += `<td>Cell ${r + 1}-${c + 1}</td>`;
      html += '</tr>';
    }
    html += '</tbody></table><p></p>';
    return html;
  }

  function createTablePicker(editor){
    if (editor.__tablePicker) return editor.__tablePicker;
    const wrap = document.createElement('div');
    wrap.id = 'tablePicker';
    wrap.className = 'table-picker';
    wrap.hidden = true;
    wrap.innerHTML = `
      <div class="table-picker-grid" aria-label="Table size picker"></div>
      <div class="table-picker-meta" id="tablePickerMeta">5 × 4</div>
      <div class="table-picker-manual">
        <label>Rows<input id="tablePickerRows" type="number" min="1" max="20" value="5"></label>
        <label>Cols<input id="tablePickerCols" type="number" min="1" max="20" value="4"></label>
        <button type="button" id="tablePickerInsert">${ICONS.table}<span>Insert</span></button>
      </div>
      <div class="table-picker-actions">
        <button type="button" id="tablePickerCancel">${ICONS['clear-format']}<span>Close</span></button>
      </div>`;
    document.body.appendChild(wrap);
    const grid = wrap.querySelector('.table-picker-grid');
    const meta = wrap.querySelector('#tablePickerMeta');
    const rowsInput = wrap.querySelector('#tablePickerRows');
    const colsInput = wrap.querySelector('#tablePickerCols');
    const state = { rows: 5, cols: 4 };

    function paint(rows, cols){
      state.rows = rows; state.cols = cols;
      meta.textContent = `${cols} × ${rows}`;
      rowsInput.value = rows;
      colsInput.value = cols;
      grid.querySelectorAll('.table-picker-cell').forEach((cell) => {
        const hot = Number(cell.dataset.row) <= rows && Number(cell.dataset.col) <= cols;
        cell.classList.toggle('is-hot', hot);
      });
    }
    for (let r = 1; r <= 8; r += 1) {
      for (let c = 1; c <= 8; c += 1) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'table-picker-cell';
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        cell.setAttribute('aria-label', `${c} × ${r}`);
        cell.addEventListener('mouseenter', () => paint(r, c));
        cell.addEventListener('focus', () => paint(r, c));
        cell.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          editor.restoreSelection?.();
          editor.insertHTML?.(buildTableHTML(r, c));
          closeTablePicker(editor);
          editor.highlightAllCodeBlocks?.();
          editor.renderMath?.();
          editor.scheduleSave?.();
          editor.updateStats?.();
        });
        grid.appendChild(cell);
      }
    }
    wrap.querySelector('#tablePickerInsert').addEventListener('click', (event) => {
      event.preventDefault();
      const rows = Math.max(1, Math.min(20, Number(rowsInput.value) || 1));
      const cols = Math.max(1, Math.min(20, Number(colsInput.value) || 1));
      editor.restoreSelection?.();
      editor.insertHTML?.(buildTableHTML(rows, cols));
      closeTablePicker(editor);
      editor.highlightAllCodeBlocks?.();
      editor.renderMath?.();
      editor.scheduleSave?.();
      editor.updateStats?.();
    });
    wrap.querySelector('#tablePickerCancel').addEventListener('click', (event) => {
      event.preventDefault();
      closeTablePicker(editor);
    });
    [rowsInput, colsInput].forEach((input) => input.addEventListener('input', () => {
      const rows = Math.max(1, Math.min(20, Number(rowsInput.value) || 1));
      const cols = Math.max(1, Math.min(20, Number(colsInput.value) || 1));
      paint(rows, cols);
    }));
    document.addEventListener('mousedown', (event) => {
      if (wrap.hidden) return;
      if (wrap.contains(event.target)) return;
      if (event.target.closest('[data-action="table"]')) return;
      closeTablePicker(editor);
    }, true);
    paint(5, 4);
    editor.__tablePicker = wrap;
    return wrap;
  }

  function openTablePicker(editor, anchor){
    const picker = createTablePicker(editor);
    const rect = anchor?.getBoundingClientRect?.() || { left: window.innerWidth / 2 - 140, bottom: 90, width: 0 };
    picker.hidden = false;
    const top = Math.min(window.innerHeight - 20 - picker.offsetHeight, rect.bottom + 10);
    const left = Math.min(window.innerWidth - 20 - 280, Math.max(12, rect.left + rect.width / 2 - 140));
    picker.style.top = `${Math.max(12, top)}px`;
    picker.style.left = `${left}px`;
  }

  function closeTablePicker(editor){
    if (editor.__tablePicker) editor.__tablePicker.hidden = true;
  }

  function anchorElement(selection){
    if (!selection || !selection.anchorNode) return null;
    return selection.anchorNode.nodeType === Node.ELEMENT_NODE
      ? selection.anchorNode
      : selection.anchorNode.parentElement;
  }

  function removeNonNodeInspector(root){
    const inspectorBody = root.querySelector('#inspectorPanel .panel-body');
    if (!inspectorBody) return;
    inspectorBody.querySelectorAll(':scope > .section:not(#nodeInspector)').forEach((el) => el.remove());
  }

  function setInspectorMode(editor, mode){
    const inspectorPanel = editor.root.querySelector('#inspectorPanel') || editor.root.querySelector('.panel.right');
    const nodeInspector = editor.nodeInspector || editor.root.querySelector('#nodeInspector');
    const sections = {
      image: editor.imageInspector || editor.root.querySelector('#imageInspector'),
      table: editor.tableInspector || editor.root.querySelector('#tableInspector'),
      latex: editor.latexInspector || editor.root.querySelector('#latexInspector'),
      code: editor.codeInspector || editor.root.querySelector('#codeInspector')
    };
    if (!nodeInspector) return;
    Object.entries(sections).forEach(([name, el]) => {
      if (!el) return;
      const active = name === mode;
      el.hidden = !active;
      el.classList.toggle('active', active);
    });
    const removeBtn = nodeInspector.querySelector('[data-action="remove-selected-node"]');
    if (removeBtn) removeBtn.style.display = mode ? 'inline-flex' : 'none';
    nodeInspector.hidden = !mode;
    nodeInspector.classList.toggle('is-visible', !!mode);
    if (inspectorPanel) inspectorPanel.hidden = !mode;
    editor.root.classList.toggle('show-inspector', !!mode);
  }

  function wordRegex(words){
    return new RegExp(`\\b(?:${words.map((w) => w.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')).join('|')})\\b`, 'g');
  }

  const KW = {
    javascript: wordRegex(['as','async','await','break','case','catch','class','const','continue','debugger','default','delete','do','else','export','extends','false','finally','for','from','function','if','import','in','instanceof','let','new','null','return','super','switch','this','throw','true','try','typeof','undefined','var','void','while','with','yield']),
    python: wordRegex(['and','as','assert','async','await','break','class','continue','def','del','elif','else','except','False','finally','for','from','global','if','import','in','is','lambda','None','nonlocal','not','or','pass','raise','return','True','try','while','with','yield']),
    sql: wordRegex(['select','from','where','join','left','right','inner','outer','on','group','by','order','insert','into','values','update','set','delete','create','table','alter','drop','as','and','or','not','null','limit','having','distinct']),
    bash: wordRegex(['if','then','else','fi','for','in','do','done','case','esac','function','echo','export','local','readonly','while','until','return']),
    css: wordRegex(['display','position','color','background','font','padding','margin','border','width','height','grid','flex','absolute','relative','fixed','sticky','block','inline','none'])
  };

  function stashTokens(text, patterns){
    let src = String(text || '');
    const stash = [];
    const keep = (html) => {
      const key = `\uE000${stash.length}\uE001`;
      stash.push(html);
      return key;
    };
    patterns.forEach((pattern) => {
      src = src.replace(pattern.re, (match) => keep(`<span class="${pattern.cls}">${esc(match)}</span>`));
    });
    return { src, restore: (html) => html.replace(/\uE000(\d+)\uE001/g, (_, i) => stash[Number(i)] || '') };
  }

  function detectLang(text){
    const code = String(text || '');
    if (/^\s*</.test(code) && /<\/?[A-Za-z][\w:-]*/.test(code)) return 'html';
    if (/^\s*[\[{]/.test(code) && /:\s*/.test(code)) return 'json';
    if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(code)) return 'sql';
    if (/^\s*#?!\/bin\/(?:ba)?sh/.test(code) || /\bfi\b|\bthen\b|\becho\b/.test(code)) return 'bash';
    if (/^\s*def\s+\w+|^\s*class\s+\w+|\bimport\s+\w+/m.test(code)) return 'python';
    if (/^\s*[.#]?[\w-]+\s*\{/.test(code)) return 'css';
    if (/\bfunction\b|\bconst\b|=>|console\./.test(code)) return 'javascript';
    return 'plaintext';
  }

  function highlightHtml(code){
    let html = esc(code);
    html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-comment">$1</span>');
    html = html.replace(/(&lt;\/?)([A-Za-z][\w:-]*)/g, '$1<span class="tok-tag">$2</span>');
    html = html.replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)(=)(&quot;.*?&quot;|&#39;.*?&#39;)/g, '<span class="tok-attr">$1</span>$2<span class="tok-string">$3</span>');
    return html;
  }

  function highlightJson(code){
    let html = esc(code);
    html = html.replace(/(&quot;(?:\\.|[^&]|&(?!quot;))*?&quot;)(\s*:)/g, '<span class="tok-attr">$1</span>$2');
    html = html.replace(/(:\s*)(&quot;(?:\\.|[^&]|&(?!quot;))*?&quot;)/g, '$1<span class="tok-string">$2</span>');
    html = html.replace(/\b(true|false|null)\b/g, '<span class="tok-key">$1</span>');
    html = html.replace(/\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, '<span class="tok-number">$1</span>');
    return html;
  }

  function highlightCss(code){
    const tokenized = stashTokens(code, [
      { re: /\/\*[\s\S]*?\*\//g, cls: 'tok-comment' },
      { re: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, cls: 'tok-string' }
    ]);
    let html = esc(tokenized.src);
    html = html.replace(/([#.a-zA-Z][^\{\n]+)(\s*\{)/g, '<span class="tok-fn">$1</span>$2');
    html = html.replace(/([a-z-]+)(\s*:)/gi, '<span class="tok-attr">$1</span>$2');
    html = html.replace(KW.css, '<span class="tok-key">$&</span>');
    html = html.replace(/\b(#[0-9a-fA-F]{3,8}|\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw)?|auto)\b/g, '<span class="tok-number">$1</span>');
    return tokenized.restore(html);
  }

  function highlightScript(code, {keywords, comments, builtins=[]}){
    const tokenized = stashTokens(code, [
      ...comments.map((re) => ({ re, cls: 'tok-comment' })),
      { re: /`(?:\\[\s\S]|[^`])*`/g, cls: 'tok-string' },
      { re: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, cls: 'tok-string' }
    ]);
    let html = esc(tokenized.src);
    html = html.replace(/\b(function|def|class)\s+([A-Za-z_$][\w$]*)/g, '<span class="tok-key">$1</span> <span class="tok-fn">$2</span>');
    html = html.replace(keywords, '<span class="tok-key">$&</span>');
    if (builtins.length) html = html.replace(wordRegex(builtins), '<span class="tok-type">$&</span>');
    html = html.replace(/\b([A-Za-z_$][\w$]*)(?=\s*\()/g, '<span class="tok-fn">$1</span>');
    html = html.replace(/\b(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/gi, '<span class="tok-number">$1</span>');
    return tokenized.restore(html);
  }

  function simpleHighlightHTML(code, language){
    let lang = String(language || '').toLowerCase();
    if (!lang || lang === 'auto' || lang === 'plaintext') lang = detectLang(code);
    if (lang === 'sh' || lang === 'shell') lang = 'bash';
    if (lang === 'xml') lang = 'html';
    if (lang === 'typescript') lang = 'javascript';
    if (lang === 'c' || lang === 'cpp' || lang === 'csharp' || lang === 'java' || lang === 'kotlin' || lang === 'swift' || lang === 'go' || lang === 'rust' || lang === 'php' || lang === 'ruby') lang = 'javascript';
    if (lang === 'markdown') return { language: 'markdown', html: esc(code) };
    if (lang === 'nohighlight') return { language: 'nohighlight', html: esc(code) };
    if (lang === 'html') return { language: 'html', html: highlightHtml(code) };
    if (lang === 'json') return { language: 'json', html: highlightJson(code) };
    if (lang === 'css') return { language: 'css', html: highlightCss(code) };
    if (lang === 'python') return { language: 'python', html: highlightScript(code, { keywords: KW.python, comments: [/#.*$/gm], builtins: ['print','len','range','str','int','float','list','dict','set','tuple','enumerate'] }) };
    if (lang === 'sql') return { language: 'sql', html: highlightScript(code, { keywords: KW.sql, comments: [/--[^\n]*/g, /\/\*[\s\S]*?\*\//g], builtins: ['count','sum','avg','min','max'] }) };
    if (lang === 'bash') return { language: 'bash', html: highlightScript(code, { keywords: KW.bash, comments: [/#.*$/gm], builtins: ['printf','echo','cd','pwd','grep','sed','awk','cat'] }) };
    if (lang === 'plaintext') return { language: 'plaintext', html: esc(code) };
    return { language: lang || 'javascript', html: highlightScript(code, { keywords: KW.javascript, comments: [/\/\*[\s\S]*?\*\//g, /\/\/[^\n]*/g], builtins: ['console','Promise','Array','Object','String','Number','Boolean','Math','Date','JSON','Map','Set','RegExp','Error'] }) };
  }

  function patchHighlight(editor){
    editor.renderHighlightedCodeElement = async function(code){
      if (!code) return;
      const pre = code.closest('pre');
      const raw = code.dataset.rawCode != null ? code.dataset.rawCode : (code.textContent || '');
      code.dataset.rawCode = raw;
      const explicit = typeof this.getExplicitCodeLanguage === 'function'
        ? this.getExplicitCodeLanguage(code)
        : (code.dataset.language || pre?.dataset.language || '');
      const result = simpleHighlightHTML(raw, explicit || 'auto');
      code.innerHTML = result.html;
      code.className = result.language === 'nohighlight' ? 'code-syntax nohighlight' : `code-syntax language-${result.language}`;
      code.dataset.language = result.language;
      code.contentEditable = 'false';
      if (pre) {
        pre.classList.add('code-block-shell');
        pre.dataset.language = result.language;
      }
    };
    editor.highlightCodeBlocksInside = function(root = this.editor){
      if (!root) return;
      root.querySelectorAll('pre code').forEach((code) => {
        const pre = code.closest('pre');
        if (pre) pre.classList.add('code-block-shell');
        if (code.dataset.editing === 'true') return;
        code.dataset.rawCode ??= code.textContent || '';
        this.renderHighlightedCodeElement(code);
      });
    };
    editor.highlightAllCodeBlocks = function(){
      this.highlightCodeBlocksInside(this.editor);
      const preview = this.root.querySelector('#markdownPreview');
      if (preview) this.highlightCodeBlocksInside(preview);
    };
    if (typeof editor.finalizeCodeBlockEditing === 'function') {
      editor.finalizeCodeBlockEditing = function(code){
        const target = code?.closest ? code.closest('pre')?.querySelector('code') || code : code;
        if (!target) return;
        target.dataset.rawCode = target.textContent || target.dataset.rawCode || '';
        target.dataset.editing = 'false';
        target.contentEditable = 'false';
        target.closest('pre')?.classList.remove('editing');
        this.renderHighlightedCodeElement(target);
        if (typeof this.showCodeInspector === 'function') this.showCodeInspector(target);
      };
    }
    editor.updateSelectedCodeLanguage = function(){
      const code = this.state.selectedCodeBlock;
      if (!code || !this.codeLanguageSelect) return;
      const lang = this.codeLanguageSelect.value;
      code.dataset.language = lang;
      code.closest('pre')?.setAttribute('data-language', lang);
      this.renderHighlightedCodeElement(code);
      if (typeof this.showCodeInspector === 'function') this.showCodeInspector(code);
      this.scheduleSave?.();
    };
  }

  function patchInspector(editor){
    removeNonNodeInspector(editor.root);
    const inspectorPanel = editor.root.querySelector('#inspectorPanel') || editor.root.querySelector('.panel.right');
    const nodeInspector = editor.nodeInspector || editor.root.querySelector('#nodeInspector');
    if (!nodeInspector) return;

    function showImage(figure){
      editor.state.selectedImageFigure = figure;
      editor.state.selectedTable = null;
      editor.state.selectedLatex = null;
      editor.state.selectedCodeBlock = null;
      if (typeof editor.showImageInspector === 'function') editor.showImageInspector(figure);
      setInspectorMode(editor, 'image');
    }
    function showTable(table){
      editor.state.selectedImageFigure = null;
      editor.state.selectedTable = table;
      editor.state.selectedLatex = null;
      editor.state.selectedCodeBlock = null;
      if (typeof editor.showTableInspector === 'function') editor.showTableInspector(table);
      setInspectorMode(editor, 'table');
    }
    function showLatex(node){
      editor.state.selectedImageFigure = null;
      editor.state.selectedTable = null;
      editor.state.selectedLatex = node;
      editor.state.selectedCodeBlock = null;
      if (typeof editor.showLatexInspector === 'function') editor.showLatexInspector(node);
      setInspectorMode(editor, 'latex');
    }
    function showCode(code){
      editor.state.selectedImageFigure = null;
      editor.state.selectedTable = null;
      editor.state.selectedLatex = null;
      editor.state.selectedCodeBlock = code;
      if (typeof editor.showCodeInspector === 'function') editor.showCodeInspector(code);
      setInspectorMode(editor, 'code');
    }

    editor.detectSelectedNode = function(){
      this.root.querySelectorAll('.selected-node').forEach((node) => node.classList.remove('selected-node'));
      const selection = document.getSelection();
      const anchor = anchorElement(selection);
      const image = this.state.selectedImageFigure || anchor?.closest('figure.image-figure');
      const table = this.state.selectedTable || anchor?.closest('table');
      const latex = this.state.selectedLatex || anchor?.closest('.latex-node');
      const codeEl = this.state.selectedCodeBlock || anchor?.closest('pre')?.querySelector('code');
      if (image) {
        image.classList.add('selected-node');
        showImage(image);
        return;
      }
      if (table) {
        table.classList.add('selected-node');
        showTable(table);
        return;
      }
      if (latex) {
        latex.classList.add('selected-node');
        showLatex(latex);
        return;
      }
      if (codeEl) {
        codeEl.closest('pre')?.classList.add('selected-node');
        showCode(codeEl);
        return;
      }
      this.state.selectedImageFigure = null;
      this.state.selectedTable = null;
      this.state.selectedLatex = null;
      this.state.selectedCodeBlock = null;
      setInspectorMode(this, null);
    };

    if (!editor.__inspectorHotfixBound) {
      editor.__inspectorHotfixBound = true;
      editor.editor?.addEventListener('click', () => setTimeout(() => editor.detectSelectedNode(), 0), true);
      editor.editor?.addEventListener('keyup', () => setTimeout(() => editor.detectSelectedNode(), 0), true);
      document.addEventListener('selectionchange', () => {
        const sel = document.getSelection();
        if (sel && editor.root.contains(sel.anchorNode)) {
          editor.detectSelectedNode();
        }
      }, true);
    }
    editor.detectSelectedNode();
    if (inspectorPanel) inspectorPanel.hidden = true;
  }

  function patchInspectorButtons(editor){
    if (editor.imageAlignSelect) {
      let row = editor.root.querySelector('.inspector-align-row');
      if (!row) {
        row = document.createElement('div');
        row.className = 'inspector-align-row';
        row.innerHTML = `
          <button type="button" class="inspector-icon-btn" data-image-align="left">${ICONS['align-image-left']}<span class="sr-only">Left</span></button>
          <button type="button" class="inspector-icon-btn" data-image-align="center">${ICONS['align-image-center']}<span class="sr-only">Center</span></button>
          <button type="button" class="inspector-icon-btn" data-image-align="right">${ICONS['align-image-right']}<span class="sr-only">Right</span></button>`;
        const label = editor.imageAlignSelect.closest('label');
        if (label) {
          label.style.display = 'none';
          label.insertAdjacentElement('beforebegin', row);
        }
      }
      row.querySelectorAll('[data-image-align]').forEach((button) => {
        button.addEventListener('click', () => {
          editor.imageAlignSelect.value = button.dataset.imageAlign;
          editor.updateSelectedImageAlign?.();
          row.querySelectorAll('[data-image-align]').forEach((b) => b.classList.toggle('is-active', b === button));
        });
      });
    }
    if (editor.tableInspector) {
      const row = editor.tableInspector.querySelector('.pill-row');
      if (row) {
        row.className = 'inspector-table-row';
        row.querySelectorAll('[data-action^="table-"]').forEach((button) => {
          const key = button.dataset.action;
          button.className = 'inspector-icon-btn';
          if (key === 'table-remove') button.classList.add('inspector-danger');
          setIcon(button, key);
        });
      }
    }
    const removeBtn = editor.root.querySelector('[data-action="remove-selected-node"]');
    if (removeBtn) {
      removeBtn.classList.add('inspector-icon-btn');
      setIcon(removeBtn, 'remove-selected-node');
    }
  }

  function patchTableButton(editor){
    if (editor.__tableHotfixBound) return;
    editor.__tableHotfixBound = true;
    editor.insertTable = function(){
      const btn = this.root.querySelector('.toolbar [data-action="table"]');
      openTablePicker(this, btn);
    };
    editor.root.addEventListener('click', (event) => {
      const btn = event.target.closest('.toolbar [data-action="table"]');
      if (!btn) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openTablePicker(editor, btn);
    }, true);
  }

  function patchEditor(editor){
    if (!editor || editor.__hotfix15Applied) return;
    editor.__hotfix15Applied = true;
    try { console.info(`[LocalRichEditor] ${HOTFIX_BUILD} patch applied`); } catch (e) {}
    ensureStyle('local-rich-editor-hotfix15-style', PATCH_STYLE);
    removeLangAndMode(editor.root, editor);
    applyToolbarIcons(editor.root);
    patchHighlight(editor);
    patchInspector(editor);
    patchInspectorButtons(editor);
    patchTableButton(editor);
    editor.renderMath?.();
    editor.highlightAllCodeBlocks?.();
    editor.detectSelectedNode?.();
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => waitForEditor(patchEditor));
  } else {
    waitForEditor(patchEditor);
  }
})();
(function(){
  'use strict';
  const BUILD = '20260328-hotfix-15';

  function waitForEditor(callback) {
    if (window.localRichEditor) {
      callback(window.localRichEditor);
      return;
    }
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (window.localRichEditor) {
        clearInterval(timer);
        callback(window.localRichEditor);
      } else if (tries > 240) {
        clearInterval(timer);
      }
    }, 50);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function svg(paths, extraClass) {
    return '<svg class="tool-icon' + (extraClass ? ' ' + extraClass : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + paths + '</svg>';
  }

  function textSvg(text, size) {
    const fontSize = size || 8;
    return svg('<text x="12" y="12" text-anchor="middle" dominant-baseline="central" font-size="' + fontSize + '">' + escapeHtml(text) + '</text>');
  }

  const ICONS = {
    'new-doc': { label: 'New document', svg: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v6"/><path d="M9 14h6"/>') },
    'import': { label: 'Import', svg: svg('<path d="M4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8H4z"/><path d="M4 11V7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v2"/><path d="m12 9 0 8"/><path d="m8.5 12.5 3.5 4 3.5-4"/>') },
    'export-md': { label: 'Export Markdown', svg: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8 15v-4l2 2 2-2v4"/><path d="M14 15v-4l3 4v-4"/>') },
    'export-html': { label: 'Export HTML', svg: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="m10 12-2 2 2 2"/><path d="m14 12 2 2-2 2"/><path d="m12.5 10.5-1 7"/>') },
    'export-json': { label: 'Export JSON', svg: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M10 11c-1 0-1.5.8-1.5 2v2c0 1.2-.5 2-1.5 2"/><path d="M14 11c1 0 1.5.8 1.5 2v2c0 1.2.5 2 1.5 2"/>') },
    'undo': { label: 'Undo', svg: svg('<path d="M9 14 4 9l5-5"/><path d="M20 20a8 8 0 0 0-8-8H4"/>') },
    'redo': { label: 'Redo', svg: svg('<path d="m15 14 5-5-5-5"/><path d="M4 20a8 8 0 0 1 8-8h8"/>') },
    'save-snapshot': { label: 'Save snapshot', svg: svg('<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v6h8V4"/><path d="M9 17h6"/>') },
    'bold': { label: 'Bold', svg: svg('<path d="M6 4h7a4 4 0 0 1 0 8H6z"/><path d="M6 12h8a4 4 0 0 1 0 8H6z"/>') },
    'italic': { label: 'Italic', svg: svg('<path d="M19 4h-9"/><path d="M14 20H5"/><path d="m15 4-6 16"/>') },
    'underline': { label: 'Underline', svg: svg('<path d="M6 4v6a6 6 0 0 0 12 0V4"/><path d="M4 20h16"/>') },
    'strike': { label: 'Strikethrough', svg: svg('<path d="M4 12h16"/><path d="M8 6.5A3.5 3.5 0 0 1 11.5 4h1A3.5 3.5 0 0 1 16 7.5"/><path d="M16 17.5A3.5 3.5 0 0 1 12.5 20h-1A3.5 3.5 0 0 1 8 16.5"/>') },
    'inline-code': { label: 'Inline code', svg: svg('<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/><path d="m14 4-4 16"/>') },
    'clear-format': { label: 'Clear formatting', svg: svg('<path d="m4 20 16-16"/><path d="M5 5h10"/><path d="M10 5v3"/><path d="M8 14h8"/>') },
    'paragraph': { label: 'Paragraph', svg: svg('<path d="M13 4v16"/><path d="M17 4v16"/><path d="M6 4h8a4 4 0 1 1 0 8H9"/>') },
    'h1': { label: 'Heading 1', svg: svg('<path d="M4 6v12"/><path d="M10 6v12"/><path d="M4 12h6"/><path d="M16 9h2v9"/><path d="M16 18h5"/>') },
    'h2': { label: 'Heading 2', svg: svg('<path d="M4 6v12"/><path d="M10 6v12"/><path d="M4 12h6"/><path d="M15 11a2 2 0 0 1 4 0c0 1.4-4 3.6-4 6h4"/>') },
    'h3': { label: 'Heading 3', svg: svg('<path d="M4 6v12"/><path d="M10 6v12"/><path d="M4 12h6"/><path d="M15 9a2.5 2.5 0 0 1 4 2"/><path d="M15 15a2.5 2.5 0 0 0 4-2"/>') },
    'blockquote': { label: 'Quote', svg: svg('<path d="M7 10h4v7H4v-4a6 6 0 0 1 6-6"/><path d="M17 10h4v7h-7v-4a6 6 0 0 1 6-6"/>') },
    'code-block': { label: 'Code block', svg: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m9 10-3 2 3 2"/><path d="m15 10 3 2-3 2"/>') },
    'ul': { label: 'Bulleted list', svg: svg('<circle cx="5" cy="7" r="1.2"/><circle cx="5" cy="12" r="1.2"/><circle cx="5" cy="17" r="1.2"/><path d="M9 7h10"/><path d="M9 12h10"/><path d="M9 17h10"/>') },
    'ol': { label: 'Numbered list', svg: svg('<path d="M4 7h1v3"/><path d="M3.5 16h3L4 13.5A1.6 1.6 0 0 0 6 11"/><path d="M9 7h11"/><path d="M9 12h11"/><path d="M9 17h11"/>') },
    'task': { label: 'Checklist', svg: svg('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 2.5 2.5L16 9"/>') },
    'link': { label: 'Link', svg: svg('<path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L10 4"/><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 1 0 7.07 7.07L14 20"/>') },
    'comment': { label: 'Comment', svg: svg('<path d="M7 18l-4 3V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7z"/><path d="M8 9h8"/><path d="M8 13h5"/>') },
    'align-left': { label: 'Align left', svg: svg('<path d="M4 6h16"/><path d="M4 12h10"/><path d="M4 18h14"/>') },
    'align-center': { label: 'Align center', svg: svg('<path d="M4 6h16"/><path d="M7 12h10"/><path d="M5 18h14"/>') },
    'align-right': { label: 'Align right', svg: svg('<path d="M4 6h16"/><path d="M10 12h10"/><path d="M6 18h14"/>') },
    'table': { label: 'Table', svg: svg('<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 10h18"/><path d="M9 5v14"/><path d="M15 5v14"/>') },
    'image': { label: 'Image', svg: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m21 16-5.5-5.5L8 18"/>') },
    'latex-inline': { label: 'Inline formula', svg: svg('<path d="M5 17 11 7l3 10 5-7"/><path d="M4 20h16"/>') },
    'latex-block': { label: 'Block formula', svg: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15 10 10l2 5 5-7"/>') },
    'hr': { label: 'Divider', svg: svg('<path d="M4 12h16"/><path d="M12 8v8"/>') },
    'toggle-source': { label: 'Markdown panel', svg: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5v14"/><path d="M12 9h5"/><path d="M12 13h5"/>') },
    'apply-source': { label: 'Apply source', svg: svg('<path d="M5 12l4 4L19 6"/><path d="M5 5h8"/><path d="M5 19h14"/>') },
    'sync-source': { label: 'Sync source', svg: svg('<path d="M20 11a8 8 0 0 0-14.9-4"/><path d="M4 5v5h5"/><path d="M4 13a8 8 0 0 0 14.9 4"/><path d="M20 19v-5h-5"/>') },
    'split-view': { label: 'Split view', svg: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14"/>') },
    'search-panel': { label: 'Search', svg: svg('<circle cx="11" cy="11" r="6"/><path d="m20 20-3.5-3.5"/>') },
    'toggle-dark': { label: 'Dark mode', svg: svg('<path d="M12 3a7 7 0 1 0 9 9 9 9 0 1 1-9-9z"/>') },
    'help': { label: 'Help', svg: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.9.8-1.7 1.3-1.7 2.7"/><path d="M12 17h.01"/>') },
    'toggle-outline': { label: 'Outline', svg: svg('<path d="M4 7h5"/><path d="M4 12h5"/><path d="M4 17h5"/><path d="M12 7h8"/><path d="M12 12h8"/><path d="M12 17h8"/>') },
    'toggle-inspector': { label: 'Inspector', svg: svg('<path d="M6 4v8"/><path d="M6 16v4"/><path d="M12 4v4"/><path d="M12 12v8"/><path d="M18 4v11"/><path d="M18 19v1"/><circle cx="6" cy="14" r="2"/><circle cx="12" cy="10" r="2"/><circle cx="18" cy="17" r="2"/>') },
    'align-image-left': { label: 'Align image left', svg: svg('<path d="M5 6h14"/><path d="M5 12h9"/><path d="M5 18h14"/><rect x="5" y="9" width="5" height="6" rx="1"/>') },
    'align-image-center': { label: 'Align image center', svg: svg('<path d="M4 6h16"/><path d="M7 18h10"/><rect x="9.5" y="9" width="5" height="6" rx="1"/>') },
    'align-image-right': { label: 'Align image right', svg: svg('<path d="M5 6h14"/><path d="M10 12h9"/><path d="M5 18h14"/><rect x="14" y="9" width="5" height="6" rx="1"/>') },
    'table-add-row': { label: 'Add row', svg: svg('<rect x="4" y="5" width="16" height="12" rx="1.5"/><path d="M4 11h16"/><path d="M9 5v12"/><path d="M15 5v12"/><path d="M12 18v4"/><path d="M10 20h4"/>') },
    'table-add-col': { label: 'Add column', svg: svg('<rect x="4" y="5" width="16" height="12" rx="1.5"/><path d="M4 11h16"/><path d="M9 5v12"/><path d="M15 5v12"/><path d="M20 10v4"/><path d="M18 12h4"/>') },
    'table-del-row': { label: 'Delete row', svg: svg('<rect x="4" y="5" width="16" height="12" rx="1.5"/><path d="M4 11h16"/><path d="M9 5v12"/><path d="M15 5v12"/><path d="M10 20h4"/>') },
    'table-del-col': { label: 'Delete column', svg: svg('<rect x="4" y="5" width="16" height="12" rx="1.5"/><path d="M4 11h16"/><path d="M9 5v12"/><path d="M15 5v12"/><path d="M18 12h4"/>') },
    'table-remove': { label: 'Delete table', svg: svg('<rect x="4" y="5" width="16" height="12" rx="1.5"/><path d="M4 11h16"/><path d="M9 5v12"/><path d="M15 5v12"/><path d="m7 20 10-10"/><path d="m17 20-10-10"/>') },
    'delete-node': { label: 'Delete selected node', svg: svg('<path d="M5 7h14"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M7 7l1 13a1 1 0 0 0 1 .9h6a1 1 0 0 0 1-.9L17 7"/>') },
    'refresh-code-highlight': { label: 'Refresh code highlight', svg: svg('<path d="M20 11a8 8 0 0 0-14.9-4"/><path d="M4 5v5h5"/><path d="M4 13a8 8 0 0 0 14.9 4"/><path d="M20 19v-5h-5"/>') },
    'close': { label: 'Close', svg: svg('<path d="m6 6 12 12"/><path d="M18 6 6 18"/>') }
  };

  const LABELS = {
    outline: 'Outline',
    inspector: 'Inspector',
    selectedNode: 'Selected node',
    image: 'Image',
    width: 'Width',
    caption: 'Caption',
    alt: 'Alt text',
    align: 'Align',
    table: 'Table',
    latex: 'LaTeX',
    codeBlock: 'Code block',
    language: 'Language',
    deleteNode: 'Delete selected node',
    noFormula: 'No formula selected.',
    editFormula: 'Edit formula',
    refreshHighlight: 'Refresh highlight',
    commentSection: 'Comments',
    markdownSource: 'Markdown source',
    preview: 'Preview',
    insertTable: 'Insert table',
    rows: 'Rows',
    cols: 'Columns',
    cancel: 'Cancel',
    insert: 'Insert',
    headers: 'Header',
    cell: 'Cell',
    untitled: 'Untitled document',
    subtitleSaved: 'Local autosave enabled',
    subtitleDirty: 'Unsaved changes',
    help: 'Help',
    search: 'Search',
    replace: 'Replace',
    restore: 'Restore',
    dismiss: 'Dismiss'
  };

  const EXTRA_STYLE = `
    #app .panel.right .panel-body > :not(#nodeInspector) { display: none !important; }
    #app #nodeInspector > .section[hidden] { display: none !important; }
    #app #nodeInspector > p[hidden] { display: none !important; }
    #app .topbar-right #langPickerWrap,
    #app .topbar-right #modeBadge { display: none !important; }
    #app .document-page pre.code-block-shell {
      background: #f8fafc !important;
      color: #0f172a !important;
      border-color: #dbe4ef !important;
    }
    body.dark #app .document-page pre.code-block-shell {
      background: #0b1220 !important;
      color: #e5eefc !important;
      border-color: #24324d !important;
    }
    #app .document-page pre.code-block-shell::before {
      color: #475569 !important;
      background: rgba(148, 163, 184, 0.14) !important;
    }
    body.dark #app .document-page pre.code-block-shell::before {
      color: rgba(226,232,240,.88) !important;
      background: rgba(255,255,255,.08) !important;
    }
    #app .inspector-button-grid {
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }
    #app .inspector-icon-btn,
    #app .align-button-row .tool-btn,
    #app [data-action="remove-selected-node"],
    #app [data-action="refresh-code-highlight"] {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    #app .inspector-icon-btn .tool-icon,
    #app .align-button-row .tool-icon,
    #app [data-action="remove-selected-node"] .tool-icon,
    #app [data-action="refresh-code-highlight"] .tool-icon {
      width: 16px;
      height: 16px;
      flex: 0 0 auto;
    }
    #app .table-picker {
      position: absolute;
      z-index: 90;
      width: 260px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 16px;
      background: var(--paper);
      box-shadow: var(--shadow);
      display: grid;
      gap: 10px;
    }
    #app .table-picker[hidden] { display: none !important; }
    #app .table-picker-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 0;
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      background: var(--paper-2);
      cursor: pointer;
      user-select: none;
    }
    #app .table-picker-cell {
      width: 24px;
      height: 24px;
      border-right: 1px solid color-mix(in srgb, var(--border) 75%, transparent);
      border-bottom: 1px solid color-mix(in srgb, var(--border) 75%, transparent);
      background: transparent;
    }
    #app .table-picker-cell:nth-child(8n) { border-right: none; }
    #app .table-picker-cell.is-active { background: rgba(59,130,246,.16); }
    #app .table-picker-cell.is-edge { box-shadow: inset 0 0 0 1px #3b82f6; }
    #app .table-picker-meta {
      text-align: center;
      font-weight: 700;
      color: var(--text);
    }
    #app .table-picker-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    #app .table-picker-fields label {
      display: grid;
      gap: 4px;
      color: var(--muted);
      font-size: 0.85rem;
    }
    #app .table-picker-fields input {
      width: 100%;
      padding: 7px 8px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--paper);
    }
    #app .table-picker-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    #app .table-picker-actions button {
      min-height: 32px;
    }
  `;

  function wordsRegex(words) {
    return new RegExp('\\b(' + words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'g');
  }

  const JS_KEYWORDS = wordsRegex(['break','case','catch','class','const','continue','default','delete','do','else','export','extends','finally','for','from','function','if','import','in','instanceof','let','new','of','return','switch','throw','try','typeof','var','void','while','with','yield','async','await','static']);
  const PY_KEYWORDS = wordsRegex(['and','as','assert','async','await','break','class','continue','def','del','elif','else','except','False','finally','for','from','global','if','import','in','is','lambda','None','nonlocal','not','or','pass','raise','return','True','try','while','with','yield']);
  const SQL_KEYWORDS = wordsRegex(['select','from','where','join','left','right','inner','outer','on','group','by','order','insert','into','values','update','set','delete','create','table','alter','drop','as','and','or','not','null','limit','having','distinct']);
  const BASH_KEYWORDS = wordsRegex(['if','then','else','fi','for','in','do','done','case','esac','function','echo','export','local','readonly','while','until','return']);
  const CSS_KEYWORDS = wordsRegex(['display','position','color','background','font','padding','margin','border','width','height','grid','flex','absolute','relative','fixed','sticky','block','inline','none']);

  function tokenizeWithPlaceholders(code, extractors) {
    let source = String(code || '');
    const stash = [];
    function stashToken(html) {
      const token = '\uE000' + stash.length + '\uE001';
      stash.push(html);
      return token;
    }
    extractors.forEach((entry) => {
      source = source.replace(entry.regex, (match) => stashToken('<span class="' + entry.className + '">' + escapeHtml(match) + '</span>'));
    });
    return {
      source: source,
      restore(html) { return html.replace(/\uE000(\d+)\uE001/g, (_, index) => stash[Number(index)] || ''); }
    };
  }

  function highlightHtmlLike(code) {
    let html = escapeHtml(code);
    html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="hljs-comment">$1</span>');
    html = html.replace(/(&lt;\/?)([A-Za-z][\w:-]*)/g, '$1<span class="hljs-keyword">$2</span>');
    html = html.replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)(=)(&quot;.*?&quot;|&#39;.*?&#39;)/g, '<span class="hljs-attr">$1</span>$2<span class="hljs-string">$3</span>');
    return html;
  }

  function highlightJson(code) {
    let html = escapeHtml(code);
    html = html.replace(/(&quot;(?:\\.|[^&]|&(?!quot;))*?&quot;)(\s*:)/g, '<span class="hljs-attr">$1</span>$2');
    html = html.replace(/(:\s*)(&quot;(?:\\.|[^&]|&(?!quot;))*?&quot;)/g, '$1<span class="hljs-string">$2</span>');
    html = html.replace(/\b(true|false|null)\b/g, '<span class="hljs-literal">$1</span>');
    html = html.replace(/\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, '<span class="hljs-number">$1</span>');
    return html;
  }

  function highlightCss(code) {
    const tokenized = tokenizeWithPlaceholders(code, [
      { regex: /\/\*[\s\S]*?\*\//g, className: 'hljs-comment' },
      { regex: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, className: 'hljs-string' }
    ]);
    let html = escapeHtml(tokenized.source);
    html = html.replace(/([#.a-zA-Z][^\{\n]+)(\s*\{)/g, '<span class="hljs-title class_">$1</span>$2');
    html = html.replace(/([a-z-]+)(\s*:)/gi, '<span class="hljs-attr">$1</span>$2');
    html = html.replace(CSS_KEYWORDS, '<span class="hljs-keyword">$1</span>');
    html = html.replace(/\b(#[0-9a-fA-F]{3,8}|\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw)?|auto)\b/g, '<span class="hljs-number">$1</span>');
    return tokenized.restore(html);
  }

  function highlightScriptLike(code, options) {
    const opts = options || {};
    const comments = opts.comments || [];
    const keywords = opts.keywords || JS_KEYWORDS;
    const builtins = opts.builtins || [];
    const extractors = comments.map((regex) => ({ regex: regex, className: 'hljs-comment' }));
    extractors.push({ regex: /`(?:\\[\s\S]|[^`])*`/g, className: 'hljs-string' });
    extractors.push({ regex: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, className: 'hljs-string' });
    const tokenized = tokenizeWithPlaceholders(code, extractors);
    let html = escapeHtml(tokenized.source);
    html = html.replace(/\b(function|def|class)\s+([A-Za-z_$][\w$]*)/g, '<span class="hljs-keyword">$1</span> <span class="hljs-title function_">$2</span>');
    html = html.replace(keywords, '<span class="hljs-keyword">$1</span>');
    if (builtins.length) html = html.replace(wordsRegex(builtins), '<span class="hljs-built_in">$1</span>');
    html = html.replace(/\b(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/gi, '<span class="hljs-number">$1</span>');
    html = html.replace(/\b([A-Za-z_$][\w$]*)(?=\s*\()/g, '<span class="hljs-title function_">$1</span>');
    return tokenized.restore(html);
  }

  function normalizeLang(language) {
    const value = String(language || '').trim().toLowerCase();
    if (!value || value === 'auto') return 'auto';
    const aliases = { js: 'javascript', ts: 'typescript', sh: 'bash', shell: 'bash', py: 'python', txt: 'plaintext', text: 'plaintext', yml: 'yaml', md: 'markdown', 'c++': 'cpp', 'c#': 'csharp' };
    return aliases[value] || value;
  }

  function detectLanguage(code, requested) {
    const text = String(code || '');
    const explicit = normalizeLang(requested);
    const looksLikeJs = /\b(function|const|let|var|return|async|await|class|new)\b|=>|console\.|import\s+[{*\w]/.test(text);
    if (explicit && explicit !== 'auto' && explicit !== 'plaintext') {
      if ((explicit === 'bash' || explicit === 'shell' || explicit === 'sh') && looksLikeJs && !/^\s*#!/m.test(text)) return 'javascript';
      return explicit;
    }
    if (/^\s*</.test(text) && /<\/?[A-Za-z][\w:-]*/.test(text)) return 'html';
    if (/^\s*[\[{]/.test(text) && /:\s*/.test(text)) return 'json';
    if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(text)) return 'sql';
    if (/^\s*#!.*\b(?:ba)?sh\b/m.test(text) || /\b(echo|fi|then|done|esac|export|readonly)\b/.test(text)) return 'bash';
    if (/^\s*def\s+\w+|^\s*class\s+\w+|\bimport\s+\w+/m.test(text)) return 'python';
    if (/^\s*[.#]?[\w-]+\s*\{/.test(text)) return 'css';
    if (looksLikeJs) return 'javascript';
    return explicit && explicit !== 'auto' ? explicit : 'plaintext';
  }

  function renderHighlightedHtml(code, language) {
    const lang = detectLanguage(code, language);
    if (lang === 'plaintext' || lang === 'nohighlight') return { language: lang, html: escapeHtml(code) };
    if (lang === 'html' || lang === 'xml' || lang === 'markdown') return { language: lang === 'xml' ? 'html' : lang, html: highlightHtmlLike(code) };
    if (lang === 'json') return { language: 'json', html: highlightJson(code) };
    if (lang === 'css') return { language: 'css', html: highlightCss(code) };
    if (lang === 'python') return { language: 'python', html: highlightScriptLike(code, { comments: [/#.*$/gm], keywords: PY_KEYWORDS, builtins: ['print','len','range','str','int','float','list','dict','set','tuple','enumerate'] }) };
    if (lang === 'sql') return { language: 'sql', html: highlightScriptLike(code, { comments: [/--[^\n]*/g, /\/\*[\s\S]*?\*\//g], keywords: SQL_KEYWORDS, builtins: ['count','sum','avg','min','max'] }) };
    if (lang === 'bash') return { language: 'bash', html: highlightScriptLike(code, { comments: [/#.*$/gm], keywords: BASH_KEYWORDS, builtins: ['printf','echo','cd','pwd','grep','sed','awk','cat'] }) };
    return { language: 'javascript', html: highlightScriptLike(code, { comments: [/\/\*[\s\S]*?\*\//g, /\/\/[^\n]*/g], keywords: JS_KEYWORDS, builtins: ['console','Promise','Array','Object','String','Number','Boolean','Math','Date','JSON','Map','Set','RegExp','Error'] }) };
  }

  function applyButtonIcon(button, key, forceText) {
    if (!button) return;
    const spec = ICONS[key] || ICONS[button.dataset.action] || ICONS[button.dataset.format] || ICONS[button.dataset.bubbleAction];
    if (!spec) return;
    button.innerHTML = spec.svg + '<span class="sr-only">' + escapeHtml(spec.label) + '</span>';
    button.title = spec.label;
    button.setAttribute('aria-label', spec.label);
    button.classList.add('tool-btn');
    button.classList.remove('has-text');
    if (forceText === true) button.classList.add('has-text');
  }

  function setEnglishChrome(editor) {
    editor.currentLang = 'en';
    if (typeof editor.applyI18n === 'function') {
      try { editor.applyI18n(); } catch (error) {}
    }
    const root = editor.root;
    root.querySelector('#langPickerWrap')?.remove();
    root.querySelector('#modeBadge')?.remove();
    if (editor.modeBadge) editor.modeBadge.remove();
    if (editor.docTitleInput && (!editor.docTitleInput.value || /새 문서|Local Rich Editor Demo/i.test(editor.docTitleInput.value))) editor.docTitleInput.value = LABELS.untitled;
    if (editor.docTitleInput) editor.docTitleInput.setAttribute('aria-label', 'Document title');
    if (editor.docSubtitle) editor.docSubtitle.textContent = editor.state?.dirty ? LABELS.subtitleDirty : LABELS.subtitleSaved;
    root.querySelector('#outlinePanel .panel-header h2') && (root.querySelector('#outlinePanel .panel-header h2').textContent = LABELS.outline);
    root.querySelector('#inspectorPanel .panel-header h2') && (root.querySelector('#inspectorPanel .panel-header h2').textContent = LABELS.inspector);
    root.querySelector('#inspectorPanel .panel-header .badge') && (root.querySelector('#inspectorPanel .panel-header .badge').textContent = LABELS.selectedNode);
    if (editor.imageInspector) {
      const labels = editor.imageInspector.querySelectorAll('label');
      const heading = editor.imageInspector.querySelector('h3');
      if (heading) heading.textContent = LABELS.image;
      if (labels[0]) labels[0].childNodes[0] && (labels[0].childNodes[0].textContent = LABELS.width);
      if (labels[1]) labels[1].childNodes[0] && (labels[1].childNodes[0].textContent = LABELS.caption + ' ');
      if (labels[2]) labels[2].childNodes[0] && (labels[2].childNodes[0].textContent = LABELS.alt + ' ');
      if (labels[3]) labels[3].childNodes[0] && (labels[3].childNodes[0].textContent = LABELS.align + ' ');
      if (editor.imageCaptionInput) editor.imageCaptionInput.placeholder = LABELS.caption;
      if (editor.imageAltInput) editor.imageAltInput.placeholder = LABELS.alt;
      if (editor.imageAlignSelect) {
        const opts = editor.imageAlignSelect.options;
        if (opts[0]) opts[0].textContent = 'Left';
        if (opts[1]) opts[1].textContent = 'Center';
        if (opts[2]) opts[2].textContent = 'Right';
      }
    }
    if (editor.tableInspector) {
      const heading = editor.tableInspector.querySelector('h3');
      if (heading) heading.textContent = LABELS.table;
    }
    if (editor.latexInspector) {
      const heading = editor.latexInspector.querySelector('h3');
      if (heading) heading.textContent = LABELS.latex;
      if (editor.latexContent && !editor.state?.selectedLatex) editor.latexContent.textContent = LABELS.noFormula;
      const btn = editor.latexInspector.querySelector('[data-action="edit-latex"]');
      if (btn) btn.textContent = LABELS.editFormula;
    }
    if (editor.codeInspector) {
      const heading = editor.codeInspector.querySelector('h3');
      if (heading) heading.textContent = LABELS.codeBlock;
      const label = editor.codeInspector.querySelector('label');
      if (label && label.firstChild) label.firstChild.textContent = LABELS.language;
      const refresh = editor.root.querySelector('[data-action="refresh-code-highlight"]');
      if (refresh) refresh.innerHTML = ICONS['refresh-code-highlight'].svg + '<span>' + LABELS.refreshHighlight + '</span>';
    }
    const deleteBtn = root.querySelector('[data-action="remove-selected-node"]');
    if (deleteBtn) deleteBtn.innerHTML = ICONS['delete-node'].svg + '<span>' + LABELS.deleteNode + '</span>';
    if (editor.searchInput) editor.searchInput.placeholder = LABELS.search;
    if (editor.replaceInput) editor.replaceInput.placeholder = LABELS.replace;
    const sourceHeaders = root.querySelectorAll('#sourcePanel .source-card header strong');
    if (sourceHeaders[0]) sourceHeaders[0].textContent = LABELS.markdownSource;
    if (sourceHeaders[1]) sourceHeaders[1].textContent = LABELS.preview;
    if (editor.restoreNowBtn) editor.restoreNowBtn.textContent = LABELS.restore;
    if (editor.dismissRestoreBtn) editor.dismissRestoreBtn.textContent = LABELS.dismiss;
  }

  function iconizeTopButtons(editor) {
    const root = editor.root;
    root.querySelectorAll('.toolbar [data-action], .toolbar [data-format], .floating-toolbar [data-bubble-action], .topbar-right [data-action]').forEach((button) => {
      const key = button.dataset.action || button.dataset.format || button.dataset.bubbleAction;
      applyButtonIcon(button, key);
    });
    root.querySelectorAll('[data-action="search-prev"], [data-action="search-next"]').forEach((button) => {
      button.innerHTML = (button.dataset.action === 'search-prev' ? svg('<path d="m15 18-6-6 6-6"/>') : svg('<path d="m9 18 6-6-6-6"/>')) + '<span class="sr-only">' + escapeHtml(button.dataset.action === 'search-prev' ? 'Previous result' : 'Next result') + '</span>';
      button.classList.add('tool-btn');
    });
  }

  function installInspectorSectionVisibility(editor) {
    const root = editor.root;
    const body = root.querySelector('#inspectorPanel .panel-body');
    if (body) Array.from(body.children).forEach((child) => { if (child.id !== 'nodeInspector') child.hidden = true; });

    function showOnly(targetKey) {
      const intro = editor.nodeInspector ? editor.nodeInspector.querySelector(':scope > p') : null;
      if (editor.imageInspector) editor.imageInspector.hidden = targetKey !== 'imageInspector';
      if (editor.tableInspector) editor.tableInspector.hidden = targetKey !== 'tableInspector';
      if (editor.latexInspector) editor.latexInspector.hidden = targetKey !== 'latexInspector';
      if (editor.codeInspector) editor.codeInspector.hidden = targetKey !== 'codeInspector';
      if (editor.nodeInspector) editor.nodeInspector.hidden = !targetKey;
      const removeBtn = root.querySelector('[data-action="remove-selected-node"]');
      if (removeBtn) removeBtn.hidden = !targetKey;
      if (intro) intro.hidden = !!targetKey;
    }

    const proto = Object.getPrototypeOf(editor);
    const originalSetInspectorVisibility = proto.setInspectorVisibility;
    proto.setInspectorVisibility = function patchedSetInspectorVisibility(visible) {
      originalSetInspectorVisibility.call(this, visible);
      if (!visible) showOnly(null);
    };

    const originalShowImageInspector = proto.showImageInspector;
    proto.showImageInspector = function patchedShowImageInspector(figure) {
      showOnly('imageInspector');
      originalShowImageInspector.call(this, figure);
      this.setInspectorVisibility(true);
    };
    const originalShowTableInspector = proto.showTableInspector;
    proto.showTableInspector = function patchedShowTableInspector(table) {
      showOnly('tableInspector');
      originalShowTableInspector.call(this, table);
      this.setInspectorVisibility(true);
    };
    const originalShowLatexInspector = proto.showLatexInspector;
    proto.showLatexInspector = function patchedShowLatexInspector(node) {
      showOnly('latexInspector');
      originalShowLatexInspector.call(this, node);
      this.setInspectorVisibility(true);
    };
    const originalShowCodeInspector = proto.showCodeInspector;
    proto.showCodeInspector = function patchedShowCodeInspector(node) {
      showOnly('codeInspector');
      originalShowCodeInspector.call(this, node);
      this.setInspectorVisibility(true);
    };
    showOnly(null);
  }

  function installInspectorButtons(editor) {
    if (editor.imageAlignSelect) {
      let row = editor.root.querySelector('.align-button-row');
      if (!row) {
        row = document.createElement('div');
        row.className = 'align-button-row';
        row.innerHTML = [
          '<button type="button" class="tool-btn" data-image-align="left">' + ICONS['align-image-left'].svg + '<span class="sr-only">Align image left</span></button>',
          '<button type="button" class="tool-btn" data-image-align="center">' + ICONS['align-image-center'].svg + '<span class="sr-only">Align image center</span></button>',
          '<button type="button" class="tool-btn" data-image-align="right">' + ICONS['align-image-right'].svg + '<span class="sr-only">Align image right</span></button>'
        ].join('');
        const label = editor.imageAlignSelect.closest('label');
        if (label) {
          label.hidden = true;
          label.insertAdjacentElement('beforebegin', row);
        }
      }
      editor.root.addEventListener('click', (event) => {
        const button = event.target.closest('[data-image-align]');
        if (!button) return;
        if (editor.imageAlignSelect) editor.imageAlignSelect.value = button.dataset.imageAlign;
        editor.updateSelectedImageAlign?.();
        row.querySelectorAll('[data-image-align]').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.imageAlign === button.dataset.imageAlign));
      });
    }
    const tableButtons = editor.root.querySelectorAll('#tableInspector [data-action^="table-"]');
    tableButtons.forEach((button) => {
      const action = button.dataset.action;
      const spec = ICONS[action];
      if (!spec) return;
      button.innerHTML = spec.svg + '<span class="sr-only">' + escapeHtml(spec.label) + '</span>';
      button.title = spec.label;
      button.setAttribute('aria-label', spec.label);
      button.className = 'tool-btn inspector-icon-btn';
      if (action === 'table-remove' || action.indexOf('del') !== -1) button.classList.add('is-danger');
    });
    const deleteNodeBtn = editor.root.querySelector('[data-action="remove-selected-node"]');
    if (deleteNodeBtn) {
      deleteNodeBtn.innerHTML = ICONS['delete-node'].svg + '<span>' + LABELS.deleteNode + '</span>';
    }
    const refreshBtn = editor.root.querySelector('[data-action="refresh-code-highlight"]');
    if (refreshBtn) refreshBtn.innerHTML = ICONS['refresh-code-highlight'].svg + '<span>' + LABELS.refreshHighlight + '</span>';
  }

  function restoreSelection(editor) {
    const range = editor.selectionRange;
    if (!range) return;
    const selection = document.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    try { selection.addRange(range.cloneRange()); } catch (error) {}
  }

  function installTablePicker(editor) {
    if (editor.root.querySelector('#tablePicker')) return;
    const picker = document.createElement('div');
    picker.id = 'tablePicker';
    picker.className = 'table-picker';
    picker.hidden = true;
    const grid = document.createElement('div');
    grid.className = 'table-picker-grid';
    for (let row = 1; row <= 8; row += 1) {
      for (let col = 1; col <= 8; col += 1) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'table-picker-cell';
        cell.dataset.rows = String(row);
        cell.dataset.cols = String(col);
        grid.appendChild(cell);
      }
    }
    picker.innerHTML = '<div class="table-picker-meta" id="tablePickerMeta">5 × 4</div>' +
      '<div class="table-picker-fields">' +
        '<label>' + LABELS.rows + '<input id="tablePickerRows" type="number" min="1" max="20" value="5"></label>' +
        '<label>' + LABELS.cols + '<input id="tablePickerCols" type="number" min="1" max="20" value="4"></label>' +
      '</div>' +
      '<div class="table-picker-actions">' +
        '<button type="button" class="subtle" data-table-picker-close="true">' + LABELS.cancel + '</button>' +
        '<button type="button" class="primary" data-table-picker-insert="true">' + LABELS.insert + '</button>' +
      '</div>';
    picker.prepend(grid);
    editor.root.appendChild(picker);
    editor.tablePicker = picker;
    editor.tablePickerGrid = grid;
    editor.tablePickerMeta = picker.querySelector('#tablePickerMeta');
    editor.tablePickerRows = picker.querySelector('#tablePickerRows');
    editor.tablePickerCols = picker.querySelector('#tablePickerCols');

    editor.updateTablePickerPreview = function updateTablePickerPreview(rows, cols) {
      const rowCount = Math.max(1, Math.min(20, Number(rows) || 1));
      const colCount = Math.max(1, Math.min(20, Number(cols) || 1));
      if (editor.tablePickerRows) editor.tablePickerRows.value = String(rowCount);
      if (editor.tablePickerCols) editor.tablePickerCols.value = String(colCount);
      if (editor.tablePickerMeta) editor.tablePickerMeta.textContent = rowCount + ' × ' + colCount;
      editor.tablePickerGrid.querySelectorAll('.table-picker-cell').forEach((cell) => {
        const active = Number(cell.dataset.rows) <= rowCount && Number(cell.dataset.cols) <= colCount;
        const edge = Number(cell.dataset.rows) === Math.min(rowCount, 8) && Number(cell.dataset.cols) <= Math.min(colCount, 8)
          || Number(cell.dataset.cols) === Math.min(colCount, 8) && Number(cell.dataset.rows) <= Math.min(rowCount, 8);
        cell.classList.toggle('is-active', active && Number(cell.dataset.rows) <= 8 && Number(cell.dataset.cols) <= 8);
        cell.classList.toggle('is-edge', edge && rowCount <= 8 && colCount <= 8);
      });
      editor.__tablePickerRows = rowCount;
      editor.__tablePickerCols = colCount;
    };

    editor.hideTablePicker = function hideTablePicker() {
      if (editor.tablePicker) editor.tablePicker.hidden = true;
    };

    editor.showTablePicker = function showTablePicker(anchor) {
      const button = anchor || editor.root.querySelector('.toolbar [data-action="table"]');
      if (!button || !editor.tablePicker) return;
      editor.captureSelection?.();
      const buttonRect = button.getBoundingClientRect();
      const rootRect = editor.root.getBoundingClientRect();
      editor.tablePicker.style.left = (buttonRect.left - rootRect.left) + 'px';
      editor.tablePicker.style.top = (buttonRect.bottom - rootRect.top + 10) + 'px';
      editor.updateTablePickerPreview(editor.__tablePickerRows || 5, editor.__tablePickerCols || 4);
      editor.tablePicker.hidden = false;
    };

    editor.insertTableWithSize = function insertTableWithSize(rows, cols) {
      editor.hideTablePicker();
      restoreSelection(editor);
      const rowCount = Math.max(1, Math.min(20, Number(rows) || 3));
      const colCount = Math.max(1, Math.min(20, Number(cols) || 3));
      let html = '<table><thead><tr>';
      for (let c = 0; c < colCount; c += 1) html += '<th>' + LABELS.headers + ' ' + (c + 1) + '</th>';
      html += '</tr></thead><tbody>';
      for (let r = 0; r < rowCount - 1; r += 1) {
        html += '<tr>';
        for (let c = 0; c < colCount; c += 1) html += '<td>' + LABELS.cell + ' ' + (r + 1) + '-' + (c + 1) + '</td>';
        html += '</tr>';
      }
      html += '</tbody></table><p></p>';
      editor.insertHTML(html);
    };

    editor.tablePickerGrid.addEventListener('mouseenter', (event) => {
      const cell = event.target.closest('.table-picker-cell');
      if (!cell) return;
      editor.updateTablePickerPreview(cell.dataset.rows, cell.dataset.cols);
    }, true);
    editor.tablePickerGrid.addEventListener('click', (event) => {
      const cell = event.target.closest('.table-picker-cell');
      if (!cell) return;
      editor.insertTableWithSize(cell.dataset.rows, cell.dataset.cols);
    });
    editor.tablePickerRows.addEventListener('input', () => editor.updateTablePickerPreview(editor.tablePickerRows.value, editor.tablePickerCols.value));
    editor.tablePickerCols.addEventListener('input', () => editor.updateTablePickerPreview(editor.tablePickerRows.value, editor.tablePickerCols.value));
    picker.addEventListener('click', (event) => {
      if (event.target.closest('[data-table-picker-close]')) editor.hideTablePicker();
      if (event.target.closest('[data-table-picker-insert]')) editor.insertTableWithSize(editor.tablePickerRows.value, editor.tablePickerCols.value);
    });
    document.addEventListener('mousedown', (event) => {
      if (picker.hidden) return;
      if (picker.contains(event.target)) return;
      const tableBtn = editor.root.querySelector('.toolbar [data-action="table"]');
      if (tableBtn && tableBtn.contains(event.target)) return;
      editor.hideTablePicker();
    });

    const proto = Object.getPrototypeOf(editor);
    proto.insertTable = function patchedInsertTable() {
      if (this.state.readOnly) return;
      this.showTablePicker(this.root.querySelector('.toolbar [data-action="table"]'));
    };
    proto.modifyTable = function patchedModifyTable(action) {
      const table = this.state.selectedTable || this.getClosestTableFromSelection?.();
      if (!table) return;
      const selection = document.getSelection();
      let cell = selection && selection.anchorNode ? (selection.anchorNode.nodeType === Node.ELEMENT_NODE ? selection.anchorNode.closest('td,th') : selection.anchorNode.parentElement && selection.anchorNode.parentElement.closest('td,th')) : null;
      if (!cell) cell = table.querySelector('tbody td, thead th, td, th');
      if (action === 'remove') {
        table.remove();
        this.state.selectedTable = null;
        this.detectSelectedNode?.();
        this.scheduleSave?.();
        this.updateStats?.();
        return;
      }
      if (!cell) return;
      const row = cell.parentElement;
      const rowIndex = Array.from(table.rows).indexOf(row);
      const colIndex = Array.from(row.cells).indexOf(cell);
      switch (action) {
        case 'add-row': {
          const insertAt = rowIndex + 1;
          const newRow = table.insertRow(insertAt);
          for (let i = 0; i < row.cells.length; i += 1) {
            const source = row.cells[i];
            const created = document.createElement(source.tagName.toLowerCase());
            created.innerHTML = source.tagName.toLowerCase() === 'th' ? LABELS.headers : LABELS.cell;
            newRow.appendChild(created);
          }
          break;
        }
        case 'add-col': {
          Array.from(table.rows).forEach((rowEl) => {
            const source = rowEl.cells[colIndex] || rowEl.cells[rowEl.cells.length - 1];
            const created = document.createElement((source?.tagName || 'td').toLowerCase());
            created.innerHTML = created.tagName === 'th' ? LABELS.headers : LABELS.cell;
            rowEl.insertBefore(created, rowEl.cells[colIndex + 1] || null);
          });
          break;
        }
        case 'del-row': {
          if (table.rows.length > 1) table.deleteRow(rowIndex);
          break;
        }
        case 'del-col': {
          Array.from(table.rows).forEach((rowEl) => { if (rowEl.cells.length > 1) rowEl.deleteCell(colIndex); });
          break;
        }
      }
      this.showTableInspector?.(table);
      this.scheduleSave?.();
      this.updateStats?.();
    };
  }

  function installCodeHighlighter(editor) {
    const proto = Object.getPrototypeOf(editor);
    proto.getExplicitCodeLanguage = function patchedGetExplicitCodeLanguage(code) {
      if (!code) return '';
      const pre = code.closest('pre');
      const classLang = Array.from(code.classList).find((name) => name.indexOf('language-') === 0);
      const raw = code.getAttribute('data-language') || (pre && pre.getAttribute('data-language')) || (classLang ? classLang.replace(/^language-/, '') : '') || (code.classList.contains('nohighlight') ? 'nohighlight' : '');
      return normalizeLang(raw);
    };
    proto.extractCodeLanguage = function patchedExtractCodeLanguage(code) {
      const raw = code && (code.dataset.rawCode != null ? code.dataset.rawCode : code.textContent) || '';
      return detectLanguage(raw, this.getExplicitCodeLanguage(code));
    };
    proto.normalizeCodeBlock = function patchedNormalizeCodeBlock(pre) {
      if (!pre) return null;
      pre.classList.add('code-block-shell');
      let code = pre.querySelector('code');
      if (!code) {
        code = document.createElement('code');
        code.textContent = pre.textContent || '';
        pre.innerHTML = '';
        pre.appendChild(code);
      }
      const raw = code.dataset.rawCode != null ? code.dataset.rawCode : (code.textContent || '');
      code.dataset.rawCode = raw;
      code.textContent = raw;
      code.setAttribute('spellcheck', 'false');
      code.setAttribute('autocapitalize', 'off');
      code.setAttribute('autocorrect', 'off');
      code.setAttribute('contenteditable', String(!this.state.readOnly));
      const explicit = this.getExplicitCodeLanguage(code);
      Array.from(code.classList).forEach((name) => {
        if (name === 'hljs' || name === 'hljs-fallback' || name === 'nohighlight' || name.indexOf('language-') === 0) code.classList.remove(name);
      });
      if (explicit && explicit !== 'auto') {
        code.dataset.language = explicit;
        pre.dataset.language = explicit;
        if (explicit === 'nohighlight') code.classList.add('nohighlight');
        else code.classList.add('language-' + explicit);
      } else {
        code.dataset.language = 'auto';
        pre.dataset.language = 'auto';
      }
      return code;
    };
    proto.prepareCodeBlockForEditing = function patchedPrepareCodeBlockForEditing(code) {
      const normalized = this.normalizeCodeBlock(code && code.closest('pre'));
      if (!normalized || this.state.readOnly) return;
      normalized.dataset.editing = 'true';
      normalized.textContent = normalized.dataset.rawCode != null ? normalized.dataset.rawCode : normalized.textContent || '';
      normalized.className = '';
      normalized.contentEditable = 'true';
      this.state.selectedCodeBlock = normalized;
      this.showCodeInspector?.(normalized);
    };
    proto.finalizeCodeBlockEditing = function patchedFinalizeCodeBlockEditing(code) {
      const normalized = this.normalizeCodeBlock(code && code.closest('pre'));
      if (!normalized) return;
      normalized.dataset.rawCode = normalized.textContent || '';
      normalized.dataset.editing = 'false';
      normalized.contentEditable = 'false';
      this.renderHighlightedCodeElement(normalized);
      this.showCodeInspector?.(normalized);
    };
    proto.renderHighlightedCodeElement = function patchedRenderHighlightedCodeElement(code) {
      if (!code) return;
      const pre = code.closest('pre');
      const raw = code.dataset.rawCode != null ? code.dataset.rawCode : (code.textContent || '');
      const explicit = this.getExplicitCodeLanguage(code);
      const result = renderHighlightedHtml(raw, explicit);
      code.dataset.rawCode = raw;
      code.dataset.language = result.language;
      code.className = result.language === 'nohighlight' ? 'nohighlight' : 'hljs hljs-fallback language-' + result.language;
      if (result.language === 'nohighlight' || result.language === 'plaintext') code.textContent = raw;
      else code.innerHTML = result.html;
      if (pre) pre.dataset.language = result.language;
    };
    proto.highlightCodeBlocksInside = function patchedHighlightCodeBlocksInside(root) {
      const scope = root || this.editor;
      if (!scope) return;
      scope.querySelectorAll('pre').forEach((pre) => {
        const code = this.normalizeCodeBlock(pre);
        if (!code || code.dataset.editing === 'true') return;
        code.contentEditable = 'false';
        this.renderHighlightedCodeElement(code);
      });
    };
    proto.highlightAllCodeBlocks = function patchedHighlightAllCodeBlocks() {
      this.highlightCodeBlocksInside(this.editor);
      const preview = this.root.querySelector('#markdownPreview');
      if (preview) this.highlightCodeBlocksInside(preview);
    };
    proto.showCodeInspector = function patchedShowCodeInspector(code) {
      if (!this.codeInspector || !code) return;
      if (this.nodeInspector) this.nodeInspector.hidden = false;
      if (this.codeInspector) this.codeInspector.hidden = false;
      const language = this.extractCodeLanguage(code);
      if (this.codeLanguageSelect) {
        if (![...this.codeLanguageSelect.options].some((option) => option.value === language)) {
          const option = document.createElement('option');
          option.value = language;
          option.textContent = language;
          this.codeLanguageSelect.appendChild(option);
        }
        this.codeLanguageSelect.value = language;
      }
      if (this.codeInfo) {
        const raw = code.dataset.rawCode != null ? code.dataset.rawCode : (code.textContent || '');
        const lineCount = raw ? raw.split('\n').length : 0;
        this.codeInfo.textContent = language + ' · ' + lineCount + ' line' + (lineCount === 1 ? '' : 's');
      }
    };
    proto.updateSelectedCodeLanguage = function patchedUpdateSelectedCodeLanguage() {
      const code = this.state.selectedCodeBlock;
      if (!code || !this.codeLanguageSelect) return;
      const lang = normalizeLang(this.codeLanguageSelect.value) || 'plaintext';
      code.dataset.language = lang;
      const pre = code.closest('pre');
      if (pre) pre.dataset.language = lang;
      this.renderHighlightedCodeElement(code);
      this.showCodeInspector(code);
      this.scheduleSave?.();
    };
    proto.refreshSelectedCodeBlock = function patchedRefreshSelectedCodeBlock() {
      const code = this.state.selectedCodeBlock;
      if (!code) return;
      this.renderHighlightedCodeElement(code);
      this.showCodeInspector(code);
      this.scheduleSave?.();
    };
  }

  function patchInstallDemo(editor) {
    const proto = Object.getPrototypeOf(editor);
    proto.installDemoContent = function patchedInstallDemoContent() {
      if (this.editor.innerHTML.trim()) return;
      this.editor.innerHTML = [
        '<h1>Local rich text editor</h1>',
        '<p>Use the toolbar to format text, insert images, write Markdown, and edit formulas.</p>',
        '<blockquote>Insert inline math such as <span class="latex-node" data-latex="\\int_0^1 x^2\\,dx=\\frac{1}{3}" data-display="false" contenteditable="false"></span>.</blockquote>',
        '<pre class="code-block-shell" data-language="javascript"><code class="language-javascript" data-language="javascript" spellcheck="false">function hello(name) {\n  return `Hello, ${name}!`;\n}</code></pre>',
        '<ul><li>Markdown panel</li><li>Base64 image compression</li><li>Tables with row and column controls</li></ul>'
      ].join('');
    };
  }

  function patchEditor(editor) {
    if (!editor || editor.__finalHotfix15Applied) return;
    editor.__finalHotfix15Applied = true;
    const proto = Object.getPrototypeOf(editor);
    if (typeof proto.setupLanguagePicker === 'function') proto.setupLanguagePicker = function noopLanguagePicker() {};
    if (typeof proto.updateModeBadges === 'function') proto.updateModeBadges = function noopModeBadge() {};
    editor.root.querySelector('#restoreBanner') && (editor.root.querySelector('#restoreBanner').hidden = true);
    const oldStyle = document.getElementById('local-rich-editor-final-hotfix15-style');
    if (!oldStyle) {
      const style = document.createElement('style');
      style.id = 'local-rich-editor-final-hotfix15-style';
      style.textContent = EXTRA_STYLE;
      document.head.appendChild(style);
    }
    setEnglishChrome(editor);
    iconizeTopButtons(editor);
    installInspectorButtons(editor);
    installInspectorSectionVisibility(editor);
    installTablePicker(editor);
    installCodeHighlighter(editor);
    patchInstallDemo(editor);
    if (editor.root.querySelector('#langPickerWrap')) editor.root.querySelector('#langPickerWrap').remove();
    if (editor.root.querySelector('#modeBadge')) editor.root.querySelector('#modeBadge').remove();
    editor.forceRefreshRenderedEnhancements?.();
    editor.detectSelectedNode?.();
    editor.highlightAllCodeBlocks?.();
    editor.renderMath?.();
    editor.updateRenderedSourcePreview?.();
    console.log('[LocalRichEditor] final hotfix applied', BUILD);
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => waitForEditor(patchEditor));
  } else {
    waitForEditor(patchEditor);
  }
})();
(function(){
  'use strict';
  function waitForEditor(callback){
    if(window.localRichEditor){callback(window.localRichEditor);return;}
    let tries=0;const timer=setInterval(()=>{tries+=1;if(window.localRichEditor){clearInterval(timer);callback(window.localRichEditor);}else if(tries>240){clearInterval(timer);}},50);
  }
  waitForEditor((editor)=>{
    const proto=Object.getPrototypeOf(editor);
    if(proto.__labelIconHotfix15) return;
    proto.__labelIconHotfix15=true;
    const originalUpdateToolLabels=typeof proto.updateToolLabels==='function'?proto.updateToolLabels:null;
    proto.updateToolLabels=function hotfixUpdateToolLabels(){
      if(originalUpdateToolLabels) originalUpdateToolLabels.call(this);
      const apply=(selector, action)=>{
        const button=this.root.querySelector(selector);
        if(!button) return;
        if(action==='remove-selected-node'){
          button.innerHTML='<svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 7h14"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M7 7l1 13a1 1 0 0 0 1 .9h6a1 1 0 0 0 1-.9L17 7"/></svg><span>Delete selected node</span>';
        }
        if(action==='refresh-code-highlight'){
          button.innerHTML='<svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 11a8 8 0 0 0-14.9-4"/><path d="M4 5v5h5"/><path d="M4 13a8 8 0 0 0 14.9 4"/><path d="M20 19v-5h-5"/></svg><span>Refresh highlight</span>';
        }
      };
      apply('[data-action="remove-selected-node"]','remove-selected-node');
      apply('[data-action="refresh-code-highlight"]','refresh-code-highlight');
    };
    editor.updateToolLabels?.();
  });
})();
(function(){
  'use strict';

  const PATCH_ID = 'local-rich-editor-patch-20260328-15';

  function ensureStyle(id, css) {
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function waitForEditor(callback) {
    if (window.localRichEditor) {
      callback(window.localRichEditor);
      return;
    }
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (window.localRichEditor) {
        clearInterval(timer);
        callback(window.localRichEditor);
      } else if (tries > 400) {
        clearInterval(timer);
      }
    }, 25);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function svg(paths, opts = {}) {
    const cls = opts.cls || 'tool-icon';
    const viewBox = opts.viewBox || '0 0 24 24';
    return `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true" focusable="false">${paths}</svg>`;
  }

  function textSvg(label, size = 9.5) {
    return `<svg class="tool-icon tool-icon-text" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><text x="12" y="15.25" text-anchor="middle" font-size="${size}">${escapeHtml(label)}</text></svg>`;
  }

  const ICONS = {
    help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4"/><path d="M12 17h.01"/>'),
    'new-doc': svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M12 18v-6"/><path d="M9 15h6"/>'),
    import: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>'),
    'export-md': textSvg('MD', 9.1),
    'export-html': textSvg('HTML', 5.7),
    'export-json': textSvg('JSON', 5.7),
    undo: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h9a7 7 0 1 1 0 14h-2"/>'),
    redo: svg('<path d="m15 14 5-5-5-5"/><path d="M20 9h-9a7 7 0 1 0 0 14h2"/>'),
    'save-snapshot': svg('<path d="M5 4h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M7 4v6h8V4"/><path d="M8 18h8"/>'),
    bold: svg('<path d="M7 5h7a4 4 0 0 1 0 8H7z"/><path d="M7 13h8a4 4 0 0 1 0 8H7z"/>'),
    italic: svg('<path d="M15 4h-6"/><path d="M13 20H7"/><path d="M11 4 9 20"/>'),
    underline: svg('<path d="M8 4v6a4 4 0 0 0 8 0V4"/><path d="M5 20h14"/>'),
    strike: svg('<path d="M4 12h16"/><path d="M8 6.5c0-1.7 1.8-3 4-3 2 0 3.7 1 4 2.5"/><path d="M8 17.5c.4 1.5 2 2.5 4 2.5 2.2 0 4-1.3 4-3"/>'),
    'inline-code': svg('<path d="m9 18-6-6 6-6"/><path d="m15 6 6 6-6 6"/><path d="m14 4-4 16"/>'),
    'clear-format': svg('<path d="M6 5h12"/><path d="M10 5v14"/><path d="m4 20 16-16"/><path d="m14 17 4 4"/>'),
    paragraph: textSvg('P', 11),
    h1: textSvg('H1', 8.4),
    h2: textSvg('H2', 8.4),
    h3: textSvg('H3', 8.4),
    blockquote: svg('<path d="M10 7H6a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2l-1 4"/><path d="M20 7h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2l-1 4"/>'),
    'code-block': svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m8 10-2 2 2 2"/><path d="m16 10 2 2-2 2"/><path d="m13 8-2 8"/>'),
    ul: svg('<path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>'),
    ol: svg('<path d="M10 6h10"/><path d="M10 12h10"/><path d="M10 18h10"/><path d="M4 5h1v4"/><path d="M3.5 9h3"/><path d="M4 13c.8 0 1.5.5 1.5 1.2 0 .5-.3.9-.8 1.2L3.5 17h2.5"/>'),
    task: svg('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 2.5 2.5L16 9"/>'),
    link: svg('<path d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 13"/><path d="M14 11a5 5 0 0 1 0 7L12.5 19.5a5 5 0 0 1-7-7L7 11"/>'),
    comment: svg('<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
    'align-left': svg('<path d="M4 6h16"/><path d="M4 12h10"/><path d="M4 18h13"/>'),
    'align-center': svg('<path d="M4 6h16"/><path d="M7 12h10"/><path d="M5.5 18h13"/>'),
    'align-right': svg('<path d="M4 6h16"/><path d="M10 12h10"/><path d="M7 18h13"/>'),
    table: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M3 16h18"/><path d="M9 4v16"/><path d="M15 4v16"/>'),
    image: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="m21 16-5.5-5.5L7 19"/>'),
    'latex-inline': textSvg('∫', 13),
    'latex-block': textSvg('∑', 13),
    hr: svg('<path d="M4 12h16"/><path d="M4 8h6"/><path d="M14 16h6"/>'),
    'toggle-source': textSvg('MD', 9.1),
    'apply-source': svg('<path d="M5 12h9"/><path d="m10 7 4 5-4 5"/><path d="M5 5h14v14H5z"/>'),
    'sync-source': svg('<path d="M21 12a9 9 0 0 1-15.5 6.4"/><path d="M3 12A9 9 0 0 1 18.5 5.6"/><path d="M3 17v-4h4"/><path d="M21 7v4h-4"/>'),
    'split-view': svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14"/>'),
    'search-panel': svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    'toggle-dark': svg('<path d="M12 3a7 7 0 1 0 9 9A9 9 0 1 1 12 3z"/>'),
    'toggle-outline': svg('<path d="M6 6h12"/><path d="M6 12h12"/><path d="M6 18h8"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>'),
    'toggle-inspector': svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c0 .66.39 1.26 1 1.5H21a2 2 0 0 1 0 4h-.09c-.61.24-1 .84-1 1.5Z"/>'),
    'refresh-code-highlight': svg('<path d="M21 12a9 9 0 0 1-15.5 6.4"/><path d="M3 12A9 9 0 0 1 18.5 5.6"/><path d="M3 17v-4h4"/><path d="M21 7v4h-4"/>'),
    'remove-selected-node': svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>'),
    'table-add-row': svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M3 16h18"/><path d="M9 5v14"/><path d="M15 5v14"/><path d="M12 2v4"/><path d="M10 4h4"/>'),
    'table-add-col': svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M3 16h18"/><path d="M9 5v14"/><path d="M15 5v14"/><path d="M20 12h4"/><path d="M22 10v4"/>', { viewBox:'0 0 28 24' }),
    'table-del-row': svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M3 16h18"/><path d="M9 5v14"/><path d="M15 5v14"/><path d="M10 2h4"/>'),
    'table-del-col': svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M3 16h18"/><path d="M9 5v14"/><path d="M15 5v14"/><path d="M20 12h4"/>', { viewBox:'0 0 28 24' }),
    'table-remove': svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M3 16h18"/><path d="M9 5v14"/><path d="M15 5v14"/><path d="m6 6 12 12"/><path d="M18 6 6 18"/>'),
    'align-image-left': svg('<rect x="4" y="6" width="8" height="10" rx="1.5"/><path d="M4 19h16"/><path d="M4 4h16"/>'),
    'align-image-center': svg('<rect x="8" y="6" width="8" height="10" rx="1.5"/><path d="M4 19h16"/><path d="M4 4h16"/>'),
    'align-image-right': svg('<rect x="12" y="6" width="8" height="10" rx="1.5"/><path d="M4 19h16"/><path d="M4 4h16"/>')
  };

  const LABELS = {
    help: 'Help',
    'new-doc': 'New document',
    import: 'Import',
    'export-md': 'Export Markdown',
    'export-html': 'Export HTML',
    'export-json': 'Export JSON',
    undo: 'Undo',
    redo: 'Redo',
    'save-snapshot': 'Save snapshot',
    bold: 'Bold',
    italic: 'Italic',
    underline: 'Underline',
    strike: 'Strike',
    'inline-code': 'Inline code',
    'clear-format': 'Clear formatting',
    paragraph: 'Paragraph',
    h1: 'Heading 1',
    h2: 'Heading 2',
    h3: 'Heading 3',
    blockquote: 'Quote',
    'code-block': 'Code block',
    ul: 'Bulleted list',
    ol: 'Numbered list',
    task: 'Checklist',
    link: 'Link',
    comment: 'Comment',
    'align-left': 'Align left',
    'align-center': 'Align center',
    'align-right': 'Align right',
    table: 'Insert table',
    image: 'Insert image',
    'latex-inline': 'Inline formula',
    'latex-block': 'Block formula',
    hr: 'Divider',
    'toggle-source': 'Markdown panel',
    'apply-source': 'Apply source',
    'sync-source': 'Sync source',
    'split-view': 'Split view',
    'search-panel': 'Search',
    'toggle-dark': 'Dark mode',
    'toggle-outline': 'Outline',
    'toggle-inspector': 'Inspector',
    'refresh-code-highlight': 'Refresh highlight',
    'remove-selected-node': 'Delete selected node',
    'table-add-row': 'Add row',
    'table-add-col': 'Add column',
    'table-del-row': 'Delete row',
    'table-del-col': 'Delete column',
    'table-remove': 'Delete table'
  };

  function normalizeLangName(language) {
    const value = String(language || '').trim().toLowerCase();
    const aliases = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      shell: 'bash', sh: 'bash', zsh: 'bash', console: 'bash', text: 'plaintext', txt: 'plaintext',
      md: 'markdown', yml: 'yaml', xml: 'html', htmlmixed: 'html', cjs: 'javascript', mjs: 'javascript'
    };
    return aliases[value] || value || 'plaintext';
  }

  function wordRegex(words) {
    return new RegExp('\\b(' + words.map((w) => w.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')).join('|') + ')\\b', 'g');
  }

  const JS_KEYWORDS = wordRegex(['break','case','catch','class','const','continue','default','delete','do','else','export','extends','finally','for','from','function','if','import','in','instanceof','let','new','of','return','switch','throw','try','typeof','var','void','while','with','yield','async','await','static','this','super','true','false','null','undefined']);
  const JS_BUILTINS = wordRegex(['Array','Boolean','Date','Error','Function','JSON','Map','Math','Number','Object','Promise','RegExp','Set','String','Symbol','console','document','window','globalThis','fetch']);
  const PY_KEYWORDS = wordRegex(['and','as','assert','async','await','break','class','continue','def','del','elif','else','except','False','finally','for','from','global','if','import','in','is','lambda','None','nonlocal','not','or','pass','raise','return','True','try','while','with','yield']);
  const BASH_KEYWORDS = wordRegex(['if','then','else','fi','for','in','do','done','case','esac','function','echo','export','local','readonly','while','until','return']);
  const SQL_KEYWORDS = wordRegex(['select','from','where','join','left','right','inner','outer','on','group','by','order','insert','into','values','update','set','delete','create','table','alter','drop','as','and','or','not','null','limit','having','distinct']);
  const CSS_KEYWORDS = wordRegex(['display','position','color','background','font','padding','margin','border','width','height','grid','flex','absolute','relative','fixed','sticky','block','inline','none']);

  function stashMatches(text, defs) {
    let src = String(text || '');
    const stash = [];
    defs.forEach((def) => {
      src = src.replace(def.regex, (match) => {
        const key = `\uE000${stash.length}\uE001`;
        stash.push(`<span class="${def.className}">${escapeHtml(match)}</span>`);
        return key;
      });
    });
    return {
      src,
      restore(html) {
        return html.replace(/\uE000(\d+)\uE001/g, (_, i) => stash[Number(i)] || '');
      }
    };
  }

  function detectLanguage(text) {
    const value = String(text || '');
    if (/^\s*</.test(value) && /<\/?[A-Za-z][\w:-]*/.test(value)) return 'html';
    if (/^\s*[\[{]/.test(value) && /:\s*/.test(value)) return 'json';
    if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(value)) return 'sql';
    if (/^\s*#?!\/(usr\/bin\/env\s+)?(ba)?sh\b/.test(value) || /^\s*#!/.test(value) || /\bfi\b|\bthen\b|\becho\b/.test(value)) return 'bash';
    if (/^\s*def\s+\w+|^\s*class\s+\w+|\bimport\s+\w+/m.test(value)) return 'python';
    if (/^\s*[.#]?[\w-]+\s*\{/.test(value)) return 'css';
    if (/^\s*#{1,6}\s/m.test(value) || /^\s*[-*+]\s/m.test(value) || /```/.test(value)) return 'markdown';
    if (/\bfunction\b|\bconst\b|=>|console\.|return\s+[`'\"]/.test(value)) return 'javascript';
    return 'plaintext';
  }

  function chooseLanguage(requested, text) {
    const req = normalizeLangName(requested);
    const detected = detectLanguage(text);
    if (!req || req === 'auto' || req === 'plaintext') return detected;
    if (req === 'bash' && detected === 'javascript') return detected;
    if (req === 'nohighlight') return 'nohighlight';
    return req;
  }

  function highlightHtmlLike(text) {
    let html = escapeHtml(text);
    html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="hljs-comment">$1</span>');
    html = html.replace(/(&lt;\/?)([A-Za-z][\w:-]*)/g, '$1<span class="hljs-keyword">$2</span>');
    html = html.replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)(=)(&quot;.*?&quot;|&#39;.*?&#39;)/g, '<span class="hljs-attr">$1</span>$2<span class="hljs-string">$3</span>');
    return html;
  }

  function highlightJson(text) {
    let html = escapeHtml(text);
    html = html.replace(/(&quot;(?:\\.|[^&]|&(?!quot;))*?&quot;)(\s*:)/g, '<span class="hljs-attr">$1</span>$2');
    html = html.replace(/(:\s*)(&quot;(?:\\.|[^&]|&(?!quot;))*?&quot;)/g, '$1<span class="hljs-string">$2</span>');
    html = html.replace(/\b(true|false|null)\b/g, '<span class="hljs-literal">$1</span>');
    html = html.replace(/\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, '<span class="hljs-number">$1</span>');
    return html;
  }

  function highlightCss(text) {
    const tok = stashMatches(text, [
      { regex: /\/\*[\s\S]*?\*\//g, className: 'hljs-comment' },
      { regex: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, className: 'hljs-string' }
    ]);
    let html = escapeHtml(tok.src);
    html = html.replace(/([.#]?[A-Za-z_][\w-]*)(\s*\{)/g, '<span class="hljs-title class_">$1</span>$2');
    html = html.replace(/([A-Za-z-]+)(\s*:)/g, '<span class="hljs-attr">$1</span>$2');
    html = html.replace(CSS_KEYWORDS, '<span class="hljs-keyword">$1</span>');
    html = html.replace(/\b(#[0-9a-fA-F]{3,8}|\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw)?|auto)\b/g, '<span class="hljs-number">$1</span>');
    return tok.restore(html);
  }

  function highlightScriptLike(text, options = {}) {
    const comments = options.comments || [];
    const keywords = options.keywords || JS_KEYWORDS;
    const builtins = options.builtins || null;
    const defs = comments.map((regex) => ({ regex, className: 'hljs-comment' }));
    defs.push({ regex: /`(?:\\[\s\S]|[^`])*`/g, className: 'hljs-string' });
    defs.push({ regex: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, className: 'hljs-string' });
    defs.push({ regex: /\/(?![/*])(?:\\.|[^\/\\\n])+\/[dgimsuvy]*/g, className: 'hljs-regexp' });
    const tok = stashMatches(text, defs);
    let html = escapeHtml(tok.src);
    html = html.replace(/\b(function|def|class)\s+([A-Za-z_$][\w$]*)/g, '<span class="hljs-keyword">$1</span> <span class="hljs-title function_">$2</span>');
    html = html.replace(keywords, '<span class="hljs-keyword">$1</span>');
    if (builtins) html = html.replace(builtins, '<span class="hljs-built_in">$1</span>');
    html = html.replace(/\b(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/gi, '<span class="hljs-number">$1</span>');
    html = html.replace(/\b([A-Za-z_$][\w$]*)(?=\s*\()/g, '<span class="hljs-title function_">$1</span>');
    return tok.restore(html);
  }

  function highlightMarkdown(text) {
    let html = escapeHtml(text);
    html = html.replace(/^(#{1,6})(\s+.*)$/gm, '<span class="hljs-keyword">$1</span><span class="hljs-title">$2</span>');
    html = html.replace(/^(\s*[-*+]\s+)(.*)$/gm, '<span class="hljs-bullet">$1</span>$2');
    html = html.replace(/(```[\s\S]*?```)/g, '<span class="hljs-string">$1</span>');
    html = html.replace(/(`[^`]+`)/g, '<span class="hljs-string">$1</span>');
    html = html.replace(/(\[[^\]]+\]\([^\)]+\))/g, '<span class="hljs-link">$1</span>');
    return html;
  }

  function offlineHighlight(text, language) {
    const lang = chooseLanguage(language, text);
    if (lang === 'nohighlight' || lang === 'plaintext') return { language: lang, html: escapeHtml(text) };
    if (lang === 'html' || lang === 'xml') return { language: 'html', html: highlightHtmlLike(text) };
    if (lang === 'json') return { language: 'json', html: highlightJson(text) };
    if (lang === 'css') return { language: 'css', html: highlightCss(text) };
    if (lang === 'python') return { language: 'python', html: highlightScriptLike(text, { comments: [/#.*$/gm], keywords: PY_KEYWORDS, builtins: wordRegex(['print','len','range','str','int','float','list','dict','set','tuple','enumerate']) }) };
    if (lang === 'sql') return { language: 'sql', html: highlightScriptLike(text, { comments: [/--[^\n]*/g, /\/\*[\s\S]*?\*\//g], keywords: SQL_KEYWORDS, builtins: wordRegex(['count','sum','avg','min','max']) }) };
    if (lang === 'bash') return { language: 'bash', html: highlightScriptLike(text, { comments: [/#.*$/gm], keywords: BASH_KEYWORDS, builtins: wordRegex(['printf','echo','cd','pwd','grep','sed','awk','cat']) }) };
    if (lang === 'markdown') return { language: 'markdown', html: highlightMarkdown(text) };
    return { language: 'javascript', html: highlightScriptLike(text, { comments: [/\/\*[\s\S]*?\*\//g, /\/\/[^\n]*/g], keywords: JS_KEYWORDS, builtins: JS_BUILTINS }) };
  }

  const PATCH_CSS = `
    #app [hidden] { display: none !important; }
    #app #restoreBanner,
    #app #langPickerWrap,
    #app #modeBadge,
    #app .inline-banner,
    #app .topbar > .pill-row,
    #app [data-action="toggle-readonly"],
    #app #readonlyBadge,
    #app .panel.right .panel-body > .section:not(#nodeInspector) {
      display: none !important;
    }
    #app .topbar { grid-template-columns: minmax(240px, 1fr) auto !important; }
    #app .topbar-right { justify-content: flex-end; }
    #app .doc-subtitle { color: var(--muted); }
    #app .toolbar .tool-btn,
    #app .toolbar [data-action],
    #app .toolbar [data-format],
    #app .floating-toolbar button,
    #app .topbar-right button {
      min-width: var(--toolbar-btn-size);
      width: var(--toolbar-btn-size);
      height: var(--toolbar-btn-size);
      padding: 0 !important;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    #app .tool-btn .tool-icon,
    #app .floating-toolbar .tool-icon,
    #app .topbar-right .tool-icon {
      width: 20px;
      height: 20px;
      stroke: currentColor;
      fill: none;
      stroke-width: 1.9;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    #app .tool-btn .tool-icon.tool-icon-text text,
    #app .floating-toolbar .tool-icon.tool-icon-text text,
    #app .topbar-right .tool-icon.tool-icon-text text {
      fill: currentColor;
      stroke: none;
      font-weight: 700;
      font-family: Inter, system-ui, sans-serif;
      letter-spacing: -0.02em;
    }
    #app .floating-toolbar .tool-btn,
    #app .topbar-right .tool-btn { width: var(--toolbar-btn-size); }
    #app .panel.right .panel-body { display: block; }
    #app #nodeInspector {
      display: grid;
      gap: 14px;
      align-content: start;
    }
    #app #nodeInspector > .section { display: none !important; }
    #app #nodeInspector > .section.active-inspector { display: grid !important; }
    #app .align-button-row,
    #app .inspector-button-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0,1fr));
      gap: 8px;
    }
    #app .align-button-row .tool-btn,
    #app .inspector-button-grid .tool-btn {
      width: 100%;
      min-width: 0;
      height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border-radius: 10px;
    }
    #app .align-button-row .tool-btn.is-active,
    #app .inspector-button-grid .tool-btn.is-active {
      background: var(--accent-soft);
      color: var(--accent);
      border-color: color-mix(in srgb, var(--accent) 42%, var(--border));
    }
    #app .inspector-remove {
      width: 100%;
      justify-content: center;
    }
    #app .inspector-icon-btn.is-danger { color: var(--danger); }
    #app .table-picker-overlay {
      position: fixed;
      inset: 0;
      z-index: 80;
      pointer-events: none;
    }
    #app .table-picker-overlay.is-open { pointer-events: auto; }
    #app .table-picker-pop {
      position: absolute;
      min-width: 236px;
      padding: 14px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: color-mix(in srgb, var(--paper) 97%, transparent);
      box-shadow: var(--shadow);
      display: grid;
      gap: 12px;
      backdrop-filter: blur(12px);
    }
    #app .table-picker-grid {
      display: grid;
      grid-template-columns: repeat(10, 18px);
      gap: 2px;
      justify-content: start;
      user-select: none;
    }
    #app .table-picker-cell {
      width: 18px;
      height: 18px;
      border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
      background: var(--paper);
      border-radius: 3px;
    }
    #app .table-picker-cell.is-active {
      background: color-mix(in srgb, var(--accent) 16%, var(--paper));
      border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
    }
    #app .table-picker-size {
      text-align: center;
      font-weight: 600;
    }
    #app .table-picker-manual {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      align-items: end;
    }
    #app .table-picker-manual label {
      display: grid;
      gap: 4px;
      font-size: 0.85rem;
      color: var(--muted);
    }
    #app .table-picker-manual input {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--paper);
    }
    #app .table-picker-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    #app .table-picker-actions button {
      min-height: 34px;
      padding: 6px 12px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--paper);
      cursor: pointer;
    }
    #app .table-picker-actions .primary { color: #fff; }
    #app .document-page pre.code-block-shell,
    #app #markdownPreview pre {
      background: #f8fbff !important;
      color: #102033 !important;
      border: 1px solid #dbe6f3 !important;
    }
    body.dark #app .document-page pre.code-block-shell,
    body.dark #app #markdownPreview pre {
      background: #0c1424 !important;
      color: #e8eefc !important;
      border-color: #21314d !important;
    }
    #app .document-page pre.code-block-shell::before,
    #app #markdownPreview pre::before {
      background: rgba(37,99,235,.10) !important;
      color: #1d4ed8 !important;
      border: 1px solid rgba(37,99,235,.14) !important;
    }
    body.dark #app .document-page pre.code-block-shell::before,
    body.dark #app #markdownPreview pre::before {
      background: rgba(96,165,250,.14) !important;
      color: #93c5fd !important;
      border-color: rgba(96,165,250,.18) !important;
    }
    @media (max-width: 720px) {
      #app .table-picker-pop {
        left: 12px !important;
        right: 12px !important;
        width: auto !important;
      }
      #app .table-picker-grid {
        grid-template-columns: repeat(10, minmax(0, 1fr));
      }
    }
  `;

  function restoreEditorSelection(editor) {
    try {
      editor.editor.focus();
      const sel = document.getSelection();
      if (editor.selectionRange) {
        sel.removeAllRanges();
        sel.addRange(editor.selectionRange.cloneRange());
      }
    } catch (error) {
      editor.editor?.focus?.();
    }
  }

  function buildTablePicker(editor) {
    let overlay = editor.root.querySelector('#tablePickerOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'tablePickerOverlay';
    overlay.className = 'table-picker-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="table-picker-pop" id="tablePickerPop" role="dialog" aria-label="Insert table">
        <div class="table-picker-grid" id="tablePickerGrid"></div>
        <div class="table-picker-size" id="tablePickerSize">3 × 3</div>
        <div class="table-picker-manual">
          <label>Rows<input id="tableRowsInput" type="number" min="1" max="20" value="3"></label>
          <label>Columns<input id="tableColsInput" type="number" min="1" max="20" value="3"></label>
        </div>
        <div class="table-picker-actions">
          <button type="button" id="tablePickerCancel">Cancel</button>
          <button type="button" class="primary" id="tablePickerInsert">Insert</button>
        </div>
      </div>`;
    editor.root.appendChild(overlay);

    const grid = overlay.querySelector('#tablePickerGrid');
    const sizeLabel = overlay.querySelector('#tablePickerSize');
    const rowsInput = overlay.querySelector('#tableRowsInput');
    const colsInput = overlay.querySelector('#tableColsInput');
    const insertBtn = overlay.querySelector('#tablePickerInsert');
    const cancelBtn = overlay.querySelector('#tablePickerCancel');

    const setPreview = (rows, cols) => {
      overlay.dataset.rows = String(rows);
      overlay.dataset.cols = String(cols);
      sizeLabel.textContent = `${rows} × ${cols}`;
      rowsInput.value = String(rows);
      colsInput.value = String(cols);
      grid.querySelectorAll('.table-picker-cell').forEach((cell) => {
        const r = Number(cell.dataset.row);
        const c = Number(cell.dataset.col);
        cell.classList.toggle('is-active', r <= rows && c <= cols);
      });
    };

    for (let r = 1; r <= 8; r += 1) {
      for (let c = 1; c <= 10; c += 1) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'table-picker-cell';
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        cell.setAttribute('aria-label', `${r} by ${c}`);
        cell.addEventListener('mouseenter', () => setPreview(r, c));
        cell.addEventListener('focus', () => setPreview(r, c));
        cell.addEventListener('click', () => editor.insertTable(r, c));
        grid.appendChild(cell);
      }
    }

    rowsInput.addEventListener('input', () => setPreview(clamp(Number(rowsInput.value) || 1, 1, 20), clamp(Number(colsInput.value) || 1, 1, 20)));
    colsInput.addEventListener('input', () => setPreview(clamp(Number(rowsInput.value) || 1, 1, 20), clamp(Number(colsInput.value) || 1, 1, 20)));
    insertBtn.addEventListener('click', () => editor.insertTable(clamp(Number(rowsInput.value) || 3, 1, 20), clamp(Number(colsInput.value) || 3, 1, 20)));
    cancelBtn.addEventListener('click', () => editor.hideTablePicker());
    overlay.addEventListener('mousedown', (event) => {
      if (event.target === overlay) editor.hideTablePicker();
    });
    setPreview(3, 3);
    return overlay;
  }

  function rebuildInspector(editor) {
    const panel = editor.root.querySelector('.panel.right');
    const body = panel?.querySelector('.panel-body');
    const header = panel?.querySelector('.panel-header h2');
    const badge = panel?.querySelector('.panel-header .badge');
    if (header) header.textContent = 'Inspector';
    if (badge) badge.textContent = 'Selected node';
    if (!body) return;
    body.innerHTML = `
      <section id="nodeInspector" class="section" hidden>
        <section id="imageInspector" class="section" hidden>
          <h3>Image</h3>
          <div class="inspector-grid">
            <label>Width</label>
            <div class="range-row">
              <input id="imageWidthRange" type="range" min="20" max="100" step="1" value="84">
              <strong id="imageWidthLabel">84%</strong>
            </div>
            <label>Caption <input id="imageCaptionInput" type="text" placeholder="Image caption"></label>
            <label>Alt text <input id="imageAltInput" type="text" placeholder="Alt text"></label>
            <label>Alignment</label>
            <div class="align-button-row">
              <button type="button" class="tool-btn" data-image-align="left">${ICONS['align-image-left']}<span class="sr-only">Align left</span></button>
              <button type="button" class="tool-btn" data-image-align="center">${ICONS['align-image-center']}<span class="sr-only">Align center</span></button>
              <button type="button" class="tool-btn" data-image-align="right">${ICONS['align-image-right']}<span class="sr-only">Align right</span></button>
            </div>
            <select id="imageAlignSelect" hidden>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </section>
        <section id="tableInspector" class="section" hidden>
          <h3>Table</h3>
          <p id="tableLocation">0 rows × 0 columns</p>
          <div class="inspector-button-grid">
            <button type="button" class="tool-btn inspector-icon-btn" data-action="table-add-row">${ICONS['table-add-row']}<span class="sr-only">Add row</span></button>
            <button type="button" class="tool-btn inspector-icon-btn" data-action="table-add-col">${ICONS['table-add-col']}<span class="sr-only">Add column</span></button>
            <button type="button" class="tool-btn inspector-icon-btn" data-action="table-del-row">${ICONS['table-del-row']}<span class="sr-only">Delete row</span></button>
            <button type="button" class="tool-btn inspector-icon-btn" data-action="table-del-col">${ICONS['table-del-col']}<span class="sr-only">Delete column</span></button>
            <button type="button" class="tool-btn inspector-icon-btn is-danger" data-action="table-remove">${ICONS['table-remove']}<span class="sr-only">Delete table</span></button>
          </div>
        </section>
        <section id="latexInspector" class="section" hidden>
          <h3>Formula</h3>
          <p id="latexContent">No formula selected.</p>
          <button type="button" class="subtle" data-action="edit-latex">Edit formula</button>
        </section>
        <section id="codeInspector" class="section" hidden>
          <h3>Code block</h3>
          <div class="inspector-grid">
            <label>Language
              <select id="codeLanguageSelect">
                <option value="auto">Auto detect</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="bash">Bash</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="json">JSON</option>
                <option value="sql">SQL</option>
                <option value="markdown">Markdown</option>
                <option value="plaintext">Plain text</option>
                <option value="nohighlight">No highlight</option>
              </select>
            </label>
            <p id="codeInfo">javascript · 0 lines</p>
            <button type="button" class="subtle" data-action="refresh-code-highlight">${ICONS['refresh-code-highlight']}<span>Refresh highlight</span></button>
          </div>
        </section>
        <button type="button" class="subtle inspector-remove" data-action="remove-selected-node">Delete selected node</button>
      </section>`;

    editor.nodeInspector = body.querySelector('#nodeInspector');
    editor.imageInspector = body.querySelector('#imageInspector');
    editor.tableInspector = body.querySelector('#tableInspector');
    editor.latexInspector = body.querySelector('#latexInspector');
    editor.codeInspector = body.querySelector('#codeInspector');
    editor.imageWidthRange = body.querySelector('#imageWidthRange');
    editor.imageWidthLabel = body.querySelector('#imageWidthLabel');
    editor.imageCaptionInput = body.querySelector('#imageCaptionInput');
    editor.imageAltInput = body.querySelector('#imageAltInput');
    editor.imageAlignSelect = body.querySelector('#imageAlignSelect');
    editor.tableLocation = body.querySelector('#tableLocation');
    editor.latexContent = body.querySelector('#latexContent');
    editor.codeLanguageSelect = body.querySelector('#codeLanguageSelect');
    editor.codeInfo = body.querySelector('#codeInfo');

    editor.imageWidthRange?.addEventListener('input', () => editor.updateSelectedImageWidth());
    editor.imageCaptionInput?.addEventListener('input', () => editor.updateSelectedImageCaption());
    editor.imageAltInput?.addEventListener('input', () => editor.updateSelectedImageAlt());
    editor.imageAlignSelect?.addEventListener('change', () => editor.updateSelectedImageAlign());
    editor.codeLanguageSelect?.addEventListener('change', () => editor.updateSelectedCodeLanguage?.());

    body.querySelectorAll('[data-image-align]').forEach((button) => {
      button.addEventListener('click', () => {
        if (editor.imageAlignSelect) editor.imageAlignSelect.value = button.dataset.imageAlign;
        editor.updateSelectedImageAlign();
        syncImageAlignButtons(editor);
      });
    });

    body.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const action = button.dataset.action;
        if (action === 'refresh-code-highlight') {
          editor.refreshSelectedCodeBlock?.();
          return;
        }
        editor.handleAction(action, button);
      });
    });
  }

  function syncImageAlignButtons(editor) {
    const value = editor.imageAlignSelect?.value || 'center';
    editor.root.querySelectorAll('[data-image-align]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.imageAlign === value);
      button.title = LABELS[`align-image-${button.dataset.imageAlign}`] || `Align ${button.dataset.imageAlign}`;
    });
  }

  function hideInspectorSections(editor) {
    [editor.imageInspector, editor.tableInspector, editor.latexInspector, editor.codeInspector].forEach((section) => {
      if (section) {
        section.hidden = true;
        section.classList.remove('active-inspector');
      }
    });
    if (editor.nodeInspector) editor.nodeInspector.hidden = true;
  }

  function patchToolbarIcons(editor) {
    const root = editor.root;
    const apply = (button, key) => {
      if (!button || !key) return;
      const icon = ICONS[key] || ICONS.help;
      const label = LABELS[key] || button.getAttribute('aria-label') || button.title || key;
      button.innerHTML = `${icon}<span class="sr-only">${escapeHtml(label)}</span>`;
      button.title = label;
      button.setAttribute('aria-label', label);
      button.classList.add('tool-btn');
    };

    root.querySelectorAll('.toolbar [data-action]').forEach((button) => apply(button, button.dataset.action));
    root.querySelectorAll('.toolbar [data-format]').forEach((button) => apply(button, button.dataset.format));
    root.querySelectorAll('.floating-toolbar [data-bubble-action]').forEach((button) => apply(button, button.dataset.bubbleAction));
    root.querySelectorAll('.topbar-right [data-action], .topbar-right button').forEach((button) => apply(button, button.dataset.action || 'help'));
  }

  function cleanupTopbar(editor) {
    editor.root.querySelector('#langPickerWrap')?.remove();
    editor.root.querySelector('#modeBadge')?.remove();
    editor.root.querySelector('.inline-banner')?.remove();
    editor.root.querySelector('#readonlyBadge')?.remove();
    editor.root.querySelectorAll('[data-action="toggle-readonly"]').forEach((node) => node.remove());
    const directChipRow = Array.from(editor.root.querySelectorAll('.topbar > .pill-row'));
    directChipRow.forEach((node) => node.remove());
    const docSubtitle = editor.root.querySelector('#docSubtitle');
    if (docSubtitle) docSubtitle.textContent = 'Local autosave enabled';
    const topRight = editor.root.querySelector('.topbar-right');
    if (topRight && !topRight.children.length) topRight.remove();
  }

  function patchEditor(editor) {
    if (!editor || editor.__finalPatch15Applied) {
      if (editor) {
        editor.renderMath?.();
        editor.highlightAllCodeBlocks?.();
      }
      return;
    }
    editor.__finalPatch15Applied = true;
    ensureStyle(PATCH_ID, PATCH_CSS);

    const proto = Object.getPrototypeOf(editor);
    const originalHandleAction = proto.handleAction;

    proto.setInspectorVisibility = function setInspectorVisibilityPatched(visible) {
      this.root.classList.toggle('show-inspector', !!visible);
      const panel = this.root.querySelector('.panel.right');
      if (panel) panel.hidden = !visible;
      if (!visible) hideInspectorSections(this);
    };

    proto.showImageInspector = function showImageInspectorPatched(figure) {
      hideInspectorSections(this);
      if (!figure || !this.imageInspector) return;
      this.nodeInspector.hidden = false;
      this.imageInspector.hidden = false;
      this.imageInspector.classList.add('active-inspector');
      const img = figure.querySelector('img');
      const caption = figure.querySelector('figcaption');
      const widthPercent = Number((img?.style.width || `${this.config.defaultImageWidthPercent}%`).replace('%', '')) || this.config.defaultImageWidthPercent;
      if (this.imageWidthRange) this.imageWidthRange.value = String(widthPercent);
      if (this.imageWidthLabel) this.imageWidthLabel.textContent = `${widthPercent}%`;
      if (this.imageCaptionInput) this.imageCaptionInput.value = caption?.textContent || '';
      if (this.imageAltInput) this.imageAltInput.value = img?.getAttribute('alt') || '';
      if (this.imageAlignSelect) this.imageAlignSelect.value = figure.dataset.align || 'center';
      syncImageAlignButtons(this);
    };

    proto.showTableInspector = function showTableInspectorPatched(table) {
      hideInspectorSections(this);
      if (!table || !this.tableInspector) return;
      this.nodeInspector.hidden = false;
      this.tableInspector.hidden = false;
      this.tableInspector.classList.add('active-inspector');
      const rows = table.rows.length;
      const cols = table.rows[0]?.cells.length || 0;
      if (this.tableLocation) this.tableLocation.textContent = `${rows} rows × ${cols} columns`;
    };

    proto.showLatexInspector = function showLatexInspectorPatched(latex) {
      hideInspectorSections(this);
      if (!latex || !this.latexInspector) return;
      this.nodeInspector.hidden = false;
      this.latexInspector.hidden = false;
      this.latexInspector.classList.add('active-inspector');
      if (this.latexContent) this.latexContent.textContent = latex.dataset.latex || '';
    };

    proto.getCodeElementFromNode = function getCodeElementFromNodePatched(node) {
      if (!node) return null;
      const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
      if (!element) return null;
      const codeNode = element.closest('.lre-code-node');
      if (codeNode && this.editor && this.editor.contains(codeNode)) {
        const nestedPre = codeNode.querySelector('pre');
        const normalized = this.normalizeCodeBlock ? this.normalizeCodeBlock(nestedPre) : (nestedPre ? nestedPre.querySelector('code') : null);
        if (normalized) return normalized;
      }
      const pre = element.closest('pre');
      if (!pre || !this.editor || !this.editor.contains(pre)) return null;
      return this.normalizeCodeBlock ? this.normalizeCodeBlock(pre) : pre.querySelector('code');
    };

    proto.showCodeInspector = function showCodeInspectorPatched(code) {
      hideInspectorSections(this);
      if (!code || !this.codeInspector) return;
      this.nodeInspector.hidden = false;
      this.codeInspector.hidden = false;
      this.codeInspector.classList.add('active-inspector');
      const language = this.extractCodeLanguage(code);
      if (this.codeLanguageSelect) this.codeLanguageSelect.value = language;
      if (this.codeInfo) {
        const text = code.dataset.rawCode != null ? code.dataset.rawCode : (code.textContent || '');
        const lineCount = text ? text.split('\n').length : 0;
        this.codeInfo.textContent = `${language} · ${lineCount} line${lineCount === 1 ? '' : 's'}`;
      }
    };

    proto.detectSelectedNode = function detectSelectedNodePatched() {
      this.root.querySelectorAll('.selected-node').forEach((node) => node.classList.remove('selected-node'));
      hideInspectorSections(this);
      const selection = document.getSelection();
      const anchor = selection?.anchorNode?.nodeType === Node.ELEMENT_NODE ? selection.anchorNode : selection?.anchorNode?.parentElement;
      const code = this.getCodeElementFromNode(anchor) || this.state.selectedCodeBlock;
      const image = anchor?.closest('figure.image-figure') || this.state.selectedImageFigure;
      const table = anchor?.closest('table') || this.state.selectedTable;
      const latex = anchor?.closest('.latex-node') || this.state.selectedLatex;
      if (image && this.editor.contains(image)) {
        image.classList.add('selected-node');
        this.state.selectedImageFigure = image;
        this.state.selectedTable = null;
        this.state.selectedLatex = null;
        this.state.selectedCodeBlock = null;
        this.showImageInspector(image);
        this.setInspectorVisibility(true);
        return;
      }
      if (table && this.editor.contains(table)) {
        table.classList.add('selected-node');
        this.state.selectedTable = table;
        this.state.selectedImageFigure = null;
        this.state.selectedLatex = null;
        this.state.selectedCodeBlock = null;
        this.showTableInspector(table);
        this.setInspectorVisibility(true);
        return;
      }
      if (latex && this.editor.contains(latex)) {
        latex.classList.add('selected-node');
        this.state.selectedLatex = latex;
        this.state.selectedImageFigure = null;
        this.state.selectedTable = null;
        this.state.selectedCodeBlock = null;
        this.showLatexInspector(latex);
        this.setInspectorVisibility(true);
        return;
      }
      if (code && this.editor.contains(code)) {
        const pre = code.closest('pre');
        (pre || code).classList.add('selected-node');
        this.state.selectedCodeBlock = code;
        this.state.selectedImageFigure = null;
        this.state.selectedTable = null;
        this.state.selectedLatex = null;
        this.showCodeInspector(code);
        this.setInspectorVisibility(true);
        return;
      }
      this.state.selectedImageFigure = null;
      this.state.selectedTable = null;
      this.state.selectedLatex = null;
      this.state.selectedCodeBlock = null;
      this.setInspectorVisibility(false);
    };

    proto.handleEditorClick = function handleEditorClickPatched(event) {
      const taskBox = event.target.closest('.task-box');
      if (taskBox) {
        const checked = taskBox.dataset.checked === 'true';
        taskBox.dataset.checked = String(!checked);
        taskBox.textContent = checked ? '☐' : '☑';
        this.scheduleSave();
        return;
      }
      const code = this.getCodeElementFromNode(event.target);
      const figure = event.target.closest('figure.image-figure');
      const table = event.target.closest('table');
      const latex = event.target.closest('.latex-node');
      this.state.selectedCodeBlock = code || null;
      this.state.selectedImageFigure = figure || null;
      this.state.selectedTable = table || null;
      this.state.selectedLatex = latex || null;
      this.detectSelectedNode();
    };

    proto.showTablePicker = function showTablePicker(anchorButton) {
      const overlay = buildTablePicker(this);
      const pop = overlay.querySelector('#tablePickerPop');
      overlay.hidden = false;
      overlay.classList.add('is-open');
      const trigger = anchorButton || this.root.querySelector('.toolbar [data-action="table"]') || this.root.querySelector('.toolbar');
      const rect = trigger?.getBoundingClientRect?.();
      const popWidth = 264;
      const left = rect ? clamp(rect.left + rect.width / 2 - popWidth / 2, 12, window.innerWidth - popWidth - 12) : clamp((window.innerWidth - popWidth) / 2, 12, window.innerWidth - popWidth - 12);
      const top = rect ? rect.bottom + 10 : 120;
      pop.style.left = `${left}px`;
      pop.style.top = `${top}px`;
      const size = overlay.querySelector('#tablePickerSize');
      if (size) size.textContent = '3 × 3';
    };

    proto.hideTablePicker = function hideTablePicker() {
      const overlay = this.root.querySelector('#tablePickerOverlay');
      if (!overlay) return;
      overlay.hidden = true;
      overlay.classList.remove('is-open');
    };

    proto.insertTable = function insertTablePatched(rows, cols) {
      if (typeof rows !== 'number' || typeof cols !== 'number') {
        this.showTablePicker();
        return;
      }
      rows = clamp(Math.round(rows), 1, 20);
      cols = clamp(Math.round(cols), 1, 20);
      this.hideTablePicker();
      restoreEditorSelection(this);
      let html = '<table><thead><tr>';
      for (let c = 0; c < cols; c += 1) html += `<th>Header ${c + 1}</th>`;
      html += '</tr></thead><tbody>';
      for (let r = 0; r < rows - 1; r += 1) {
        html += '<tr>';
        for (let c = 0; c < cols; c += 1) html += `<td>Cell ${r + 1}-${c + 1}</td>`;
        html += '</tr>';
      }
      html += '</tbody></table><p></p>';
      this.insertHTML(html);
      this.updateOutline?.();
      this.updateStats?.();
    };

    proto.handleAction = function handleActionPatched(action, button) {
      if (action === 'table') {
        this.showTablePicker(button);
        return;
      }
      if (action === 'toggle-readonly') return;
      return originalHandleAction.call(this, action, button);
    };

    proto.renderHighlightedCodeElement = function renderHighlightedCodeElementPatched(code) {
      if (!code) return Promise.resolve();
      const pre = code.closest('pre');
      const raw = code.dataset.rawCode != null ? code.dataset.rawCode : (code.textContent || '');
      code.dataset.rawCode = raw;
      const requested = this.extractCodeLanguage(code);
      const resolved = chooseLanguage(requested, raw);
      if (resolved === 'nohighlight') {
        code.textContent = raw;
        code.className = 'nohighlight';
        code.dataset.language = 'nohighlight';
        if (pre) pre.dataset.language = 'nohighlight';
        return Promise.resolve();
      }
      const out = offlineHighlight(raw, resolved);
      code.innerHTML = out.html;
      code.className = out.language === 'plaintext' ? 'language-plaintext' : `hljs hljs-fallback language-${out.language}`;
      code.dataset.language = out.language;
      if (pre) pre.dataset.language = out.language;
      return Promise.resolve();
    };

    proto.highlightCodeBlocksInside = function highlightCodeBlocksInsidePatched(root = this.editor) {
      if (!root) return;
      root.querySelectorAll('pre').forEach((pre) => {
        const code = this.normalizeCodeBlock(pre);
        if (!code) return;
        if (code.dataset.editing === 'true') return;
        code.contentEditable = 'false';
        code.dataset.rawCode = code.dataset.rawCode != null ? code.dataset.rawCode : (code.textContent || '');
        this.renderHighlightedCodeElement(code);
      });
    };

    proto.highlightAllCodeBlocks = function highlightAllCodeBlocksPatched() {
      this.highlightCodeBlocksInside(this.editor);
      const preview = this.root.querySelector('#markdownPreview');
      if (preview) this.highlightCodeBlocksInside(preview);
    };

    proto.updateSelectedCodeLanguage = function updateSelectedCodeLanguagePatched() {
      const code = this.state.selectedCodeBlock;
      if (!code || !this.codeLanguageSelect) return;
      const lang = normalizeLangName(this.codeLanguageSelect.value);
      this.applyLanguageToCodeElement(code, lang);
      code.dataset.rawCode = code.dataset.rawCode != null ? code.dataset.rawCode : (code.textContent || '');
      this.renderHighlightedCodeElement(code).then(() => this.showCodeInspector(code));
      this.scheduleSave();
    };

    proto.refreshSelectedCodeBlock = function refreshSelectedCodeBlockPatched() {
      const code = this.state.selectedCodeBlock;
      if (!code) return;
      code.dataset.rawCode = code.dataset.rawCode != null ? code.dataset.rawCode : (code.textContent || '');
      this.renderHighlightedCodeElement(code).then(() => this.showCodeInspector(code));
    };

    cleanupTopbar(editor);
    rebuildInspector(editor);
    patchToolbarIcons(editor);
    buildTablePicker(editor);
    syncImageAlignButtons(editor);

    // Remove language picker logic remnants.
    editor.setupLanguagePicker = function noopLanguagePicker() {};
    editor.currentLang = 'en';

    // Normalize visible labels that remain.
    const searchPanel = editor.root.querySelector('#searchPanel');
    if (searchPanel) {
      const [searchInput, replaceInput] = searchPanel.querySelectorAll('input');
      if (searchInput) searchInput.placeholder = 'Search in document';
      if (replaceInput) replaceInput.placeholder = 'Replace with';
    }
    editor.root.querySelector('#helpDialog .panel-header h2')?.replaceChildren(document.createTextNode('Help'));

    editor.root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') editor.hideTablePicker?.();
    });
    document.addEventListener('mousedown', (event) => {
      const overlay = editor.root.querySelector('#tablePickerOverlay');
      if (!overlay || overlay.hidden) return;
      const pop = overlay.querySelector('#tablePickerPop');
      const tableBtn = editor.root.querySelector('.toolbar [data-action="table"]');
      if (pop?.contains(event.target) || tableBtn?.contains(event.target)) return;
      editor.hideTablePicker();
    });

    editor.highlightAllCodeBlocks();
    editor.renderMath?.();
    editor.detectSelectedNode?.();
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => waitForEditor(patchEditor));
  } else {
    waitForEditor(patchEditor);
  }
})();
(function(){
  'use strict';
  function waitForEditor(callback){
    if(window.localRichEditor){callback(window.localRichEditor);return;}
    let tries=0;const timer=setInterval(()=>{tries+=1;if(window.localRichEditor){clearInterval(timer);callback(window.localRichEditor);}else if(tries>240){clearInterval(timer);}},50);
  }
  waitForEditor((editor)=>{
    const proto=Object.getPrototypeOf(editor);
    if(proto.__inspectorCodeHotfix15) return;
    proto.__inspectorCodeHotfix15=true;
    const originalShowCodeInspector=proto.showCodeInspector;
    proto.showCodeInspector=function finalShowCodeInspector(code){
      if(this.imageInspector) this.imageInspector.hidden=true;
      if(this.tableInspector) this.tableInspector.hidden=true;
      if(this.latexInspector) this.latexInspector.hidden=true;
      if(this.codeInspector) this.codeInspector.hidden=false;
      if(this.nodeInspector) this.nodeInspector.hidden=false;
      const intro=this.nodeInspector?this.nodeInspector.querySelector(':scope > p'):null;
      if(intro) intro.hidden=true;
      const removeBtn=this.root.querySelector('[data-action="remove-selected-node"]');
      if(removeBtn) removeBtn.hidden=false;
      if(originalShowCodeInspector) originalShowCodeInspector.call(this, code);
      this.setInspectorVisibility?.(true);
    };
    editor.detectSelectedNode?.();
  });
})();

/* Host embed recovery: keep core UI available when a host page suppresses editor chrome. */
(function(){
  'use strict';
  const BUILD = '20260330-embed-recovery-01';
  const STYLE_ID = 'local-rich-editor-embed-recovery-style';
  const STYLE = `
    .lre-root.is-host-embedded #lreEmbedToolbarHost {
      position: sticky;
      top: 0;
      z-index: 35;
      display: grid;
      gap: 10px;
      padding: 12px;
      margin-bottom: 12px;
      background: var(--lre-card);
      border: 1px solid var(--lre-border);
      border-radius: var(--lre-radius);
      box-shadow: var(--lre-shadow);
    }
    .lre-root.is-host-embedded #lreEmbedToolbarHost .lre-toolbar-scroll {
      overflow-x: auto;
      padding-bottom: 2px;
    }
    .lre-root.is-host-embedded #lreEmbedToolbarHost .lre-toolbar {
      display: flex;
      flex-wrap: nowrap;
      gap: 10px;
      min-width: max-content;
    }
    .lre-root.is-host-embedded .lre-statusbar { display: flex !important; }
    .lre-root.is-host-embedded .lre-searchbar.is-open { display: flex !important; }
    .lre-root.is-host-embedded .lre-source-panel.is-open { display: grid !important; }
    .lre-root.is-host-embedded .lre-floating.is-open { display: flex !important; }
    .lre-root.is-host-embedded .lre-slash-menu.is-open { display: grid !important; }
    .lre-root.is-host-embedded .lre-color-popover.is-open { display: grid !important; }
    .lre-root.is-host-embedded .lre-dialog[open] { display: block !important; }
    .lre-root.is-host-embedded .table-picker-overlay:not([hidden]),
    .lre-root.is-host-embedded #tablePickerOverlay:not([hidden]) { display: block !important; }
    .lre-root.is-host-embedded #lreOutlinePanel:not([hidden]),
    .lre-root.is-host-embedded #lreInspectorPanel:not([hidden]) { display: block !important; }
    .lre-root.is-host-embedded .lre-main-wrap.has-outline {
      grid-template-columns: 280px minmax(0, 1fr) !important;
    }
    .lre-root.is-host-embedded .lre-main-wrap.has-inspector {
      grid-template-columns: minmax(0, 1fr) 320px !important;
    }
    .lre-root.is-host-embedded .lre-main-wrap.has-outline.has-inspector {
      grid-template-columns: 280px minmax(0, 1fr) 320px !important;
    }
    .lre-root.is-host-embedded .lre-editor-shell.is-split {
      grid-template-columns: minmax(0, 1fr) minmax(280px, 38%) !important;
      align-items: start !important;
    }
    @media (max-width: 980px) {
      .lre-root.is-host-embedded .lre-main-wrap.has-outline,
      .lre-root.is-host-embedded .lre-main-wrap.has-inspector,
      .lre-root.is-host-embedded .lre-main-wrap.has-outline.has-inspector,
      .lre-root.is-host-embedded .lre-editor-shell.is-split {
        grid-template-columns: minmax(0, 1fr) !important;
      }
    }
  `;

  function ensureStyle(id, cssText) {
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = cssText;
    return style;
  }

  function getEditor() {
    return window.__localRichEditor || window.localRichEditor || null;
  }

  function waitForEditor(callback) {
    const resolve = () => {
      const editor = getEditor();
      if (!editor) return false;
      callback(editor);
      return true;
    };
    if (resolve()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (resolve() || tries > 300) {
        clearInterval(timer);
      }
    }, 50);
    window.addEventListener('local-rich-editor:ready', () => {
      if (resolve()) clearInterval(timer);
    }, { once: true });
  }

  function recoverEmbeddedHost(editor) {
    if (!editor || editor.__embedHostRecoveryApplied) return;
    const root = editor.root;
    const topbar = root?.querySelector('.lre-topbar');
    const toolbarScroll = topbar?.querySelector('.lre-toolbar-scroll');
    const surface = root?.querySelector('.lre-surface');
    if (!root || !topbar || !toolbarScroll || !surface) return;
    if (window.getComputedStyle(topbar).display !== 'none') return;

    editor.__embedHostRecoveryApplied = true;
    ensureStyle(STYLE_ID, STYLE);
    root.classList.add('is-host-embedded');

    let host = root.querySelector('#lreEmbedToolbarHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'lreEmbedToolbarHost';
      host.setAttribute('role', 'toolbar');
      host.setAttribute('aria-label', 'Editor toolbar');
      const searchbar = root.querySelector('#lreSearchbar');
      surface.insertBefore(host, searchbar || surface.firstChild);
    }
    if (toolbarScroll.parentElement !== host) {
      host.appendChild(toolbarScroll);
    }

    try { console.info('[LocalRichEditor]', BUILD, 'applied'); } catch (error) {}
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => waitForEditor(recoverEmbeddedHost), { once: true });
  } else {
    waitForEditor(recoverEmbeddedHost);
  }
})();


/* Embedded content editor mode for host pages like StatKISS write forms. */
(function(){
  'use strict';

  const BUILD = '20260402-embedded-content-01';
  const EMBED_STYLE_ID = 'solid-embedded-content-style';
  const DEMO_STYLE_ID = 'solid-demo-shell-style';
  const STORAGE_PREFIX = 'solid-embedded-content-editor-v1:';
  const HIDDEN_ACTIONS = new Set([
    'new-doc',
    'import-file',
    'export-md',
    'export-html',
    'export-json',
    'snapshot',
    'toggle-search',
    'toggle-outline',
    'toggle-dark',
    'comment'
  ]);

  const EMBED_STYLE = `
    .lre-root.lre-embedded-content,
    .lre-root.lre-embedded-content * {
      box-sizing: border-box;
    }
    .lre-root.lre-embedded-content {
      min-height: 0;
      padding: 0;
      color: #111827;
    }
    .lre-root.lre-embedded-content .lre-app {
      max-width: none;
      gap: 10px;
    }
    .lre-root.lre-embedded-content .lre-topbar {
      display: none !important;
    }
    .lre-root.lre-embedded-content .lre-surface,
    .lre-root.lre-embedded-content .lre-panel,
    .lre-root.lre-embedded-content .lre-source-panel,
    .lre-root.lre-embedded-content .lre-statusbar {
      box-shadow: none;
    }
    .lre-root.lre-embedded-content .lre-surface {
      padding: 0;
      border: 0;
      background: transparent;
    }
    .lre-root.lre-embedded-content .lre-main-wrap {
      gap: 10px;
    }
    .lre-root.lre-embedded-content .lre-editor-shell {
      gap: 10px;
    }
    .lre-root.lre-embedded-content .lre-editor-page {
      width: 100%;
      min-height: 420px;
      margin: 0;
      padding: 18px 20px;
      border-radius: 18px;
      background: #ffffff;
      box-shadow: none;
    }
    .lre-root.lre-embedded-content .lre-statusbar {
      border-radius: 16px;
      background: #ffffff;
      font-size: 13px;
    }
    .lre-root.lre-embedded-content [data-embed-hidden="true"],
    .lre-root.lre-embedded-content .lre-group[data-embed-empty="true"] {
      display: none !important;
    }
    .lre-root.lre-embedded-content #lreEmbedToolbarHost {
      position: sticky;
      top: 0;
      z-index: 25;
      display: grid;
      gap: 10px;
      padding: 10px;
      background: #ffffff;
      border: 1px solid var(--lre-border);
      border-radius: 18px;
      box-shadow: none;
    }
    .lre-root.lre-embedded-content #lreEmbedToolbarHost .lre-toolbar-scroll {
      overflow: visible;
      padding-bottom: 2px;
    }
    .lre-root.lre-embedded-content #lreEmbedToolbarHost .lre-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 8px;
      min-width: 0;
      width: 100%;
    }
    .lre-root.lre-embedded-content #lreEmbedToolbarHost .lre-group {
      max-width: 100%;
      gap: 6px;
      padding: 6px;
      border-radius: 14px;
    }
    .lre-root.lre-embedded-content .lre-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 38px;
      height: 38px;
      min-width: 38px;
      min-height: 38px;
      visibility: visible !important;
    }
    .lre-root.lre-embedded-content .lre-btn svg {
      display: block !important;
      width: 20px !important;
      height: 20px !important;
      flex: 0 0 auto;
    }
    .lre-root.lre-embedded-content .lre-source-card header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .lre-root.lre-embedded-content .lre-source-actions {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .lre-root.lre-embedded-content .lre-source-actions .lre-btn {
      width: 34px;
      height: 34px;
      min-width: 34px;
      min-height: 34px;
    }
    .lre-root.lre-embedded-content .lre-source-actions .lre-btn svg {
      width: 18px !important;
      height: 18px !important;
    }
    .lre-root.lre-embedded-content .lre-source-panel {
      background: transparent;
      border: 0;
      padding: 0;
    }
    .lre-root.lre-embedded-content .lre-source-card {
      background: #ffffff;
      border-radius: 18px;
      border: 1px solid var(--lre-border);
      overflow: hidden;
    }
    .lre-root.lre-embedded-content .lre-panel {
      border-radius: 18px;
      background: #ffffff;
    }
    .lre-root.lre-embedded-content .lre-searchbar {
      border-radius: 18px;
      background: #ffffff;
      box-shadow: none;
    }
    .lre-root.lre-embedded-content .lre-floating,
    .lre-root.lre-embedded-content .lre-color-popover {
      box-shadow: 0 18px 42px rgba(15, 23, 42, 0.12);
    }
    .lre-root.lre-embedded-content .lre-comment-list:empty::before {
      content: 'No comments';
      color: var(--lre-muted);
    }
    .lre-host-textarea {
      display: none !important;
    }
    .solid-embedded-editor-host {
      display: block;
      width: 100%;
    }
    @media (max-width: 980px) {
      .lre-root.lre-embedded-content .lre-editor-page {
        min-height: 360px;
        padding: 16px;
      }
      .lre-root.lre-embedded-content #lreEmbedToolbarHost {
        padding: 8px;
      }
      .lre-root.lre-embedded-content .lre-btn {
        width: 36px;
        height: 36px;
        min-width: 36px;
        min-height: 36px;
      }
      .lre-root.lre-embedded-content .lre-btn svg {
        width: 19px !important;
        height: 19px !important;
      }
      .lre-root.lre-embedded-content .lre-main-wrap.has-outline,
      .lre-root.lre-embedded-content .lre-main-wrap.has-inspector,
      .lre-root.lre-embedded-content .lre-main-wrap.has-outline.has-inspector,
      .lre-root.lre-embedded-content .lre-editor-shell.is-split {
        grid-template-columns: minmax(0, 1fr) !important;
      }
    }
  `;

  const DEMO_STYLE = `
    :root {
      --sk-bg: #f4f7fb;
      --sk-card: #eef2f7;
      --sk-line: #d7dde7;
      --sk-text: #111827;
      --sk-muted: #6b7280;
      --sk-primary: #2563eb;
      --sk-primary-soft: rgba(37, 99, 235, 0.12);
      --sk-white: #ffffff;
      --sk-radius: 28px;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: var(--sk-bg);
      color: var(--sk-text);
      font: 15px/1.55 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    body {
      min-height: 100vh;
    }
    .sk-demo-page,
    .sk-demo-page * {
      box-sizing: border-box;
    }
    .sk-demo-page {
      min-height: 100vh;
      background: var(--sk-bg);
    }
    .sk-demo-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      padding: 28px 56px;
      background: var(--sk-white);
      border-bottom: 1px solid #e5e7eb;
    }
    .sk-demo-brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .sk-demo-logo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 54px;
      height: 54px;
      border-radius: 18px;
      background: linear-gradient(135deg, #f472b6 0%, #60a5fa 100%);
      color: #fff;
      font-weight: 800;
      letter-spacing: .04em;
    }
    .sk-demo-brand strong {
      display: block;
      font-size: 17px;
      letter-spacing: .02em;
    }
    .sk-demo-brand span {
      display: block;
      color: var(--sk-muted);
      font-size: 13px;
    }
    .sk-demo-nav {
      display: flex;
      align-items: center;
      gap: 28px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .sk-demo-nav a {
      color: var(--sk-text);
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
    }
    .sk-demo-main {
      padding: 28px;
    }
    .sk-demo-panel {
      max-width: 1280px;
      margin: 0 auto;
      padding: 28px;
      background: var(--sk-card);
      border: 1px solid #dfe5ef;
      border-radius: var(--sk-radius);
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
    }
    .sk-demo-section-label {
      display: block;
      margin-bottom: 14px;
      font-size: 15px;
      font-weight: 700;
    }
    .sk-demo-title {
      display: block;
      width: 100%;
      padding: 14px 16px;
      border-radius: 18px;
      border: 1px solid #cfd7e3;
      background: #ffffff;
      font-size: 18px;
      outline: none;
      margin-bottom: 22px;
    }
    .sk-demo-title:focus {
      border-color: var(--sk-primary);
      box-shadow: 0 0 0 4px var(--sk-primary-soft);
    }
    .sk-demo-editor-card {
      padding: 22px;
      border-radius: 26px;
      background: #f7f9fc;
      border: 1px solid #dfe5ef;
    }
    .sk-demo-upload {
      margin-top: 26px;
    }
    .sk-demo-upload h2 {
      margin: 0 0 12px;
      font-size: 15px;
    }
    .sk-demo-dropzone {
      min-height: 160px;
      border-radius: 24px;
      border: 1px dashed #c7d0dd;
      background: #ffffff;
      display: grid;
      place-items: center;
      text-align: center;
      color: var(--sk-muted);
      padding: 22px;
    }
    .sk-demo-dropzone strong {
      display: block;
      margin-top: 10px;
      color: var(--sk-text);
      font-size: 18px;
    }
    .sk-demo-dropzone span {
      display: block;
      margin-top: 8px;
      font-size: 14px;
    }
    .sk-demo-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }
    .sk-demo-actions button {
      min-width: 96px;
      height: 44px;
      padding: 0 20px;
      border-radius: 999px;
      border: 1px solid #cfd7e3;
      background: #ffffff;
      color: var(--sk-text);
      font-weight: 700;
      cursor: pointer;
    }
    .sk-demo-actions button.primary {
      border-color: var(--sk-primary);
      background: var(--sk-primary);
      color: #ffffff;
      box-shadow: 0 10px 18px rgba(37, 99, 235, 0.18);
    }
    @media (max-width: 980px) {
      .sk-demo-header {
        padding: 22px 18px;
        align-items: flex-start;
      }
      .sk-demo-nav {
        gap: 18px;
      }
      .sk-demo-main {
        padding: 18px;
      }
      .sk-demo-panel {
        padding: 18px;
        border-radius: 24px;
      }
      .sk-demo-editor-card {
        padding: 14px;
        border-radius: 22px;
      }
    }
  `;

  function ensureStyle(id, cssText) {
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = cssText;
    return style;
  }

  function debounce(fn, delay) {
    let timer = null;
    return function debounced() {
      const args = arguments;
      const context = this;
      clearTimeout(timer);
      timer = setTimeout(function(){ fn.apply(context, args); }, delay);
    };
  }

  function icon(paths, viewBox) {
    return '<svg class="lre-icon" viewBox="' + (viewBox || '0 0 24 24') + '" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9">' + paths + '</svg>';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function createIconButton(label, svgMarkup, className) {
    return '<button class="lre-btn ' + (className || '') + '" type="button" aria-label="' + escapeHtml(label) + '" title="' + escapeHtml(label) + '">' + svgMarkup + '<span class="lre-sr">' + escapeHtml(label) + '</span></button>';
  }

  function readJSON(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch (error) {
      return null;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function looksLikeHtml(value) {
    return /<\/?[a-z][\s\S]*>/i.test(String(value || ''));
  }

  function normalizeString(value) {
    return String(value || '').trim().toLowerCase();
  }

  function buildStorageKey(textarea, options) {
    if (options && typeof options.storageKey === 'string' && options.storageKey.trim()) {
      return options.storageKey.trim();
    }
    const parts = [
      window.location && window.location.pathname ? window.location.pathname : 'local',
      textarea && (textarea.name || textarea.id || textarea.placeholder || textarea.className || 'content')
    ];
    return STORAGE_PREFIX + parts.map(function(part){ return normalizeString(part).replace(/[^a-z0-9가-힣_-]+/gi, '-'); }).filter(Boolean).join(':');
  }

  function dispatchHostInput(textarea) {
    if (!textarea) return;
    try {
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (error) {}
  }

  function getInitialPayload(textarea, options) {
    if (options && typeof options.html === 'string') {
      return { mode: 'html', value: options.html, source: 'option-html', savedAt: null };
    }
    if (options && typeof options.markdown === 'string') {
      return { mode: 'markdown', value: options.markdown, source: 'option-markdown', savedAt: null };
    }
    const currentValue = textarea ? String(textarea.value || '') : '';
    if (currentValue.trim()) {
      return { mode: (options && options.preferMarkdown) ? 'markdown' : 'html', value: currentValue, source: 'textarea', savedAt: null };
    }
    if (options && options.restoreDraft === false) {
      return { mode: 'html', value: '', source: 'empty', savedAt: null };
    }
    const draft = readJSON(buildStorageKey(textarea, options));
    if (draft && typeof draft.html === 'string') {
      return { mode: 'html', value: draft.html, source: 'draft', savedAt: draft.savedAt || null };
    }
    return { mode: 'html', value: '', source: 'empty', savedAt: null };
  }

  function formatTimeLabel(isoString) {
    if (!isoString) return 'Local draft ready';
    try {
      return 'Draft saved ' + new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return 'Local draft ready';
    }
  }

  function neutralizeGlobalEditorStyles() {
    const style = document.getElementById('lre-style');
    if (!style || style.dataset.embeddedScoped === 'true') return;
    let css = style.textContent || '';
    css = css.replace(/\*\s*\{\s*box-sizing:\s*border-box;\s*\}/, '.lre-root, .lre-root * { box-sizing: border-box; }');
    css = css.replace(/html,\s*body\s*\{[^}]*\}/, '.lre-root { color: var(--lre-text); font: 16px/1.55 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif; }');
    css = css.replace(/body\s*\{\s*min-height:\s*100vh;\s*\}/, '');
    css = css.replace(/button,\s*input,\s*select,\s*textarea\s*\{[^}]*\}/, '.lre-root button, .lre-root input, .lre-root select, .lre-root textarea { font: inherit; color: inherit; }');
    style.textContent = css;
    style.dataset.embeddedScoped = 'true';
  }

  function findNearbyTitleInput(textarea, explicitTitleField) {
    if (explicitTitleField) {
      if (typeof explicitTitleField === 'string') return document.querySelector(explicitTitleField);
      if (explicitTitleField && explicitTitleField.nodeType === 1) return explicitTitleField;
    }
    const scope = textarea && (textarea.form || textarea.closest('.sk-demo-panel, form, section, article, .card, body')) || document;
    const candidates = Array.from(scope.querySelectorAll('input[type="text"], input:not([type]), input[type="search"]')).filter(function(input){
      return input !== textarea && !input.disabled && input.offsetParent !== null;
    });
    if (!candidates.length) return null;
    const preferred = candidates.find(function(input){
      const hay = [input.name, input.id, input.placeholder, input.getAttribute('aria-label')].join(' ').toLowerCase();
      return /(title|subject|heading|제목|제목을)/i.test(hay);
    });
    return preferred || candidates[0] || null;
  }

  function hideToolbarActions(editor) {
    editor.root.querySelectorAll('[data-action]').forEach(function(button){
      if (HIDDEN_ACTIONS.has(button.dataset.action)) {
        button.setAttribute('data-embed-hidden', 'true');
      }
    });
    editor.root.querySelectorAll('.lre-group').forEach(function(group){
      const hasVisible = Array.from(group.children).some(function(child){
        return child.getAttribute('data-embed-hidden') !== 'true';
      });
      if (!hasVisible) {
        group.setAttribute('data-embed-empty', 'true');
      }
    });
  }

  function hasVisibleAdvancedRibbonGroups(editor) {
    return Array.from(editor.root.querySelectorAll('.lre-group[data-ribbon-group="advanced"]')).some(function(group){
      return group.getAttribute('data-embed-empty') !== 'true' && group.hidden !== true;
    });
  }

  function syncRibbonControls(editor) {
    const button = editor && editor.root ? editor.root.querySelector('[data-ribbon-toggle]') : null;
    if (!button) return;
    const buttonGroup = button.closest('.lre-group');
    const hasAdvanced = hasVisibleAdvancedRibbonGroups(editor);
    if (buttonGroup) buttonGroup.hidden = !hasAdvanced;
    const expanded = hasAdvanced && !!(editor.state && editor.state.ribbonExpanded);
    editor.root.classList.toggle('lre-ribbon-expanded', expanded);
    button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    button.setAttribute('title', expanded ? 'Hide extra tools' : 'Show extra tools');
    button.setAttribute('aria-label', expanded ? 'Hide extra tools' : 'Show extra tools');
    const label = button.querySelector('.lre-ribbon-toggle-label');
    if (label) label.textContent = expanded ? 'Hide tools' : 'Show tools';
  }

  function ensureRibbonControls(editor, options) {
    if (!editor || !editor.root) return;
    editor.state = editor.state || {};
    if (typeof editor.state.ribbonExpanded !== 'boolean') {
      editor.state.ribbonExpanded = !!(options && options.ribbonExpanded);
    }
    const button = editor.root.querySelector('[data-ribbon-toggle]');
    if (!button) return;
    if (!editor.__ribbonControlsInstalled) {
      button.addEventListener('click', function(event){
        event.preventDefault();
        event.stopPropagation();
        editor.state.ribbonExpanded = !editor.state.ribbonExpanded;
        syncRibbonControls(editor);
        if (typeof editor.updateLayout === 'function') editor.updateLayout();
      });
      editor.__ribbonControlsInstalled = true;
    }
    syncRibbonControls(editor);
  }

  function createEmbeddedToolbarHost(editor) {
    const root = editor.root;
    const topbar = root.querySelector('.lre-topbar');
    const surface = root.querySelector('.lre-surface');
    const searchbar = root.querySelector('#lreSearchbar');
    const toolbarScroll = topbar && topbar.querySelector('.lre-toolbar-scroll');
    if (!surface || !toolbarScroll) return null;
    let host = root.querySelector('#lreEmbedToolbarHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'lreEmbedToolbarHost';
      host.setAttribute('role', 'toolbar');
      host.setAttribute('aria-label', 'Content editor toolbar');
      surface.insertBefore(host, searchbar || surface.firstChild);
    }
    if (toolbarScroll.parentElement !== host) {
      host.appendChild(toolbarScroll);
    }
    if (topbar) topbar.hidden = true;
    return host;
  }

  function installSourceActions(editor, syncNow) {
    if (editor.__embeddedSourceActionsInstalled) return;
    const header = editor.root.querySelector('#lreSourcePanel .lre-source-card header');
    if (!header) return;
    const actions = document.createElement('div');
    actions.className = 'lre-source-actions';
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'lre-btn';
    apply.innerHTML = icon('<path d="M5 12l4 4L19 6"/><path d="M5 5h8"/><path d="M5 19h14"/>') + '<span class="lre-sr">Apply Markdown</span>';
    apply.setAttribute('aria-label', 'Apply Markdown');
    apply.title = 'Apply Markdown';
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'lre-btn';
    reset.innerHTML = icon('<path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v4h4"/>') + '<span class="lre-sr">Reset Markdown</span>';
    reset.setAttribute('aria-label', 'Reset Markdown');
    reset.title = 'Reset Markdown';
    actions.appendChild(apply);
    actions.appendChild(reset);
    header.appendChild(actions);

    const applyFromMarkdown = function() {
      editor.editor.innerHTML = editor.parseMarkdown(editor.sourceText.value || '');
      editor.normalizeAfterImport();
      editor.markDirty();
      if (typeof syncNow === 'function') syncNow(true);
    };
    const resetToDocument = function() {
      editor.sourceText.value = editor.toMarkdown();
      editor.updateMarkdownPreview();
    };

    apply.addEventListener('click', applyFromMarkdown);
    reset.addEventListener('click', resetToDocument);
    editor.sourceText.addEventListener('keydown', function(event){
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        applyFromMarkdown();
      }
    });

    editor.__embeddedSourceActionsInstalled = true;
  }

  function installScopedPersistence(editor, textarea, storageKey, initialPayload) {
    const mirrorToTextarea = function(force) {
      const html = editor.getHTML ? editor.getHTML() : editor.editor.innerHTML;
      if (force || textarea.value !== html) {
        textarea.value = html;
        dispatchHostInput(textarea);
      }
      return html;
    };

    const saveDraft = function() {
      const html = mirrorToTextarea(false);
      const savedAt = new Date().toISOString();
      writeJSON(storageKey, {
        html: html,
        savedAt: savedAt
      });
      editor.state.dirty = false;
      editor.state.lastSavedAt = savedAt;
      if (editor.statusDirty) editor.statusDirty.textContent = 'Saved';
      if (editor.statusSaved) editor.statusSaved.textContent = formatTimeLabel(savedAt);
      if (typeof editor.updateStatus === 'function') editor.updateStatus();
    };

    editor.saveState = saveDraft;
    editor.loadState = function() { return null; };
    editor.autosave = debounce(function(){ saveDraft(); }, 700);

    const debouncedMirror = debounce(function(){ mirrorToTextarea(false); }, 120);
    const observer = new MutationObserver(function(){ debouncedMirror(); });
    observer.observe(editor.editor, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'src', 'alt', 'data-language', 'data-code', 'data-tex', 'data-display']
    });

    editor.editor.addEventListener('input', debouncedMirror);
    editor.root.addEventListener('click', function(){ setTimeout(debouncedMirror, 0); });
    editor.root.addEventListener('keyup', debouncedMirror);
    editor.root.addEventListener('change', debouncedMirror);

    if (textarea.form) {
      textarea.form.addEventListener('submit', function(){
        mirrorToTextarea(true);
        if (typeof editor.saveState === 'function') editor.saveState();
      });
    }

    if (editor.statusDirty) {
      editor.statusDirty.textContent = initialPayload && initialPayload.source === 'draft' ? 'Draft restored' : 'Ready';
    }
    if (editor.statusSaved) {
      editor.statusSaved.textContent = formatTimeLabel(initialPayload && initialPayload.savedAt || null);
    }
    editor.state.dirty = false;
    mirrorToTextarea(true);

    editor.__hostMirrorNow = mirrorToTextarea;
    editor.__hostDraftObserver = observer;
    return mirrorToTextarea;
  }

  function applyEmbeddedMode(editor, textarea, options, initialPayload) {
    ensureStyle(EMBED_STYLE_ID, EMBED_STYLE);
    neutralizeGlobalEditorStyles();
    editor.root.classList.add('lre-embedded-content');
    hideToolbarActions(editor);
    createEmbeddedToolbarHost(editor);
    ensureRibbonControls(editor, options || {});
    editor.state.outlineOpen = false;
    editor.state.inspectorPinned = false;
    editor.state.sourceOpen = false;
    editor.state.split = false;
    if (editor.searchbar) editor.searchbar.classList.remove('is-open');
    if (editor.docTitle) editor.docTitle.value = 'Content body';

    const titleInput = findNearbyTitleInput(textarea, options && options.titleField);
    if (titleInput) {
      const syncTitle = function() {
        if (editor.docTitle) editor.docTitle.value = String(titleInput.value || '').trim() || 'Content body';
      };
      syncTitle();
      titleInput.addEventListener('input', syncTitle);
      editor.__hostTitleInput = titleInput;
    }

    const syncNow = installScopedPersistence(editor, textarea, buildStorageKey(textarea, options), initialPayload);
    installSourceActions(editor, syncNow);
    if (typeof editor.updateLayout === 'function') editor.updateLayout();
    if (typeof editor.updateToolbarActiveState === 'function') editor.updateToolbarActiveState();
    return syncNow;
  }

  function resolveMountElement(target) {
    if (!target) return null;
    if (typeof target === 'string') return document.querySelector(target);
    if (target && target.nodeType === 1) return target;
    return null;
  }

  function mountIntoTextarea(textarea, options) {
    if (!textarea || textarea.dataset.solidEditorMounted === 'true') return textarea && textarea.__solidEditorInstance || null;
    if (!window.mountLocalRichEditor) {
      console.error('[LocalRichEditor]', BUILD, 'mountLocalRichEditor not found');
      return null;
    }

    textarea.dataset.solidEditorMounted = 'true';
    textarea.classList.add('lre-host-textarea');
    const wrapper = document.createElement('div');
    wrapper.className = 'solid-embedded-editor-host';
    textarea.insertAdjacentElement('afterend', wrapper);

    const initialPayload = getInitialPayload(textarea, options || {});
    const mountOptions = {
      target: wrapper,
      replace: true,
      persist: false,
      placeholder: options && typeof options.placeholder === 'string' ? options.placeholder : 'Write the announcement content here.',
      title: 'Content body'
    };
    if (options && typeof options.lang === 'string' && options.lang.trim()) mountOptions.lang = options.lang.trim();
    if (options && typeof options.dark === 'boolean') mountOptions.dark = options.dark;
    if (options && typeof options.ribbonExpanded === 'boolean') mountOptions.ribbonExpanded = options.ribbonExpanded;
    if (initialPayload.mode === 'markdown') mountOptions.markdown = initialPayload.value;
    else mountOptions.html = initialPayload.value;

    const editor = window.mountLocalRichEditor(mountOptions);
    if (!editor) {
      textarea.dataset.solidEditorMounted = 'false';
      return null;
    }

    textarea.__solidEditorInstance = editor;
    editor.__hostTextarea = textarea;
    editor.__hostStorageKey = buildStorageKey(textarea, options || {});
    applyEmbeddedMode(editor, textarea, options || {}, initialPayload);
    if (typeof editor.renderAllCodeBlocks === 'function') editor.renderAllCodeBlocks();
    if (typeof editor.renderAllMath === 'function') editor.renderAllMath();
    if (typeof editor.detectSelectedNode === 'function') editor.detectSelectedNode();
    try { console.info('[LocalRichEditor]', BUILD, 'mounted on textarea'); } catch (error) {}
    return editor;
  }

  function scoreTextarea(textarea) {
    if (!textarea || textarea.disabled) return -Infinity;
    if (textarea.dataset.solidEditorMounted === 'true') return -Infinity;
    const hay = [textarea.name, textarea.id, textarea.placeholder, textarea.getAttribute('aria-label'), textarea.className].join(' ');
    let score = 0;
    if (/(content|contents|body|detail|description|article|announcement|notice|post|editor)/i.test(hay)) score += 80;
    if (/(내용|본문|상세|설명)/i.test(hay)) score += 90;
    const rows = Number(textarea.getAttribute('rows') || 0);
    score += Math.min(rows, 20) * 4;
    score += Math.min(textarea.clientHeight || textarea.offsetHeight || 0, 500) / 5;
    if (textarea.closest('.sk-demo-editor-card, .write, .write-form, .board-write, .announcement-write, .editor-wrap, .editor-area, .content-area')) score += 30;
    if (rows && rows < 4 && (textarea.clientHeight || textarea.offsetHeight || 0) < 120) score -= 40;
    if (/(search|captcha|reply|comment|filter)/i.test(hay)) score -= 60;
    if (textarea.type === 'hidden') score -= 200;
    if (textarea.closest('[hidden], .is-hidden, .hidden')) score -= 50;
    return score;
  }

  function findBestContentTextarea(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const list = Array.from(scope.querySelectorAll('textarea')).filter(function(textarea){
      return textarea.dataset.solidEditorMounted !== 'true';
    });
    if (!list.length) return null;
    list.sort(function(a, b){ return scoreTextarea(b) - scoreTextarea(a); });
    return scoreTextarea(list[0]) > 0 ? list[0] : null;
  }

  function mountContentEditor(target, options) {
    const resolved = resolveMountElement(target);
    if (!resolved) return null;
    if (resolved.tagName === 'TEXTAREA') return mountIntoTextarea(resolved, options || {});
    const textarea = resolved.matches('textarea') ? resolved : resolved.querySelector('textarea');
    if (textarea) return mountIntoTextarea(textarea, options || {});
    return null;
  }

  function resolveConfiguredTarget(options) {
    const config = options || {};
    const globalConfig = window.STATKISS_SOLID_EDIT_CONFIG || {};
    return config.target
      || config.selector
      || config.textarea
      || globalConfig.target
      || globalConfig.selector
      || globalConfig.textarea
      || window.STATKISS_SOLID_EDIT_TARGET
      || (window.STATKISS_ANNOUNCEMENT_CONTEXT && window.STATKISS_ANNOUNCEMENT_CONTEXT.editorTarget)
      || null;
  }

  function resolveTargetTextarea(target) {
    if (!target) return null;
    const resolved = resolveMountElement(target);
    if (!resolved) return null;
    if (resolved.tagName === 'TEXTAREA') return resolved;
    if (typeof resolved.matches === 'function' && resolved.matches('textarea')) return resolved;
    return resolved.querySelector ? resolved.querySelector('textarea') : null;
  }

  function observeAndMount(getTextarea, options) {
    const config = options || {};
    const timeoutMs = Number(config.observeTimeout || 15000);
    const tryMount = function() {
      if (window.__solidAutoMountedContentEditor) return window.__solidAutoMountedContentEditor;
      const textarea = getTextarea();
      if (!textarea) return null;
      const editor = mountIntoTextarea(textarea, config);
      if (!editor) return null;
      window.__solidAutoMountedContentEditor = editor;
      return editor;
    };

    const immediate = tryMount();
    if (immediate) return immediate;

    if (!document.body) {
      document.addEventListener('DOMContentLoaded', function(){ observeAndMount(getTextarea, config); }, { once: true });
      return null;
    }

    const observer = new MutationObserver(function(){
      const mounted = tryMount();
      if (mounted) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(function(){ observer.disconnect(); }, timeoutMs);
    return null;
  }

  function autoMountContentEditor(options) {
    const configuredTarget = resolveConfiguredTarget(options);
    if (configuredTarget) {
      return observeAndMount(function(){ return resolveTargetTextarea(configuredTarget); }, options || {});
    }
    return observeAndMount(function(){ return findBestContentTextarea(document); }, options || {});
  }

  function initContentEditor(options) {
    const mergedOptions = Object.assign({}, window.STATKISS_SOLID_EDIT_CONFIG || {}, options || {});
    return autoMountContentEditor(mergedOptions);
  }

  function renderDemoShell(target) {
    const host = resolveMountElement(target) || document.getElementById('app') || document.body;
    if (!host) return null;
    ensureStyle(DEMO_STYLE_ID, DEMO_STYLE);
    host.innerHTML = `
      <div class="sk-demo-page">
        <header class="sk-demo-header">
          <div class="sk-demo-brand">
            <div class="sk-demo-logo">KISS</div>
            <div>
              <strong>Korean International Statistical Society</strong>
              <span>Embedded content editor demo</span>
            </div>
          </div>
          <nav class="sk-demo-nav" aria-label="Primary">
            <a href="#">About</a>
            <a href="#">Notice</a>
            <a href="#">Publications</a>
            <a href="#">Awards</a>
            <a href="#">Forum</a>
            <a href="#">Membership</a>
          </nav>
        </header>
        <main class="sk-demo-main">
          <section class="sk-demo-panel">
            <label class="sk-demo-section-label" for="demoTitleInput">Event content</label>
            <input id="demoTitleInput" class="sk-demo-title" type="text" placeholder="Enter a title">
            <div class="sk-demo-editor-card">
              <textarea id="demoContentTextarea" name="content" rows="18" placeholder="Write the announcement content here."></textarea>
            </div>
            <section class="sk-demo-upload">
              <h2>Attachments</h2>
              <div class="sk-demo-dropzone" aria-hidden="true">
                <div>
                  <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"><path d="M12 3v12"/><path d="m7 10 5-5 5 5"/><path d="M5 21h14"/></svg>
                  <strong>Drop files here or choose a file</strong>
                  <span>This demo keeps the upload area outside the editor, like the host page layout.</span>
                </div>
              </div>
            </section>
            <div class="sk-demo-actions">
              <button class="primary" type="button">Submit</button>
              <button type="button">List</button>
            </div>
          </section>
        </main>
      </div>
    `;

    const textarea = host.querySelector('#demoContentTextarea');
    textarea.value = [
      '<p>Write the announcement content in the page body editor.</p>',
      '<p><strong>Formatting</strong>, <em>math</em>, images, tables, and code blocks stay inside the content area instead of taking over the whole page.</p>',
      '<blockquote>Use the Markdown panel when you want to paste or refine source.</blockquote>',
      '<div class="lre-math-node block" contenteditable="false" data-type="math" data-display="true" data-tex="\\int_0^1 x^2 \\mathrm{d}x = \\frac{1}{3}"></div>',
      '<div class="lre-code-node" contenteditable="false" data-type="code" data-language="javascript" data-code="const mean = values.reduce((sum, value) => sum + value, 0) / values.length;\\nconsole.log(mean);"></div>'
    ].join('');

    const editor = mountIntoTextarea(textarea, {
      placeholder: 'Write the announcement content here.',
      storageKey: 'solid-demo-embedded-content-editor-v1',
      titleField: '#demoTitleInput'
    });
    return editor;
  }

  function runStatkissAutoInit() {
    if (window.STATKISS_SOLID_EDIT_AUTOINIT === false) return;
    if (document.querySelector('.sk-demo-page')) return;
    if (window.__solidStatkissAutoInitRan) return;
    window.__solidStatkissAutoInitRan = true;
    initContentEditor();
  }

  window.mountStatkissContentEditor = mountContentEditor;
  window.autoMountStatkissContentEditor = autoMountContentEditor;
  window.initStatkissContentEditor = initContentEditor;
  window.renderStatkissContentWriteDemo = renderDemoShell;
  window.mountEmbeddedContentEditor = mountContentEditor;
  window.initEmbeddedContentEditor = initContentEditor;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runStatkissAutoInit, { once: true });
  } else {
    setTimeout(runStatkissAutoInit, 0);
  }
})();

(function () {
  if (typeof window === 'undefined') return;

  function toElement(target) {
    if (!target) return null;
    if (typeof target === 'string') {
      try {
        return document.querySelector(target);
      } catch (error) {
        return null;
      }
    }
    if (target && target.nodeType === 1) return target;
    return null;
  }

  function normalizeBootOptions(input) {
    if (!input) return {};
    if (typeof input === 'string' || (input && input.nodeType === 1)) {
      return { target: input };
    }
    if (typeof input === 'object') return Object.assign({}, input);
    return {};
  }

  function whenReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
      return;
    }
    callback();
  }

  function waitForMountApi(timeoutMs) {
    const timeout = typeof timeoutMs === 'number' ? timeoutMs : 15000;
    return new Promise(function (resolve, reject) {
      const hasApi = function () {
        return typeof window.mountStatkissContentEditor === 'function' || typeof window.autoMountStatkissContentEditor === 'function';
      };
      if (hasApi()) {
        resolve();
        return;
      }
      const startedAt = Date.now();
      const timer = setInterval(function () {
        if (hasApi()) {
          clearInterval(timer);
          resolve();
          return;
        }
        if (Date.now() - startedAt > timeout) {
          clearInterval(timer);
          reject(new Error('Solid editor mount API not available'));
        }
      }, 40);
    });
  }

  function waitForTarget(target, timeoutMs) {
    const timeout = typeof timeoutMs === 'number' ? timeoutMs : 15000;
    return new Promise(function (resolve, reject) {
      const getTarget = function () {
        if (!target) return null;
        return toElement(target);
      };
      const immediate = getTarget();
      if (immediate) {
        resolve(immediate);
        return;
      }
      if (!document.body) {
        reject(new Error('Document body is not ready'));
        return;
      }
      const observer = new MutationObserver(function () {
        const next = getTarget();
        if (!next) return;
        observer.disconnect();
        clearTimeout(cancelTimer);
        resolve(next);
      });
      const cancelTimer = setTimeout(function () {
        observer.disconnect();
        reject(new Error('Solid editor target not found: ' + String(target)));
      }, timeout);
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  async function initStatkissContentEditor(input, maybeOptions) {
    const options = Object.assign(
      {},
      normalizeBootOptions(window.STATKISS_SOLID_EDIT_BOOT_OPTIONS || window.STATKISS_SOLID_EDIT_OPTIONS),
      normalizeBootOptions(input),
      normalizeBootOptions(maybeOptions)
    );

    const timeout = typeof options.waitTimeout === 'number' ? options.waitTimeout : 15000;

    await new Promise(function (resolve) { whenReady(resolve); });
    await waitForMountApi(timeout);

    if (options.target) {
      const element = await waitForTarget(options.target, timeout);
      return window.mountStatkissContentEditor(element, options);
    }

    if (window.STATKISS_SOLID_EDIT_TARGET) {
      const element = await waitForTarget(window.STATKISS_SOLID_EDIT_TARGET, timeout);
      const merged = Object.assign({}, options, { target: element });
      return window.mountStatkissContentEditor(element, merged);
    }

    if (typeof window.autoMountStatkissContentEditor === 'function') {
      window.autoMountStatkissContentEditor(options);
      return window.__solidAutoMountedContentEditor || null;
    }

    return null;
  }

  window.initStatkissContentEditor = initStatkissContentEditor;
})();


/* 20260403-statkiss-supreme-patch */
(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  const BUILD = '20260403-statkiss-supreme-patch';
  const STYLE_ID = 'statkiss-solid-editor-supreme-style';
  const PATCH_FLAG = '__statkissSupremePatchApplied';

  const TOKENS = {
    js: ['as','async','await','break','case','catch','class','const','continue','debugger','default','delete','do','else','export','extends','false','finally','for','from','function','if','import','in','instanceof','let','new','null','return','super','switch','this','throw','true','try','typeof','undefined','var','void','while','with','yield'],
    py: ['and','as','assert','async','await','break','class','continue','def','del','elif','else','except','False','finally','for','from','global','if','import','in','is','lambda','None','nonlocal','not','or','pass','raise','return','True','try','while','with','yield'],
    bash: ['if','then','else','fi','for','in','do','done','case','esac','function','echo','export','local','readonly','while','until','return'],
    sql: ['select','from','where','join','left','right','inner','outer','on','group','by','order','insert','into','values','update','set','delete','create','table','alter','drop','as','and','or','not','null','limit','having','distinct'],
    css: ['display','position','color','background','font','padding','margin','border','width','height','grid','flex','absolute','relative','fixed','sticky','block','inline','none']
  };

  const STYLE = `
    .lre-root.lre-embedded-content .statkiss-mode-switcher {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px;
      border: 1px solid var(--lre-border);
      border-radius: 999px;
      background: rgba(255,255,255,.9);
      box-shadow: none;
      margin-bottom: 2px;
      width: fit-content;
    }
    .lre-root.lre-embedded-content .statkiss-mode-switcher button {
      appearance: none;
      border: 0;
      background: transparent;
      color: var(--lre-muted);
      height: 34px;
      padding: 0 14px;
      border-radius: 999px;
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: .01em;
      cursor: pointer;
    }
    .lre-root.lre-embedded-content .statkiss-mode-switcher button.is-active {
      background: rgba(37, 99, 235, .12);
      color: #1d4ed8;
      box-shadow: inset 0 0 0 1px rgba(37,99,235,.18);
    }
    .lre-root.lre-embedded-content [data-action="toggle-source"],
    .lre-root.lre-embedded-content [data-action="toggle-split"],
    .lre-root.lre-embedded-content [data-action="toggle-dark"],
    .lre-root.lre-embedded-content [data-action="comment"],
    .lre-root.lre-embedded-content .lre-floating [data-bubble-action="comment"] {
      display: none !important;
    }
    .lre-root.lre-embedded-content .lre-group[data-ribbon-group="advanced"] [data-action="toggle-source"],
    .lre-root.lre-embedded-content .lre-group[data-ribbon-group="advanced"] [data-action="toggle-split"] {
      display: none !important;
    }
    .lre-root.lre-embedded-content .lre-btn[data-action="h1"] .lre-icon,
    .lre-root.lre-embedded-content .lre-btn[data-action="h2"] .lre-icon,
    .lre-root.lre-embedded-content .lre-btn[data-action="h3"] .lre-icon {
      width: 22px !important;
      height: 22px !important;
    }
    .lre-root.lre-embedded-content.statkiss-markdown-mode #lreEmbedToolbarHost .lre-toolbar-scroll {
      display: none !important;
    }
    .lre-root.lre-embedded-content.statkiss-markdown-mode .lre-editor-shell > div:first-child {
      display: none !important;
    }
    .lre-root.lre-embedded-content.statkiss-markdown-mode .lre-source-panel {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) minmax(320px, 42%);
      gap: 12px;
    }
    .lre-root.lre-embedded-content.statkiss-markdown-mode .lre-editor-shell {
      grid-template-columns: minmax(0, 1fr) !important;
    }
    .lre-root.lre-embedded-content.statkiss-markdown-mode #lreInspectorPanel,
    .lre-root.lre-embedded-content.statkiss-markdown-mode #lreOutlinePanel {
      display: none !important;
    }
    .lre-root.lre-embedded-content #lreInspectorPanel .lre-inspector-section {
      display: none;
    }
    .lre-root.lre-embedded-content #lreInspectorPanel .lre-inspector-section.is-open {
      display: grid;
      gap: 10px;
    }
    .lre-root.lre-embedded-content #lreInspectorPanel .statkiss-inspector-actions {
      display: grid;
      gap: 10px;
    }
    .lre-root.lre-embedded-content #lreInspectorPanel .statkiss-inspector-actions .lre-btn,
    .lre-root.lre-embedded-content #lreInspectorPanel .statkiss-inspector-actions button {
      justify-content: center;
    }
    .lre-root.lre-embedded-content .lre-code-node {
      position: relative;
      border-radius: 22px;
      overflow: hidden;
      border: 1px solid #d7e0ed;
      background: #f8fbff;
      color: #0f172a;
      margin: 1rem 0;
    }
    .lre-root.lre-embedded-content .lre-code-node.is-selected {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }
    .lre-root.lre-embedded-content .lre-code-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      border-bottom: 1px solid rgba(148,163,184,.18);
      background: rgba(255,255,255,.88);
    }
    .lre-root.lre-embedded-content .lre-code-head .lre-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 0;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid rgba(37,99,235,.16);
      background: rgba(37,99,235,.08);
      color: #1d4ed8;
      font-size: 12px;
      font-weight: 700;
      text-transform: lowercase;
    }
    .lre-root.lre-embedded-content .statkiss-code-toggle {
      appearance: none;
      border: 1px solid rgba(148,163,184,.26);
      background: rgba(255,255,255,.72);
      color: #334155;
      border-radius: 999px;
      width: 34px;
      height: 34px;
      min-width: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .lre-root.lre-embedded-content .statkiss-code-toggle svg {
      width: 18px;
      height: 18px;
    }
    .lre-root.lre-embedded-content .lre-code-node pre {
      margin: 0;
      padding: 18px 18px 20px;
      white-space: pre;
      overflow: auto;
      background: transparent;
      color: inherit;
    }
    .lre-root.lre-embedded-content .lre-code-node.is-collapsed pre {
      display: none;
    }
    .lre-root.lre-embedded-content .lre-code-node code {
      display: block;
      font: 14px/1.7 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      white-space: pre;
      color: inherit;
    }
    .lre-root.lre-embedded-content .lre-code-node .tok-comment { color: #64748b; }
    .lre-root.lre-embedded-content .lre-code-node .tok-key,
    .lre-root.lre-embedded-content .lre-code-node .tok-tag { color: #0f766e; font-weight: 700; }
    .lre-root.lre-embedded-content .lre-code-node .tok-string,
    .lre-root.lre-embedded-content .lre-code-node .tok-link { color: #b45309; }
    .lre-root.lre-embedded-content .lre-code-node .tok-number { color: #7c3aed; }
    .lre-root.lre-embedded-content .lre-code-node .tok-attr { color: #1d4ed8; }
    .lre-root.lre-embedded-content .lre-code-node .tok-fn,
    .lre-root.lre-embedded-content .lre-code-node .tok-title { color: #be123c; }
    .lre-root.lre-embedded-content .lre-code-node .tok-type,
    .lre-root.lre-embedded-content .lre-code-node .tok-bullet { color: #4f46e5; }
    .lre-root.lre-embedded-content .lre-math-node {
      overflow: hidden;
    }
    .lre-root.lre-embedded-content .lre-math-node .statkiss-math-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 1.75em;
    }
    .lre-root.lre-embedded-content .lre-math-node.inline .statkiss-math-wrap {
      display: inline-flex;
      min-width: 1em;
    }
    .lre-root.lre-embedded-content .lre-math-node svg {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 0 auto;
    }
    .lre-root.lre-embedded-content .lre-math-node.is-error .statkiss-math-wrap {
      color: #b91c1c;
      font: 600 13px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      white-space: pre-wrap;
      word-break: break-word;
      justify-content: flex-start;
      text-align: left;
    }
    .lre-root.lre-embedded-content .statkiss-inline-modal[hidden] {
      display: none !important;
    }
    .lre-root.lre-embedded-content .statkiss-inline-modal {
      position: fixed;
      inset: 0;
      z-index: 120;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(15,23,42,.26);
      backdrop-filter: blur(8px);
    }
    .lre-root.lre-embedded-content .statkiss-inline-card {
      width: min(360px, calc(100vw - 32px));
      display: grid;
      gap: 14px;
      padding: 16px;
      border-radius: 18px;
      border: 1px solid rgba(148,163,184,.22);
      background: rgba(255,255,255,.98);
      box-shadow: 0 22px 48px rgba(15,23,42,.18);
      color: #0f172a;
    }
    .lre-root.lre-embedded-content .statkiss-inline-card h3 {
      margin: 0;
      font-size: 16px;
    }
    .lre-root.lre-embedded-content .statkiss-inline-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 4px;
      padding: 8px;
      border-radius: 14px;
      border: 1px solid rgba(148,163,184,.18);
      background: #f8fafc;
    }
    .lre-root.lre-embedded-content .statkiss-inline-grid button {
      appearance: none;
      border: 1px solid rgba(148,163,184,.22);
      background: #fff;
      border-radius: 6px;
      width: 24px;
      height: 24px;
      cursor: pointer;
    }
    .lre-root.lre-embedded-content .statkiss-inline-grid button.is-active {
      background: rgba(37,99,235,.12);
      border-color: rgba(37,99,235,.42);
    }
    .lre-root.lre-embedded-content .statkiss-inline-fields {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .lre-root.lre-embedded-content .statkiss-inline-fields label {
      display: grid;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
    }
    .lre-root.lre-embedded-content .statkiss-inline-fields input {
      width: 100%;
      height: 38px;
      border: 1px solid rgba(148,163,184,.26);
      border-radius: 12px;
      padding: 0 12px;
      background: #fff;
      color: #0f172a;
      font: inherit;
    }
    .lre-root.lre-embedded-content .statkiss-inline-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .lre-root.lre-embedded-content .statkiss-inline-actions button {
      appearance: none;
      border: 1px solid rgba(148,163,184,.26);
      background: #fff;
      color: #0f172a;
      border-radius: 999px;
      padding: 8px 14px;
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .lre-root.lre-embedded-content .statkiss-inline-actions .primary {
      background: #2563eb;
      color: #fff;
      border-color: #2563eb;
    }
    body.dark .lre-root.lre-embedded-content .statkiss-mode-switcher {
      background: rgba(15,23,42,.88);
      border-color: rgba(71,85,105,.55);
    }
    body.dark .lre-root.lre-embedded-content .statkiss-mode-switcher button {
      color: #94a3b8;
    }
    body.dark .lre-root.lre-embedded-content .statkiss-mode-switcher button.is-active {
      color: #dbeafe;
      background: rgba(59,130,246,.24);
      box-shadow: inset 0 0 0 1px rgba(96,165,250,.28);
    }
    body.dark .lre-root.lre-embedded-content .lre-code-node {
      background: #0f172a;
      color: #e5eefc;
      border-color: #24324d;
    }
    body.dark .lre-root.lre-embedded-content .lre-code-head {
      background: rgba(15,23,42,.9);
      border-color: rgba(71,85,105,.34);
    }
    body.dark .lre-root.lre-embedded-content .lre-code-head .lre-chip {
      color: #bfdbfe;
      background: rgba(59,130,246,.18);
      border-color: rgba(96,165,250,.22);
    }
    body.dark .lre-root.lre-embedded-content .statkiss-code-toggle {
      background: rgba(15,23,42,.8);
      color: #e2e8f0;
      border-color: rgba(71,85,105,.42);
    }
    body.dark .lre-root.lre-embedded-content .lre-code-node .tok-comment { color: #94a3b8; }
    body.dark .lre-root.lre-embedded-content .lre-code-node .tok-key,
    body.dark .lre-root.lre-embedded-content .lre-code-node .tok-tag { color: #5eead4; }
    body.dark .lre-root.lre-embedded-content .lre-code-node .tok-string,
    body.dark .lre-root.lre-embedded-content .lre-code-node .tok-link { color: #fbbf24; }
    body.dark .lre-root.lre-embedded-content .lre-code-node .tok-number { color: #c4b5fd; }
    body.dark .lre-root.lre-embedded-content .lre-code-node .tok-attr { color: #93c5fd; }
    body.dark .lre-root.lre-embedded-content .lre-code-node .tok-fn,
    body.dark .lre-root.lre-embedded-content .lre-code-node .tok-title { color: #fda4af; }
    body.dark .lre-root.lre-embedded-content .lre-code-node .tok-type,
    body.dark .lre-root.lre-embedded-content .lre-code-node .tok-bullet { color: #a5b4fc; }
    body.dark .lre-root.lre-embedded-content .statkiss-inline-card {
      background: rgba(15,23,42,.98);
      color: #e5eefc;
      border-color: rgba(71,85,105,.42);
    }
    body.dark .lre-root.lre-embedded-content .statkiss-inline-grid {
      background: #0b1220;
      border-color: rgba(71,85,105,.42);
    }
    body.dark .lre-root.lre-embedded-content .statkiss-inline-grid button,
    body.dark .lre-root.lre-embedded-content .statkiss-inline-fields input,
    body.dark .lre-root.lre-embedded-content .statkiss-inline-actions button {
      background: #0b1220;
      color: #e5eefc;
      border-color: rgba(71,85,105,.42);
    }
    body.dark .lre-root.lre-embedded-content .statkiss-inline-actions .primary {
      background: #2563eb;
      color: #fff;
      border-color: #2563eb;
    }
    @media (max-width: 900px) {
      .lre-root.lre-embedded-content.statkiss-markdown-mode .lre-source-panel {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `;

  function ensureStyle(id, cssText) {
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = cssText;
    return style;
  }

  function waitForEditor(callback) {
    const run = function () {
      const editor = window.__localRichEditor || window.localRichEditor || window.__solidAutoMountedContentEditor || null;
      if (!editor) return false;
      callback(editor);
      return true;
    };
    if (run()) return;
    let tries = 0;
    const timer = setInterval(function () {
      tries += 1;
      if (run() || tries > 400) clearInterval(timer);
    }, 50);
    window.addEventListener('local-rich-editor:ready', function () {
      if (run()) clearInterval(timer);
    }, { once: true });
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function svg(paths, viewBox) {
    return '<svg viewBox="' + (viewBox || '0 0 24 24') + '" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9">' + paths + '</svg>';
  }

  function normalizeLang(value) {
    const raw = String(value || '').trim().toLowerCase();
    const aliases = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      py: 'python', sh: 'bash', shell: 'bash', zsh: 'bash', cjs: 'javascript', mjs: 'javascript',
      htmlmixed: 'html', xml: 'html', yml: 'yaml', txt: 'plaintext', text: 'plaintext', md: 'markdown'
    };
    return aliases[raw] || raw || 'plaintext';
  }

  function wordRegex(words) {
    return new RegExp('\\b(' + words.map(function (w) { return w.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'); }).join('|') + ')\\b', 'g');
  }

  function stashTokens(text, patterns) {
    let src = String(text || '');
    const stash = [];
    const keep = function (html) {
      const key = '\uE100' + stash.length + '\uE101';
      stash.push(html);
      return key;
    };
    patterns.forEach(function (pattern) {
      src = src.replace(pattern.re, function (match) {
        return keep('<span class="' + pattern.cls + '">' + esc(match) + '</span>');
      });
    });
    return {
      src: src,
      restore: function (html) {
        return html.replace(/\uE100(\d+)\uE101/g, function (_, i) { return stash[Number(i)] || ''; });
      }
    };
  }

  function detectLanguage(code, hint) {
    const lang = normalizeLang(hint);
    if (lang && lang !== 'auto') return lang;
    const text = String(code || '');
    if (/^\s*</.test(text) && /<\/?[A-Za-z][\w:-]*/.test(text)) return 'html';
    if (/^\s*[\[{]/.test(text) && /:\s*/.test(text)) return 'json';
    if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(text)) return 'sql';
    if (/^\s*#?!\/bin\/(?:ba)?sh/.test(text) || /\bfi\b|\bthen\b|\becho\b/.test(text)) return 'bash';
    if (/^\s*def\s+\w+|^\s*class\s+\w+|\bimport\s+\w+/m.test(text)) return 'python';
    if (/^\s*[.#]?[\w-]+\s*\{/.test(text)) return 'css';
    if (/^\s*#{1,6}\s/m.test(text) || /^\s*[-*+]\s/m.test(text) || /```/.test(text)) return 'markdown';
    if (/\b(function|const|let|var|=>|console\.)\b/.test(text)) return 'javascript';
    return 'plaintext';
  }

  function highlightHtmlLike(code) {
    let html = esc(code);
    html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-comment">$1</span>');
    html = html.replace(/(&lt;\/?)([A-Za-z][\w:-]*)/g, '$1<span class="tok-tag">$2</span>');
    html = html.replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)(=)(&quot;.*?&quot;|&#39;.*?&#39;)/g, '<span class="tok-attr">$1</span>$2<span class="tok-string">$3</span>');
    return html;
  }

  function highlightJson(code) {
    let html = esc(code);
    html = html.replace(/(&quot;(?:\\.|[^&]|&(?!quot;))*?&quot;)(\s*:)/g, '<span class="tok-attr">$1</span>$2');
    html = html.replace(/(:\s*)(&quot;(?:\\.|[^&]|&(?!quot;))*?&quot;)/g, '$1<span class="tok-string">$2</span>');
    html = html.replace(/\b(true|false|null)\b/g, '<span class="tok-key">$1</span>');
    html = html.replace(/\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, '<span class="tok-number">$1</span>');
    return html;
  }

  function highlightCss(code) {
    const tokenized = stashTokens(code, [
      { re: /\/\*[\s\S]*?\*\//g, cls: 'tok-comment' },
      { re: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, cls: 'tok-string' }
    ]);
    let html = esc(tokenized.src);
    html = html.replace(/([#.a-zA-Z][^\{\n]+)(\s*\{)/g, '<span class="tok-fn">$1</span>$2');
    html = html.replace(/([a-z-]+)(\s*:)/gi, '<span class="tok-attr">$1</span>$2');
    html = html.replace(wordRegex(TOKENS.css), '<span class="tok-key">$1</span>');
    html = html.replace(/\b(#[0-9a-fA-F]{3,8}|\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw)?|auto)\b/g, '<span class="tok-number">$1</span>');
    return tokenized.restore(html);
  }

  function highlightScript(code, config) {
    const tokenized = stashTokens(code, (config.comments || []).map(function (re) { return { re: re, cls: 'tok-comment' }; }).concat([
      { re: /`(?:\\[\s\S]|[^`])*`/g, cls: 'tok-string' },
      { re: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, cls: 'tok-string' }
    ]));
    let html = esc(tokenized.src);
    html = html.replace(/\b(function|def|class)\s+([A-Za-z_$][\w$]*)/g, '<span class="tok-key">$1</span> <span class="tok-fn">$2</span>');
    html = html.replace(config.keywords, '<span class="tok-key">$1</span>');
    if (config.builtins && config.builtins.length) html = html.replace(wordRegex(config.builtins), '<span class="tok-type">$1</span>');
    html = html.replace(/\b([A-Za-z_$][\w$]*)(?=\s*\()/g, '<span class="tok-fn">$1</span>');
    html = html.replace(/\b(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/gi, '<span class="tok-number">$1</span>');
    return tokenized.restore(html);
  }

  function highlightMarkdown(code) {
    let html = esc(code);
    html = html.replace(/^(#{1,6})(\s+.*)$/gm, '<span class="tok-key">$1</span><span class="tok-title">$2</span>');
    html = html.replace(/^(\s*[-*+]\s+)(.*)$/gm, '<span class="tok-bullet">$1</span>$2');
    html = html.replace(/(```[\s\S]*?```)/g, '<span class="tok-string">$1</span>');
    html = html.replace(/(`[^`]+`)/g, '<span class="tok-string">$1</span>');
    html = html.replace(/(\[[^\]]+\]\([^\)]+\))/g, '<span class="tok-link">$1</span>');
    return html;
  }

  function highlightCodeHtml(code, language) {
    const lang = detectLanguage(code, language);
    if (lang === 'html') return { language: 'html', html: highlightHtmlLike(code) };
    if (lang === 'json') return { language: 'json', html: highlightJson(code) };
    if (lang === 'css') return { language: 'css', html: highlightCss(code) };
    if (lang === 'python') return { language: 'python', html: highlightScript(code, { keywords: wordRegex(TOKENS.py), comments: [/#.*$/gm], builtins: ['print','len','range','str','int','float','list','dict','set','tuple','enumerate'] }) };
    if (lang === 'sql') return { language: 'sql', html: highlightScript(code, { keywords: wordRegex(TOKENS.sql), comments: [/--[^\n]*/g, /\/\*[\s\S]*?\*\//g], builtins: ['count','sum','avg','min','max'] }) };
    if (lang === 'bash') return { language: 'bash', html: highlightScript(code, { keywords: wordRegex(TOKENS.bash), comments: [/#.*$/gm], builtins: ['printf','echo','cd','pwd','grep','sed','awk','cat'] }) };
    if (lang === 'markdown') return { language: 'markdown', html: highlightMarkdown(code) };
    if (lang === 'plaintext' || lang === 'nohighlight') return { language: lang, html: esc(code) };
    return { language: 'javascript', html: highlightScript(code, { keywords: wordRegex(TOKENS.js), comments: [/\/\*[\s\S]*?\*\//g, /\/\/[^\n]*/g], builtins: ['console','Promise','Array','Object','String','Number','Boolean','Math','Date','JSON','Map','Set','RegExp','Error'] }) };
  }

  function ensureCodeChrome(node) {
    if (!node) return;
    let head = node.querySelector('.lre-code-head');
    if (!head) {
      head = document.createElement('div');
      head.className = 'lre-code-head';
      node.prepend(head);
    }
    let chip = head.querySelector('.lre-chip');
    if (!chip) {
      chip = document.createElement('span');
      chip.className = 'lre-chip';
      head.prepend(chip);
    }
    let toggle = head.querySelector('.statkiss-code-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'statkiss-code-toggle';
      toggle.innerHTML = svg('<path d="m7 10 5 5 5-5"/>');
      head.appendChild(toggle);
    }
    toggle.setAttribute('aria-label', node.classList.contains('is-collapsed') ? 'Expand code block' : 'Collapse code block');
    toggle.title = toggle.getAttribute('aria-label');
    toggle.onclick = function (event) {
      event.preventDefault();
      event.stopPropagation();
      node.classList.toggle('is-collapsed');
      toggle.innerHTML = node.classList.contains('is-collapsed')
        ? svg('<path d="m7 14 5-5 5 5"/>')
        : svg('<path d="m7 10 5 5 5-5"/>');
      toggle.setAttribute('aria-label', node.classList.contains('is-collapsed') ? 'Expand code block' : 'Collapse code block');
      toggle.title = toggle.getAttribute('aria-label');
    };
    return { head: head, chip: chip, toggle: toggle };
  }

  function normalizeMathNode(node) {
    if (!node) return null;
    if (node.classList.contains('latex-node')) {
      node.classList.remove('latex-node');
      node.classList.add('lre-math-node');
      const tex = node.dataset.tex || node.dataset.latex || node.textContent || '';
      node.dataset.tex = tex;
      node.dataset.type = 'math';
      const display = String(node.dataset.display || 'false') === 'true';
      node.classList.toggle('block', display);
      node.classList.toggle('inline', !display);
      node.setAttribute('contenteditable', 'false');
    }
    if (!node.classList.contains('lre-math-node')) return null;
    if (!node.classList.contains('block') && !node.classList.contains('inline')) {
      const display = String(node.dataset.display || 'false') === 'true';
      node.classList.add(display ? 'block' : 'inline');
    }
    node.dataset.type = 'math';
    node.dataset.tex = node.dataset.tex || node.dataset.latex || '';
    node.setAttribute('contenteditable', 'false');
    return node;
  }

  function whenMathJaxReady(timeoutMs) {
    const timeout = typeof timeoutMs === 'number' ? timeoutMs : 15000;
    return new Promise(function (resolve) {
      const done = function () {
        const mj = window.MathJax;
        if (!mj || typeof mj.tex2svgPromise !== 'function') return false;
        if (mj.startup && mj.startup.promise && typeof mj.startup.promise.then === 'function') {
          mj.startup.promise.then(function () { resolve(mj); }).catch(function () { resolve(mj); });
        } else {
          resolve(mj);
        }
        return true;
      };
      if (done()) return;
      const startedAt = Date.now();
      const timer = setInterval(function () {
        if (done() || Date.now() - startedAt > timeout) {
          clearInterval(timer);
          if (!window.MathJax) resolve(null);
        }
      }, 50);
    });
  }

  async function renderMathNode(editor, node) {
    const target = normalizeMathNode(node);
    if (!target) return;
    const tex = String(target.dataset.tex || '').trim();
    const display = String(target.dataset.display || (target.classList.contains('block') ? 'true' : 'false')) === 'true';
    target.dataset.tex = tex;
    target.dataset.display = String(display);
    target.classList.toggle('block', display);
    target.classList.toggle('inline', !display);
    target.classList.remove('is-error');
    target.innerHTML = '<span class="statkiss-math-wrap"></span>';
    const mount = target.querySelector('.statkiss-math-wrap');
    if (!tex) {
      target.classList.add('is-error');
      mount.textContent = display ? '$$ $$' : '\\( \\)';
      return;
    }
    try {
      const mj = await whenMathJaxReady();
      if (!mj || typeof mj.tex2svgPromise !== 'function') throw new Error('MathJax not ready');
      const result = await mj.tex2svgPromise(tex, { display: display });
      const svgEl = result && result.querySelector ? result.querySelector('svg') : null;
      mount.innerHTML = '';
      if (svgEl) {
        const clone = svgEl.cloneNode(true);
        clone.setAttribute('focusable', 'false');
        clone.setAttribute('aria-hidden', 'true');
        mount.appendChild(clone);
      } else if (result && typeof result.outerHTML === 'string') {
        mount.innerHTML = result.outerHTML;
        mount.querySelectorAll('mjx-assistive-mml, mjx-help, mjx-semantics, mjx-speech').forEach(function (el) { el.remove(); });
      } else {
        throw new Error('MathJax produced no SVG');
      }
    } catch (error) {
      target.classList.add('is-error');
      mount.textContent = display ? '$$\n' + tex + '\n$$' : '\\(' + tex + '\\)';
    }
    if (editor && typeof editor.populateMathInspector === 'function' && editor.getSelectedMathNode && editor.getSelectedMathNode() === target) {
      editor.populateMathInspector(target);
    }
  }

  function renderMathInside(editor, root) {
    const scope = root || editor.editor;
    if (!scope) return;
    scope.querySelectorAll('.lre-math-node, .latex-node').forEach(function (node) {
      renderMathNode(editor, node);
    });
  }

  function buildTableNode(rows, cols) {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    const headRow = document.createElement('tr');
    for (let c = 0; c < cols; c += 1) {
      const th = document.createElement('th');
      th.contentEditable = 'true';
      th.textContent = 'Header ' + (c + 1);
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    for (let r = 0; r < Math.max(1, rows - 1); r += 1) {
      const row = document.createElement('tr');
      for (let c = 0; c < cols; c += 1) {
        const td = document.createElement('td');
        td.contentEditable = 'true';
        td.textContent = 'Cell ' + (r + 1) + '-' + (c + 1);
        row.appendChild(td);
      }
      tbody.appendChild(row);
    }
    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
  }

  function ensureTableModal(editor) {
    if (editor.__statkissTableModal) return editor.__statkissTableModal;
    const overlay = document.createElement('div');
    overlay.className = 'statkiss-inline-modal';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="statkiss-inline-card" role="dialog" aria-label="Insert table">
        <h3>Insert table</h3>
        <div class="statkiss-inline-grid"></div>
        <div class="statkiss-inline-size">3 × 3</div>
        <div class="statkiss-inline-fields">
          <label>Rows<input type="number" min="1" max="20" value="3"></label>
          <label>Columns<input type="number" min="1" max="20" value="3"></label>
        </div>
        <div class="statkiss-inline-actions">
          <button type="button" data-role="cancel">Cancel</button>
          <button type="button" class="primary" data-role="insert">Insert</button>
        </div>
      </div>`;
    editor.root.appendChild(overlay);
    const grid = overlay.querySelector('.statkiss-inline-grid');
    const size = overlay.querySelector('.statkiss-inline-size');
    const rowsInput = overlay.querySelectorAll('input')[0];
    const colsInput = overlay.querySelectorAll('input')[1];
    for (let r = 1; r <= 8; r += 1) {
      for (let c = 1; c <= 8; c += 1) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.dataset.rows = String(r);
        cell.dataset.cols = String(c);
        cell.setAttribute('aria-label', r + ' by ' + c);
        cell.addEventListener('mouseenter', function () { paint(r, c); });
        cell.addEventListener('focus', function () { paint(r, c); });
        cell.addEventListener('click', function () { insert(r, c); });
        grid.appendChild(cell);
      }
    }
    function paint(rows, cols) {
      rows = Math.max(1, Math.min(20, Number(rows) || 1));
      cols = Math.max(1, Math.min(20, Number(cols) || 1));
      overlay.dataset.rows = String(rows);
      overlay.dataset.cols = String(cols);
      rowsInput.value = String(rows);
      colsInput.value = String(cols);
      size.textContent = rows + ' × ' + cols;
      grid.querySelectorAll('button').forEach(function (cell) {
        const active = Number(cell.dataset.rows) <= rows && Number(cell.dataset.cols) <= cols;
        cell.classList.toggle('is-active', active);
      });
    }
    function insert(rows, cols) {
      overlay.hidden = true;
      if (typeof editor.restoreSelection === 'function') editor.restoreSelection();
      const table = buildTableNode(Math.max(1, Math.min(20, rows)), Math.max(1, Math.min(20, cols)));
      if (typeof editor.insertNode === 'function') editor.insertNode(table);
      else editor.editor.appendChild(table);
      if (typeof editor.selectNode === 'function') editor.selectNode(table);
      if (typeof editor.markDirty === 'function') editor.markDirty();
      if (typeof editor.updateSourceView === 'function') editor.updateSourceView();
    }
    rowsInput.addEventListener('input', function () { paint(rowsInput.value, colsInput.value); });
    colsInput.addEventListener('input', function () { paint(rowsInput.value, colsInput.value); });
    overlay.querySelector('[data-role="insert"]').addEventListener('click', function () { insert(Number(rowsInput.value) || 3, Number(colsInput.value) || 3); });
    overlay.querySelector('[data-role="cancel"]').addEventListener('click', function () { overlay.hidden = true; });
    overlay.addEventListener('mousedown', function (event) { if (event.target === overlay) overlay.hidden = true; });
    paint(3, 3);
    editor.__statkissTableModal = overlay;
    return overlay;
  }

  function showTableModal(editor) {
    ensureTableModal(editor).hidden = false;
  }

  function findCommentsSection(panel) {
    if (!panel) return null;
    const sections = Array.from(panel.querySelectorAll('.lre-inspector-section'));
    return sections.find(function (section) {
      return section.querySelector('#lreCommentList') || /comments/i.test(section.querySelector('h3') && section.querySelector('h3').textContent || '');
    }) || null;
  }

  function getSelectedCodeFigure(editor) {
    const direct = editor.selectedNode;
    if (direct && direct.classList && direct.classList.contains('lre-code-node')) return direct;
    const stateNode = editor.state && (editor.state.selectedCodeFigure || editor.state.selectedCodeBlock) || null;
    if (stateNode && stateNode.classList && stateNode.classList.contains('lre-code-node')) return stateNode;
    if (stateNode && stateNode.closest) return stateNode.closest('.lre-code-node');
    return null;
  }

  function syncInspector(editor) {
    const panel = editor.inspectorPanel || editor.root.querySelector('#lreInspectorPanel');
    if (!panel) return;
    const comments = findCommentsSection(panel);
    if (comments) comments.remove();

    const image = editor.getSelectedImageNode ? editor.getSelectedImageNode() : null;
    const table = editor.getSelectedTable ? editor.getSelectedTable() : null;
    const math = editor.getSelectedMathNode ? editor.getSelectedMathNode() : null;
    const code = editor.getSelectedCodeNode ? editor.getSelectedCodeNode() : null;
    const any = !!(image || table || math || code);

    if (editor.imageInspector) { editor.imageInspector.hidden = !image; editor.imageInspector.classList.toggle('is-open', !!image); }
    if (editor.tableInspector) { editor.tableInspector.hidden = !table; editor.tableInspector.classList.toggle('is-open', !!table); }
    if (editor.mathInspector) { editor.mathInspector.hidden = !math; editor.mathInspector.classList.toggle('is-open', !!math); }
    if (editor.codeInspector) { editor.codeInspector.hidden = !code; editor.codeInspector.classList.toggle('is-open', !!code); }

    if (image && typeof editor.populateImageInspector === 'function') editor.populateImageInspector(image);
    if (table && typeof editor.populateTableInspector === 'function') editor.populateTableInspector(table);
    if (math && typeof editor.populateMathInspector === 'function') editor.populateMathInspector(math);
    if (code && typeof editor.populateCodeInspector === 'function') editor.populateCodeInspector(code);

    if (editor.inspectorHint) {
      editor.inspectorHint.textContent = image ? 'Image selected.' : table ? 'Table selected.' : math ? 'Formula selected.' : code ? 'Code block selected.' : 'Select an image, table, formula, or code block.';
    }

    panel.hidden = !any && !(editor.state && editor.state.inspectorPinned);
    editor.root.classList.toggle('show-inspector', !panel.hidden);
    if (editor.mainWrap) editor.mainWrap.classList.toggle('has-inspector', !panel.hidden);
  }

  function bindModeSwitcher(editor) {
    if (editor.__statkissModeSwitcherBound) return;
    const host = editor.root.querySelector('#lreEmbedToolbarHost') || editor.root.querySelector('.lre-surface');
    if (!host) return;
    let switcher = host.querySelector('.statkiss-mode-switcher');
    if (!switcher) {
      switcher = document.createElement('div');
      switcher.className = 'statkiss-mode-switcher';
      switcher.innerHTML = '<button type="button" data-mode="rich">Rich Text</button><button type="button" data-mode="markdown">Markdown</button>';
      host.prepend(switcher);
    }
    const applyMarkdownToEditor = function (markDirty) {
      if (!editor.sourceText || typeof editor.parseMarkdown !== 'function') return;
      editor.editor.innerHTML = editor.parseMarkdown(editor.sourceText.value || '');
      if (typeof editor.normalizeAfterImport === 'function') editor.normalizeAfterImport();
      renderMathInside(editor, editor.editor);
      renderAllCode(editor, editor.editor);
      if (markDirty && typeof editor.markDirty === 'function') editor.markDirty();
      if (typeof editor.updateSourceView === 'function') editor.updateSourceView();
      if (typeof editor.updateStatus === 'function') editor.updateStatus();
    };
    editor.__applyMarkdownSource = applyMarkdownToEditor;

    function syncButtons() {
      switcher.querySelectorAll('button[data-mode]').forEach(function (button) {
        button.classList.toggle('is-active', button.dataset.mode === editor.__authorMode);
        button.setAttribute('aria-pressed', button.dataset.mode === editor.__authorMode ? 'true' : 'false');
      });
    }

    editor.setAuthorMode = function setAuthorMode(mode, options) {
      const next = mode === 'markdown' ? 'markdown' : 'rich';
      const opts = options || {};
      if (next === 'markdown') {
        editor.__authorMode = 'markdown';
        if (editor.sourceText && typeof editor.toMarkdown === 'function') {
          editor.sourceText.value = editor.toMarkdown();
          if (typeof editor.updateMarkdownPreview === 'function') editor.updateMarkdownPreview();
        }
        if (editor.state) {
          editor.state.sourceOpen = true;
          editor.state.split = false;
        }
        editor.root.classList.add('statkiss-markdown-mode');
        editor.sourcePanel && editor.sourcePanel.classList.add('is-open');
        editor.inspectorPanel && (editor.inspectorPanel.hidden = true);
      } else {
        if (editor.__authorMode === 'markdown' && !opts.skipApply) {
          applyMarkdownToEditor(true);
        }
        editor.__authorMode = 'rich';
        if (editor.state) {
          editor.state.sourceOpen = false;
          editor.state.split = false;
        }
        editor.root.classList.remove('statkiss-markdown-mode');
        editor.sourcePanel && editor.sourcePanel.classList.remove('is-open');
        syncInspector(editor);
      }
      if (typeof editor.updateToolbarActiveState === 'function') editor.updateToolbarActiveState();
      if (typeof editor.updateLayout === 'function') editor.updateLayout();
      syncButtons();
    };

    switcher.addEventListener('click', function (event) {
      const button = event.target.closest('button[data-mode]');
      if (!button) return;
      event.preventDefault();
      editor.setAuthorMode(button.dataset.mode);
    });

    const originalGetHTML = typeof editor.getHTML === 'function' ? editor.getHTML.bind(editor) : null;
    editor.getHTML = function patchedGetHTML() {
      if (editor.__authorMode === 'markdown') applyMarkdownToEditor(false);
      return originalGetHTML ? originalGetHTML() : editor.editor.innerHTML;
    };
    if (typeof editor.saveState === 'function') {
      const originalSaveState = editor.saveState.bind(editor);
      editor.saveState = function patchedSaveState() {
        if (editor.__authorMode === 'markdown') applyMarkdownToEditor(false);
        return originalSaveState();
      };
    }
    if (typeof editor.__hostMirrorNow === 'function') {
      const originalMirror = editor.__hostMirrorNow.bind(editor);
      editor.__hostMirrorNow = function patchedHostMirror(force) {
        if (editor.__authorMode === 'markdown') applyMarkdownToEditor(false);
        return originalMirror(force);
      };
    }

    editor.__authorMode = editor.__authorMode || 'rich';
    syncButtons();
    editor.__statkissModeSwitcherBound = true;
  }

  function renderCodeNode(editor, node) {
    if (!node || !node.classList || !node.classList.contains('lre-code-node')) return;
    let pre = node.querySelector('pre');
    if (!pre) {
      pre = document.createElement('pre');
      node.appendChild(pre);
    }
    let code = pre.querySelector('code');
    if (!code) {
      code = document.createElement('code');
      pre.appendChild(code);
    }
    const language = detectLanguage(node.dataset.code || '', node.dataset.language || pre.dataset.language || code.dataset.language || 'auto');
    const text = String(node.dataset.code || code.dataset.rawCode || code.textContent || '');
    node.dataset.code = text;
    node.dataset.language = language;
    const ui = ensureCodeChrome(node);
    if (ui && ui.chip) ui.chip.textContent = language;
    const result = highlightCodeHtml(text, language);
    code.dataset.rawCode = text;
    code.dataset.language = result.language;
    code.className = result.language === 'nohighlight' ? 'nohighlight' : 'statkiss-code language-' + result.language;
    if (result.language === 'plaintext' || result.language === 'nohighlight') code.textContent = text;
    else code.innerHTML = result.html;
    code.setAttribute('spellcheck', 'false');
    code.setAttribute('contenteditable', 'false');
    pre.dataset.language = result.language;
  }

  function renderAllCode(editor, root) {
    const scope = root || editor.editor;
    if (!scope) return;
    scope.querySelectorAll('.lre-code-node').forEach(function (node) { renderCodeNode(editor, node); });
  }

  function patchInstance(editor) {
    if (!editor || editor[PATCH_FLAG]) return editor;
    editor[PATCH_FLAG] = true;
    ensureStyle(STYLE_ID, STYLE);

    if (editor.root) {
      const comments = findCommentsSection(editor.inspectorPanel || editor.root.querySelector('#lreInspectorPanel'));
      if (comments) comments.remove();
    }

    editor.getSelectedImageNode = function patchedGetSelectedImageNode() {
      const node = this.selectedNode || (this.state && this.state.selectedImageFigure);
      return node && node.classList && node.classList.contains('lre-image-node') ? node : null;
    };
    editor.getSelectedTable = function patchedGetSelectedTable() {
      const node = this.selectedNode || (this.state && this.state.selectedTable);
      return node && node.tagName === 'TABLE' ? node : (node && node.closest ? node.closest('table') : null);
    };
    editor.getSelectedMathNode = function patchedGetSelectedMathNode() {
      const node = this.selectedNode || (this.state && (this.state.selectedMathNode || this.state.selectedLatex));
      const math = node && node.classList && node.classList.contains('lre-math-node') ? node : (node && node.closest ? node.closest('.lre-math-node') : null);
      return normalizeMathNode(math);
    };
    editor.getSelectedCodeNode = function patchedGetSelectedCodeNode() {
      return getSelectedCodeFigure(this);
    };

    editor.populateMathInspector = function patchedPopulateMathInspector(node) {
      if (!node || !this.mathText) return;
      this.inspectorHint && (this.inspectorHint.textContent = 'Formula selected.');
      this.mathText.value = node.dataset.tex || '';
    };
    editor.populateCodeInspector = function patchedPopulateCodeInspector(node) {
      if (!node) return;
      const language = detectLanguage(node.dataset.code || '', node.dataset.language || 'auto');
      if (this.codeLanguageSelect) {
        if (![...this.codeLanguageSelect.options].some(function (option) { return option.value === language; })) {
          const extra = document.createElement('option');
          extra.value = language;
          extra.textContent = language;
          this.codeLanguageSelect.appendChild(extra);
        }
        this.codeLanguageSelect.value = language;
      }
      if (this.codeInfo) {
        const lines = String(node.dataset.code || '').split(/\r?\n/).length;
        this.codeInfo.textContent = language + ' · ' + lines + ' line' + (lines === 1 ? '' : 's');
      }
      this.inspectorHint && (this.inspectorHint.textContent = 'Code block selected.');
      let collapseBtn = this.codeInspector && this.codeInspector.querySelector('[data-role="toggle-code-collapse"]');
      if (this.codeInspector && !collapseBtn) {
        collapseBtn = document.createElement('button');
        collapseBtn.type = 'button';
        collapseBtn.className = 'lre-btn lre-muted-btn';
        collapseBtn.dataset.role = 'toggle-code-collapse';
        collapseBtn.textContent = 'Collapse / expand';
        const actions = this.codeInspector.querySelector('.lre-actions, .lre-icon-row, .statkiss-inspector-actions') || this.codeInspector;
        actions.appendChild(collapseBtn);
        collapseBtn.addEventListener('click', () => {
          const target = this.getSelectedCodeNode();
          if (!target) return;
          target.classList.toggle('is-collapsed');
          const toggle = target.querySelector('.statkiss-code-toggle');
          if (toggle) toggle.click();
        });
      }
    };
    editor.updateInspector = function patchedUpdateInspector() {
      syncInspector(this);
    };
    editor.showImageInspector = function patchedShowImageInspector(node) {
      this.selectedNode = node;
      syncInspector(this);
    };
    editor.showTableInspector = function patchedShowTableInspector(node) {
      this.selectedNode = node;
      syncInspector(this);
    };
    editor.showLatexInspector = function patchedShowLatexInspector(node) {
      this.selectedNode = normalizeMathNode(node);
      syncInspector(this);
    };
    editor.showCodeInspector = function patchedShowCodeInspector(node) {
      this.selectedNode = node && node.classList && node.classList.contains('lre-code-node') ? node : (node && node.closest ? node.closest('.lre-code-node') : node);
      syncInspector(this);
    };
    editor.selectNode = function patchedSelectNode(node) {
      if (!node) return;
      if (typeof this.clearNodeSelection === 'function') {
        this.root.querySelectorAll('.is-selected').forEach(function (el) { el.classList.remove('is-selected'); });
      }
      const next = node.classList && node.classList.contains('lre-code-node') ? node
        : node.classList && node.classList.contains('lre-math-node') ? normalizeMathNode(node)
        : node;
      this.selectedNode = next;
      next.classList && next.classList.add('is-selected');
      if (this.state) {
        this.state.selectedImageFigure = next && next.classList && next.classList.contains('lre-image-node') ? next : null;
        this.state.selectedTable = next && next.tagName === 'TABLE' ? next : null;
        this.state.selectedMathNode = next && next.classList && next.classList.contains('lre-math-node') ? next : null;
        this.state.selectedLatex = this.state.selectedMathNode;
        this.state.selectedCodeFigure = next && next.classList && next.classList.contains('lre-code-node') ? next : null;
        this.state.selectedCodeBlock = this.state.selectedCodeFigure;
      }
      syncInspector(this);
    };
    editor.clearNodeSelection = function patchedClearNodeSelection() {
      this.root.querySelectorAll('.is-selected').forEach(function (el) { el.classList.remove('is-selected'); });
      this.selectedNode = null;
      if (this.state) {
        this.state.selectedImageFigure = null;
        this.state.selectedTable = null;
        this.state.selectedMathNode = null;
        this.state.selectedLatex = null;
        this.state.selectedCodeFigure = null;
        this.state.selectedCodeBlock = null;
      }
      syncInspector(this);
    };
    editor.detectSelectedNode = function patchedDetectSelectedNode() {
      const sel = document.getSelection();
      const anchor = sel && sel.anchorNode ? (sel.anchorNode.nodeType === Node.ELEMENT_NODE ? sel.anchorNode : sel.anchorNode.parentElement) : null;
      const image = anchor && anchor.closest ? anchor.closest('.lre-image-node') : null;
      const table = anchor && anchor.closest ? anchor.closest('table') : null;
      const math = anchor && anchor.closest ? anchor.closest('.lre-math-node, .latex-node') : null;
      const code = anchor && anchor.closest ? anchor.closest('.lre-code-node') : null;
      if (code) return this.selectNode(code);
      if (math) return this.selectNode(normalizeMathNode(math));
      if (image) return this.selectNode(image);
      if (table) return this.selectNode(table);
      this.clearNodeSelection();
    };
    editor.handleEditorClick = function patchedHandleEditorClick(event) {
      const target = event.target;
      const code = target.closest && target.closest('.lre-code-node');
      const image = target.closest && target.closest('.lre-image-node');
      const table = target.closest && target.closest('table');
      const math = target.closest && target.closest('.lre-math-node, .latex-node');
      if (code) return this.selectNode(code);
      if (image) return this.selectNode(image);
      if (math) return this.selectNode(normalizeMathNode(math));
      if (table) return this.selectNode(table);
      this.clearNodeSelection();
    };
    editor.handleEditorDoubleClick = function patchedHandleEditorDoubleClick(event) {
      const code = event.target.closest && event.target.closest('.lre-code-node');
      const math = event.target.closest && event.target.closest('.lre-math-node, .latex-node');
      if (code && typeof this.openCodeDialogForNode === 'function') return this.openCodeDialogForNode(code);
      if (math && typeof this.openMathDialogForNode === 'function') return this.openMathDialogForNode(normalizeMathNode(math));
    };

    editor.renderMathNode = function patchedRenderMathNode(node) { return renderMathNode(this, node); };
    editor.renderAllMath = function patchedRenderAllMath() {
      renderMathInside(this, this.editor);
      if (this.sourcePreview) renderMathInside(this, this.sourcePreview);
    };
    editor.saveMathDialog = function patchedSaveMathDialog() {
      const display = this.mathDialogDisplay && this.mathDialogDisplay.value === 'block';
      const tex = String(this.mathDialogText && this.mathDialogText.value || '').trim();
      if (!tex) {
        try { this.mathDialog && this.mathDialog.close(); } catch (error) {}
        return;
      }
      let node = this.editingMathNode || this.getSelectedMathNode();
      if (node) {
        node = normalizeMathNode(node);
        node.dataset.tex = tex;
        node.dataset.display = String(!!display);
        node.classList.toggle('block', !!display);
        node.classList.toggle('inline', !display);
      } else {
        node = document.createElement(display ? 'div' : 'span');
        node.className = 'lre-math-node ' + (display ? 'block' : 'inline');
        node.setAttribute('contenteditable', 'false');
        node.dataset.type = 'math';
        node.dataset.tex = tex;
        node.dataset.display = String(!!display);
        if (typeof this.insertNode === 'function') this.insertNode(node);
      }
      renderMathNode(this, node);
      if (typeof this.selectNode === 'function') this.selectNode(node);
      try { this.mathDialog && this.mathDialog.close(); } catch (error) {}
      this.editingMathNode = null;
      if (typeof this.markDirty === 'function') this.markDirty();
    };
    editor.openMathDialogForSelected = function patchedOpenMathDialogForSelected() {
      const node = this.getSelectedMathNode();
      if (!node) return;
      this.editingMathNode = node;
      if (this.mathDialogDisplay) this.mathDialogDisplay.value = node.classList.contains('block') ? 'block' : 'inline';
      if (this.mathDialogText) this.mathDialogText.value = node.dataset.tex || '';
      try { this.mathDialog && this.mathDialog.showModal(); } catch (error) { this.mathDialog && this.mathDialog.show(); }
    };

    editor.renderCodeNode = function patchedRenderCodeNode(node) { renderCodeNode(this, node); };
    editor.refreshSelectedCode = function patchedRefreshSelectedCode() {
      const node = this.getSelectedCodeNode();
      if (!node) return;
      renderCodeNode(this, node);
      syncInspector(this);
      if (typeof this.markDirty === 'function') this.markDirty();
    };
    editor.updateSelectedCodeLanguage = function patchedUpdateSelectedCodeLanguage() {
      const node = this.getSelectedCodeNode();
      if (!node || !this.codeLanguageSelect) return;
      node.dataset.language = normalizeLang(this.codeLanguageSelect.value) || 'plaintext';
      renderCodeNode(this, node);
      syncInspector(this);
      if (typeof this.markDirty === 'function') this.markDirty();
    };
    editor.openCodeDialogForSelected = function patchedOpenCodeDialogForSelected() {
      const node = this.getSelectedCodeNode();
      if (!node) return;
      this.editingCodeNode = node;
      if (this.codeDialogLang) this.codeDialogLang.value = normalizeLang(node.dataset.language || 'plaintext');
      if (this.codeDialogText) this.codeDialogText.value = String(node.dataset.code || '');
      try { this.codeDialog && this.codeDialog.showModal(); } catch (error) { this.codeDialog && this.codeDialog.show(); }
    };
    editor.saveCodeDialog = function patchedSaveCodeDialog() {
      const lang = normalizeLang(this.codeDialogLang && this.codeDialogLang.value || 'plaintext');
      const text = String(this.codeDialogText && this.codeDialogText.value || '');
      let node = this.editingCodeNode || this.getSelectedCodeNode();
      if (!node) {
        node = document.createElement('figure');
        node.className = 'lre-code-node';
        node.setAttribute('contenteditable', 'false');
        node.dataset.type = 'code';
        if (typeof this.insertNode === 'function') this.insertNode(node);
      }
      node.dataset.language = lang;
      node.dataset.code = text;
      renderCodeNode(this, node);
      if (typeof this.selectNode === 'function') this.selectNode(node);
      try { this.codeDialog && this.codeDialog.close(); } catch (error) {}
      this.editingCodeNode = null;
      if (typeof this.markDirty === 'function') this.markDirty();
    };

    editor.updateMarkdownPreview = function patchedUpdateMarkdownPreview() {
      if (!this.sourcePreview || !this.sourceText || typeof this.parseMarkdown !== 'function') return;
      this.sourcePreview.innerHTML = this.parseMarkdown(this.sourceText.value || '');
      renderMathInside(this, this.sourcePreview);
      renderAllCode(this, this.sourcePreview);
    };

    const originalHandleAction = typeof editor.handleAction === 'function' ? editor.handleAction.bind(editor) : null;
    editor.handleAction = function patchedHandleAction(action, button) {
      if (action === 'table') { showTableModal(this); return; }
      if (action === 'toggle-split') return;
      if (action === 'toggle-source') { this.setAuthorMode(this.__authorMode === 'markdown' ? 'rich' : 'markdown'); return; }
      if (action === 'toggle-dark' || action === 'comment') return;
      if (action === 'refresh-code') { this.refreshSelectedCode(); return; }
      return originalHandleAction ? originalHandleAction(action, button) : undefined;
    };
    editor.insertTablePrompt = function patchedInsertTablePrompt() { showTableModal(this); };
    editor.toggleSplitView = function patchedToggleSplitView() { if (this.setAuthorMode) this.setAuthorMode('markdown'); };
    editor.toggleSourcePanel = function patchedToggleSourcePanel(force) {
      const next = typeof force === 'boolean' ? (force ? 'markdown' : 'rich') : (this.__authorMode === 'markdown' ? 'rich' : 'markdown');
      if (this.setAuthorMode) this.setAuthorMode(next);
    };

    bindModeSwitcher(editor);
    editor.setAuthorMode('rich', { skipApply: true });

    if (editor.root) {
      editor.root.querySelectorAll('[data-action="toggle-split"], [data-action="toggle-source"], [data-action="toggle-dark"], [data-action="comment"]').forEach(function (node) { node.style.display = 'none'; });
      const comments = findCommentsSection(editor.inspectorPanel || editor.root.querySelector('#lreInspectorPanel'));
      if (comments) comments.remove();
    }

    renderAllCode(editor, editor.editor);
    renderMathInside(editor, editor.editor);
    if (editor.sourcePreview) {
      renderAllCode(editor, editor.sourcePreview);
      renderMathInside(editor, editor.sourcePreview);
    }
    syncInspector(editor);
    try { console.info('[LocalRichEditor]', BUILD, 'applied'); } catch (error) {}
    return editor;
  }

  function wrapMount(name) {
    const original = window[name];
    if (typeof original !== 'function' || original.__statkissWrapped) return;
    const wrapped = function () {
      const result = original.apply(this, arguments);
      if (result && typeof result.then === 'function') {
        return result.then(function (editor) { return patchInstance(editor); });
      }
      return patchInstance(result);
    };
    wrapped.__statkissWrapped = true;
    wrapped.__statkissOriginal = original;
    window[name] = wrapped;
  }

  wrapMount('mountStatkissContentEditor');
  wrapMount('mountEmbeddedContentEditor');
  wrapMount('initStatkissContentEditor');
  wrapMount('initEmbeddedContentEditor');
  wrapMount('autoMountStatkissContentEditor');
  wrapMount('renderStatkissContentWriteDemo');

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', function () { waitForEditor(patchInstance); }, { once: true });
  } else {
    waitForEditor(patchInstance);
  }
})();


/* StatKISS final editor correction patch: remove dark/comment, center popups, block-math only, icon-only code collapse. */
(function(){
  'use strict';
  const PATCH_FLAG = '__statkissFinalCorrection20260403';
  const STYLE_ID = 'statkiss-final-correction-style';

  function svg(paths, viewBox) {
    return '<svg class="lre-icon" viewBox="' + (viewBox || '0 0 24 24') + '" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9">' + paths + '</svg>';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function waitForEditor(callback) {
    if (window.localRichEditor) {
      callback(window.localRichEditor);
      return;
    }
    let tries = 0;
    const timer = setInterval(function(){
      tries += 1;
      if (window.localRichEditor) {
        clearInterval(timer);
        callback(window.localRichEditor);
        return;
      }
      if (tries > 320) clearInterval(timer);
    }, 50);
  }

  function wrapMount(name, callback) {
    const original = window[name];
    if (typeof original !== 'function' || original.__statkissFinalCorrectionWrapped) return;
    const wrapped = function() {
      const result = original.apply(this, arguments);
      if (result && typeof result.then === 'function') {
        return result.then(function(editor){
          const patched = callback(editor);
          return patched || editor;
        });
      }
      const patched = callback(result);
      return patched || result;
    };
    wrapped.__statkissFinalCorrectionWrapped = true;
    wrapped.__statkissFinalCorrectionOriginal = original;
    window[name] = wrapped;
  }

  function ensureStyle() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = `
      .lre-root.lre-embedded-content [data-action="toggle-dark"],
      .lre-root.lre-embedded-content [data-action="comment"],
      .lre-root.lre-embedded-content [data-action="inline-math"],
      .lre-root.lre-embedded-content [data-action="toggle-split"],
      .lre-root.lre-embedded-content .lre-floating [data-bubble-action="comment"],
      .lre-root.lre-embedded-content .lre-floating [data-bubble-action="inline-math"],
      .lre-root.lre-embedded-content .lre-floating [data-bubble-action="toggle-dark"] {
        display: none !important;
      }
      .lre-root.lre-embedded-content .lre-color-popover.is-open {
        position: fixed !important;
        left: 50% !important;
        top: 50% !important;
        right: auto !important;
        bottom: auto !important;
        transform: translate(-50%, -50%) !important;
        z-index: 130 !important;
        width: min(320px, calc(100vw - 32px)) !important;
        max-height: calc(100vh - 32px) !important;
        overflow: auto !important;
        padding: 16px !important;
        border-radius: 18px !important;
        background: rgba(255,255,255,.98) !important;
        border: 1px solid rgba(148,163,184,.28) !important;
        box-shadow: 0 24px 56px rgba(15,23,42,.18) !important;
      }
      .lre-root.lre-embedded-content .lre-color-popover::before {
        content: '';
        position: fixed;
        inset: 0;
        z-index: -1;
        background: rgba(15,23,42,.18);
        backdrop-filter: blur(6px);
      }
      .lre-root.lre-embedded-content .statkiss-inline-modal {
        z-index: 140 !important;
      }
      .lre-root.lre-embedded-content .statkiss-code-collapse {
        width: 34px !important;
        height: 34px !important;
        min-width: 34px !important;
        min-height: 34px !important;
        padding: 0 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      .lre-root.lre-embedded-content .statkiss-code-collapse svg {
        width: 18px !important;
        height: 18px !important;
      }
      .lre-root.lre-embedded-content .statkiss-math-image {
        display: block;
        max-width: 100%;
        height: auto;
        margin: 0 auto;
      }
      .lre-root.lre-embedded-content .lre-math-node,
      .lre-root.lre-embedded-content .lre-math-node.block {
        display: block !important;
      }
      .lre-root.lre-embedded-content .lre-math-node.inline {
        display: none !important;
      }
      .lre-root.lre-embedded-content .lre-math-node .statkiss-math-wrap {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 48px;
        width: 100%;
      }
      .lre-root.lre-embedded-content .lre-math-node.is-error .statkiss-math-wrap {
        justify-content: flex-start !important;
        text-align: left !important;
        white-space: pre-wrap !important;
        color: #b91c1c !important;
      }
      .lre-root.lre-embedded-content #lreInspectorPanel .lre-inspector-section {
        display: none;
      }
      .lre-root.lre-embedded-content #lreInspectorPanel .lre-inspector-section.is-open {
        display: grid;
        gap: 10px;
      }
      .lre-root.lre-embedded-content #lreInspectorPanel .lre-actions,
      .lre-root.lre-embedded-content #lreInspectorPanel .lre-icon-row,
      .lre-root.lre-embedded-content #lreInspectorPanel .statkiss-inspector-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      body.dark .lre-root.lre-embedded-content .lre-color-popover.is-open {
        background: rgba(15,23,42,.98) !important;
        color: #e5eefc !important;
        border-color: rgba(71,85,105,.42) !important;
      }
      body.dark .lre-root.lre-embedded-content .lre-color-popover .lre-field input,
      body.dark .lre-root.lre-embedded-content .lre-color-popover .lre-field select,
      body.dark .lre-root.lre-embedded-content .lre-color-popover .lre-field textarea {
        background: #0f172a !important;
        color: #e5eefc !important;
        border-color: rgba(71,85,105,.42) !important;
      }
    `;
  }

  function removeMatching(root, selector) {
    root.querySelectorAll(selector).forEach(function(node){ node.remove(); });
  }

  function findCommentsSection(panel) {
    if (!panel) return null;
    return Array.from(panel.querySelectorAll('.lre-inspector-section')).find(function(section){
      return section.querySelector('#lreCommentList') || /comments/i.test((section.querySelector('h3') && section.querySelector('h3').textContent) || '');
    }) || null;
  }

  function removeButtons(editor) {
    if (!editor || !editor.root) return;
    removeMatching(editor.root, '[data-action="toggle-dark"], [data-action="comment"], [data-action="inline-math"], [data-action="toggle-split"]');
    removeMatching(editor.root, '.lre-floating [data-bubble-action="comment"], .lre-floating [data-bubble-action="inline-math"], .lre-floating [data-bubble-action="toggle-dark"]');
    const comments = findCommentsSection(editor.inspectorPanel || editor.root.querySelector('#lreInspectorPanel'));
    if (comments) comments.remove();
  }

  function patchColorIcons(editor) {
    if (!editor || !editor.root) return;
    const defs = {
      'text-color': {
        label: 'Text color',
        svg: svg('<path d="m7 18 5-12 5 12"/><path d="M9.5 12h5"/><path d="M5 20h14"/>')
      },
      'bg-color': {
        label: 'Background color',
        svg: svg('<path d="m7.5 15.5 4.5-10 4.5 10"/><path d="M9.4 11h5.2"/><rect x="4" y="17" width="16" height="4" rx="1.4" fill="currentColor" stroke="none" opacity=".9"/>')
      }
    };
    Object.keys(defs).forEach(function(action){
      editor.root.querySelectorAll('[data-action="' + action + '"]').forEach(function(button){
        const def = defs[action];
        button.innerHTML = def.svg + '<span class="lre-sr">' + escapeHtml(def.label) + '</span>';
        button.setAttribute('aria-label', def.label);
        button.title = def.label;
      });
    });
  }

  function patchMathDialog(editor) {
    if (!editor) return;
    const select = editor.mathDialogDisplay || editor.root.querySelector('#lreMathDialogDisplay');
    if (select) {
      Array.from(select.options).forEach(function(option){
        if (option.value !== 'block') option.remove();
      });
      select.value = 'block';
      const label = select.closest('label');
      if (label) label.style.display = 'none';
    }
  }

  function normalizeMathNode(node) {
    if (!node) return null;
    if (node.classList && node.classList.contains('latex-node')) {
      node.classList.remove('latex-node');
      node.classList.add('lre-math-node');
    }
    if (!node.classList || !node.classList.contains('lre-math-node')) return null;
    const tex = String(node.dataset.tex || node.dataset.latex || '').trim();
    node.dataset.type = 'math';
    node.dataset.tex = tex;
    node.dataset.display = 'true';
    node.classList.remove('inline');
    node.classList.add('block');
    node.setAttribute('contenteditable', 'false');
    return node;
  }

  function whenMathJaxReady(timeoutMs) {
    const timeout = typeof timeoutMs === 'number' ? timeoutMs : 20000;
    return new Promise(function(resolve){
      const done = function(){
        const mj = window.MathJax;
        if (!mj || typeof mj.tex2svgPromise !== 'function') return false;
        if (mj.startup && mj.startup.promise && typeof mj.startup.promise.then === 'function') {
          mj.startup.promise.then(function(){ resolve(mj); }).catch(function(){ resolve(mj); });
        } else {
          resolve(mj);
        }
        return true;
      };
      if (done()) return;
      const started = Date.now();
      const timer = setInterval(function(){
        if (done() || Date.now() - started > timeout) {
          clearInterval(timer);
          if (!window.MathJax) resolve(null);
        }
      }, 50);
    });
  }

  function extractSvgMarkup(result) {
    if (!result) return '';
    let svg = null;
    if (result.tagName && String(result.tagName).toLowerCase() === 'svg') svg = result;
    if (!svg && result.querySelector) svg = result.querySelector('svg');
    if (!svg && result.firstElementChild && String(result.firstElementChild.tagName || '').toLowerCase() === 'svg') svg = result.firstElementChild;
    if (!svg) return '';
    const clone = svg.cloneNode(true);
    if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('focusable', 'false');
    clone.setAttribute('aria-hidden', 'true');
    return clone.outerHTML;
  }

  async function renderMath(editor, node) {
    const target = normalizeMathNode(node);
    if (!target) return;
    const tex = String(target.dataset.tex || '').trim();
    const token = (target.__statkissMathToken || 0) + 1;
    target.__statkissMathToken = token;
    target.classList.remove('is-error');
    target.innerHTML = '<div class="statkiss-math-wrap"></div>';
    const mount = target.querySelector('.statkiss-math-wrap');
    if (!tex) {
      target.classList.add('is-error');
      mount.textContent = '$$\n\n$$';
      return;
    }
    try {
      const mj = await whenMathJaxReady(22000);
      if (token !== target.__statkissMathToken) return;
      if (!mj || typeof mj.tex2svgPromise !== 'function') throw new Error('MathJax not ready');
      const result = await mj.tex2svgPromise(tex, { display: true });
      if (token !== target.__statkissMathToken) return;
      const svgMarkup = extractSvgMarkup(result);
      if (!svgMarkup) throw new Error('MathJax SVG missing');
      const img = document.createElement('img');
      img.className = 'statkiss-math-image';
      img.alt = tex;
      img.decoding = 'async';
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMarkup);
      mount.innerHTML = '';
      mount.appendChild(img);
      target.classList.remove('is-error');
    } catch (error) {
      if (token !== target.__statkissMathToken) return;
      target.classList.add('is-error');
      mount.textContent = '$$\n' + tex + '\n$$';
    }
    if (editor && typeof editor.populateMathInspector === 'function' && editor.getSelectedMathNode && editor.getSelectedMathNode() === target) {
      editor.populateMathInspector(target);
    }
  }

  function rerenderAllMath(editor) {
    if (!editor || !editor.root) return;
    editor.root.querySelectorAll('.lre-math-node, .latex-node').forEach(function(node){ renderMath(editor, node); });
  }

  function ensureTableDialog(editor) {
    if (editor.__statkissFinalTableDialog) return editor.__statkissFinalTableDialog;
    const overlay = document.createElement('div');
    overlay.className = 'statkiss-inline-modal';
    overlay.hidden = true;
    overlay.innerHTML = [
      '<div class="statkiss-inline-card" role="dialog" aria-label="Insert table">',
      '<h3>Insert table</h3>',
      '<div class="statkiss-inline-grid"></div>',
      '<div class="statkiss-inline-size">3 × 3</div>',
      '<div class="statkiss-inline-fields">',
      '<label>Rows<input type="number" min="1" max="20" value="3"></label>',
      '<label>Columns<input type="number" min="1" max="20" value="3"></label>',
      '</div>',
      '<div class="statkiss-inline-actions">',
      '<button type="button" data-role="cancel">Cancel</button>',
      '<button type="button" class="primary" data-role="insert">Insert</button>',
      '</div>',
      '</div>'
    ].join('');
    editor.root.appendChild(overlay);
    const grid = overlay.querySelector('.statkiss-inline-grid');
    const size = overlay.querySelector('.statkiss-inline-size');
    const rowsInput = overlay.querySelectorAll('input')[0];
    const colsInput = overlay.querySelectorAll('input')[1];
    function paint(rows, cols) {
      rows = Math.max(1, Math.min(20, Number(rows) || 1));
      cols = Math.max(1, Math.min(20, Number(cols) || 1));
      rowsInput.value = String(rows);
      colsInput.value = String(cols);
      size.textContent = rows + ' × ' + cols;
      grid.querySelectorAll('button').forEach(function(cell){
        const active = Number(cell.dataset.rows) <= rows && Number(cell.dataset.cols) <= cols;
        cell.classList.toggle('is-active', active);
      });
      overlay.dataset.rows = String(rows);
      overlay.dataset.cols = String(cols);
    }
    function insert(rows, cols) {
      overlay.hidden = true;
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      const tbody = document.createElement('tbody');
      const headRow = document.createElement('tr');
      rows = Math.max(1, Math.min(20, Number(rows) || 3));
      cols = Math.max(1, Math.min(20, Number(cols) || 3));
      for (let c = 0; c < cols; c += 1) {
        const th = document.createElement('th');
        th.contentEditable = 'true';
        th.textContent = 'Header ' + (c + 1);
        headRow.appendChild(th);
      }
      thead.appendChild(headRow);
      for (let r = 0; r < Math.max(1, rows - 1); r += 1) {
        const row = document.createElement('tr');
        for (let c = 0; c < cols; c += 1) {
          const td = document.createElement('td');
          td.contentEditable = 'true';
          td.textContent = 'Cell ' + (r + 1) + '-' + (c + 1);
          row.appendChild(td);
        }
        tbody.appendChild(row);
      }
      table.appendChild(thead);
      table.appendChild(tbody);
      if (typeof editor.restoreSelection === 'function') editor.restoreSelection();
      if (typeof editor.insertNode === 'function') editor.insertNode(table);
      else editor.editor.appendChild(table);
      if (typeof editor.selectNode === 'function') editor.selectNode(table);
      if (typeof editor.markDirty === 'function') editor.markDirty();
      if (typeof editor.updateSourceView === 'function') editor.updateSourceView();
      if (typeof editor.updateStatus === 'function') editor.updateStatus();
    }
    for (let r = 1; r <= 8; r += 1) {
      for (let c = 1; c <= 8; c += 1) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.dataset.rows = String(r);
        cell.dataset.cols = String(c);
        cell.addEventListener('mouseenter', function(){ paint(r, c); });
        cell.addEventListener('focus', function(){ paint(r, c); });
        cell.addEventListener('click', function(){ insert(r, c); });
        grid.appendChild(cell);
      }
    }
    rowsInput.addEventListener('input', function(){ paint(rowsInput.value, colsInput.value); });
    colsInput.addEventListener('input', function(){ paint(rowsInput.value, colsInput.value); });
    overlay.querySelector('[data-role="insert"]').addEventListener('click', function(){ insert(rowsInput.value, colsInput.value); });
    overlay.querySelector('[data-role="cancel"]').addEventListener('click', function(){ overlay.hidden = true; });
    overlay.addEventListener('mousedown', function(event){ if (event.target === overlay) overlay.hidden = true; });
    paint(3, 3);
    editor.__statkissFinalTableDialog = overlay;
    return overlay;
  }

  function showTableDialog(editor) {
    const overlay = ensureTableDialog(editor);
    overlay.hidden = false;
  }

  function centerColorPopover(editor, mode, title) {
    if (!editor || !editor.colorPopover) return;
    editor.activeColorMode = mode || editor.activeColorMode || 'foreColor';
    if (editor.colorPopoverTitle) editor.colorPopoverTitle.textContent = title || (editor.activeColorMode === 'hiliteColor' ? 'Background color' : 'Text color');
    editor.colorPopover.classList.add('is-open');
    editor.colorPopover.style.left = '50%';
    editor.colorPopover.style.top = '50%';
    editor.colorPopover.style.right = 'auto';
    editor.colorPopover.style.bottom = 'auto';
    editor.colorPopover.style.transform = 'translate(-50%, -50%)';
  }

  function patchParseInlineMarkdown(editor) {
    editor.parseInlineMarkdown = function patchedParseInlineMarkdown(text) {
      return escapeHtml(text)
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure class="lre-image-node align-center" contenteditable="false" data-type="image"><div class="lre-node-head"><span class="lre-chip">image</span></div><div class="lre-figure-wrap"><img src="$2" alt="$1" style="width:100%"></div><figcaption>$1</figcaption></figure>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/~~([^~]+)~~/g, '<s>$1</s>')
        .replace(/`([^`]+)`/g, '<code class="lre-inline-code">$1</code>');
    };
  }

  function patchCodeInspector(editor) {
    const original = typeof editor.populateCodeInspector === 'function' ? editor.populateCodeInspector.bind(editor) : null;
    editor.populateCodeInspector = function(node) {
      if (original) original(node);
      const inspector = this.codeInspector;
      if (!inspector) return;
      let btn = inspector.querySelector('[data-role="toggle-code-collapse"]');
      if (btn && !btn.classList.contains('statkiss-code-collapse')) {
        btn.remove();
        btn = null;
      }
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lre-btn lre-muted-btn statkiss-code-collapse';
        btn.dataset.role = 'toggle-code-collapse';
        const actions = inspector.querySelector('.lre-actions, .lre-icon-row, .statkiss-inspector-actions') || inspector;
        actions.appendChild(btn);
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          const target = this.getSelectedCodeNode && this.getSelectedCodeNode();
          if (!target) return;
          target.classList.toggle('is-collapsed');
          const headBtn = target.querySelector('.statkiss-code-toggle');
          if (headBtn) {
            const iconMarkup = target.classList.contains('is-collapsed')
              ? svg('<path d="m8 10 4 4 4-4"/>')
              : svg('<path d="m8 14 4-4 4 4"/>');
            headBtn.innerHTML = iconMarkup;
            headBtn.setAttribute('aria-label', target.classList.contains('is-collapsed') ? 'Expand code block' : 'Collapse code block');
            headBtn.title = headBtn.getAttribute('aria-label');
          }
          this.populateCodeInspector(target);
          if (typeof this.markDirty === 'function') this.markDirty();
        });
      }
      const collapsed = !!(node && node.classList && node.classList.contains('is-collapsed'));
      btn.innerHTML = (collapsed ? svg('<path d="m8 10 4 4 4-4"/>') : svg('<path d="m8 14 4-4 4 4"/>')) + '<span class="lre-sr">Toggle code collapse</span>';
      btn.setAttribute('aria-label', collapsed ? 'Expand code block' : 'Collapse code block');
      btn.title = btn.getAttribute('aria-label');
    };
  }

  function patchInstance(editor) {
    if (!editor || editor[PATCH_FLAG]) return editor;
    editor[PATCH_FLAG] = true;
    ensureStyle();
    removeButtons(editor);
    patchColorIcons(editor);
    patchMathDialog(editor);
    patchParseInlineMarkdown(editor);
    patchCodeInspector(editor);

    editor.toggleDarkMode = function() {};
    editor.addComment = function() {};

    const originalHandleAction = typeof editor.handleAction === 'function' ? editor.handleAction.bind(editor) : null;
    editor.handleAction = function(action, button) {
      if (action === 'toggle-dark' || action === 'comment' || action === 'toggle-split') return;
      if (action === 'inline-math') action = 'block-math';
      if (action === 'table') {
        showTableDialog(this);
        return;
      }
      if (action === 'text-color') {
        centerColorPopover(this, 'foreColor', 'Text color');
        return;
      }
      if (action === 'bg-color') {
        centerColorPopover(this, 'hiliteColor', 'Background color');
        return;
      }
      return originalHandleAction ? originalHandleAction(action, button) : undefined;
    };

    editor.openColorPopover = function(button, mode, title) {
      centerColorPopover(this, mode, title);
    };

    editor.openMathDialog = function(mode, tex) {
      patchMathDialog(this);
      this.editingMathNode = null;
      if (this.mathDialogDisplay) this.mathDialogDisplay.value = 'block';
      if (this.mathDialogText) this.mathDialogText.value = tex || '';
      try { this.mathDialog && this.mathDialog.showModal(); } catch (error) { this.mathDialog && this.mathDialog.show(); }
    };

    editor.openMathDialogForSelected = function() {
      const node = normalizeMathNode(this.getSelectedMathNode && this.getSelectedMathNode());
      if (!node) return;
      patchMathDialog(this);
      this.editingMathNode = node;
      if (this.mathDialogDisplay) this.mathDialogDisplay.value = 'block';
      if (this.mathDialogText) this.mathDialogText.value = node.dataset.tex || '';
      try { this.mathDialog && this.mathDialog.showModal(); } catch (error) { this.mathDialog && this.mathDialog.show(); }
    };

    editor.openMathDialogForNode = function(node) {
      const math = normalizeMathNode(node);
      if (!math) return;
      this.selectNode && this.selectNode(math);
      this.openMathDialogForSelected();
    };

    editor.saveMathDialog = function() {
      patchMathDialog(this);
      const tex = String(this.mathDialogText && this.mathDialogText.value || '').trim();
      if (!tex) {
        try { this.mathDialog && this.mathDialog.close(); } catch (error) {}
        return;
      }
      let node = this.editingMathNode || (this.getSelectedMathNode && this.getSelectedMathNode());
      if (!node) {
        node = document.createElement('div');
        node.className = 'lre-math-node block';
        node.setAttribute('contenteditable', 'false');
        node.dataset.type = 'math';
        node.dataset.display = 'true';
        if (typeof this.insertNode === 'function') this.insertNode(node);
        else this.editor.appendChild(node);
      }
      node = normalizeMathNode(node);
      node.dataset.tex = tex;
      node.dataset.display = 'true';
      renderMath(this, node);
      if (typeof this.selectNode === 'function') this.selectNode(node);
      try { this.mathDialog && this.mathDialog.close(); } catch (error) {}
      this.editingMathNode = null;
      if (typeof this.markDirty === 'function') this.markDirty();
      if (typeof this.updateSourceView === 'function') this.updateSourceView();
      if (typeof this.updateStatus === 'function') this.updateStatus();
    };

    editor.renderMathNode = function(node) { return renderMath(this, node); };
    editor.renderAllMath = function() { rerenderAllMath(this); };
    editor.insertTablePrompt = function() { showTableDialog(this); };
    editor.showTablePicker = function() { showTableDialog(this); };

    const originalGetSlashCommands = typeof editor.getSlashCommands === 'function' ? editor.getSlashCommands.bind(editor) : null;
    editor.getSlashCommands = function() {
      const items = originalGetSlashCommands ? originalGetSlashCommands() : [];
      const filtered = items.filter(function(item){
        return item && item.name !== 'math' && item.name !== 'comment' && item.name !== 'inline-math';
      });
      if (!filtered.some(function(item){ return item && item.name === 'formula'; })) {
        filtered.push({ name: 'formula', label: 'Formula', icon: 'blockMath', action: () => this.handleAction('block-math') });
      }
      return filtered;
    };

    const originalToMarkdown = typeof editor.toMarkdown === 'function' ? editor.toMarkdown.bind(editor) : null;
    if (originalToMarkdown) {
      editor.toMarkdown = function() {
        this.root.querySelectorAll('.lre-math-node.inline, .latex-node').forEach(function(node){ normalizeMathNode(node); });
        return originalToMarkdown();
      };
    }

    const originalUpdateMarkdownPreview = typeof editor.updateMarkdownPreview === 'function' ? editor.updateMarkdownPreview.bind(editor) : null;
    editor.updateMarkdownPreview = function() {
      if (originalUpdateMarkdownPreview) {
        originalUpdateMarkdownPreview();
      } else if (this.sourcePreview && this.sourceText && typeof this.parseMarkdown === 'function') {
        this.sourcePreview.innerHTML = this.parseMarkdown(this.sourceText.value || '');
      }
      if (this.sourcePreview) {
        this.sourcePreview.querySelectorAll('.lre-math-node.inline, .latex-node').forEach(function(node){ normalizeMathNode(node); });
      }
      rerenderAllMath(this);
      if (typeof this.highlightAllCodeBlocks === 'function') this.highlightAllCodeBlocks();
    };

    removeButtons(editor);
    patchColorIcons(editor);
    patchMathDialog(editor);
    editor.root.querySelectorAll('.lre-math-node.inline, .latex-node').forEach(function(node){ normalizeMathNode(node); });
    if (typeof editor.highlightAllCodeBlocks === 'function') editor.highlightAllCodeBlocks();
    rerenderAllMath(editor);
    if (typeof editor.updateInspector === 'function') editor.updateInspector();
    if (typeof editor.setAuthorMode === 'function') editor.setAuthorMode(editor.__authorMode || 'rich', { skipApply: true });

    setTimeout(function(){
      removeButtons(editor);
      patchColorIcons(editor);
      patchMathDialog(editor);
      rerenderAllMath(editor);
      if (typeof editor.updateInspector === 'function') editor.updateInspector();
    }, 50);

    return editor;
  }

  wrapMount('mountStatkissContentEditor', patchInstance);
  wrapMount('mountEmbeddedContentEditor', patchInstance);
  wrapMount('initStatkissContentEditor', patchInstance);
  wrapMount('initEmbeddedContentEditor', patchInstance);
  wrapMount('autoMountStatkissContentEditor', patchInstance);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ waitForEditor(patchInstance); }, { once: true });
  } else {
    waitForEditor(patchInstance);
  }
})();


/* StatKISS 20260403 repair patch: center dialogs, disable speech worker reliance, fix block math rendering, preserve caret after block insertion. */
(function(){
  'use strict';
  const PATCH_FLAG = '__statkissRepairPatch20260403_2';
  const STYLE_ID = 'statkiss-repair-patch-style-20260403-2';

  function waitForEditor(callback) {
    if (window.localRichEditor) {
      callback(window.localRichEditor);
      return;
    }
    let tries = 0;
    const timer = setInterval(function(){
      tries += 1;
      if (window.localRichEditor) {
        clearInterval(timer);
        callback(window.localRichEditor);
        return;
      }
      if (tries > 360) clearInterval(timer);
    }, 50);
  }

  function wrapMount(name, callback) {
    const original = window[name];
    if (typeof original !== 'function' || original.__statkissRepairWrapped) return;
    const wrapped = function() {
      const result = original.apply(this, arguments);
      if (result && typeof result.then === 'function') {
        return result.then(function(editor){
          const patched = callback(editor);
          return patched || editor;
        });
      }
      const patched = callback(result);
      return patched || result;
    };
    wrapped.__statkissRepairWrapped = true;
    window[name] = wrapped;
  }

  function ensureStyle() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = `
      .lre-root.lre-embedded-content dialog.lre-dialog[open] {
        position: fixed !important;
        inset: auto !important;
        left: 50% !important;
        top: 50% !important;
        transform: translate(-50%, -50%) !important;
        margin: 0 !important;
        width: min(760px, calc(100vw - 24px)) !important;
        max-width: calc(100vw - 24px) !important;
        max-height: calc(100vh - 24px) !important;
        overflow: auto !important;
        z-index: 160 !important;
      }
      .lre-root.lre-embedded-content dialog.lre-dialog::backdrop {
        background: rgba(15, 23, 42, .32) !important;
        backdrop-filter: blur(6px) !important;
      }
      .lre-root.lre-embedded-content .lre-color-popover.is-open {
        position: fixed !important;
        inset: auto !important;
        left: 50% !important;
        top: 50% !important;
        right: auto !important;
        bottom: auto !important;
        transform: translate(-50%, -50%) !important;
        z-index: 150 !important;
      }
      .lre-root.lre-embedded-content .table-picker-overlay:not([hidden]) {
        position: fixed !important;
        inset: 0 !important;
        z-index: 155 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      .lre-root.lre-embedded-content .table-picker-pop {
        position: relative !important;
        inset: auto !important;
        left: auto !important;
        top: auto !important;
        transform: none !important;
        margin: 0 auto !important;
      }
      .lre-root.lre-embedded-content .statkiss-inline-modal:not([hidden]) {
        position: fixed !important;
        inset: 0 !important;
        z-index: 170 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      .lre-root.lre-embedded-content .lre-math-node,
      .lre-root.lre-embedded-content .lre-math-node.block {
        display: block !important;
        width: 100% !important;
      }
      .lre-root.lre-embedded-content .lre-math-node .statkiss-math-wrap {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 46px !important;
        width: 100% !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
      }
      .lre-root.lre-embedded-content .lre-math-node .statkiss-math-wrap svg {
        display: block !important;
        max-width: 100% !important;
        height: auto !important;
        overflow: visible !important;
      }
      .lre-root.lre-embedded-content .lre-math-node .statkiss-math-wrap mjx-container {
        display: block !important;
        max-width: 100% !important;
        overflow: visible !important;
      }
      .lre-root.lre-embedded-content .lre-math-node .statkiss-math-wrap mjx-container[display="true"] {
        display: block !important;
        margin: 0 auto !important;
      }
      .lre-root.lre-embedded-content .lre-math-node .statkiss-math-wrap mjx-assistive-mml,
      .lre-root.lre-embedded-content .lre-math-node .statkiss-math-wrap mjx-help {
        display: none !important;
      }
      .lre-root.lre-embedded-content mjx-assistive-mml,
      .lre-root.lre-embedded-content mjx-help,
      .lre-root.lre-embedded-content mjx-focus {
        display: none !important;
      }
      .lre-root.lre-embedded-content .lre-code-head .statkiss-code-toggle {
        width: 34px !important;
        height: 34px !important;
        min-width: 34px !important;
        min-height: 34px !important;
        padding: 0 !important;
        overflow: hidden !important;
        white-space: nowrap !important;
        text-indent: -9999px !important;
        position: relative !important;
      }
      .lre-root.lre-embedded-content .lre-code-head .statkiss-code-toggle svg {
        position: absolute !important;
        inset: 0 !important;
        margin: auto !important;
        width: 18px !important;
        height: 18px !important;
        text-indent: 0 !important;
      }
      .lre-root.lre-embedded-content .lre-code-head .statkiss-code-toggle > span:not(.lre-sr) {
        display: none !important;
      }
    `;
  }

  function removeHelpAndAssistive(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('mjx-help, mjx-assistive-mml, mjx-focus').forEach(function(node){ node.remove(); });
  }

  function disableMathJaxSpeech() {
    const mj = window.MathJax;
    if (!mj) return;
    try {
      if (mj.config) {
        mj.config.options = mj.config.options || {};
        mj.config.options.enableExplorer = false;
        mj.config.options.enableExplorerHelp = false;
        mj.config.options.enableSpeech = false;
        mj.config.options.enableBraille = false;
        mj.config.options.enableEnrichment = false;
        mj.config.options.a11y = Object.assign({}, mj.config.options.a11y || {}, {
          speech: false,
          braille: false,
          subtitles: false,
          voicing: false,
          help: false,
          infoPrefix: false,
          infoRole: false,
          infoType: false,
          inTabOrder: false
        });
      }
      const doc = mj.startup && mj.startup.document;
      if (doc) {
        doc.options = doc.options || {};
        doc.options.enableExplorer = false;
        doc.options.enableExplorerHelp = false;
        doc.options.enableSpeech = false;
        doc.options.enableBraille = false;
        doc.options.enableEnrichment = false;
        doc.options.a11y = Object.assign({}, doc.options.a11y || {}, {
          speech: false,
          braille: false,
          subtitles: false,
          voicing: false,
          help: false,
          infoPrefix: false,
          infoRole: false,
          infoType: false,
          inTabOrder: false
        });
        doc.attachSpeech = function(){ return this; };
        doc.explorable = function(){ return this; };
        doc.getWebworker = function(){ return null; };
      }
    } catch (error) {}
  }

  function whenMathJaxReady(timeoutMs) {
    const timeout = typeof timeoutMs === 'number' ? timeoutMs : 20000;
    return new Promise(function(resolve){
      const done = function(){
        disableMathJaxSpeech();
        const mj = window.MathJax;
        if (!mj || (typeof mj.tex2svgPromise !== 'function' && typeof mj.tex2svg !== 'function')) return false;
        if (mj.startup && mj.startup.promise && typeof mj.startup.promise.then === 'function') {
          mj.startup.promise.then(function(){ disableMathJaxSpeech(); resolve(mj); }).catch(function(){ disableMathJaxSpeech(); resolve(mj); });
        } else {
          resolve(mj);
        }
        return true;
      };
      if (done()) return;
      const started = Date.now();
      const timer = setInterval(function(){
        if (done() || Date.now() - started > timeout) {
          clearInterval(timer);
          if (!window.MathJax) resolve(null);
        }
      }, 50);
    });
  }

  function normalizeMathNode(node) {
    if (!node) return null;
    if (node.classList && node.classList.contains('latex-node')) {
      node.classList.remove('latex-node');
      node.classList.add('lre-math-node');
    }
    if (!node.classList || !node.classList.contains('lre-math-node')) return null;
    node.dataset.type = 'math';
    node.dataset.display = 'true';
    node.classList.remove('inline');
    node.classList.add('block');
    node.setAttribute('contenteditable', 'false');
    if (!node.dataset.tex && node.dataset.latex) node.dataset.tex = node.dataset.latex;
    return node;
  }

  function extractRenderedMath(result) {
    if (!result) return null;
    if (result.querySelector) {
      const svg = result.querySelector('svg');
      if (svg) return svg.cloneNode(true);
      const mjx = result.querySelector('mjx-container');
      if (mjx) return mjx.cloneNode(true);
    }
    if (result.tagName) {
      const tag = String(result.tagName).toLowerCase();
      if (tag === 'svg' || tag === 'mjx-container') return result.cloneNode(true);
    }
    return null;
  }

  function clearMathNode(node) {
    node.innerHTML = '<div class="statkiss-math-wrap"></div>';
    return node.querySelector('.statkiss-math-wrap');
  }

  async function renderMathNode(editor, node) {
    const target = normalizeMathNode(node);
    if (!target) return;
    const tex = String(target.dataset.tex || '').trim();
    const mount = clearMathNode(target);
    const token = (target.__statkissRenderToken || 0) + 1;
    target.__statkissRenderToken = token;
    target.classList.remove('is-error');
    if (!tex) {
      target.classList.add('is-error');
      mount.textContent = '$$\n\n$$';
      return;
    }
    try {
      const mj = await whenMathJaxReady(22000);
      if (target.__statkissRenderToken !== token) return;
      if (!mj) throw new Error('MathJax not available');
      let result = null;
      if (typeof mj.tex2svgPromise === 'function') {
        result = await mj.tex2svgPromise(tex, { display: true });
      } else if (typeof mj.tex2svg === 'function') {
        result = mj.tex2svg(tex, { display: true });
      }
      if (target.__statkissRenderToken !== token) return;
      const rendered = extractRenderedMath(result);
      if (!rendered) throw new Error('Rendered math node missing');
      removeHelpAndAssistive(rendered);
      mount.innerHTML = '';
      mount.appendChild(rendered);
      target.classList.remove('is-error');
    } catch (error) {
      if (target.__statkissRenderToken !== token) return;
      target.classList.add('is-error');
      mount.textContent = '$$\n' + tex + '\n$$';
      try { console.warn('[LocalRichEditor] math render failed', error); } catch (e) {}
    }
    if (editor && typeof editor.populateMathInspector === 'function') {
      const selected = editor.getSelectedMathNode && editor.getSelectedMathNode();
      if (selected === target) editor.populateMathInspector(target);
    }
  }

  function rerenderAllMath(editor) {
    if (!editor || !editor.root) return;
    editor.root.querySelectorAll('.lre-math-node, .latex-node').forEach(function(node){ renderMathNode(editor, node); });
    const preview = editor.sourcePreview || editor.root.querySelector('#lreMarkdownPreview');
    if (preview) preview.querySelectorAll('.lre-math-node, .latex-node').forEach(function(node){ renderMathNode(editor, node); });
  }

  function openCenteredDialog(dialog) {
    if (!dialog) return;
    try {
      if (typeof dialog.showModal === 'function') {
        if (!dialog.open) dialog.showModal();
      } else if (typeof dialog.show === 'function') {
        dialog.show();
      } else {
        dialog.setAttribute('open', 'open');
      }
    } catch (error) {
      dialog.setAttribute('open', 'open');
    }
    dialog.style.left = '50%';
    dialog.style.top = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.margin = '0';
  }

  function centerColorPopover(editor, mode, title) {
    if (!editor || !editor.colorPopover) return;
    editor.activeColorMode = mode || editor.activeColorMode || 'foreColor';
    if (editor.colorPopoverTitle) editor.colorPopoverTitle.textContent = title || (editor.activeColorMode === 'hiliteColor' ? 'Background color' : 'Text color');
    editor.colorPopover.classList.add('is-open');
    editor.colorPopover.style.left = '50%';
    editor.colorPopover.style.top = '50%';
    editor.colorPopover.style.right = 'auto';
    editor.colorPopover.style.bottom = 'auto';
    editor.colorPopover.style.transform = 'translate(-50%, -50%)';
  }

  function ensureParagraphAfter(node, editor) {
    let next = node.nextSibling;
    if (!next || !(next.nodeType === 1 && next.matches('p,div'))) {
      next = document.createElement('p');
      next.innerHTML = '<br>';
      node.parentNode.insertBefore(next, node.nextSibling);
    }
    return next;
  }

  function placeCaretAtStart(element, editor) {
    if (!element) return;
    const sel = window.getSelection();
    const range = document.createRange();
    element.focus && element.focus();
    range.selectNodeContents(element);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    if (editor && typeof editor.saveSelection === 'function') editor.saveSelection();
    if (editor && typeof editor.updateInspector === 'function') editor.updateInspector();
  }

  function finishBlockInsertion(editor, node) {
    if (!editor || !node || !node.parentNode) return;
    if (typeof editor.clearNodeSelection === 'function') editor.clearNodeSelection();
    const paragraph = ensureParagraphAfter(node, editor);
    placeCaretAtStart(paragraph, editor);
    if (typeof editor.markDirty === 'function') editor.markDirty();
    if (typeof editor.updateOutline === 'function') editor.updateOutline();
    if (typeof editor.updateStatus === 'function') editor.updateStatus();
    if (typeof editor.updateSourceView === 'function') editor.updateSourceView();
  }

  function ensureTableDialog(editor) {
    if (editor.__statkissRepairTableDialog) return editor.__statkissRepairTableDialog;
    const overlay = document.createElement('div');
    overlay.className = 'statkiss-inline-modal';
    overlay.hidden = true;
    overlay.innerHTML = [
      '<div class="statkiss-inline-card" role="dialog" aria-label="Insert table">',
      '<h3>Insert table</h3>',
      '<div class="statkiss-inline-grid"></div>',
      '<div class="statkiss-inline-size">3 × 3</div>',
      '<div class="statkiss-inline-fields">',
      '<label>Rows<input type="number" min="1" max="20" value="3"></label>',
      '<label>Columns<input type="number" min="1" max="20" value="3"></label>',
      '</div>',
      '<div class="statkiss-inline-actions">',
      '<button type="button" data-role="cancel">Cancel</button>',
      '<button type="button" class="primary" data-role="insert">Insert</button>',
      '</div>',
      '</div>'
    ].join('');
    editor.root.appendChild(overlay);
    const grid = overlay.querySelector('.statkiss-inline-grid');
    const size = overlay.querySelector('.statkiss-inline-size');
    const rowsInput = overlay.querySelectorAll('input')[0];
    const colsInput = overlay.querySelectorAll('input')[1];
    function paint(rows, cols) {
      rows = Math.max(1, Math.min(20, Number(rows) || 1));
      cols = Math.max(1, Math.min(20, Number(cols) || 1));
      rowsInput.value = String(rows);
      colsInput.value = String(cols);
      size.textContent = rows + ' × ' + cols;
      grid.querySelectorAll('button').forEach(function(cell){
        const active = Number(cell.dataset.rows) <= rows && Number(cell.dataset.cols) <= cols;
        cell.classList.toggle('is-active', active);
      });
      overlay.dataset.rows = String(rows);
      overlay.dataset.cols = String(cols);
    }
    function insert(rows, cols) {
      overlay.hidden = true;
      rows = Math.max(1, Math.min(20, Number(rows) || 3));
      cols = Math.max(1, Math.min(20, Number(cols) || 3));
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      const tbody = document.createElement('tbody');
      const headRow = document.createElement('tr');
      for (let c = 0; c < cols; c += 1) {
        const th = document.createElement('th');
        th.contentEditable = 'true';
        th.textContent = 'Header ' + (c + 1);
        headRow.appendChild(th);
      }
      thead.appendChild(headRow);
      for (let r = 0; r < Math.max(1, rows - 1); r += 1) {
        const row = document.createElement('tr');
        for (let c = 0; c < cols; c += 1) {
          const td = document.createElement('td');
          td.contentEditable = 'true';
          td.textContent = 'Cell ' + (r + 1) + '-' + (c + 1);
          row.appendChild(td);
        }
        tbody.appendChild(row);
      }
      table.appendChild(thead);
      table.appendChild(tbody);
      if (typeof editor.restoreSelection === 'function') editor.restoreSelection();
      if (typeof editor.insertNode === 'function') editor.insertNode(table);
      else editor.editor.appendChild(table);
      finishBlockInsertion(editor, table);
    }
    for (let r = 1; r <= 8; r += 1) {
      for (let c = 1; c <= 8; c += 1) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.dataset.rows = String(r);
        cell.dataset.cols = String(c);
        cell.addEventListener('mouseenter', function(){ paint(r, c); });
        cell.addEventListener('focus', function(){ paint(r, c); });
        cell.addEventListener('click', function(){ insert(r, c); });
        grid.appendChild(cell);
      }
    }
    rowsInput.addEventListener('input', function(){ paint(rowsInput.value, colsInput.value); });
    colsInput.addEventListener('input', function(){ paint(rowsInput.value, colsInput.value); });
    overlay.querySelector('[data-role="insert"]').addEventListener('click', function(){ insert(rowsInput.value, colsInput.value); });
    overlay.querySelector('[data-role="cancel"]').addEventListener('click', function(){ overlay.hidden = true; });
    overlay.addEventListener('mousedown', function(event){ if (event.target === overlay) overlay.hidden = true; });
    paint(3, 3);
    editor.__statkissRepairTableDialog = overlay;
    return overlay;
  }

  function showTableDialog(editor) {
    const overlay = ensureTableDialog(editor);
    overlay.hidden = false;
  }

  function patchInstance(editor) {
    if (!editor || editor[PATCH_FLAG]) return editor;
    editor[PATCH_FLAG] = true;
    ensureStyle();
    disableMathJaxSpeech();

    const root = editor.root;
    if (!root) return editor;

    // Hide dark/comment/inline math buttons again.
    root.querySelectorAll('[data-action="toggle-dark"], [data-action="comment"], [data-action="inline-math"], [data-action="toggle-split"], .lre-floating [data-bubble-action="comment"], .lre-floating [data-bubble-action="inline-math"], .lre-floating [data-bubble-action="toggle-dark"]').forEach(function(node){ node.remove(); });

    // Center dialogs/popovers.
    const originalOpenCodeDialog = typeof editor.openCodeDialog === 'function' ? editor.openCodeDialog.bind(editor) : null;
    editor.openCodeDialog = function(language, code) {
      if (originalOpenCodeDialog) originalOpenCodeDialog(language, code);
      openCenteredDialog(this.codeDialog);
    };
    const originalOpenCodeDialogForSelected = typeof editor.openCodeDialogForSelected === 'function' ? editor.openCodeDialogForSelected.bind(editor) : null;
    editor.openCodeDialogForSelected = function() {
      if (originalOpenCodeDialogForSelected) originalOpenCodeDialogForSelected();
      openCenteredDialog(this.codeDialog);
    };
    editor.openMathDialog = function(mode, tex) {
      this.editingMathNode = null;
      if (this.mathDialogDisplay) this.mathDialogDisplay.value = 'block';
      if (this.mathDialogText) this.mathDialogText.value = tex || '';
      openCenteredDialog(this.mathDialog);
    };
    editor.openMathDialogForSelected = function() {
      const node = normalizeMathNode(this.getSelectedMathNode && this.getSelectedMathNode());
      if (!node) return;
      this.editingMathNode = node;
      if (this.mathDialogDisplay) this.mathDialogDisplay.value = 'block';
      if (this.mathDialogText) this.mathDialogText.value = node.dataset.tex || '';
      openCenteredDialog(this.mathDialog);
    };
    editor.openMathDialogForNode = function(node) {
      const math = normalizeMathNode(node);
      if (!math) return;
      if (typeof this.selectNode === 'function') this.selectNode(math);
      this.openMathDialogForSelected();
    };
    editor.openColorPopover = function(button, mode, title) { centerColorPopover(this, mode, title); };

    const originalHandleAction = typeof editor.handleAction === 'function' ? editor.handleAction.bind(editor) : null;
    editor.handleAction = function(action, button) {
      if (action === 'toggle-dark' || action === 'comment' || action === 'inline-math' || action === 'toggle-split') {
        if (action === 'inline-math') this.openMathDialog('block');
        return;
      }
      if (action === 'table') return showTableDialog(this);
      if (action === 'text-color') return centerColorPopover(this, 'foreColor', 'Text color');
      if (action === 'bg-color') return centerColorPopover(this, 'hiliteColor', 'Background color');
      return originalHandleAction ? originalHandleAction(action, button) : undefined;
    };

    editor.renderMathNode = function(node) { return renderMathNode(this, node); };
    editor.renderAllMath = function() { return rerenderAllMath(this); };
    editor.insertTablePrompt = function() { return showTableDialog(this); };
    editor.showTablePicker = function() { return showTableDialog(this); };

    const originalSaveMathDialog = typeof editor.saveMathDialog === 'function' ? editor.saveMathDialog.bind(editor) : null;
    editor.saveMathDialog = function() {
      const tex = String(this.mathDialogText && this.mathDialogText.value || '').trim();
      if (!tex) {
        try { this.mathDialog && this.mathDialog.close(); } catch (error) {}
        return;
      }
      let node = this.editingMathNode || (this.getSelectedMathNode && this.getSelectedMathNode());
      const creating = !node;
      if (!node) {
        node = document.createElement('div');
        node.className = 'lre-math-node block';
        node.dataset.type = 'math';
        node.dataset.display = 'true';
        node.setAttribute('contenteditable', 'false');
        if (typeof this.insertNode === 'function') this.insertNode(node);
        else this.editor.appendChild(node);
      }
      node = normalizeMathNode(node);
      node.dataset.tex = tex;
      node.dataset.display = 'true';
      renderMathNode(this, node);
      try { this.mathDialog && this.mathDialog.close(); } catch (error) {}
      this.editingMathNode = null;
      if (creating) finishBlockInsertion(this, node);
      else if (typeof this.selectNode === 'function') this.selectNode(node);
    };

    const originalSaveCodeDialog = typeof editor.saveCodeDialog === 'function' ? editor.saveCodeDialog.bind(editor) : null;
    editor.saveCodeDialog = function() {
      const lang = typeof normalizeLang === 'function' ? normalizeLang(this.codeDialogLang && this.codeDialogLang.value || 'plaintext') : (this.codeDialogLang && this.codeDialogLang.value || 'plaintext');
      const code = String(this.codeDialogText && this.codeDialogText.value || '');
      let node = this.editingCodeNode || (this.getSelectedCodeNode && this.getSelectedCodeNode());
      const creating = !node;
      if (!node) {
        node = typeof this.createCodeNode === 'function' ? this.createCodeNode(lang, code) : null;
        if (!node) return;
        if (typeof this.insertNode === 'function') this.insertNode(node);
        else this.editor.appendChild(node);
      } else {
        node.dataset.language = lang;
        node.dataset.code = code;
        if (typeof this.renderCodeNode === 'function') this.renderCodeNode(node);
      }
      try { this.codeDialog && this.codeDialog.close(); } catch (error) {}
      this.editingCodeNode = null;
      if (creating) finishBlockInsertion(this, node);
      else if (typeof this.selectNode === 'function') this.selectNode(node);
    };

    const originalUpdateMarkdownPreview = typeof editor.updateMarkdownPreview === 'function' ? editor.updateMarkdownPreview.bind(editor) : null;
    editor.updateMarkdownPreview = function() {
      if (originalUpdateMarkdownPreview) originalUpdateMarkdownPreview();
      rerenderAllMath(this);
      if (typeof this.highlightAllCodeBlocks === 'function') this.highlightAllCodeBlocks();
    };

    // First pass after mount.
    disableMathJaxSpeech();
    rerenderAllMath(editor);
    if (typeof editor.highlightAllCodeBlocks === 'function') editor.highlightAllCodeBlocks();
    if (typeof editor.updateInspector === 'function') editor.updateInspector();
    setTimeout(function(){
      disableMathJaxSpeech();
      rerenderAllMath(editor);
      if (typeof editor.highlightAllCodeBlocks === 'function') editor.highlightAllCodeBlocks();
      if (typeof editor.updateInspector === 'function') editor.updateInspector();
    }, 80);

    return editor;
  }

  wrapMount('mountStatkissContentEditor', patchInstance);
  wrapMount('mountEmbeddedContentEditor', patchInstance);
  wrapMount('initStatkissContentEditor', patchInstance);
  wrapMount('initEmbeddedContentEditor', patchInstance);
  wrapMount('autoMountStatkissContentEditor', patchInstance);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ waitForEditor(patchInstance); }, { once: true });
  } else {
    waitForEditor(patchInstance);
  }
})();


(function(){
  'use strict';

  var PATCH_ID = 'local-rich-editor-patch-20260403-memory-inlineworker-01';
  if (window.__STATKISS_MEMORY_INLINE_PATCH__ === PATCH_ID) return;
  window.__STATKISS_MEMORY_INLINE_PATCH__ = PATCH_ID;

  var INLINE_SPEECH_RESPONSE = JSON.stringify({
    options: {},
    translations: {},
    mactions: {},
    label: '',
    ssml: '',
    braillelabel: '',
    braille: '',
    tree: ''
  });

  function log() {
    try {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('[LocalRichEditor]');
      console.info.apply(console, args);
    } catch (error) {}
  }

  function debounce(fn, delay) {
    var timer = null;
    return function() {
      var context = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function(){ fn.apply(context, args); }, delay);
    };
  }

  function getInlineSpeechWorkerUrl() {
    if (window.__STATKISS_INLINE_SPEECH_WORKER_URL__) return window.__STATKISS_INLINE_SPEECH_WORKER_URL__;
    var source = [
      "self.onmessage = function(event){",
      "  var msg = (event && event.data) || {};",
      "  var cmd = msg.cmd || '';",
      "  var data = '';",
      "  switch (cmd) {",
      "    case 'speech':",
      "    case 'nextRules':",
      "    case 'nextStyle':",
      "      data = " + JSON.stringify(INLINE_SPEECH_RESPONSE) + ";",
      "      break;",
      "    case 'localePreferences':",
      "      data = '{}';",
      "      break;",
      "    case 'relevantPreferences':",
      "      data = '[]';",
      "      break;",
      "    default:",
      "      data = '';",
      "      break;",
      "  }",
      "  self.postMessage({ cmd: cmd, data: data });",
      "};"
    ].join('\n');
    var blob = new Blob([source], { type: 'text/javascript' });
    window.__STATKISS_INLINE_SPEECH_WORKER_URL__ = URL.createObjectURL(blob);
    return window.__STATKISS_INLINE_SPEECH_WORKER_URL__;
  }

  function patchWorkerFactory(target) {
    if (!target || target.__statkissInlineWorkerPatched) return;
    target.__statkissInlineWorkerPatched = true;
    target.createWorker = async function(listener) {
      var worker = new Worker(getInlineSpeechWorkerUrl());
      worker.onmessage = listener;
      return worker;
    };
  }

  function hardDisableMathJaxSpeechRuntime(doc) {
    if (!doc) return;
    try {
      doc.options = doc.options || {};
      doc.options.enableExplorer = false;
      doc.options.enableExplorerHelp = false;
      doc.options.enableSpeech = false;
      doc.options.enableBraille = false;
      doc.options.enableEnrichment = false;
      doc.options.a11y = Object.assign({}, doc.options.a11y || {}, {
        speech: false,
        braille: false,
        subtitles: false,
        voicing: false,
        help: false,
        infoPrefix: false,
        infoRole: false,
        infoType: false,
        inTabOrder: false,
        keyMagnifier: false,
        mouseMagnifier: false,
        treeColoring: false,
        hover: false,
        flame: false
      });
      if (typeof doc.attachSpeech === 'function') doc.attachSpeech = function(){ return this; };
      if (typeof doc.explorable === 'function') doc.explorable = function(){ return this; };
      if (typeof doc.getWebworker === 'function') doc.getWebworker = function(){ return null; };
      if (doc.webworker) {
        try { doc.webworker.terminate && doc.webworker.terminate(); } catch (error) {}
        doc.webworker = null;
      }
      if (doc.math && typeof doc.math[Symbol.iterator] === 'function') {
        try {
          for (var item of doc.math) {
            if (item && item.explorers && typeof item.explorers.unhighlight === 'function') {
              try { item.explorers.unhighlight(); } catch (error) {}
            }
            if (item && item.outputData) item.outputData.speechPromise = null;
          }
        } catch (error) {}
      }
    } catch (error) {}
  }

  function patchMathJaxRuntime() {
    var mj = window.MathJax;
    if (!mj) return false;
    try {
      mj.config = mj.config || {};
      mj.config.options = mj.config.options || {};
      mj.config.options.enableExplorer = false;
      mj.config.options.enableExplorerHelp = false;
      mj.config.options.enableSpeech = false;
      mj.config.options.enableBraille = false;
      mj.config.options.enableEnrichment = false;
      mj.config.options.a11y = Object.assign({}, mj.config.options.a11y || {}, {
        speech: false,
        braille: false,
        subtitles: false,
        voicing: false,
        help: false,
        infoPrefix: false,
        infoRole: false,
        infoType: false,
        inTabOrder: false,
        keyMagnifier: false,
        mouseMagnifier: false,
        treeColoring: false,
        hover: false,
        flame: false
      });
      mj.config.svg = Object.assign({}, mj.config.svg || {}, { fontCache: 'global' });
    } catch (error) {}

    try {
      var htmlAdaptorCtor = mj._ && mj._.adaptors && mj._.adaptors.HTMLAdaptor && mj._.adaptors.HTMLAdaptor.HTMLAdaptor;
      if (htmlAdaptorCtor && htmlAdaptorCtor.prototype) patchWorkerFactory(htmlAdaptorCtor.prototype);
    } catch (error) {}

    try {
      if (mj.startup) {
        if (mj.startup.adaptor) patchWorkerFactory(mj.startup.adaptor);
        if (mj.startup.output && mj.startup.output.options) mj.startup.output.options.fontCache = 'global';
        if (mj.startup.document) hardDisableMathJaxSpeechRuntime(mj.startup.document);
      }
    } catch (error) {}

    return true;
  }

  function removeMathRenderArtifacts(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('mjx-assistive-mml, mjx-help, mjx-focus').forEach(function(node){ node.remove(); });
  }

  function normalizeMathNode(node) {
    if (!node) return null;
    if (node.classList && node.classList.contains('latex-node')) {
      node.classList.remove('latex-node');
      node.classList.add('lre-math-node');
    }
    if (!node.classList || !node.classList.contains('lre-math-node')) return null;
    node.dataset.type = 'math';
    node.dataset.display = 'true';
    node.classList.remove('inline');
    node.classList.add('block');
    if (!node.dataset.tex && node.dataset.latex) node.dataset.tex = node.dataset.latex;
    node.setAttribute('contenteditable', 'false');
    return node;
  }

  function ensureMathWrap(node) {
    var wrap = node.querySelector('.statkiss-math-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'statkiss-math-wrap';
      node.appendChild(wrap);
    }
    return wrap;
  }

  function extractRenderedMath(result) {
    if (!result) return null;
    if (result.querySelector) {
      var svg = result.querySelector('svg');
      if (svg) return svg.cloneNode(true);
      var container = result.querySelector('mjx-container');
      if (container) return container.cloneNode(true);
    }
    if (result.tagName) {
      var tag = String(result.tagName || '').toLowerCase();
      if (tag === 'svg' || tag === 'mjx-container') return result.cloneNode(true);
    }
    return null;
  }

  function whenMathJaxReady(timeoutMs) {
    var timeout = typeof timeoutMs === 'number' ? timeoutMs : 20000;
    return new Promise(function(resolve){
      var done = function() {
        patchMathJaxRuntime();
        var mj = window.MathJax;
        if (!mj || (typeof mj.tex2svgPromise !== 'function' && typeof mj.tex2svg !== 'function')) return false;
        if (mj.startup && mj.startup.promise && typeof mj.startup.promise.then === 'function') {
          mj.startup.promise.then(function(){ patchMathJaxRuntime(); resolve(mj); }).catch(function(){ patchMathJaxRuntime(); resolve(mj); });
        } else {
          resolve(mj);
        }
        return true;
      };
      if (done()) return;
      var started = Date.now();
      var timer = setInterval(function(){
        if (done() || Date.now() - started > timeout) {
          clearInterval(timer);
          if (!window.MathJax) resolve(null);
        }
      }, 50);
    });
  }

  var MATH_CACHE = new Map();
  var MATH_CACHE_LIMIT = 64;

  function cacheMath(tex, markup) {
    if (!tex || !markup) return;
    if (MATH_CACHE.has(tex)) MATH_CACHE.delete(tex);
    MATH_CACHE.set(tex, markup);
    while (MATH_CACHE.size > MATH_CACHE_LIMIT) {
      var firstKey = MATH_CACHE.keys().next();
      if (firstKey && !firstKey.done) MATH_CACHE.delete(firstKey.value);
      else break;
    }
  }

  async function renderMathNodeLight(editor, node, force) {
    var target = normalizeMathNode(node);
    if (!target) return;
    var tex = String(target.dataset.tex || '').trim();
    var wrap = ensureMathWrap(target);
    var token = (target.__statkissRenderToken || 0) + 1;
    target.__statkissRenderToken = token;
    target.classList.remove('is-error');

    if (!tex) {
      wrap.innerHTML = '';
      target.dataset.renderedTex = '';
      target.classList.add('is-error');
      return;
    }

    if (!force && target.dataset.renderedTex === tex && wrap.querySelector('svg, mjx-container')) {
      return;
    }

    if (MATH_CACHE.has(tex)) {
      wrap.innerHTML = MATH_CACHE.get(tex);
      removeMathRenderArtifacts(wrap);
      target.dataset.renderedTex = tex;
      return;
    }

    try {
      var mj = await whenMathJaxReady(22000);
      if (target.__statkissRenderToken !== token) return;
      if (!mj) throw new Error('MathJax not available');
      var result = null;
      if (typeof mj.tex2svgPromise === 'function') {
        result = await mj.tex2svgPromise(tex, { display: true });
      } else if (typeof mj.tex2svg === 'function') {
        result = mj.tex2svg(tex, { display: true });
      }
      if (target.__statkissRenderToken !== token) return;
      var rendered = extractRenderedMath(result);
      if (!rendered) throw new Error('Rendered math node missing');
      wrap.innerHTML = '';
      wrap.appendChild(rendered);
      removeMathRenderArtifacts(wrap);
      target.dataset.renderedTex = tex;
      cacheMath(tex, wrap.innerHTML);
      target.classList.remove('is-error');
    } catch (error) {
      if (target.__statkissRenderToken !== token) return;
      wrap.innerHTML = '';
      target.classList.add('is-error');
      target.dataset.renderedTex = '';
      try { console.warn('[LocalRichEditor] math render failed', error); } catch (error2) {}
    }
  }

  function serializeCleanHtml(editor) {
    if (!editor || !editor.editor) return '';
    var clone = editor.editor.cloneNode(true);
    removeMathRenderArtifacts(clone);
    clone.querySelectorAll('.lre-math-node, .latex-node').forEach(function(node){
      if (node.classList.contains('latex-node')) {
        node.classList.remove('latex-node');
        node.classList.add('lre-math-node');
      }
      if (node.dataset.latex && !node.dataset.tex) node.dataset.tex = node.dataset.latex;
      node.dataset.display = 'true';
      node.classList.remove('inline');
      node.classList.add('block');
      node.setAttribute('contenteditable', 'false');
      var wrap = node.querySelector('.statkiss-math-wrap');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'statkiss-math-wrap';
        node.appendChild(wrap);
      }
      wrap.innerHTML = '';
      node.querySelectorAll('svg, mjx-container, mjx-assistive-mml, mjx-help, mjx-focus').forEach(function(el){
        if (wrap.contains(el)) el.remove();
      });
      delete node.dataset.renderedTex;
    });
    return clone.innerHTML;
  }

  function installLeanDraftObserver(editor) {
    if (!editor || !editor.editor) return;
    try {
      if (editor.__hostDraftObserver && typeof editor.__hostDraftObserver.disconnect === 'function') {
        editor.__hostDraftObserver.disconnect();
      }
    } catch (error) {}

    var mirror = typeof editor.__hostMirrorNow === 'function' ? editor.__hostMirrorNow.bind(editor) : null;
    if (!mirror) return;
    var debouncedMirror = debounce(function(){ mirror(false); }, 240);

    var observer = new MutationObserver(function(mutations){
      var shouldMirror = false;
      for (var i = 0; i < mutations.length; i += 1) {
        var mutation = mutations[i];
        var target = mutation.target;
        var element = target && target.nodeType === 1 ? target : (target && target.parentElement ? target.parentElement : null);
        if (element) {
          var insideMath = element.closest('.statkiss-math-wrap, mjx-container, mjx-assistive-mml, mjx-help, mjx-focus');
          var insideCodePaint = element.closest('.lre-code-pre, .hljs');
          if ((insideMath || insideCodePaint) && mutation.type !== 'attributes') continue;
          if (mutation.type === 'attributes') {
            var attr = mutation.attributeName || '';
            if (insideMath || insideCodePaint) {
              if (attr === 'data-tex' || attr === 'data-display' || attr === 'data-language' || attr === 'data-code' || attr === 'src' || attr === 'alt') {
                shouldMirror = true;
                break;
              }
              continue;
            }
            if (attr === 'class' || attr === 'style') continue;
          }
        }
        shouldMirror = true;
        break;
      }
      if (shouldMirror) debouncedMirror();
    });

    observer.observe(editor.editor, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-language', 'data-code', 'data-tex', 'data-display', 'src', 'alt', 'class', 'style']
    });

    editor.__hostDraftObserver = observer;
    mirror(true);
  }

  function patchEditorInstance(editor) {
    if (!editor || editor.__statkissMemoryPatched) return editor;
    editor.__statkissMemoryPatched = true;
    patchMathJaxRuntime();

    editor.getHTML = function() {
      return serializeCleanHtml(this);
    };

    editor.renderMathNode = function(node, force) {
      return renderMathNodeLight(this, node, force);
    };

    editor.renderAllMath = function(force) {
      if (!this || !this.root) return;
      var selector = '.lre-math-node, .latex-node';
      this.root.querySelectorAll(selector).forEach(function(node){ renderMathNodeLight(editor, node, force); });
      var preview = this.sourcePreview || this.root.querySelector('#lreMarkdownPreview');
      if (preview) preview.querySelectorAll(selector).forEach(function(node){ renderMathNodeLight(editor, node, force); });
    };

    installLeanDraftObserver(editor);
    setTimeout(function(){ editor.renderAllMath(false); }, 30);
    return editor;
  }

  function wrapMount(name) {
    var fn = window[name];
    if (typeof fn !== 'function' || fn.__statkissMemoryWrapped) return;
    var wrapped = function() {
      var result = fn.apply(this, arguments);
      if (result && typeof result.then === 'function') {
        return result.then(function(editor){ return patchEditorInstance(editor); });
      }
      return patchEditorInstance(result);
    };
    wrapped.__statkissMemoryWrapped = true;
    window[name] = wrapped;
  }

  function waitForEditor(callback) {
    if (window.localRichEditor) {
      callback(window.localRichEditor);
      return;
    }
    var tries = 0;
    var timer = setInterval(function(){
      tries += 1;
      if (window.localRichEditor) {
        clearInterval(timer);
        callback(window.localRichEditor);
      } else if (tries > 300) {
        clearInterval(timer);
      }
    }, 50);
  }

  function installLifecycleCleanup() {
    if (window.__STATKISS_MEMORY_CLEANUP_INSTALLED__) return;
    window.__STATKISS_MEMORY_CLEANUP_INSTALLED__ = true;
    var cleanup = function(){
      try {
        var editor = window.localRichEditor;
        if (editor && editor.__hostDraftObserver && typeof editor.__hostDraftObserver.disconnect === 'function') {
          editor.__hostDraftObserver.disconnect();
        }
      } catch (error) {}
      try {
        var mj = window.MathJax;
        if (mj && mj.startup && mj.startup.document && mj.startup.document.webworker) {
          var worker = mj.startup.document.webworker;
          if (worker) {
            try { worker.terminate && worker.terminate(); } catch (error) {}
            mj.startup.document.webworker = null;
          }
        }
      } catch (error) {}
    };
    window.addEventListener('pagehide', cleanup);
    window.addEventListener('beforeunload', cleanup);
    document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'hidden') cleanup(); });
  }

  patchMathJaxRuntime();
  wrapMount('mountStatkissContentEditor');
  wrapMount('mountEmbeddedContentEditor');
  wrapMount('initStatkissContentEditor');
  wrapMount('initEmbeddedContentEditor');
  wrapMount('autoMountStatkissContentEditor');
  installLifecycleCleanup();

  if (window.MathJax && window.MathJax.startup && window.MathJax.startup.promise && typeof window.MathJax.startup.promise.then === 'function') {
    window.MathJax.startup.promise.then(function(){ patchMathJaxRuntime(); });
  } else {
    setTimeout(patchMathJaxRuntime, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ waitForEditor(patchEditorInstance); }, { once: true });
  } else {
    waitForEditor(patchEditorInstance);
  }

  log(PATCH_ID + ' applied');
})();



(function(){
  'use strict';
  var PATCH_ID = 'statkiss-optimizer-math-center-20260403-01';
  if (window.__STATKISS_ULTRA_PATCH__ === PATCH_ID) return;
  window.__STATKISS_ULTRA_PATCH__ = PATCH_ID;

  var DEFAULT_MATHJAX_BUNDLE_URL = 'https://cdn.jsdelivr.net/gh/statground/solid-edit@0.0.2/versions/0.0.2/mathjax_localrich_bundle_20260403.js';

  function log() {
    try {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('[LocalRichEditor]');
      console.info.apply(console, args);
    } catch (error) {}
  }

  if (typeof window !== 'undefined') {
    window.MathJax = window.MathJax || {
      tex: {
        inlineMath: [],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true
      },
      svg: { fontCache: 'none' },
      startup: { typeset: false },
      options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'] }
    };
  }

  function resolveMathJaxBundleUrl() {
    if (window.STATKISS_MATHJAX_BUNDLE_URL) return window.STATKISS_MATHJAX_BUNDLE_URL;
    var current = '';
    try { current = document.currentScript && document.currentScript.src || ''; } catch (error) {}
    if (current && current.indexOf('/combine/') === -1) {
      try { return new URL('mathjax_localrich_bundle_20260403.js', current).href; } catch (error) {}
    }
    return DEFAULT_MATHJAX_BUNDLE_URL;
  }

  function ensureMathJaxBundle() {
    var mj = window.MathJax;
    if (mj && (typeof mj.tex2svgPromise === 'function' || typeof mj.tex2svg === 'function')) {
      return Promise.resolve(mj);
    }
    if (window.__STATKISS_MATHJAX_BUNDLE_PROMISE__) return window.__STATKISS_MATHJAX_BUNDLE_PROMISE__;
    window.__STATKISS_MATHJAX_BUNDLE_PROMISE__ = new Promise(function(resolve, reject){
      var existing = document.querySelector('script[data-statkiss-mathjax-bundle="1"]');
      function done() {
        var mathjax = window.MathJax;
        if (mathjax && (typeof mathjax.tex2svgPromise === 'function' || typeof mathjax.tex2svg === 'function')) {
          resolve(mathjax);
          return true;
        }
        return false;
      }
      if (done()) return;
      var script = existing || document.createElement('script');
      script.setAttribute('data-statkiss-mathjax-bundle', '1');
      script.src = resolveMathJaxBundleUrl();
      script.async = false;
      script.onload = function(){ done() || reject(new Error('MathJax bundle loaded but API missing')); };
      script.onerror = function(){ reject(new Error('Failed to load MathJax bundle')); };
      if (!existing) document.head.appendChild(script);
    });
    return window.__STATKISS_MATHJAX_BUNDLE_PROMISE__;
  }

  function patchMathJaxRuntime() {
    var mj = window.MathJax;
    if (!mj) return false;
    try {
      mj.config = mj.config || {};
      mj.config.tex = Object.assign({}, mj.config.tex || {}, { inlineMath: [] });
      mj.config.svg = Object.assign({}, mj.config.svg || {}, { fontCache: 'none' });
      mj.config.options = mj.config.options || {};
      mj.config.options.enableExplorer = false;
      mj.config.options.enableExplorerHelp = false;
      mj.config.options.enableSpeech = false;
      mj.config.options.enableBraille = false;
      mj.config.options.enableEnrichment = false;
      mj.config.options.a11y = Object.assign({}, mj.config.options.a11y || {}, {
        speech: false,
        braille: false,
        subtitles: false,
        voicing: false,
        help: false,
        infoPrefix: false,
        infoRole: false,
        infoType: false,
        inTabOrder: false,
        keyMagnifier: false,
        mouseMagnifier: false,
        treeColoring: false,
        hover: false,
        flame: false
      });
      if (mj.startup && mj.startup.output && mj.startup.output.options) {
        mj.startup.output.options.fontCache = 'none';
      }
      if (mj.startup && mj.startup.document) {
        var doc = mj.startup.document;
        doc.options = doc.options || {};
        doc.options.enableExplorer = false;
        doc.options.enableExplorerHelp = false;
        doc.options.enableSpeech = false;
        doc.options.enableBraille = false;
        doc.options.enableEnrichment = false;
        doc.options.a11y = Object.assign({}, doc.options.a11y || {}, {
          speech: false,
          braille: false,
          subtitles: false,
          voicing: false,
          help: false,
          infoPrefix: false,
          infoRole: false,
          infoType: false,
          inTabOrder: false
        });
        if (doc.outputJax && doc.outputJax.options) doc.outputJax.options.fontCache = 'none';
        doc.attachSpeech = function(){ return this; };
        doc.explorable = function(){ return this; };
        doc.getWebworker = function(){ return null; };
        if (doc.webworker) {
          try { doc.webworker.terminate && doc.webworker.terminate(); } catch (error) {}
          doc.webworker = null;
        }
      }
    } catch (error) {}
    return !!(mj && (typeof mj.tex2svgPromise === 'function' || typeof mj.tex2svg === 'function'));
  }

  function whenMathJaxReady(timeoutMs) {
    var timeout = typeof timeoutMs === 'number' ? timeoutMs : 20000;
    return ensureMathJaxBundle().then(function(){
      return new Promise(function(resolve){
        var finish = function() {
          patchMathJaxRuntime();
          var mj = window.MathJax;
          if (!mj || (typeof mj.tex2svgPromise !== 'function' && typeof mj.tex2svg !== 'function')) return false;
          if (mj.startup && mj.startup.promise && typeof mj.startup.promise.then === 'function') {
            mj.startup.promise.then(function(){ patchMathJaxRuntime(); resolve(mj); }).catch(function(){ patchMathJaxRuntime(); resolve(mj); });
          } else {
            resolve(mj);
          }
          return true;
        };
        if (finish()) return;
        var started = Date.now();
        var timer = setInterval(function(){
          if (finish() || Date.now() - started > timeout) {
            clearInterval(timer);
            if (!window.MathJax) resolve(null);
          }
        }, 50);
      });
    }).catch(function(){ return null; });
  }

  function moveToBody(node) {
    if (!node || !document.body || node.parentNode === document.body) return node;
    try { document.body.appendChild(node); } catch (error) {}
    return node;
  }

  function centerFloating(node, width) {
    if (!node) return;
    moveToBody(node);
    node.style.position = 'fixed';
    node.style.left = '50%';
    node.style.top = '50%';
    node.style.right = 'auto';
    node.style.bottom = 'auto';
    node.style.margin = '0';
    node.style.transform = 'translate(-50%, -50%)';
    node.style.zIndex = '2147483000';
    if (width) node.style.width = width;
  }

  function normalizeMathNode(node) {
    if (!node) return null;
    if (node.classList && node.classList.contains('latex-node')) {
      node.classList.remove('latex-node');
      node.classList.add('lre-math-node');
    }
    if (!node.classList || !node.classList.contains('lre-math-node')) return null;
    node.dataset.type = 'math';
    node.dataset.display = 'true';
    node.classList.remove('inline');
    node.classList.add('block');
    node.setAttribute('contenteditable', 'false');
    if (!node.dataset.tex && node.dataset.latex) node.dataset.tex = node.dataset.latex;
    return node;
  }

  function ensureMathWrap(node) {
    var wrap = node.querySelector('.statkiss-math-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'statkiss-math-wrap';
      node.appendChild(wrap);
    }
    return wrap;
  }

  function stripMathAssistive(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('mjx-assistive-mml, mjx-help, mjx-focus').forEach(function(el){ el.remove(); });
  }

  function extractRenderedMath(result) {
    if (!result) return null;
    if (result.tagName) {
      var tag = String(result.tagName || '').toLowerCase();
      if (tag === 'mjx-container') return result.cloneNode(true);
      if (tag === 'svg') return result.cloneNode(true);
    }
    if (result.querySelector) {
      var container = result.querySelector('mjx-container');
      if (container) return container.cloneNode(true);
      var svg = result.querySelector('svg');
      if (svg) return svg.cloneNode(true);
    }
    return null;
  }

  var MATH_CACHE = new Map();
  var MATH_CACHE_LIMIT = 64;
  function cacheMath(tex, markup) {
    if (!tex || !markup) return;
    if (MATH_CACHE.has(tex)) MATH_CACHE.delete(tex);
    MATH_CACHE.set(tex, markup);
    while (MATH_CACHE.size > MATH_CACHE_LIMIT) {
      var first = MATH_CACHE.keys().next();
      if (first && !first.done) MATH_CACHE.delete(first.value);
      else break;
    }
  }

  async function renderMath(editor, node, force) {
    var target = normalizeMathNode(node);
    if (!target) return;
    var tex = String(target.dataset.tex || '').trim();
    var wrap = ensureMathWrap(target);
    var token = (target.__statkissRenderToken || 0) + 1;
    target.__statkissRenderToken = token;
    target.classList.remove('is-error');
    if (!tex) {
      wrap.innerHTML = '';
      target.dataset.renderedTex = '';
      target.classList.add('is-error');
      return;
    }
    if (!force && target.dataset.renderedTex === tex && wrap.querySelector('mjx-container, svg')) {
      return;
    }
    if (MATH_CACHE.has(tex)) {
      wrap.innerHTML = MATH_CACHE.get(tex);
      stripMathAssistive(wrap);
      target.dataset.renderedTex = tex;
      return;
    }
    try {
      var mj = await whenMathJaxReady(22000);
      if (target.__statkissRenderToken !== token) return;
      if (!mj) throw new Error('MathJax not available');
      var result = null;
      if (typeof mj.tex2svgPromise === 'function') result = await mj.tex2svgPromise(tex, { display: true });
      else if (typeof mj.tex2svg === 'function') result = mj.tex2svg(tex, { display: true });
      if (target.__statkissRenderToken !== token) return;
      var rendered = extractRenderedMath(result);
      if (!rendered) throw new Error('Rendered math node missing');
      stripMathAssistive(rendered);
      wrap.innerHTML = '';
      wrap.appendChild(rendered);
      target.dataset.renderedTex = tex;
      target.classList.remove('is-error');
      cacheMath(tex, wrap.innerHTML);
    } catch (error) {
      if (target.__statkissRenderToken !== token) return;
      wrap.innerHTML = '';
      target.dataset.renderedTex = '';
      target.classList.add('is-error');
      try { console.warn('[LocalRichEditor] math render failed', error); } catch (error2) {}
    }
  }

  function rerenderAllMath(editor, force) {
    if (!editor || !editor.root) return;
    editor.root.querySelectorAll('.lre-math-node, .latex-node').forEach(function(node){ renderMath(editor, node, force); });
    var preview = editor.sourcePreview || editor.root.querySelector('#lreMarkdownPreview');
    if (preview) preview.querySelectorAll('.lre-math-node, .latex-node').forEach(function(node){ renderMath(editor, node, force); });
  }

  function ensureParagraphAfter(node) {
    var next = node && node.nextSibling;
    if (!node || !node.parentNode) return null;
    if (!next || !(next.nodeType === 1 && /^(P|DIV)$/.test(next.nodeName))) {
      next = document.createElement('p');
      next.innerHTML = '<br>';
      node.parentNode.insertBefore(next, node.nextSibling);
    }
    return next;
  }

  function placeCaretAtStart(el, editor) {
    if (!el) return;
    var sel = window.getSelection && window.getSelection();
    if (!sel) return;
    var range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    try { el.focus && el.focus(); } catch (error) {}
    try { editor && editor.saveSelection && editor.saveSelection(); } catch (error) {}
  }

  function finishBlockInsertion(editor, node) {
    if (!editor || !node) return;
    try { editor.clearNodeSelection && editor.clearNodeSelection(); } catch (error) {}
    var paragraph = ensureParagraphAfter(node);
    placeCaretAtStart(paragraph, editor);
    try { editor.markDirty && editor.markDirty(); } catch (error) {}
    try { editor.updateOutline && editor.updateOutline(); } catch (error) {}
    try { editor.updateStatus && editor.updateStatus(); } catch (error) {}
    try { editor.updateSourceView && editor.updateSourceView(); } catch (error) {}
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    try {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    } catch (error) {
      dialog.removeAttribute('open');
    }
  }

  function openCenteredDialog(dialog) {
    if (!dialog) return;
    centerFloating(dialog);
    try {
      if (typeof dialog.showModal === 'function') {
        if (!dialog.open) dialog.showModal();
      } else if (typeof dialog.show === 'function') {
        dialog.show();
      } else {
        dialog.setAttribute('open', 'open');
      }
    } catch (error) {
      dialog.setAttribute('open', 'open');
    }
  }

  function ensureCenterStyles() {
    if (document.getElementById('statkiss-optimizer-center-style')) return;
    var style = document.createElement('style');
    style.id = 'statkiss-optimizer-center-style';
    style.textContent = [
      '.lre-color-popover.is-open, .table-picker-overlay, .statkiss-inline-modal, dialog[open].lre-dialog { position: fixed !important; left: 50% !important; top: 50% !important; right: auto !important; bottom: auto !important; transform: translate(-50%, -50%) !important; z-index: 2147483000 !important; }',
      '.statkiss-inline-modal[hidden] { display:none !important; }',
      '.statkiss-inline-modal { inset: 0; background: rgba(15, 23, 42, 0.18); }',
      '.statkiss-inline-card { width: min(92vw, 320px); background: var(--lre-card, #fff); border: 1px solid var(--lre-border, #dbe4f0); border-radius: 16px; box-shadow: 0 18px 48px rgba(15,23,42,.18); padding: 16px; display: grid; gap: 12px; }',
      '.statkiss-inline-card h3 { margin: 0; font-size: 15px; font-weight: 700; }',
      '.statkiss-inline-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; }',
      '.statkiss-inline-grid button { width: 100%; aspect-ratio: 1; border: 1px solid var(--lre-border, #dbe4f0); border-radius: 8px; background: #fff; }',
      '.statkiss-inline-grid button.is-active { background: #dbeafe; border-color: #3b82f6; }',
      '.statkiss-inline-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }',
      '.statkiss-inline-fields label { display: grid; gap: 6px; font-size: 12px; }',
      '.statkiss-inline-fields input { width: 100%; border: 1px solid var(--lre-border, #dbe4f0); border-radius: 10px; padding: 8px 10px; }',
      '.statkiss-inline-actions { display:flex; justify-content:flex-end; gap:8px; }',
      '.statkiss-inline-actions button { border:1px solid var(--lre-border,#dbe4f0); border-radius: 999px; padding: 8px 12px; background:#fff; }',
      '.statkiss-inline-actions .primary { background:#2563eb; color:#fff; border-color:#2563eb; }',
      '.lre-root.lre-embedded-content .lre-color-popover, .lre-root.lre-embedded-content .table-picker-overlay { width: min(92vw, 320px) !important; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  function ensureTableDialog(editor) {
    if (editor.__statkissUltraTableDialog) return editor.__statkissUltraTableDialog;
    var overlay = document.createElement('div');
    overlay.className = 'statkiss-inline-modal';
    overlay.hidden = true;
    overlay.innerHTML = [
      '<div class="statkiss-inline-card" role="dialog" aria-label="Insert table">',
      '<h3>Insert table</h3>',
      '<div class="statkiss-inline-grid"></div>',
      '<div class="statkiss-inline-size">3 × 3</div>',
      '<div class="statkiss-inline-fields">',
      '<label>Rows<input type="number" min="1" max="20" value="3"></label>',
      '<label>Columns<input type="number" min="1" max="20" value="3"></label>',
      '</div>',
      '<div class="statkiss-inline-actions">',
      '<button type="button" data-role="cancel">Cancel</button>',
      '<button type="button" class="primary" data-role="insert">Insert</button>',
      '</div>',
      '</div>'
    ].join('');
    document.body.appendChild(overlay);
    var grid = overlay.querySelector('.statkiss-inline-grid');
    var size = overlay.querySelector('.statkiss-inline-size');
    var inputs = overlay.querySelectorAll('input');
    var rowsInput = inputs[0];
    var colsInput = inputs[1];
    function paint(rows, cols) {
      rows = Math.max(1, Math.min(20, Number(rows) || 1));
      cols = Math.max(1, Math.min(20, Number(cols) || 1));
      rowsInput.value = String(rows);
      colsInput.value = String(cols);
      size.textContent = rows + ' × ' + cols;
      grid.querySelectorAll('button').forEach(function(cell){
        var active = Number(cell.dataset.rows) <= rows && Number(cell.dataset.cols) <= cols;
        cell.classList.toggle('is-active', active);
      });
      overlay.dataset.rows = String(rows);
      overlay.dataset.cols = String(cols);
    }
    function insert(rows, cols) {
      overlay.hidden = true;
      rows = Math.max(1, Math.min(20, Number(rows) || 3));
      cols = Math.max(1, Math.min(20, Number(cols) || 3));
      var table = document.createElement('table');
      var thead = document.createElement('thead');
      var tbody = document.createElement('tbody');
      var hr = document.createElement('tr');
      for (var c = 0; c < cols; c += 1) {
        var th = document.createElement('th');
        th.contentEditable = 'true';
        th.textContent = 'Header ' + (c + 1);
        hr.appendChild(th);
      }
      thead.appendChild(hr);
      for (var r = 0; r < Math.max(1, rows - 1); r += 1) {
        var tr = document.createElement('tr');
        for (var cc = 0; cc < cols; cc += 1) {
          var td = document.createElement('td');
          td.contentEditable = 'true';
          td.textContent = 'Cell ' + (r + 1) + '-' + (cc + 1);
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(thead);
      table.appendChild(tbody);
      try { editor.restoreSelection && editor.restoreSelection(); } catch (error) {}
      if (typeof editor.insertNode === 'function') editor.insertNode(table);
      else if (editor.editor) editor.editor.appendChild(table);
      finishBlockInsertion(editor, table);
    }
    for (var r = 1; r <= 8; r += 1) {
      for (var c = 1; c <= 8; c += 1) {
        var cell = document.createElement('button');
        cell.type = 'button';
        cell.dataset.rows = String(r);
        cell.dataset.cols = String(c);
        cell.addEventListener('mouseenter', function(ev){ paint(ev.currentTarget.dataset.rows, ev.currentTarget.dataset.cols); });
        cell.addEventListener('focus', function(ev){ paint(ev.currentTarget.dataset.rows, ev.currentTarget.dataset.cols); });
        cell.addEventListener('click', function(ev){ insert(ev.currentTarget.dataset.rows, ev.currentTarget.dataset.cols); });
        grid.appendChild(cell);
      }
    }
    rowsInput.addEventListener('input', function(){ paint(rowsInput.value, colsInput.value); });
    colsInput.addEventListener('input', function(){ paint(rowsInput.value, colsInput.value); });
    overlay.querySelector('[data-role="insert"]').addEventListener('click', function(){ insert(rowsInput.value, colsInput.value); });
    overlay.querySelector('[data-role="cancel"]').addEventListener('click', function(){ overlay.hidden = true; });
    overlay.addEventListener('mousedown', function(ev){ if (ev.target === overlay) overlay.hidden = true; });
    paint(3, 3);
    editor.__statkissUltraTableDialog = overlay;
    return overlay;
  }

  function showTableDialog(editor) {
    var overlay = ensureTableDialog(editor);
    overlay.hidden = false;
    centerFloating(overlay);
  }

  function patchEditor(editor) {
    if (!editor || editor.__statkissUltraOptimized) return editor;
    editor.__statkissUltraOptimized = true;
    ensureCenterStyles();
    patchMathJaxRuntime();

    var root = editor.root;
    if (!root) return editor;

    root.querySelectorAll('[data-action="toggle-dark"], [data-action="comment"], [data-action="inline-math"], [data-action="toggle-split"], .lre-floating [data-bubble-action="comment"], .lre-floating [data-bubble-action="inline-math"], .lre-floating [data-bubble-action="toggle-dark"]').forEach(function(node){ node.remove(); });

    editor.openColorPopover = function(button, mode, title) {
      if (!this.colorPopover) return;
      this.activeColorMode = mode || this.activeColorMode || 'foreColor';
      if (this.colorPopoverTitle) this.colorPopoverTitle.textContent = title || (this.activeColorMode === 'hiliteColor' ? 'Background color' : 'Text color');
      centerFloating(this.colorPopover, 'min(92vw, 320px)');
      this.colorPopover.classList.add('is-open');
    };

    var originalHandleAction = typeof editor.handleAction === 'function' ? editor.handleAction.bind(editor) : null;
    editor.handleAction = function(action, button) {
      if (action === 'toggle-dark' || action === 'comment' || action === 'inline-math' || action === 'toggle-split') {
        if (action === 'inline-math') this.openMathDialog('block');
        return;
      }
      if (action === 'table') return showTableDialog(this);
      if (action === 'text-color') return this.openColorPopover(button, 'foreColor', 'Text color');
      if (action === 'bg-color') return this.openColorPopover(button, 'hiliteColor', 'Background color');
      return originalHandleAction ? originalHandleAction(action, button) : undefined;
    };

    editor.insertTablePrompt = function() { return showTableDialog(this); };
    editor.showTablePicker = function() { return showTableDialog(this); };

    editor.openMathDialog = function(mode, tex) {
      this.editingMathNode = null;
      if (this.mathDialogDisplay) this.mathDialogDisplay.value = 'block';
      if (this.mathDialogText) this.mathDialogText.value = tex || '';
      if (this.mathDialog) {
        centerFloating(this.mathDialog, 'min(92vw, 640px)');
        openCenteredDialog(this.mathDialog);
      }
    };

    editor.openMathDialogForSelected = function() {
      var node = normalizeMathNode(this.getSelectedMathNode && this.getSelectedMathNode());
      if (!node) return;
      this.editingMathNode = node;
      if (this.mathDialogDisplay) this.mathDialogDisplay.value = 'block';
      if (this.mathDialogText) this.mathDialogText.value = node.dataset.tex || '';
      if (this.mathDialog) {
        centerFloating(this.mathDialog, 'min(92vw, 640px)');
        openCenteredDialog(this.mathDialog);
      }
    };

    editor.saveMathDialog = function() {
      var tex = String(this.mathDialogText && this.mathDialogText.value || '').trim();
      if (!tex) {
        closeDialog(this.mathDialog);
        return;
      }
      var node = normalizeMathNode(this.editingMathNode || (this.getSelectedMathNode && this.getSelectedMathNode()));
      var creating = !node;
      if (!node) {
        node = document.createElement('div');
        node.className = 'lre-math-node block';
        node.dataset.type = 'math';
        node.dataset.display = 'true';
        node.setAttribute('contenteditable', 'false');
        ensureMathWrap(node);
        try { this.restoreSelection && this.restoreSelection(); } catch (error) {}
        if (typeof this.insertNode === 'function') this.insertNode(node);
        else if (this.editor) this.editor.appendChild(node);
      }
      node.dataset.tex = tex;
      delete node.dataset.latex;
      renderMath(this, node, true);
      try { this.selectNode && this.selectNode(node); } catch (error) {}
      try { this.populateMathInspector && this.populateMathInspector(node); } catch (error) {}
      closeDialog(this.mathDialog);
      if (creating) finishBlockInsertion(this, node);
      else {
        try { this.markDirty && this.markDirty(); } catch (error) {}
        try { this.updateSourceView && this.updateSourceView(); } catch (error) {}
        try { this.updateStatus && this.updateStatus(); } catch (error) {}
      }
    };

    var originalOpenCodeDialog = typeof editor.openCodeDialog === 'function' ? editor.openCodeDialog.bind(editor) : null;
    editor.openCodeDialog = function(language, code) {
      if (originalOpenCodeDialog) originalOpenCodeDialog(language, code);
      if (this.codeDialog) {
        centerFloating(this.codeDialog, 'min(92vw, 760px)');
        openCenteredDialog(this.codeDialog);
      }
    };
    var originalOpenCodeDialogForSelected = typeof editor.openCodeDialogForSelected === 'function' ? editor.openCodeDialogForSelected.bind(editor) : null;
    editor.openCodeDialogForSelected = function() {
      if (originalOpenCodeDialogForSelected) originalOpenCodeDialogForSelected();
      if (this.codeDialog) {
        centerFloating(this.codeDialog, 'min(92vw, 760px)');
        openCenteredDialog(this.codeDialog);
      }
    };

    editor.renderMathNode = function(node, force) { return renderMath(this, node, force); };
    editor.renderAllMath = function(force) { return rerenderAllMath(this, force); };

    setTimeout(function(){ rerenderAllMath(editor, true); }, 80);
    return editor;
  }

  function wrapMount(name) {
    var fn = window[name];
    if (typeof fn !== 'function' || fn.__statkissUltraWrap) return;
    var wrapped = function() {
      var result = fn.apply(this, arguments);
      if (result && typeof result.then === 'function') {
        return result.then(function(editor){ return patchEditor(editor); });
      }
      return patchEditor(result);
    };
    wrapped.__statkissUltraWrap = true;
    window[name] = wrapped;
  }

  function waitForEditor(callback) {
    if (window.localRichEditor) {
      callback(window.localRichEditor);
      return;
    }
    var tries = 0;
    var timer = setInterval(function(){
      tries += 1;
      if (window.localRichEditor) {
        clearInterval(timer);
        callback(window.localRichEditor);
      } else if (tries > 300) {
        clearInterval(timer);
      }
    }, 50);
  }

  ensureMathJaxBundle().then(function(){ patchMathJaxRuntime(); }).catch(function(){});
  wrapMount('mountStatkissContentEditor');
  wrapMount('mountEmbeddedContentEditor');
  wrapMount('initStatkissContentEditor');
  wrapMount('initEmbeddedContentEditor');
  wrapMount('autoMountStatkissContentEditor');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ waitForEditor(patchEditor); }, { once: true });
  } else {
    waitForEditor(patchEditor);
  }
  log(PATCH_ID + ' applied');
})();



/* StatKISS 20260403 option + inspector/dialog fix patch */
(function(){
  var PATCH_ID = 'statkiss-option-inspector-dialog-fix-20260403-01';
  if (window.__STATKISS_OPTION_INSPECTOR_PATCH__) return;
  window.__STATKISS_OPTION_INSPECTOR_PATCH__ = true;

  function log(msg){ try { console.log('[LocalRichEditor] ' + msg); } catch (e) {} }

  function hideNode(node){ if (!node) return; node.hidden = true; node.style.display = 'none'; node.setAttribute('aria-hidden','true'); }
  function showNode(node, display){ if (!node) return; node.hidden = false; node.style.display = display || ''; node.removeAttribute('aria-hidden'); }

  function ensureExtraStyles(){
    if (document.getElementById('statkiss-option-inspector-style')) return;
    var style = document.createElement('style');
    style.id = 'statkiss-option-inspector-style';
    style.textContent = [
      '.statkiss-inspector-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px;}',
      '.statkiss-inspector-head h2{margin:0;}',
      '.statkiss-inspector-close{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border:1px solid var(--lre-border,#dbe4f0);border-radius:12px;background:transparent;color:var(--lre-text,#0f172a);cursor:pointer;}',
      '.statkiss-inspector-close svg{width:18px;height:18px;stroke-width:2;}',
      '.statkiss-force-hide{display:none !important;}',
      '.statkiss-hidden-source{display:none !important;}',
      '.statkiss-dialog-bound{outline:none;}',
      '.statkiss-code-option-disabled [data-action="code-block"], .statkiss-code-option-disabled #lreCodeInspector, .statkiss-code-option-disabled #lreCodeDialog{display:none !important;}',
      '.statkiss-inspector-manual-hidden #lreInspectorPanel{display:none !important;}',
      '.statkiss-inline-modal, dialog.lre-dialog{max-width:calc(100vw - 24px); max-height:calc(100vh - 24px);}',
      '.statkiss-inline-modal .lre-dialog-card, dialog.lre-dialog .lre-dialog-card{max-height:calc(100vh - 48px); overflow:auto;}'
    ].join('');
    document.head.appendChild(style);
  }

  function iconX(){
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6 18 18"/><path d="M18 6 6 18"/></svg>';
  }

  function closeInspector(editor){
    if (!editor || !editor.root) return;
    var panel = editor.inspectorPanel || editor.root.querySelector('#lreInspectorPanel');
    if (!panel) return;
    if (editor.state) editor.state.inspectorPinned = false;
    editor.__statkissInspectorManuallyClosed = true;
    panel.hidden = true;
    panel.classList.remove('is-open');
    editor.root.classList.add('statkiss-inspector-manual-hidden');
    editor.root.classList.remove('show-inspector');
    if (editor.mainWrap) editor.mainWrap.classList.remove('has-inspector');
  }

  function reopenInspectorIfNeeded(editor){
    if (!editor || !editor.root) return;
    var panel = editor.inspectorPanel || editor.root.querySelector('#lreInspectorPanel');
    if (!panel) return;
    if (!editor.selectedNode) return;
    editor.__statkissInspectorManuallyClosed = false;
    editor.root.classList.remove('statkiss-inspector-manual-hidden');
    panel.hidden = false;
    if (editor.mainWrap) editor.mainWrap.classList.add('has-inspector');
    editor.root.classList.add('show-inspector');
  }

  function ensureInspectorClose(editor){
    if (!editor || !editor.root) return;
    var panel = editor.inspectorPanel || editor.root.querySelector('#lreInspectorPanel');
    if (!panel) return;
    if (panel.querySelector('.statkiss-inspector-head')) return;
    var heading = panel.querySelector('h2');
    if (!heading) return;
    var wrap = document.createElement('div');
    wrap.className = 'statkiss-inspector-head';
    heading.parentNode.insertBefore(wrap, heading);
    wrap.appendChild(heading);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'statkiss-inspector-close';
    btn.setAttribute('aria-label', 'Close inspector');
    btn.title = 'Close inspector';
    btn.innerHTML = iconX();
    btn.addEventListener('mousedown', function(ev){ ev.preventDefault(); });
    btn.addEventListener('click', function(ev){ ev.preventDefault(); closeInspector(editor); });
    wrap.appendChild(btn);
  }

  function removeMarkdownMode(editor){
    if (!editor || !editor.root) return;
    var switcher = editor.root.querySelector('.statkiss-mode-switcher');
    if (switcher) switcher.remove();
    var sourcePanel = editor.sourcePanel || editor.root.querySelector('#lreSourcePanel');
    if (sourcePanel) {
      sourcePanel.classList.remove('is-open');
      sourcePanel.hidden = true;
      sourcePanel.classList.add('statkiss-hidden-source');
    }
    editor.__authorMode = 'rich';
    if (editor.state) {
      editor.state.sourceOpen = false;
      editor.state.split = false;
    }
    ['[data-action="toggle-source"]','[data-action="toggle-split"]'].forEach(function(sel){
      editor.root.querySelectorAll(sel).forEach(function(node){ node.remove(); });
    });
    editor.setAuthorMode = function(mode, options){
      this.__authorMode = 'rich';
      if (this.state) { this.state.sourceOpen = false; this.state.split = false; }
      if (this.sourcePanel) { this.sourcePanel.hidden = true; this.sourcePanel.classList.remove('is-open'); }
      this.root.classList.remove('statkiss-markdown-mode');
      if (typeof this.updateLayout === 'function') this.updateLayout();
    };
    editor.toggleSourcePanel = function(){ this.setAuthorMode('rich'); return false; };
    editor.toggleSplitView = function(){ this.setAuthorMode('rich'); return false; };
  }

  function bindDialog(dialog, handlers){
    if (!dialog || dialog.__statkissDialogFixBound) return;
    dialog.__statkissDialogFixBound = true;
    dialog.classList.add('statkiss-dialog-bound');
    dialog.addEventListener('mousedown', function(ev){
      if (ev.target && ev.target.closest && ev.target.closest('button')) ev.preventDefault();
    });
    dialog.addEventListener('click', function(ev){
      var close = ev.target.closest('[data-close-dialog]');
      if (close) {
        ev.preventDefault();
        if (handlers && typeof handlers.close === 'function') handlers.close();
        else if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
        return;
      }
      var actionNode = ev.target.closest('[data-action]');
      if (!actionNode) return;
      var action = actionNode.getAttribute('data-action');
      if (handlers && typeof handlers[action] === 'function') {
        ev.preventDefault();
        handlers[action](ev, actionNode);
      }
    });
  }

  function ensureDialogBindings(editor){
    if (!editor) return;
    bindDialog(editor.mathDialog, {
      close: function(){ try { editor.mathDialog && editor.mathDialog.close && editor.mathDialog.close(); } catch(e){ if(editor.mathDialog) editor.mathDialog.removeAttribute('open'); } },
      'save-math-dialog': function(){ if (typeof editor.saveMathDialog === 'function') editor.saveMathDialog(); }
    });
    bindDialog(editor.codeDialog, {
      close: function(){ try { editor.codeDialog && editor.codeDialog.close && editor.codeDialog.close(); } catch(e){ if(editor.codeDialog) editor.codeDialog.removeAttribute('open'); } },
      'save-code-dialog': function(){ if (typeof editor.saveCodeDialog === 'function') editor.saveCodeDialog(); }
    });
  }

  function setCodeBlockEnabled(editor, enabled){
    if (!editor || !editor.root) return;
    var root = editor.root;
    root.classList.toggle('statkiss-code-option-disabled', !enabled);
    root.querySelectorAll('[data-action="code-block"], [data-action="edit-code"], [data-action="refresh-code"], [data-action="refresh-code-highlight"]').forEach(function(node){
      if (enabled) showNode(node, ''); else hideNode(node);
    });
    if (editor.codeInspector) {
      if (enabled) editor.codeInspector.hidden = !editor.getSelectedCodeNode || !editor.getSelectedCodeNode();
      else editor.codeInspector.hidden = true;
    }
    if (editor.codeDialog) {
      if (!enabled) {
        try { editor.codeDialog.close && editor.codeDialog.close(); } catch (e) {}
        editor.codeDialog.hidden = true;
      } else {
        editor.codeDialog.hidden = false;
      }
    }
    if (!enabled) {
      var originalHandle = editor.__statkissOriginalHandleAction || editor.handleAction && editor.handleAction.bind(editor);
      if (!editor.__statkissOriginalHandleAction && originalHandle) editor.__statkissOriginalHandleAction = originalHandle;
      editor.handleAction = function(action, button){
        if (action === 'code-block' || action === 'edit-code' || action === 'refresh-code' || action === 'refresh-code-highlight' || action === 'save-code-dialog') return;
        return editor.__statkissOriginalHandleAction ? editor.__statkissOriginalHandleAction(action, button) : undefined;
      };
    } else if (editor.__statkissOriginalHandleAction) {
      editor.handleAction = editor.__statkissOriginalHandleAction;
    }
  }

  function applyCodeOption(editor){
    var enabled = !!window.STATKISS_ENABLE_CODEBLOCK;
    setCodeBlockEnabled(editor, enabled);
    ensureDialogBindings(editor);
  }

  function patchEditor(editor){
    if (!editor || editor.__statkissOptionInspectorDialogFix) return editor;
    editor.__statkissOptionInspectorDialogFix = true;
    ensureExtraStyles();
    removeMarkdownMode(editor);
    ensureInspectorClose(editor);
    ensureDialogBindings(editor);
    applyCodeOption(editor);

    var originalUpdateInspector = typeof editor.updateInspector === 'function' ? editor.updateInspector.bind(editor) : null;
    editor.updateInspector = function(){
      if (originalUpdateInspector) originalUpdateInspector();
      ensureInspectorClose(this);
      if (this.__statkissInspectorManuallyClosed && !this.state?.inspectorPinned) {
        var hasSelected = !!(this.getSelectedImageNode && this.getSelectedImageNode() || this.getSelectedTable && this.getSelectedTable() || this.getSelectedMathNode && this.getSelectedMathNode() || (window.STATKISS_ENABLE_CODEBLOCK && this.getSelectedCodeNode && this.getSelectedCodeNode()));
        if (!hasSelected) closeInspector(this);
      }
      if (!window.STATKISS_ENABLE_CODEBLOCK && this.codeInspector) this.codeInspector.hidden = true;
    };

    var originalSelectNode = typeof editor.selectNode === 'function' ? editor.selectNode.bind(editor) : null;
    if (originalSelectNode) {
      editor.selectNode = function(node){
        var result = originalSelectNode(node);
        reopenInspectorIfNeeded(this);
        if (typeof this.updateInspector === 'function') this.updateInspector();
        return result;
      };
    }

    var originalHandleAction = typeof editor.handleAction === 'function' ? editor.handleAction.bind(editor) : null;
    if (originalHandleAction) {
      editor.__statkissOriginalHandleAction = originalHandleAction;
      editor.handleAction = function(action, button){
        if (action === 'toggle-source' || action === 'toggle-split') return this.setAuthorMode('rich');
        if (action === 'toggle-inspector' && (this.inspectorPanel && !this.inspectorPanel.hidden)) {
          closeInspector(this);
          return;
        }
        if (!window.STATKISS_ENABLE_CODEBLOCK && (action === 'code-block' || action === 'edit-code' || action === 'refresh-code' || action === 'refresh-code-highlight' || action === 'save-code-dialog')) return;
        return originalHandleAction(action, button);
      };
    }

    var originalOpenMathDialog = typeof editor.openMathDialog === 'function' ? editor.openMathDialog.bind(editor) : null;
    if (originalOpenMathDialog) {
      editor.openMathDialog = function(mode, tex){
        var r = originalOpenMathDialog(mode, tex);
        ensureDialogBindings(this);
        return r;
      };
    }
    var originalOpenMathDialogForSelected = typeof editor.openMathDialogForSelected === 'function' ? editor.openMathDialogForSelected.bind(editor) : null;
    if (originalOpenMathDialogForSelected) {
      editor.openMathDialogForSelected = function(){
        var r = originalOpenMathDialogForSelected();
        ensureDialogBindings(this);
        return r;
      };
    }
    var originalOpenCodeDialog = typeof editor.openCodeDialog === 'function' ? editor.openCodeDialog.bind(editor) : null;
    if (originalOpenCodeDialog) {
      editor.openCodeDialog = function(language, code){
        if (!window.STATKISS_ENABLE_CODEBLOCK) return;
        var r = originalOpenCodeDialog(language, code);
        ensureDialogBindings(this);
        return r;
      };
    }
    var originalOpenCodeDialogForSelected = typeof editor.openCodeDialogForSelected === 'function' ? editor.openCodeDialogForSelected.bind(editor) : null;
    if (originalOpenCodeDialogForSelected) {
      editor.openCodeDialogForSelected = function(){
        if (!window.STATKISS_ENABLE_CODEBLOCK) return;
        var r = originalOpenCodeDialogForSelected();
        ensureDialogBindings(this);
        return r;
      };
    }

    reopenInspectorIfNeeded(editor);
    if (typeof editor.updateLayout === 'function') editor.updateLayout();
    if (typeof editor.updateToolbarActiveState === 'function') editor.updateToolbarActiveState();
    return editor;
  }

  function wrapMount(name){
    var fn = window[name];
    if (typeof fn !== 'function' || fn.__statkissOptionWrap) return;
    var wrapped = function(){
      var result = fn.apply(this, arguments);
      if (result && typeof result.then === 'function') return result.then(function(editor){ return patchEditor(editor); });
      return patchEditor(result);
    };
    wrapped.__statkissOptionWrap = true;
    window[name] = wrapped;
  }

  window.__statkissApplyCodeblockOption = function(editor){
    ensureExtraStyles();
    if (editor) {
      applyCodeOption(editor);
      if (typeof editor.updateInspector === 'function') editor.updateInspector();
      if (typeof editor.updateLayout === 'function') editor.updateLayout();
    }
  };

  wrapMount('mountStatkissContentEditor');
  wrapMount('mountEmbeddedContentEditor');
  wrapMount('initStatkissContentEditor');
  wrapMount('initEmbeddedContentEditor');
  wrapMount('autoMountStatkissContentEditor');
  if (window.localRichEditor) patchEditor(window.localRichEditor);
  log(PATCH_ID + ' applied');
})();


/* StatKISS 20260403 GitHub CDN + UI final patch */
(function(){
  if (window.__STATKISS_GITHUB_CDN_UI_PATCH__) return;
  window.__STATKISS_GITHUB_CDN_UI_PATCH__ = true;

  var PATCH_ID = 'statkiss-github-cdn-ui-final-20260403-01';
  var MATHJAX_CDN = window.STATKISS_MATHJAX_CDN_URL || window.STATKISS_MATHJAX_BUNDLE_URL || 'https://cdn.jsdelivr.net/gh/mathjax/MathJax@3.2.2/es5/tex-chtml.js';
  window.STATKISS_MATHJAX_CDN_URL = MATHJAX_CDN;
  window.STATKISS_MATHJAX_BUNDLE_URL = MATHJAX_CDN;

  function log(msg){ try { console.log('[LocalRichEditor] ' + msg); } catch (e) {} }
  function q(root, sel){ try { return root ? root.querySelector(sel) : null; } catch (e) { return null; } }
  function qa(root, sel){ try { return Array.from(root ? root.querySelectorAll(sel) : []); } catch (e) { return []; } }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(ch){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]; }); }
  function remove(node){ if (node && node.parentNode) node.parentNode.removeChild(node); }
  function hide(node){ if (!node) return; node.hidden = true; node.style.display = 'none'; }
  function show(node, display){ if (!node) return; node.hidden = false; node.style.display = display || ''; }
  function isFn(fn){ return typeof fn === 'function'; }
  function xIcon(){ return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6L18 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'; }
  function icon(paths){ return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' + paths + '</svg>'; }
  function ensureStyle(){
    if (document.getElementById('statkiss-github-cdn-ui-style')) return;
    var style = document.createElement('style');
    style.id = 'statkiss-github-cdn-ui-style';
    style.textContent = [
      '.statkiss-inspector-close{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border:1px solid var(--lre-border,#dbe4f0);border-radius:12px;background:transparent;color:var(--lre-text,#0f172a);cursor:pointer;}',
      '.statkiss-inspector-close svg{width:18px;height:18px;display:block;}',
      '.statkiss-text-align-group .lre-btn[disabled]{opacity:.45;cursor:not-allowed;pointer-events:none;}',
      '.statkiss-text-align-group .lre-btn.is-active{border-color:var(--lre-primary,#2563eb);background:color-mix(in srgb, var(--lre-primary-soft,#dbeafe) 72%, transparent);color:var(--lre-primary,#2563eb);}',
      '.statkiss-math-render{display:flex;justify-content:center;align-items:center;min-height:1.5em;}',
      '.statkiss-math-render mjx-container{margin:0 !important;}',
      '.statkiss-math-placeholder{font-size:14px;color:var(--lre-muted,#64748b);}',
      '.statkiss-inline-hidden{display:none !important;}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureMathJaxConfig(){
    var existing = window.MathJax || {};
    var options = Object.assign({}, existing.options || {});
    options.enableMenu = false;
    options.renderActions = Object.assign({}, options.renderActions || {}, { addMenu: [] });
    options.menuOptions = Object.assign({}, options.menuOptions || {}, { settings: Object.assign({}, (options.menuOptions && options.menuOptions.settings) || {}, { assistiveMml: false, explorer: false }) });
    window.MathJax = Object.assign({}, existing, {
      startup: Object.assign({}, existing.startup || {}, { typeset: false }),
      tex: Object.assign({ inlineMath: [['$', '$'], ['\\(', '\\)']], displayMath: [['$$', '$$'], ['\\[', '\\]']], processEscapes: true }, existing.tex || {}),
      chtml: Object.assign({ matchFontHeight: false }, existing.chtml || {}),
      svg: Object.assign({ fontCache: 'none' }, existing.svg || {}),
      options: options
    });
  }

  function loadScriptOnce(url, testFn){
    return new Promise(function(resolve, reject){
      if (isFn(testFn) && testFn()) { resolve(window.MathJax || window.hljs || true); return; }
      var existing = document.querySelector('script[data-statkiss-src="' + url.replace(/"/g,'&quot;') + '"]');
      if (existing) {
        existing.addEventListener('load', function(){ resolve(window.MathJax || window.hljs || true); }, { once:true });
        existing.addEventListener('error', function(){ reject(new Error('Failed to load ' + url)); }, { once:true });
        return;
      }
      var s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.defer = true;
      s.dataset.statkissSrc = url;
      s.onload = function(){ resolve(window.MathJax || window.hljs || true); };
      s.onerror = function(){ reject(new Error('Failed to load ' + url)); };
      document.head.appendChild(s);
    });
  }

  var mathjaxPromise = null;
  function ensureMathJaxExternal(){
    if (window.MathJax && (isFn(window.MathJax.tex2chtmlPromise) || isFn(window.MathJax.tex2svgPromise) || isFn(window.MathJax.tex2chtml) || isFn(window.MathJax.tex2svg))) {
      var ready = window.MathJax.startup && window.MathJax.startup.promise;
      return ready && isFn(ready.then) ? ready.then(function(){ return window.MathJax; }).catch(function(){ return window.MathJax; }) : Promise.resolve(window.MathJax);
    }
    if (mathjaxPromise) return mathjaxPromise;
    ensureMathJaxConfig();
    mathjaxPromise = loadScriptOnce(MATHJAX_CDN, function(){
      return !!(window.MathJax && (isFn(window.MathJax.tex2chtmlPromise) || isFn(window.MathJax.tex2svgPromise) || isFn(window.MathJax.tex2chtml) || isFn(window.MathJax.tex2svg)));
    }).then(function(){
      var mj = window.MathJax;
      var ready = mj && mj.startup && mj.startup.promise;
      return ready && isFn(ready.then) ? ready.then(function(){ return mj; }).catch(function(){ return mj; }) : mj;
    });
    return mathjaxPromise;
  }

  function mathMarkupFromResult(result){
    if (!result) return '';
    if (typeof result === 'string') return result;
    if (result.querySelector) {
      var node = result.querySelector('mjx-container') || result.querySelector('svg') || result;
      if (node && node.outerHTML) return node.outerHTML;
    }
    return result.outerHTML || '';
  }

  function getMathNode(node){
    if (!node) return null;
    if (node.classList && (node.classList.contains('lre-math-node') || node.classList.contains('latex-node'))) return node;
    return node.closest ? node.closest('.lre-math-node, .latex-node') : null;
  }

  function ensureMathWrap(node){
    if (!node) return null;
    var wrap = q(node, '.statkiss-math-render');
    if (!wrap) {
      node.innerHTML = '';
      wrap = document.createElement('div');
      wrap.className = 'statkiss-math-render';
      node.appendChild(wrap);
    }
    return wrap;
  }

  async function renderMathNode(editor, node){
    node = getMathNode(node);
    if (!node) return;
    node.classList.add('lre-math-node', 'block');
    node.classList.remove('inline');
    node.dataset.type = 'math';
    node.dataset.display = 'true';
    if (node.classList.contains('latex-node')) node.classList.remove('latex-node');
    var tex = String(node.dataset.tex || node.dataset.latex || '').trim();
    var wrap = ensureMathWrap(node);
    if (!tex) {
      node.classList.remove('is-error');
      node.removeAttribute('data-math-error');
      if (wrap) wrap.innerHTML = '';
      return;
    }
    if (wrap) wrap.innerHTML = '<span class="statkiss-math-placeholder">Rendering…</span>';
    try {
      var mj = await ensureMathJaxExternal();
      if (!mj) throw new Error('MathJax unavailable');
      var result = null;
      if (isFn(mj.tex2chtmlPromise)) result = await mj.tex2chtmlPromise(tex, { display: true });
      else if (isFn(mj.tex2chtml)) result = mj.tex2chtml(tex, { display: true });
      else if (isFn(mj.tex2svgPromise)) result = await mj.tex2svgPromise(tex, { display: true });
      else if (isFn(mj.tex2svg)) result = mj.tex2svg(tex, { display: true });
      var markup = mathMarkupFromResult(result);
      if (!markup) throw new Error('MathJax output missing');
      wrap.innerHTML = markup;
      node.classList.remove('is-error');
      node.removeAttribute('data-math-error');
    } catch (error) {
      node.classList.add('is-error');
      node.setAttribute('data-math-error', error && error.message || 'Math render failed');
      wrap.innerHTML = '<pre>' + esc(tex) + '</pre>';
    }
  }

  function renderAllMath(editor){
    if (!editor || !editor.root) return;
    qa(editor.editor || editor.root, '.lre-math-node, .latex-node').forEach(function(node){ renderMathNode(editor, node); });
    qa(editor.sourcePreview || null, '.lre-math-node, .latex-node').forEach(function(node){ renderMathNode(editor, node); });
  }

  function closeInspector(editor){
    if (!editor || !editor.root) return;
    var panel = editor.inspectorPanel || q(editor.root, '#lreInspectorPanel') || q(editor.root, '.panel.right');
    if (!panel) return;
    panel.hidden = true;
    panel.classList.remove('is-open');
    editor.__statkissInspectorManuallyClosed = true;
    if (editor.mainWrap) editor.mainWrap.classList.remove('has-inspector');
    editor.root.classList.remove('show-inspector');
  }

  function reopenInspector(editor){
    if (!editor || !editor.root) return;
    var panel = editor.inspectorPanel || q(editor.root, '#lreInspectorPanel') || q(editor.root, '.panel.right');
    if (!panel) return;
    panel.hidden = false;
    editor.__statkissInspectorManuallyClosed = false;
    if (editor.mainWrap) editor.mainWrap.classList.add('has-inspector');
    editor.root.classList.add('show-inspector');
  }

  function ensureInspectorHeader(editor){
    if (!editor || !editor.root) return;
    var panel = editor.inspectorPanel || q(editor.root, '#lreInspectorPanel') || q(editor.root, '.panel.right');
    if (!panel) return;
    var btn = q(panel, '.statkiss-inspector-close');
    if (!btn) {
      var title = q(panel, 'h2') || q(panel, '.panel-header h2');
      if (title) {
        var head = title.parentNode;
        if (!head || !head.classList || !head.classList.contains('statkiss-inspector-head')) {
          var wrap = document.createElement('div');
          wrap.className = 'statkiss-inspector-head';
          title.parentNode.insertBefore(wrap, title);
          wrap.appendChild(title);
          head = wrap;
        }
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'statkiss-inspector-close';
        btn.title = 'Close inspector';
        btn.setAttribute('aria-label', 'Close inspector');
        head.appendChild(btn);
      }
    }
    if (btn) {
      btn.innerHTML = xIcon();
      if (!btn.__statkissCloseBound) {
        btn.__statkissCloseBound = true;
        btn.addEventListener('mousedown', function(ev){ ev.preventDefault(); });
        btn.addEventListener('click', function(ev){ ev.preventDefault(); closeInspector(editor); });
      }
    }
  }

  function bindImageInspector(editor){
    if (!editor || !editor.root) return;
    var section = q(editor.root, '#imageInspector');
    if (!section || section.__statkissImageFixed) return;
    section.innerHTML = [
      '<h3>Image</h3>',
      '<div class="inspector-grid">',
      '<label>Caption <input id="imageCaptionInput" type="text" placeholder="Caption"></label>',
      '<label>Alt text <input id="imageAltInput" type="text" placeholder="Alt text"></label>',
      '<label>Width</label>',
      '<div class="range-row"><input id="imageWidthRange" type="range" min="20" max="100" step="1" value="84"><strong id="imageWidthLabel">84%</strong></div>',
      '<label>Align</label>',
      '<div class="align-button-row">',
      '<button type="button" class="tool-btn" data-image-align="left" aria-label="Align left" title="Align left">'+icon('<path d="M4 6h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 12h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 18h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>')+'<span class="sr-only">Align left</span></button>',
      '<button type="button" class="tool-btn" data-image-align="center" aria-label="Align center" title="Align center">'+icon('<path d="M4 6h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M7 12h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M5 18h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>')+'<span class="sr-only">Align center</span></button>',
      '<button type="button" class="tool-btn" data-image-align="right" aria-label="Align right" title="Align right">'+icon('<path d="M4 6h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10 12h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M6 18h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>')+'<span class="sr-only">Align right</span></button>',
      '</div>',
      '<select id="imageAlignSelect" hidden><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select>',
      '</div>'
    ].join('');
    section.__statkissImageFixed = true;
    editor.imageInspector = section;
    editor.imageWidthRange = q(section, '#imageWidthRange');
    editor.imageWidthLabel = q(section, '#imageWidthLabel');
    editor.imageCaptionInput = q(section, '#imageCaptionInput');
    editor.imageAltInput = q(section, '#imageAltInput');
    editor.imageAlignSelect = q(section, '#imageAlignSelect');
    if (editor.imageWidthRange && !editor.imageWidthRange.__statkissBound) {
      editor.imageWidthRange.__statkissBound = true;
      editor.imageWidthRange.addEventListener('input', function(){ isFn(editor.updateSelectedImageWidth) && editor.updateSelectedImageWidth(); });
    }
    if (editor.imageCaptionInput && !editor.imageCaptionInput.__statkissBound) {
      editor.imageCaptionInput.__statkissBound = true;
      editor.imageCaptionInput.addEventListener('input', function(){ isFn(editor.updateSelectedImageCaption) && editor.updateSelectedImageCaption(); });
    }
    if (editor.imageAltInput && !editor.imageAltInput.__statkissBound) {
      editor.imageAltInput.__statkissBound = true;
      editor.imageAltInput.addEventListener('input', function(){ isFn(editor.updateSelectedImageAlt) && editor.updateSelectedImageAlt(); });
    }
    qa(section, '[data-image-align]').forEach(function(button){
      button.addEventListener('mousedown', function(ev){ ev.preventDefault(); });
      button.addEventListener('click', function(){
        if (editor.imageAlignSelect) editor.imageAlignSelect.value = button.dataset.imageAlign || 'center';
        isFn(editor.updateSelectedImageAlign) && editor.updateSelectedImageAlign();
        qa(section, '[data-image-align]').forEach(function(btn){ btn.classList.toggle('is-active', btn === button); });
      });
    });
  }

  function removeMarkdownMode(editor){
    if (!editor || !editor.root) return;
    qa(editor.root, '.statkiss-mode-switcher, [data-action="toggle-source"], [data-action="toggle-split"], [data-action="export-md"]').forEach(remove);
    hide(editor.sourcePanel || q(editor.root, '#lreSourcePanel'));
    editor.__authorMode = 'rich';
    if (editor.state) { editor.state.sourceOpen = false; editor.state.split = false; }
    editor.setAuthorMode = function(){ this.__authorMode = 'rich'; if (this.state) { this.state.sourceOpen = false; this.state.split = false; } hide(this.sourcePanel || q(this.root, '#lreSourcePanel')); if (isFn(this.updateLayout)) this.updateLayout(); };
    editor.toggleSourcePanel = function(){ return false; };
    editor.toggleSplitView = function(){ return false; };
  }

  function getSelectionAnchor(editor){
    var sel = document.getSelection ? document.getSelection() : null;
    if (!sel || !sel.anchorNode) return null;
    var node = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
    if (!node || !editor || !editor.editor || !editor.editor.contains(node)) return null;
    return node;
  }

  function getTextAlignContext(editor){
    if (!editor || !editor.editor) return { special: true, block: null };
    var special = (isFn(editor.getSelectedImageNode) && editor.getSelectedImageNode()) || (isFn(editor.getSelectedTable) && editor.getSelectedTable()) || (isFn(editor.getSelectedMathNode) && editor.getSelectedMathNode()) || (window.STATKISS_ENABLE_CODEBLOCK && isFn(editor.getSelectedCodeNode) && editor.getSelectedCodeNode());
    if (special) return { special: true, block: null };
    var node = getSelectionAnchor(editor);
    if (!node) return { special: false, block: null };
    if (node.closest && node.closest('.lre-image-node, .lre-code-node, .lre-math-node, .latex-node, table')) return { special: true, block: null };
    var block = node.closest ? node.closest('p,h1,h2,h3,blockquote,li,div') : null;
    if (!block || !editor.editor.contains(block)) return { special: false, block: null };
    return { special: false, block: block };
  }

  function currentAlign(block){
    if (!block) return 'left';
    var value = (block.style && block.style.textAlign) || (window.getComputedStyle ? window.getComputedStyle(block).textAlign : '') || 'left';
    value = String(value || 'left').toLowerCase();
    if (value.indexOf('center') >= 0) return 'center';
    if (value.indexOf('right') >= 0 || value.indexOf('end') >= 0) return 'right';
    return 'left';
  }

  function applyTextAlign(editor, value){
    var ctx = getTextAlignContext(editor);
    if (ctx.special || !ctx.block) return;
    ctx.block.style.textAlign = value;
    isFn(editor.markDirty) && editor.markDirty();
    isFn(editor.updateSourceView) && editor.updateSourceView();
    isFn(editor.updateStatus) && editor.updateStatus();
    isFn(editor.updateToolbarActiveState) && editor.updateToolbarActiveState();
  }

  function refreshTextAlignButtons(editor){
    var group = q(editor && editor.root, '.statkiss-text-align-group');
    if (!group) return;
    var ctx = getTextAlignContext(editor);
    var align = currentAlign(ctx.block);
    qa(group, 'button').forEach(function(btn){
      var active = btn.dataset.align === align && !ctx.special && !!ctx.block;
      btn.classList.toggle('is-active', active);
      btn.disabled = !!ctx.special || !ctx.block;
      btn.setAttribute('aria-disabled', btn.disabled ? 'true' : 'false');
    });
  }

  function ensureTextAlignButtons(editor){
    if (!editor || !editor.toolbar) return;
    var toolbar = editor.toolbar;
    var group = q(toolbar, '.statkiss-text-align-group');
    if (!group) {
      group = document.createElement('div');
      group.className = 'lre-group statkiss-text-align-group';
      var buttons = [
        { align:'left', label:'Align text left', svg: icon('<path d="M4 6h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 12h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 18h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>') },
        { align:'center', label:'Align text center', svg: icon('<path d="M4 6h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M7 12h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M5 18h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>') },
        { align:'right', label:'Align text right', svg: icon('<path d="M4 6h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10 12h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M6 18h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>') }
      ];
      buttons.forEach(function(item){
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lre-btn';
        btn.dataset.align = item.align;
        btn.innerHTML = item.svg + '<span class="lre-sr">' + esc(item.label) + '</span>';
        btn.title = item.label;
        btn.setAttribute('aria-label', item.label);
        btn.addEventListener('mousedown', function(ev){ ev.preventDefault(); });
        btn.addEventListener('click', function(ev){ ev.preventDefault(); applyTextAlign(editor, item.align); });
        group.appendChild(btn);
      });
      toolbar.appendChild(group);
    }
    refreshTextAlignButtons(editor);
  }

  function patchEditor(editor){
    if (!editor || editor.__statkissGithubCdnUiPatched) return editor;
    editor.__statkissGithubCdnUiPatched = true;
    ensureStyle();
    removeMarkdownMode(editor);
    ensureInspectorHeader(editor);
    bindImageInspector(editor);
    ensureTextAlignButtons(editor);

    var note = q(editor.mathDialog || editor.root, '.lre-note');
    if (note) note.textContent = 'MathJax runs from the GitHub CDN build.';

    var originalUpdateInspector = isFn(editor.updateInspector) ? editor.updateInspector.bind(editor) : null;
    editor.updateInspector = function(){
      if (originalUpdateInspector) originalUpdateInspector();
      ensureInspectorHeader(this);
      bindImageInspector(this);
      refreshTextAlignButtons(this);
    };

    var originalSelectNode = isFn(editor.selectNode) ? editor.selectNode.bind(editor) : null;
    if (originalSelectNode) editor.selectNode = function(node){ var r = originalSelectNode(node); reopenInspector(this); refreshTextAlignButtons(this); return r; };
    var originalClearNodeSelection = isFn(editor.clearNodeSelection) ? editor.clearNodeSelection.bind(editor) : null;
    if (originalClearNodeSelection) editor.clearNodeSelection = function(){ var r = originalClearNodeSelection(); refreshTextAlignButtons(this); return r; };

    editor.renderMathNode = function(node){ return renderMathNode(this, node); };
    editor.renderAllMath = function(){ return renderAllMath(this); };
    editor.saveMathDialog = function(){
      var tex = String(this.mathDialogText && this.mathDialogText.value || '').trim();
      if (!tex) { try { this.mathDialog && this.mathDialog.close(); } catch (e) {} return; }
      var node = getMathNode(this.editingMathNode || (isFn(this.getSelectedMathNode) && this.getSelectedMathNode()));
      if (!node) {
        node = document.createElement('div');
        node.className = 'lre-math-node block';
        node.setAttribute('contenteditable', 'false');
        node.dataset.type = 'math';
        if (isFn(this.insertNode)) this.insertNode(node); else if (this.editor) this.editor.appendChild(node);
      }
      node.dataset.tex = tex;
      node.dataset.display = 'true';
      node.classList.add('block');
      node.classList.remove('inline', 'latex-node');
      ensureMathWrap(node);
      renderMathNode(this, node);
      isFn(this.selectNode) && this.selectNode(node);
      try { this.mathDialog && this.mathDialog.close(); } catch (e) {}
      this.editingMathNode = null;
      isFn(this.markDirty) && this.markDirty();
      isFn(this.updateSourceView) && this.updateSourceView();
      isFn(this.updateStatus) && this.updateStatus();
    };
    editor.openMathDialogForSelected = function(){
      var node = getMathNode(isFn(this.getSelectedMathNode) && this.getSelectedMathNode());
      if (!node) return;
      this.editingMathNode = node;
      if (this.mathDialogText) this.mathDialogText.value = String(node.dataset.tex || '');
      if (this.mathDialogDisplay) this.mathDialogDisplay.value = 'block';
      try { this.mathDialog && this.mathDialog.showModal(); } catch (e) { this.mathDialog && this.mathDialog.show && this.mathDialog.show(); }
    };

    var originalHandleAction = isFn(editor.handleAction) ? editor.handleAction.bind(editor) : null;
    if (originalHandleAction) {
      editor.handleAction = function(action, button){
        if (action === 'toggle-source' || action === 'toggle-split' || action === 'export-md') return false;
        return originalHandleAction(action, button);
      };
    }

    if (!editor.__statkissTextAlignMonitorBound) {
      editor.__statkissTextAlignMonitorBound = true;
      document.addEventListener('selectionchange', function(){ if (editor.root && editor.root.isConnected) refreshTextAlignButtons(editor); });
      editor.editor && editor.editor.addEventListener('click', function(){ refreshTextAlignButtons(editor); });
      editor.editor && editor.editor.addEventListener('keyup', function(){ refreshTextAlignButtons(editor); });
    }

    ensureMathJaxExternal().then(function(){ renderAllMath(editor); }).catch(function(){ renderAllMath(editor); });
    renderAllMath(editor);
    refreshTextAlignButtons(editor);
    return editor;
  }

  function wrapMount(name){
    var fn = window[name];
    if (!isFn(fn) || fn.__statkissGithubCdnWrap) return;
    var wrapped = function(){
      var result = fn.apply(this, arguments);
      if (result && isFn(result.then)) return result.then(function(editor){ return patchEditor(editor); });
      return patchEditor(result);
    };
    wrapped.__statkissGithubCdnWrap = true;
    window[name] = wrapped;
  }

  ['mountStatkissContentEditor','mountEmbeddedContentEditor','initStatkissContentEditor','initEmbeddedContentEditor','autoMountStatkissContentEditor'].forEach(wrapMount);
  if (window.localRichEditor) patchEditor(window.localRichEditor);
  log(PATCH_ID + ' applied');
})();


/* ---- merged codeblock option start ---- */

(function(){
  if (window.__STATKISS_CODEBLOCK_OPTION__) return;
  window.__STATKISS_CODEBLOCK_OPTION__ = true;
  window.STATKISS_ENABLE_CODEBLOCK = true;
  function apply(){
    try {
      if (typeof window.__statkissApplyCodeblockOption === 'function') {
        window.__statkissApplyCodeblockOption(window.localRichEditor || null);
      }
    } catch (e) { try { console.warn('[LocalRichEditor] codeblock option apply failed', e); } catch (_) {} }
  }
  apply();
  ['mountStatkissContentEditor','mountEmbeddedContentEditor','initStatkissContentEditor','initEmbeddedContentEditor','autoMountStatkissContentEditor'].forEach(function(name){
    var fn = window[name];
    if (typeof fn !== 'function' || fn.__statkissCodeOptionWrap) return;
    var wrapped = function(){
      var result = fn.apply(this, arguments);
      if (result && typeof result.then === 'function') return result.then(function(editor){ apply(); return editor; });
      apply();
      return result;
    };
    wrapped.__statkissCodeOptionWrap = true;
    window[name] = wrapped;
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
})();


/* StatKISS 20260403 highlight.js CDN option patch */
(function(){
  if (window.__STATKISS_HLJS_CDN_OPTION_PATCH__) return;
  window.__STATKISS_HLJS_CDN_OPTION_PATCH__ = true;

  var SCRIPT_URL = window.STATKISS_HLJS_SCRIPT_SRC || 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/highlight.min.js';
  var STYLE_URL = window.STATKISS_HLJS_STYLE_HREF || 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/styles/github.min.css';
  function log(msg){ try { console.log('[LocalRichEditor] ' + msg); } catch (e) {} }
  function q(root, sel){ try { return root ? root.querySelector(sel) : null; } catch (e) { return null; } }
  function qa(root, sel){ try { return Array.from(root ? root.querySelectorAll(sel) : []); } catch (e) { return []; } }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(ch){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]; }); }
  function isFn(fn){ return typeof fn === 'function'; }

  function ensureCss(){
    if (document.querySelector('link[data-statkiss-hljs-style]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = STYLE_URL;
    link.dataset.statkissHljsStyle = '1';
    document.head.appendChild(link);
  }
  var hljsPromise = null;
  function loadScriptOnce(url){
    return new Promise(function(resolve, reject){
      if (window.hljs && isFn(window.hljs.highlight)) { resolve(window.hljs); return; }
      var existing = document.querySelector('script[data-statkiss-hljs-src="' + url.replace(/"/g,'&quot;') + '"]');
      if (existing) {
        existing.addEventListener('load', function(){ resolve(window.hljs); }, { once:true });
        existing.addEventListener('error', function(){ reject(new Error('Failed to load ' + url)); }, { once:true });
        return;
      }
      var s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.defer = true;
      s.dataset.statkissHljsSrc = url;
      s.onload = function(){ resolve(window.hljs); };
      s.onerror = function(){ reject(new Error('Failed to load ' + url)); };
      document.head.appendChild(s);
    });
  }
  function ensureHljs(){
    ensureCss();
    if (window.hljs && isFn(window.hljs.highlight)) return Promise.resolve(window.hljs);
    if (hljsPromise) return hljsPromise;
    hljsPromise = loadScriptOnce(SCRIPT_URL).then(function(){ return window.hljs; });
    return hljsPromise;
  }
  function mapLang(lang){
    lang = String(lang || 'plaintext').toLowerCase();
    return ({ html:'xml', shell:'bash', sh:'bash', js:'javascript', ts:'typescript', md:'markdown', text:'plaintext', plain:'plaintext', txt:'plaintext' })[lang] || lang;
  }
  function applyExternalHighlight(editor, node){
    if (!node || !node.classList || !node.classList.contains('lre-code-node')) return;
    var codeEl = q(node, 'pre code');
    if (!codeEl) return;
    var text = String(node.dataset.code || codeEl.dataset.rawCode || codeEl.textContent || '');
    var lang = mapLang(node.dataset.language || codeEl.dataset.language || 'plaintext');
    codeEl.dataset.rawCode = text;
    codeEl.textContent = text;
    codeEl.className = 'hljs';
    if (window.hljs && isFn(window.hljs.highlight)) {
      try {
        if (lang === 'auto') {
          var autoRes = window.hljs.highlightAuto(text);
          codeEl.innerHTML = autoRes.value;
          codeEl.className = 'hljs language-' + (autoRes.language || 'plaintext');
          node.dataset.language = autoRes.language || 'auto';
        } else if (lang === 'plaintext' || lang === 'nohighlight') {
          codeEl.textContent = text;
          codeEl.className = 'hljs language-plaintext';
        } else if (window.hljs.getLanguage && window.hljs.getLanguage(lang)) {
          var res = window.hljs.highlight(text, { language: lang, ignoreIllegals: true });
          codeEl.innerHTML = res.value;
          codeEl.className = 'hljs language-' + lang;
        } else {
          codeEl.textContent = text;
          codeEl.className = 'hljs language-plaintext';
        }
      } catch (e) {
        codeEl.textContent = text;
        codeEl.className = 'hljs language-plaintext';
      }
    }
    codeEl.setAttribute('spellcheck', 'false');
    codeEl.setAttribute('contenteditable', 'false');
    var pre = q(node, 'pre');
    if (pre) pre.dataset.language = node.dataset.language || lang;
    if (editor && isFn(editor.populateCodeInspector) && isFn(editor.getSelectedCodeNode) && editor.getSelectedCodeNode() === node) {
      editor.populateCodeInspector(node);
    }
  }
  function patchCodeOption(editor){
    if (!editor || editor.__statkissExternalHljsPatched) return editor;
    editor.__statkissExternalHljsPatched = true;
    ensureHljs().then(function(){ if (isFn(editor.highlightAllCodeBlocks)) editor.highlightAllCodeBlocks(); }).catch(function(){});

    var originalRenderCodeNode = isFn(editor.renderCodeNode) ? editor.renderCodeNode.bind(editor) : null;
    editor.renderCodeNode = function(node){
      if (originalRenderCodeNode) originalRenderCodeNode(node);
      applyExternalHighlight(this, node);
    };
    editor.highlightCodeBlocksInside = function(root){ qa(root || this.editor, '.lre-code-node').forEach(function(node){ editor.renderCodeNode(node); }); };
    editor.highlightAllCodeBlocks = function(){ this.highlightCodeBlocksInside(this.editor); if (this.sourcePreview) this.highlightCodeBlocksInside(this.sourcePreview); };
    var originalSaveCodeDialog = isFn(editor.saveCodeDialog) ? editor.saveCodeDialog.bind(editor) : null;
    editor.saveCodeDialog = function(){
      if (originalSaveCodeDialog) originalSaveCodeDialog();
      var node = isFn(this.getSelectedCodeNode) && this.getSelectedCodeNode();
      if (node) applyExternalHighlight(this, node);
    };
    var originalRefresh = isFn(editor.refreshSelectedCodeBlock) ? editor.refreshSelectedCodeBlock.bind(editor) : (isFn(editor.refreshSelectedCode) ? editor.refreshSelectedCode.bind(editor) : null);
    editor.refreshSelectedCodeBlock = function(){ if (originalRefresh) originalRefresh(); var node = isFn(this.getSelectedCodeNode) && this.getSelectedCodeNode(); if (node) applyExternalHighlight(this, node); };
    editor.refreshSelectedCode = editor.refreshSelectedCodeBlock;
    qa(editor.root || null, '[data-action="refresh-code-highlight"]').forEach(function(btn){ btn.title = 'Refresh highlighting'; btn.setAttribute('aria-label', 'Refresh highlighting'); });
    editor.highlightAllCodeBlocks();
    return editor;
  }

  function apply(){
    ensureHljs().catch(function(){});
    try {
      if (typeof window.__statkissApplyCodeblockOption === 'function') {
        window.__statkissApplyCodeblockOption(window.localRichEditor || null);
      }
      if (window.localRichEditor) patchCodeOption(window.localRichEditor);
    } catch (e) { try { console.warn('[LocalRichEditor] external highlight option apply failed', e); } catch (_) {} }
  }

  ['mountStatkissContentEditor','mountEmbeddedContentEditor','initStatkissContentEditor','initEmbeddedContentEditor','autoMountStatkissContentEditor'].forEach(function(name){
    var fn = window[name];
    if (typeof fn !== 'function' || fn.__statkissExternalHljsWrap) return;
    var wrapped = function(){
      var result = fn.apply(this, arguments);
      if (result && typeof result.then === 'function') return result.then(function(editor){ apply(); return patchCodeOption(editor); });
      apply();
      return patchCodeOption(result);
    };
    wrapped.__statkissExternalHljsWrap = true;
    window[name] = wrapped;
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  log('statkiss-highlightjs-cdn-option-20260403-01 applied');
})();

/* ---- merged codeblock option end ---- */


/* StatKISS 20260403 final formula-svg + toolbar-pack fix */
(function(){
  if (window.__STATKISS_FINAL_MATH_SVG_20260403_01__) return;
  window.__STATKISS_FINAL_MATH_SVG_20260403_01__ = true;

  var PATCH_ID = 'statkiss-final-math-svg-toolbar-20260403-01';
  var MATHJAX_CDN = window.STATKISS_MATHJAX_CDN_URL || 'https://cdn.jsdelivr.net/gh/mathjax/MathJax@3.2.2/es5/tex-svg.js';
  window.STATKISS_MATHJAX_CDN_URL = MATHJAX_CDN;

  function log(msg){ try { console.log('[LocalRichEditor] ' + msg); } catch (e) {} }
  function isFn(fn){ return typeof fn === 'function'; }
  function q(root, sel){ try { return root ? root.querySelector(sel) : null; } catch (e) { return null; } }
  function qa(root, sel){ try { return Array.from(root ? root.querySelectorAll(sel) : []); } catch (e) { return []; } }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(ch){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]; }); }

  function ensureStyle(){
    if (document.getElementById('statkiss-final-math-svg-toolbar-style')) return;
    var style = document.createElement('style');
    style.id = 'statkiss-final-math-svg-toolbar-style';
    style.textContent = [
      '.lre-toolbar{gap:8px 6px !important;}',
      '.lre-group.statkiss-text-align-group{order:4;}',
      '.lre-root .statkiss-math-render{display:flex;justify-content:center;align-items:center;max-width:100%;min-height:1.5em;overflow:visible;}',
      '.lre-root .statkiss-math-render mjx-container{display:inline-flex !important;justify-content:center;align-items:center;max-width:100%;margin:0 auto !important;overflow:visible !important;}',
      '.lre-root .statkiss-math-render svg{display:block;max-width:100%;height:auto;overflow:visible;}',
      '.lre-root .statkiss-math-placeholder{font-size:14px;color:var(--lre-muted,#64748b);}',
      '.lre-root .lre-math-node.block{display:block;width:100%;text-align:center;}',
      '.lre-root .lre-math-node.block > .statkiss-math-render{width:100%;}',
      '.lre-root .lre-math-node.is-error .statkiss-math-render pre{white-space:pre-wrap;word-break:break-word;font:500 14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;margin:0;}',
      '.lre-root .statkiss-text-align-group .lre-btn{margin-right:0 !important;}'
    ].join('');
    document.head.appendChild(style);
  }

  function hasRuntime(){
    var mj = window.MathJax;
    return !!(mj && (isFn(mj.tex2svgPromise) || isFn(mj.tex2svg)));
  }

  function ensureMathConfig(){
    if (hasRuntime()) return;
    var existing = window.MathJax;
    if (existing && (isFn(existing.tex2chtmlPromise) || isFn(existing.tex2chtml) || (existing.startup && existing.startup.document))) {
      return;
    }
    if (!existing || typeof existing !== 'object') existing = {};
    var menuOptions = Object.assign({}, (existing.options && existing.options.menuOptions) || {}, {
      settings: Object.assign({}, ((existing.options && existing.options.menuOptions) || {}).settings || {}, {
        assistiveMml: false,
        explorer: false
      })
    });
    var renderActions = Object.assign({}, (existing.options && existing.options.renderActions) || {}, { addMenu: [] });
    var options = Object.assign({}, existing.options || {}, { enableMenu: false, renderActions: renderActions, menuOptions: menuOptions });
    existing.startup = Object.assign({}, existing.startup || {}, { typeset: false });
    existing.options = options;
    existing.tex = Object.assign({}, existing.tex || {}, {
      inlineMath: [],
      displayMath: [['$$', '$$'], ['\\[', '\\]']],
      processEscapes: true
    });
    existing.svg = Object.assign({}, existing.svg || {}, { fontCache: 'none' });
    if (existing.chtml) delete existing.chtml;
    window.MathJax = existing;
  }

  function loadScriptOnce(url){
    return new Promise(function(resolve, reject){
      if (hasRuntime()) {
        var mj0 = window.MathJax;
        var p0 = mj0 && mj0.startup && mj0.startup.promise;
        if (p0 && isFn(p0.then)) {
          p0.then(function(){ resolve(mj0); }).catch(function(){ resolve(mj0); });
        } else {
          resolve(mj0);
        }
        return;
      }
      var selector = 'script[data-statkiss-math-svg-src="' + url.replace(/"/g, '&quot;') + '"]';
      var existing = document.querySelector(selector);
      if (existing) {
        existing.addEventListener('load', function(){ resolve(window.MathJax); }, { once:true });
        existing.addEventListener('error', function(){ reject(new Error('Failed to load ' + url)); }, { once:true });
        return;
      }
      var s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.defer = true;
      s.dataset.statkissMathSvgSrc = url;
      s.onload = function(){ resolve(window.MathJax); };
      s.onerror = function(){ reject(new Error('Failed to load ' + url)); };
      document.head.appendChild(s);
    });
  }

  var mathjaxPromise = null;
  function ensureMathJax(){
    if (hasRuntime()) {
      var mj = window.MathJax;
      var ready = mj && mj.startup && mj.startup.promise;
      return ready && isFn(ready.then) ? ready.then(function(){ return mj; }).catch(function(){ return mj; }) : Promise.resolve(mj);
    }
    if (mathjaxPromise) return mathjaxPromise;
    ensureMathConfig();
    mathjaxPromise = loadScriptOnce(MATHJAX_CDN).then(function(){
      var mj = window.MathJax;
      var ready = mj && mj.startup && mj.startup.promise;
      return ready && isFn(ready.then) ? ready.then(function(){ return mj; }).catch(function(){ return mj; }) : mj;
    });
    return mathjaxPromise;
  }

  function getMathNode(node){
    if (!node) return null;
    if (node.classList && (node.classList.contains('lre-math-node') || node.classList.contains('latex-node'))) return node;
    return node.closest ? node.closest('.lre-math-node, .latex-node') : null;
  }

  function normalizeTeX(tex){
    tex = String(tex || '');
    tex = tex.replace(/\\#(?=[A-Za-z])/g, '\\');
    tex = tex.replace(/\u00a0/g, ' ');
    return tex.trim();
  }

  function ensureMathWrap(node){
    var wrap = q(node, '.statkiss-math-render');
    if (!wrap) {
      node.innerHTML = '';
      wrap = document.createElement('div');
      wrap.className = 'statkiss-math-render';
      node.appendChild(wrap);
    }
    return wrap;
  }

  function mathMarkupFromResult(result){
    if (!result) return '';
    if (typeof result === 'string') return result;
    if (result.querySelector) {
      var container = result.querySelector('mjx-container') || result.querySelector('svg') || result;
      return container && container.outerHTML ? container.outerHTML : '';
    }
    return result.outerHTML || '';
  }

  async function renderMathNode(editor, node, force){
    node = getMathNode(node);
    if (!node) return;
    node.classList.add('lre-math-node', 'block');
    node.classList.remove('inline', 'latex-node');
    node.setAttribute('contenteditable', 'false');
    node.dataset.type = 'math';
    node.dataset.display = 'true';
    var tex = normalizeTeX(node.dataset.tex || node.dataset.latex || '');
    node.dataset.tex = tex;
    var wrap = ensureMathWrap(node);
    if (!tex) {
      wrap.innerHTML = '';
      node.classList.remove('is-error');
      node.removeAttribute('data-math-error');
      return;
    }
    if (!force && node.__statkissLastMathTex === tex && q(wrap, 'svg, mjx-container')) return;
    wrap.innerHTML = '<span class="statkiss-math-placeholder">Rendering…</span>';
    try {
      var mj = await ensureMathJax();
      if (!mj || (!isFn(mj.tex2svgPromise) && !isFn(mj.tex2svg))) throw new Error('MathJax SVG is not ready');
      var result = isFn(mj.tex2svgPromise) ? await mj.tex2svgPromise(tex, { display: true }) : mj.tex2svg(tex, { display: true });
      var markup = mathMarkupFromResult(result);
      if (!markup) throw new Error('MathJax SVG output missing');
      wrap.innerHTML = markup;
      node.__statkissLastMathTex = tex;
      node.classList.remove('is-error');
      node.removeAttribute('data-math-error');
    } catch (error) {
      node.classList.add('is-error');
      node.setAttribute('data-math-error', (error && error.message) || 'Math render failed');
      wrap.innerHTML = '<pre>' + esc(tex) + '</pre>';
    }
  }

  function renderAllMath(editor, force){
    if (!editor || !editor.root) return;
    qa(editor.editor || editor.root, '.lre-math-node, .latex-node').forEach(function(node){ renderMathNode(editor, node, force); });
    var preview = editor.sourcePreview || q(editor.root, '#lreMarkdownPreview');
    if (preview) qa(preview, '.lre-math-node, .latex-node').forEach(function(node){ renderMathNode(editor, node, force); });
  }

  function packToolbar(editor){
    var toolbar = editor && (editor.toolbar || q(editor.root, '#lreToolbar'));
    if (!toolbar) return;
    var alignGroup = q(toolbar, '.statkiss-text-align-group');
    if (!alignGroup) return;
    var target = null;
    qa(toolbar, '.lre-group').some(function(group){
      if (group === alignGroup) return false;
      if (q(group, '[data-action="link"]') || q(group, '[data-action="text-color"]') || q(group, '[data-action="bg-color"]') || q(group, '[data-action="table"]')) {
        target = group;
        return true;
      }
      return false;
    });
    if (target && alignGroup !== target.previousSibling) {
      toolbar.insertBefore(alignGroup, target);
    }
  }

  function patchEditor(editor){
    if (!editor || editor.__statkissFinalMathSvgFix) return editor;
    editor.__statkissFinalMathSvgFix = true;
    ensureStyle();
    packToolbar(editor);

    var originalPopulateMathInspector = isFn(editor.populateMathInspector) ? editor.populateMathInspector.bind(editor) : null;
    editor.populateMathInspector = function(node){
      if (originalPopulateMathInspector) originalPopulateMathInspector(node);
      if (this.mathText) this.mathText.value = normalizeTeX(node && (node.dataset.tex || node.dataset.latex || ''));
    };

    editor.renderMathNode = function(node, force){ return renderMathNode(this, node, force); };
    editor.renderAllMath = function(force){ return renderAllMath(this, force); };

    editor.saveMathDialog = function(){
      var tex = normalizeTeX(this.mathDialogText && this.mathDialogText.value || '');
      if (!tex) { try { this.mathDialog && this.mathDialog.close(); } catch (e) {} return; }
      var node = getMathNode(this.editingMathNode || (isFn(this.getSelectedMathNode) && this.getSelectedMathNode()));
      if (!node) {
        node = document.createElement('div');
        node.className = 'lre-math-node block';
        node.setAttribute('contenteditable', 'false');
        node.dataset.type = 'math';
        if (isFn(this.insertNode)) this.insertNode(node); else if (this.editor) this.editor.appendChild(node);
      }
      node.classList.add('lre-math-node', 'block');
      node.classList.remove('inline', 'latex-node');
      node.dataset.type = 'math';
      node.dataset.display = 'true';
      node.dataset.tex = tex;
      ensureMathWrap(node);
      renderMathNode(this, node, true);
      if (isFn(this.selectNode)) this.selectNode(node);
      try { this.mathDialog && this.mathDialog.close(); } catch (e) {}
      this.editingMathNode = null;
      if (isFn(this.markDirty)) this.markDirty();
      if (isFn(this.updateSourceView)) this.updateSourceView();
      if (isFn(this.updateStatus)) this.updateStatus();
      if (isFn(this.updateToolbarActiveState)) this.updateToolbarActiveState();
      if (isFn(this.populateMathInspector)) this.populateMathInspector(node);
    };

    editor.openMathDialogForSelected = function(){
      var node = getMathNode(isFn(this.getSelectedMathNode) && this.getSelectedMathNode());
      if (!node) return;
      this.editingMathNode = node;
      if (this.mathDialogText) this.mathDialogText.value = normalizeTeX(node.dataset.tex || node.dataset.latex || '');
      if (this.mathDialogDisplay) this.mathDialogDisplay.value = 'block';
      try { this.mathDialog && this.mathDialog.showModal(); } catch (e) { this.mathDialog && this.mathDialog.show && this.mathDialog.show(); }
    };

    var originalUpdateInspector = isFn(editor.updateInspector) ? editor.updateInspector.bind(editor) : null;
    editor.updateInspector = function(){
      if (originalUpdateInspector) originalUpdateInspector();
      packToolbar(this);
      if (this.selectedNode) {
        var math = getMathNode(this.selectedNode);
        if (math && isFn(this.populateMathInspector)) this.populateMathInspector(math);
      }
    };

    if (!editor.__statkissFinalMathSvgSelectionBound) {
      editor.__statkissFinalMathSvgSelectionBound = true;
      document.addEventListener('selectionchange', function(){ if (editor.root && editor.root.isConnected) packToolbar(editor); });
      if (editor.editor) {
        editor.editor.addEventListener('click', function(){ packToolbar(editor); });
        editor.editor.addEventListener('keyup', function(){ packToolbar(editor); });
      }
    }

    ensureMathJax().then(function(){ renderAllMath(editor, true); }).catch(function(){ renderAllMath(editor, true); });
    renderAllMath(editor, true);
    packToolbar(editor);
    return editor;
  }

  function wrapMount(name){
    var fn = window[name];
    if (!isFn(fn) || fn.__statkissFinalMathSvgWrapped) return;
    var wrapped = function(){
      var result = fn.apply(this, arguments);
      if (result && isFn(result.then)) return result.then(function(editor){ return patchEditor(editor); });
      return patchEditor(result);
    };
    wrapped.__statkissFinalMathSvgWrapped = true;
    window[name] = wrapped;
  }

  ['mountStatkissContentEditor','mountEmbeddedContentEditor','initStatkissContentEditor','initEmbeddedContentEditor','autoMountStatkissContentEditor'].forEach(wrapMount);
  if (window.localRichEditor) patchEditor(window.localRichEditor);
  log(PATCH_ID + ' applied');
})();

/* StatKISS 20260403 late stability + responsive + math single-load patch */
(function(){
  if (window.__STATKISS_LATE_STABILITY_20260403_02__) return;
  window.__STATKISS_LATE_STABILITY_20260403_02__ = true;

  var PATCH_ID = 'statkiss-late-stability-20260403-02';
  var MATHJAX_URL = window.STATKISS_MATHJAX_CDN_URL || 'https://cdn.jsdelivr.net/gh/mathjax/MathJax@3.2.2/es5/tex-svg.js';
  var HLJS_JS = window.STATKISS_HLJS_SCRIPT_SRC || 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/highlight.min.js';
  var HLJS_CSS = window.STATKISS_HLJS_STYLE_HREF || 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/styles/github.min.css';
  var TOOLBAR_SIZE_KEY = 'statkiss-toolbar-size-v1';

  function log(msg){ try { console.log('[LocalRichEditor] ' + msg); } catch (e) {} }
  function isFn(fn){ return typeof fn === 'function'; }
  function q(root, sel){ try { return root ? root.querySelector(sel) : null; } catch (e) { return null; } }
  function qa(root, sel){ try { return Array.prototype.slice.call(root ? root.querySelectorAll(sel) : []); } catch (e) { return []; } }
  function remove(node){ if (node && node.parentNode) node.parentNode.removeChild(node); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(ch){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]; }); }
  function hasClass(node, cls){ return !!(node && node.classList && node.classList.contains(cls)); }
  function icon(paths){ return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' + paths + '</svg>'; }
  function closeSvg(){ return icon('<path d="M6 6 18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'); }
  function trashAltSvg(){ return icon('<path d="M9 4h6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M5 7h14" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M9.5 11.5v5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M14.5 11.5v5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M7.5 7.5 8.4 18a1 1 0 0 0 1 .9h5.2a1 1 0 0 0 1-.9l.9-10.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'); }
  function sizeSvg(){ return icon('<path d="M7 7h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M5 12h14" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/><path d="M8 17h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'); }
  function currentToolbarSize(root){ return (root && root.dataset && root.dataset.toolbarSize) || 'compact'; }
  function saveToolbarSize(size){ try { localStorage.setItem(TOOLBAR_SIZE_KEY, size); } catch (e) {} }
  function loadToolbarSize(){ try { return localStorage.getItem(TOOLBAR_SIZE_KEY) || 'compact'; } catch (e) { return 'compact'; } }

  function ensureStyle(){
    if (document.getElementById('statkiss-late-stability-style')) return;
    var style = document.createElement('style');
    style.id = 'statkiss-late-stability-style';
    style.textContent = [
      '.lre-root{--statkiss-toolbar-btn:38px;--statkiss-toolbar-icon:19px;--statkiss-toolbar-texticon-w:25px;--statkiss-toolbar-texticon-h:23px;}',
      '.lre-root[data-toolbar-size="compact"]{--statkiss-toolbar-btn:38px;--statkiss-toolbar-icon:19px;--statkiss-toolbar-texticon-w:25px;--statkiss-toolbar-texticon-h:23px;}',
      '.lre-root[data-toolbar-size="normal"]{--statkiss-toolbar-btn:42px;--statkiss-toolbar-icon:22px;--statkiss-toolbar-texticon-w:27px;--statkiss-toolbar-texticon-h:24px;}',
      '.lre-root[data-toolbar-size="roomy"]{--statkiss-toolbar-btn:46px;--statkiss-toolbar-icon:24px;--statkiss-toolbar-texticon-w:29px;--statkiss-toolbar-texticon-h:26px;}',
      '.lre-root .lre-btn{width:var(--statkiss-toolbar-btn)!important;height:var(--statkiss-toolbar-btn)!important;}',
      '.lre-root .lre-btn svg{width:var(--statkiss-toolbar-icon)!important;height:var(--statkiss-toolbar-icon)!important;}',
      '.lre-root .lre-icon-text{width:var(--statkiss-toolbar-texticon-w)!important;height:var(--statkiss-toolbar-texticon-h)!important;}',
      '.lre-root .lre-toolbar{gap:6px 5px !important;align-items:flex-start !important;}',
      '.lre-root .lre-group{gap:5px !important;padding:6px !important;}',
      '.lre-root .lre-topbar{padding:10px !important;}',
      '.lre-root .lre-surface{overflow:hidden;}',
      '.lre-root .lre-editor-page{overflow-wrap:anywhere;word-break:break-word;max-width:100% !important;width:min(100%,980px);}',
      '.lre-root .lre-editor-page img,.lre-root .lre-editor-page table,.lre-root .lre-editor-page svg,.lre-root .lre-editor-page mjx-container,.lre-root .lre-editor-page pre{max-width:100%;}',
      '.lre-root .lre-panel,.lre-root .lre-searchbar{background:color-mix(in srgb,var(--lre-card,#fff) 82%, #edf3ff 18%) !important;}',
      '.lre-root .lre-panel{border-color:color-mix(in srgb,var(--lre-border,#d7ddea) 86%, #c8d6ee 14%) !important;}',
      'body.lre-dark .lre-root .lre-panel,body.lre-dark .lre-root .lre-searchbar{background:color-mix(in srgb,var(--lre-card,#121b2e) 88%, #17243b 12%) !important;}',
      '.statkiss-inspector-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;}',
      '.statkiss-inspector-head h2{margin:0 !important;}',
      '.statkiss-inspector-actions{display:flex;align-items:center;gap:8px;}',
      '.statkiss-inspector-close,.statkiss-inspector-delete{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border:1px solid var(--lre-border,#d7ddea);border-radius:14px;background:transparent;color:var(--lre-text,#0f172a);cursor:pointer;transition:.18s ease;}',
      '.statkiss-inspector-close:hover,.statkiss-inspector-delete:hover{border-color:var(--lre-primary,#2563eb);background:color-mix(in srgb,var(--lre-primary-soft,#dbeafe) 70%, transparent);color:var(--lre-primary,#2563eb);}',
      '.statkiss-inspector-delete{color:#c2410c;border-color:rgba(194,65,12,.22);}',
      '.statkiss-inspector-delete:hover{border-color:#dc2626;background:rgba(220,38,38,.08);color:#dc2626;}',
      '.statkiss-inspector-close svg,.statkiss-inspector-delete svg,.statkiss-toolbar-size-toggle svg{width:18px !important;height:18px !important;display:block;}',
      '.lre-root .statkiss-text-align-group{order:3;}',
      '.lre-root .statkiss-text-align-group .lre-btn[disabled]{opacity:.42;cursor:not-allowed;pointer-events:none;}',
      '.lre-root .statkiss-text-align-group .lre-btn.is-active{border-color:var(--lre-primary,#2563eb);background:color-mix(in srgb,var(--lre-primary-soft,#dbeafe) 72%, transparent);color:var(--lre-primary,#2563eb);}',
      '.lre-root .statkiss-toolbar-size-toggle.is-compact,.lre-root .statkiss-toolbar-size-toggle.is-normal,.lre-root .statkiss-toolbar-size-toggle.is-roomy{border-color:var(--lre-primary,#2563eb);}',
      '.lre-root .statkiss-math-render{display:flex;justify-content:center;align-items:center;max-width:100%;min-height:1.5em;overflow:visible;}',
      '.lre-root .statkiss-math-render mjx-container{display:inline-flex !important;justify-content:center;align-items:center;max-width:100%;margin:0 auto !important;overflow:visible !important;}',
      '.lre-root .statkiss-math-render svg{display:block;max-width:100%;height:auto;overflow:visible;}',
      '.lre-root .statkiss-math-placeholder{font-size:14px;color:var(--lre-muted,#64748b);}',
      '.lre-root .lre-math-node.block{display:block;width:100%;text-align:center;}',
      '.lre-root .lre-math-node.block > .statkiss-math-render{width:100%;}',
      '.lre-root .lre-math-node.is-error .statkiss-math-render pre{white-space:pre-wrap;word-break:break-word;font:500 14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;margin:0;}',
      '.lre-root .statkiss-math-render .MathJax,.lre-root .statkiss-math-render mjx-container{max-width:100% !important;}',
      '.lre-root .statkiss-inline-hidden{display:none !important;}',
      '@media (max-width: 980px){.lre-root .lre-main-wrap,.lre-root .lre-main-wrap.has-outline,.lre-root .lre-main-wrap.has-inspector,.lre-root .lre-main-wrap.has-outline.has-inspector{grid-template-columns:minmax(0,1fr) !important;}.lre-root .lre-panel{order:2;}.lre-root .lre-surface{order:1;}}',
      '@media (max-width: 720px){.lre-root,.lre-app,.lre-topbar,.lre-surface,.lre-editor-shell,.lre-main-wrap,.lre-panel{min-width:0 !important;max-width:100% !important;}.lre-root{padding:8px !important;}.lre-root .lre-topbar{padding:8px !important;}.lre-root .lre-docbar{flex-wrap:wrap;}.lre-root .lre-toolbar{gap:5px 4px !important;}.lre-root .lre-group{padding:5px !important;border-radius:14px !important;}.lre-root .lre-editor-page{width:100% !important;max-width:100% !important;padding:18px 14px !important;min-height:48vh !important;}.lre-root .lre-editor-page *{max-width:100% !important;}.lre-root .lre-statusbar{gap:8px !important;}.lre-root .lre-panel{padding:12px !important;}}'
    ].join('');
    document.head.appendChild(style);
  }

  function sameUrl(a, b){
    try { return new URL(a, document.baseURI).href === new URL(b, document.baseURI).href; } catch (e) { return a === b; }
  }

  function dedupeAssetTags(){
    var seenScripts = Object.create(null);
    qa(document, 'script[src]').forEach(function(node){
      var src = node.getAttribute('src') || '';
      if (!src) return;
      if (/MathJax|highlight\.min\.js/i.test(src)) {
        var key = src;
        if (seenScripts[key]) remove(node);
        else seenScripts[key] = true;
      }
    });
    var seenLinks = Object.create(null);
    qa(document, 'link[rel="stylesheet"][href]').forEach(function(node){
      var href = node.getAttribute('href') || '';
      if (!href) return;
      if (/highlightjs|github\.min\.css/i.test(href)) {
        var key = href;
        if (seenLinks[key]) remove(node);
        else seenLinks[key] = true;
      }
    });
  }

  function hasMathRuntime(){
    var mj = window.MathJax;
    return !!(mj && (isFn(mj.tex2svgPromise) || isFn(mj.tex2svg) || isFn(mj.tex2chtmlPromise) || isFn(mj.tex2chtml)));
  }

  function prepareMathConfig(){
    if (hasMathRuntime()) return;
    var mj = window.MathJax;
    if (!mj || typeof mj !== 'object' || (mj.version && !hasMathRuntime())) {
      mj = {};
    }
    var options = Object.assign({}, mj.options || {});
    options.enableMenu = false;
    options.renderActions = Object.assign({}, options.renderActions || {}, { addMenu: [] });
    var menuOptions = Object.assign({}, options.menuOptions || {});
    menuOptions.settings = Object.assign({}, menuOptions.settings || {}, { assistiveMml: false, explorer: false });
    options.menuOptions = menuOptions;
    mj.startup = Object.assign({}, mj.startup || {}, { typeset: false });
    mj.tex = Object.assign({}, mj.tex || {}, { inlineMath: [], displayMath: [['$$', '$$'], ['\\[', '\\]']], processEscapes: true });
    mj.svg = Object.assign({}, mj.svg || {}, { fontCache: 'none' });
    delete mj.chtml;
    mj.options = options;
    window.MathJax = mj;
  }

  function waitFor(testFn, timeoutMs){
    timeoutMs = timeoutMs || 20000;
    return new Promise(function(resolve, reject){
      var start = Date.now();
      (function tick(){
        var ok = false;
        try { ok = !!testFn(); } catch (e) { ok = false; }
        if (ok) { resolve(true); return; }
        if (Date.now() - start >= timeoutMs) { reject(new Error('Timed out waiting for dependency')); return; }
        setTimeout(tick, 60);
      })();
    });
  }

  function awaitMathStartup(mj, timeoutMs){
    return new Promise(function(resolve){
      var done = false;
      function finish(){ if (!done) { done = true; resolve(mj); } }
      try {
        var p = mj && mj.startup && mj.startup.promise;
        if (p && isFn(p.then)) {
          p.then(finish).catch(finish);
          setTimeout(finish, timeoutMs || 8000);
        } else {
          finish();
        }
      } catch (e) {
        finish();
      }
    });
  }

  function loadScriptOnce(url, testFn){
    return new Promise(function(resolve, reject){
      if (isFn(testFn) && testFn()) { resolve(window.MathJax || window.hljs || true); return; }
      var existing = null;
      qa(document, 'script[src]').some(function(node){
        var src = node.getAttribute('src') || node.src || '';
        if (sameUrl(src, url)) { existing = node; return true; }
        return false;
      });
      if (existing) {
        var settled = false;
        function ok(){ if (settled) return; settled = true; resolve(window.MathJax || window.hljs || true); }
        function fail(){ if (settled) return; settled = true; reject(new Error('Failed to load ' + url)); }
        existing.addEventListener('load', ok, { once:true });
        existing.addEventListener('error', fail, { once:true });
        waitFor(function(){ return !testFn || testFn(); }, 22000).then(ok).catch(function(){ /* let error or timeout below handle */ setTimeout(fail, 0); });
        return;
      }
      var s = document.createElement('script');
      s.src = url;
      s.defer = true;
      s.async = true;
      s.dataset.statkissManaged = 'true';
      s.onload = function(){ resolve(window.MathJax || window.hljs || true); };
      s.onerror = function(){ reject(new Error('Failed to load ' + url)); };
      document.head.appendChild(s);
    });
  }

  var mathjaxPromise = null;
  function ensureMathJaxReady(){
    if (hasMathRuntime()) return awaitMathStartup(window.MathJax, 8000);
    if (mathjaxPromise) return mathjaxPromise;
    prepareMathConfig();
    mathjaxPromise = loadScriptOnce(MATHJAX_URL, hasMathRuntime).then(function(){ return awaitMathStartup(window.MathJax, 8000); }).then(function(mj){ return mj || window.MathJax; });
    return mathjaxPromise;
  }

  function isSpecialNode(node){
    return !!(node && node.closest && node.closest('.lre-image-node, .lre-code-node, .lre-math-node, .latex-node, table'));
  }

  function getSelectionAnchor(editor){
    var sel = document.getSelection ? document.getSelection() : null;
    if (!sel || !sel.anchorNode || !editor || !editor.editor) return null;
    var node = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
    if (!node || !editor.editor.contains(node)) return null;
    return node;
  }

  function findAlignBlock(editor, node){
    if (!editor || !editor.editor || !node || !node.closest) return null;
    var block = node.closest('p,h1,h2,h3,blockquote,li');
    if (block && editor.editor.contains(block)) return block;
    if (editor.editor === node || editor.editor.contains(node)) return editor.editor;
    return null;
  }

  function getTextAlignContext(editor){
    if (!editor || !editor.editor) return { special:true, block:null };
    var anchor = getSelectionAnchor(editor);
    if (anchor) {
      if (isSpecialNode(anchor)) return { special:true, block:null };
      return { special:false, block:findAlignBlock(editor, anchor) };
    }
    var selected = editor.selectedNode || null;
    if (selected && isSpecialNode(selected)) return { special:true, block:null };
    return { special:false, block:editor.editor };
  }

  function currentAlign(block){
    if (!block) return 'left';
    var value = (block.style && block.style.textAlign) || (window.getComputedStyle ? window.getComputedStyle(block).textAlign : '') || 'left';
    value = String(value || 'left').toLowerCase();
    if (value.indexOf('center') >= 0) return 'center';
    if (value.indexOf('right') >= 0 || value.indexOf('end') >= 0) return 'right';
    return 'left';
  }

  function applyTextAlign(editor, value){
    var ctx = getTextAlignContext(editor);
    if (ctx.special || !ctx.block) return;
    ctx.block.style.textAlign = value;
    if (editor.selectedNode && isSpecialNode(editor.selectedNode) && isFn(editor.clearNodeSelection)) editor.clearNodeSelection();
    isFn(editor.markDirty) && editor.markDirty();
    isFn(editor.updateSourceView) && editor.updateSourceView();
    isFn(editor.updateStatus) && editor.updateStatus();
    isFn(editor.updateToolbarActiveState) && editor.updateToolbarActiveState();
  }

  function refreshTextAlignButtons(editor){
    var group = q(editor && editor.root, '.statkiss-text-align-group');
    if (!group) return;
    var ctx = getTextAlignContext(editor);
    var align = currentAlign(ctx.block);
    qa(group, 'button[data-align]').forEach(function(btn){
      var disabled = !!ctx.special || !ctx.block;
      btn.disabled = disabled;
      btn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      btn.classList.toggle('is-active', !disabled && btn.dataset.align === align);
    });
  }

  function setToolbarSize(editor, size){
    if (!editor || !editor.root) return;
    size = size || 'compact';
    editor.root.dataset.toolbarSize = size;
    saveToolbarSize(size);
    var btn = q(editor.root, '.statkiss-toolbar-size-toggle');
    if (btn) {
      btn.classList.remove('is-compact', 'is-normal', 'is-roomy');
      btn.classList.add('is-' + size);
      btn.title = size === 'compact' ? 'Toolbar size: Compact' : size === 'normal' ? 'Toolbar size: Normal' : 'Toolbar size: Large';
      btn.setAttribute('aria-label', btn.title);
    }
  }

  function cycleToolbarSize(editor){
    var size = currentToolbarSize(editor && editor.root);
    size = size === 'compact' ? 'normal' : size === 'normal' ? 'roomy' : 'compact';
    setToolbarSize(editor, size);
  }

  function ensureToolbarSizeButton(editor){
    var toolbar = editor && (editor.toolbar || q(editor.root, '#lreToolbar'));
    if (!toolbar) return;
    var group = q(toolbar, '.statkiss-toolbar-size-group');
    if (!group) {
      group = document.createElement('div');
      group.className = 'lre-group statkiss-toolbar-size-group';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lre-btn statkiss-toolbar-size-toggle';
      btn.innerHTML = sizeSvg() + '<span class="lre-sr">Toolbar size</span>';
      btn.addEventListener('mousedown', function(ev){ ev.preventDefault(); });
      btn.addEventListener('click', function(ev){ ev.preventDefault(); cycleToolbarSize(editor); });
      group.appendChild(btn);
      toolbar.insertBefore(group, toolbar.firstChild ? toolbar.firstChild.nextSibling : null);
    }
    setToolbarSize(editor, loadToolbarSize());
  }

  function placeTextAlignGroup(editor){
    var toolbar = editor && (editor.toolbar || q(editor.root, '#lreToolbar'));
    var group = q(toolbar, '.statkiss-text-align-group');
    if (!toolbar || !group) return;
    var target = null;
    qa(toolbar, '.lre-group').some(function(item){
      if (item === group) return false;
      if (q(item, '[data-action="paragraph"]') || q(item, '[data-action="h1"]')) { target = item; return true; }
      return false;
    });
    if (target && group !== target.previousSibling) toolbar.insertBefore(group, target);
  }

  function ensureTextAlignButtons(editor){
    if (!editor) return;
    var toolbar = editor.toolbar || q(editor.root, '#lreToolbar');
    if (!toolbar) return;
    var group = q(toolbar, '.statkiss-text-align-group');
    if (!group) {
      group = document.createElement('div');
      group.className = 'lre-group statkiss-text-align-group';
      [
        { align:'left', label:'Align text left', svg: icon('<path d="M4 6h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 12h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 18h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>') },
        { align:'center', label:'Align text center', svg: icon('<path d="M4 6h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M7 12h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M5 18h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>') },
        { align:'right', label:'Align text right', svg: icon('<path d="M4 6h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10 12h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M6 18h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>') }
      ].forEach(function(item){
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lre-btn';
        btn.dataset.align = item.align;
        btn.title = item.label;
        btn.setAttribute('aria-label', item.label);
        btn.innerHTML = item.svg + '<span class="lre-sr">' + esc(item.label) + '</span>';
        btn.addEventListener('mousedown', function(ev){ ev.preventDefault(); });
        btn.addEventListener('click', function(ev){ ev.preventDefault(); applyTextAlign(editor, item.align); });
        group.appendChild(btn);
      });
      toolbar.appendChild(group);
    }
    placeTextAlignGroup(editor);
    refreshTextAlignButtons(editor);
  }

  function betterMathMarkup(result){
    if (!result) return '';
    if (typeof result === 'string') return result;
    if (result.querySelector) {
      var chosen = result.querySelector('svg') || result.querySelector('mjx-container') || result;
      return chosen && chosen.outerHTML ? chosen.outerHTML : '';
    }
    return result.outerHTML || '';
  }

  function normalizeTeX(tex){
    tex = String(tex || '');
    tex = tex.replace(/\\#(?=[A-Za-z])/g, '\\');
    tex = tex.replace(/\u00a0/g, ' ');
    return tex.trim();
  }

  function getMathNode(node){
    if (!node) return null;
    if (node.classList && (node.classList.contains('lre-math-node') || node.classList.contains('latex-node'))) return node;
    return node.closest ? node.closest('.lre-math-node, .latex-node') : null;
  }

  function ensureMathWrap(node){
    var wrap = q(node, '.statkiss-math-render');
    if (!wrap) {
      node.innerHTML = '';
      wrap = document.createElement('div');
      wrap.className = 'statkiss-math-render';
      node.appendChild(wrap);
    }
    return wrap;
  }

  async function renderMathNode(editor, node, force){
    node = getMathNode(node);
    if (!node) return;
    node.classList.add('lre-math-node', 'block');
    node.classList.remove('inline', 'latex-node');
    node.dataset.type = 'math';
    node.dataset.display = 'true';
    node.setAttribute('contenteditable', 'false');
    var tex = normalizeTeX(node.dataset.tex || node.dataset.latex || '');
    node.dataset.tex = tex;
    var wrap = ensureMathWrap(node);
    if (!tex) {
      wrap.innerHTML = '';
      node.classList.remove('is-error');
      node.removeAttribute('data-math-error');
      return;
    }
    if (!force && node.__statkissLastMathTex === tex && q(wrap, 'svg, mjx-container')) return;
    wrap.innerHTML = '<span class="statkiss-math-placeholder">Rendering…</span>';
    try {
      var mj = await ensureMathJaxReady();
      if (!mj) throw new Error('MathJax unavailable');
      var result = null;
      if (isFn(mj.tex2svgPromise)) result = await mj.tex2svgPromise(tex, { display:true });
      else if (isFn(mj.tex2svg)) result = mj.tex2svg(tex, { display:true });
      else if (isFn(mj.tex2chtmlPromise)) result = await mj.tex2chtmlPromise(tex, { display:true });
      else if (isFn(mj.tex2chtml)) result = mj.tex2chtml(tex, { display:true });
      var markup = betterMathMarkup(result);
      if (!markup) throw new Error('MathJax output missing');
      wrap.innerHTML = markup;
      node.__statkissLastMathTex = tex;
      node.classList.remove('is-error');
      node.removeAttribute('data-math-error');
    } catch (error) {
      node.classList.add('is-error');
      node.setAttribute('data-math-error', (error && error.message) || 'Math render failed');
      wrap.innerHTML = '<pre>' + esc(tex) + '</pre>';
    }
  }

  function renderAllMath(editor, force){
    if (!editor || !editor.root) return;
    qa(editor.editor || editor.root, '.lre-math-node, .latex-node').forEach(function(node){ renderMathNode(editor, node, force); });
    var preview = editor.sourcePreview || q(editor.root, '#lreMarkdownPreview');
    if (preview) qa(preview, '.lre-math-node, .latex-node').forEach(function(node){ renderMathNode(editor, node, force); });
  }

  function ensureInspectorHeader(editor){
    var panel = editor && (editor.inspectorPanel || q(editor.root, '#lreInspectorPanel'));
    if (!panel) return;
    var title = q(panel, 'h2');
    if (!title) return;
    var head = q(panel, '.statkiss-inspector-head');
    if (!head) {
      head = document.createElement('div');
      head.className = 'statkiss-inspector-head';
      title.parentNode.insertBefore(head, title);
      head.appendChild(title);
    }
    var actions = q(head, '.statkiss-inspector-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'statkiss-inspector-actions';
      head.appendChild(actions);
    }
    var del = q(actions, '.statkiss-inspector-delete');
    if (!del) {
      del = document.createElement('button');
      del.type = 'button';
      del.className = 'statkiss-inspector-delete';
      del.title = 'Delete selected node';
      del.setAttribute('aria-label', 'Delete selected node');
      actions.appendChild(del);
    }
    del.innerHTML = trashAltSvg() + '<span class="lre-sr">Delete selected node</span>';
    if (!del.__statkissBound) {
      del.__statkissBound = true;
      del.addEventListener('mousedown', function(ev){ ev.preventDefault(); });
      del.addEventListener('click', function(ev){ ev.preventDefault(); if (isFn(editor.deleteSelectedNode)) editor.deleteSelectedNode(); });
    }
    var close = q(actions, '.statkiss-inspector-close');
    if (!close) {
      close = document.createElement('button');
      close.type = 'button';
      close.className = 'statkiss-inspector-close';
      close.title = 'Close inspector';
      close.setAttribute('aria-label', 'Close inspector');
      actions.appendChild(close);
    }
    close.innerHTML = closeSvg() + '<span class="lre-sr">Close inspector</span>';
    if (!close.__statkissBound) {
      close.__statkissBound = true;
      close.addEventListener('mousedown', function(ev){ ev.preventDefault(); });
      close.addEventListener('click', function(ev){ ev.preventDefault(); var panel = editor.inspectorPanel || q(editor.root, '#lreInspectorPanel'); if (panel) { panel.hidden = true; if (editor.mainWrap) editor.mainWrap.classList.remove('has-inspector'); } });
    }
    qa(panel, '.lre-actions [data-action="delete-node"]').forEach(function(btn){ if (btn.parentNode) btn.parentNode.style.display = 'none'; });
  }

  function patchEditor(editor){
    if (!editor || editor.__STATKISS_LATE_STABILITY_PATCHED_02__) return editor;
    editor.__STATKISS_LATE_STABILITY_PATCHED_02__ = true;
    ensureStyle();
    dedupeAssetTags();
    ensureTextAlignButtons(editor);
    ensureToolbarSizeButton(editor);
    ensureInspectorHeader(editor);

    var oldUpdateInspector = isFn(editor.updateInspector) ? editor.updateInspector.bind(editor) : null;
    editor.updateInspector = function(){
      if (oldUpdateInspector) oldUpdateInspector();
      ensureInspectorHeader(this);
      refreshTextAlignButtons(this);
      placeTextAlignGroup(this);
    };

    var oldUpdateToolbarState = isFn(editor.updateToolbarActiveState) ? editor.updateToolbarActiveState.bind(editor) : null;
    editor.updateToolbarActiveState = function(){
      if (oldUpdateToolbarState) oldUpdateToolbarState();
      refreshTextAlignButtons(this);
      ensureInspectorHeader(this);
    };

    var oldClearNodeSelection = isFn(editor.clearNodeSelection) ? editor.clearNodeSelection.bind(editor) : null;
    if (oldClearNodeSelection) {
      editor.clearNodeSelection = function(){ var r = oldClearNodeSelection(); refreshTextAlignButtons(this); return r; };
    }
    var oldSelectNode = isFn(editor.selectNode) ? editor.selectNode.bind(editor) : null;
    if (oldSelectNode) {
      editor.selectNode = function(node){ var r = oldSelectNode(node); var panel = this.inspectorPanel || q(this.root, '#lreInspectorPanel'); if (panel) { panel.hidden = false; if (this.mainWrap) this.mainWrap.classList.add('has-inspector'); } refreshTextAlignButtons(this); ensureInspectorHeader(this); return r; };
    }

    editor.renderMathNode = function(node, force){ return renderMathNode(this, node, force); };
    editor.renderAllMath = function(force){ return renderAllMath(this, force); };

    var oldSaveMathDialog = isFn(editor.saveMathDialog) ? editor.saveMathDialog.bind(editor) : null;
    editor.saveMathDialog = function(){
      var tex = normalizeTeX(this.mathDialogText && this.mathDialogText.value || '');
      if (!tex) { try { this.mathDialog && this.mathDialog.close(); } catch (e) {} return; }
      var node = getMathNode(this.editingMathNode || (isFn(this.getSelectedMathNode) && this.getSelectedMathNode()));
      if (!node) {
        node = document.createElement('div');
        node.className = 'lre-math-node block';
        node.setAttribute('contenteditable', 'false');
        node.dataset.type = 'math';
        if (isFn(this.insertNode)) this.insertNode(node); else if (this.editor) this.editor.appendChild(node);
      }
      node.dataset.tex = tex;
      node.dataset.display = 'true';
      node.classList.add('lre-math-node', 'block');
      node.classList.remove('inline', 'latex-node');
      ensureMathWrap(node);
      renderMathNode(this, node, true);
      if (isFn(this.selectNode)) this.selectNode(node);
      try { this.mathDialog && this.mathDialog.close(); } catch (e) {}
      this.editingMathNode = null;
      isFn(this.markDirty) && this.markDirty();
      isFn(this.updateSourceView) && this.updateSourceView();
      isFn(this.updateStatus) && this.updateStatus();
      isFn(this.updateToolbarActiveState) && this.updateToolbarActiveState();
      if (isFn(this.populateMathInspector)) this.populateMathInspector(node);
    };

    if (!editor.__statkissLateSelectionBound) {
      editor.__statkissLateSelectionBound = true;
      document.addEventListener('selectionchange', function(){
        if (!editor.root || !editor.root.isConnected) return;
        var anchor = getSelectionAnchor(editor);
        if (anchor && !isSpecialNode(anchor) && editor.selectedNode && isSpecialNode(editor.selectedNode) && isFn(editor.clearNodeSelection)) {
          editor.clearNodeSelection();
        }
        refreshTextAlignButtons(editor);
      });
      if (editor.editor) {
        editor.editor.addEventListener('mousedown', function(ev){
          var target = ev.target;
          if (!target) return;
          if (!isSpecialNode(target) && editor.selectedNode && isSpecialNode(editor.selectedNode) && isFn(editor.clearNodeSelection)) {
            setTimeout(function(){ editor.clearNodeSelection(); refreshTextAlignButtons(editor); }, 0);
          }
        });
        editor.editor.addEventListener('click', function(){ refreshTextAlignButtons(editor); ensureInspectorHeader(editor); });
        editor.editor.addEventListener('keyup', function(){ refreshTextAlignButtons(editor); });
      }
    }

    ensureMathJaxReady().then(function(){ renderAllMath(editor, true); }).catch(function(){ renderAllMath(editor, true); });
    renderAllMath(editor, true);
    refreshTextAlignButtons(editor);
    placeTextAlignGroup(editor);
    return editor;
  }

  function wrapMount(name){
    var fn = window[name];
    if (!isFn(fn) || fn.__STATKISS_LATE_STABILITY_WRAP_02__) return;
    var wrapped = function(){
      var result = fn.apply(this, arguments);
      if (result && isFn(result.then)) return result.then(function(editor){ return patchEditor(editor); });
      return patchEditor(result);
    };
    wrapped.__STATKISS_LATE_STABILITY_WRAP_02__ = true;
    window[name] = wrapped;
  }

  ['mountStatkissContentEditor','mountEmbeddedContentEditor','initStatkissContentEditor','initEmbeddedContentEditor','autoMountStatkissContentEditor'].forEach(wrapMount);
  dedupeAssetTags();
  if (window.localRichEditor) patchEditor(window.localRichEditor);
  log(PATCH_ID + ' applied');
})();
