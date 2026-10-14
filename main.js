/* Shigurasu — a small linux desk cast in sea glass. */

const APPS = [
  { id: "terminal", title: "Terminal", pebble: "tide" },
  { id: "files", title: "Files", pebble: "seafoam" },
  { id: "notes", title: "Notes", pebble: "amber" },
  { id: "gallery", title: "Shore", pebble: "aqua" },
  { id: "calc", title: "Calc", pebble: "cobalt" },
  { id: "settings", title: "Settings", pebble: "rose" },
];

const WELCOME = `Shigurasu
user  tide
host  shigurasu

The panels on this desk are frosted sea glass.
Color is in the body. The face is matte. Light pools inside.

commands
  help
  ls
  cd Documents
  cat welcome.txt
  open Pictures/shore.jpg
  neofetch
`;

const FIELD = `Sea glass is glass that has been tumbled until the surface goes matte and the edges go soft.

The color is in the body. Light pools inside it instead of sliding off a shine. A shadow falls down and to the right, the way a pebble sits on paper.

Clear blur is just glass. This desk is the other thing: frost, color, and a soft shadow.
`;

const fsRoot = {
  type: "dir",
  children: {
    home: {
      type: "dir",
      children: {
        tide: {
          type: "dir",
          children: {
            Documents: {
              type: "dir",
              children: {
                "welcome.txt": { type: "file", content: WELCOME },
                "field-notes.txt": { type: "file", content: FIELD },
              },
            },
            Pictures: {
              type: "dir",
              children: {
                "shore.jpg": {
                  type: "file",
                  kind: "image",
                  src: "HUOZlKiXEAAnU0x.jpeg",
                  content: "",
                },
              },
            },
          },
        },
      },
    },
  },
};

const state = {
  windows: [],
  tint: localStorage.getItem("shigurasu-tint") || "seafoam",
  grain: Number(localStorage.getItem("shigurasu-grain") ?? 0.15),
  bloom: Number(localStorage.getItem("shigurasu-bloom") ?? 0.43),
  paper: localStorage.getItem("shigurasu-paper") || "daylight",
  volume: 70,
  cascade: 0,
  noteCount: 1,
};

const $ = (sel, root = document) => root.querySelector(sel);
const desktop = () => $("#desktop");

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function icon(name) {
  const p = {
    terminal: '<path d="M6 8l5 4-5 4M13 16h6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    files: '<path d="M4 8.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1h-7l-1.6-1.8A1 1 0 0 0 9.6 6.5H5a1 1 0 0 0-1 1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    notes: '<path d="M7 4.5h8.2L19 8.2V19a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M15 4.8V8.5h3.6M8.5 12h7M8.5 15.5h5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    gallery: '<circle cx="12" cy="12" r="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.1" fill="currentColor"/>',
    calc: '<path d="M7 5h10v14H7z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 8h6M9 12h.01M12 12h.01M15 12h.01M9 15.5h.01M12 15.5h.01M15 15.5h.01" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    settings: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M6.6 6.6l1.4 1.4M16 16l1.4 1.4M17.4 6.6 16 8M8 16l-1.4 1.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    wifi: '<path d="M4 10.2c4.4-3.6 11.6-3.6 16 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M7 13.2c2.8-2.2 7.2-2.2 10 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="17" r="1.1" fill="currentColor"/>',
    vol: '<path d="M5 10h2.8L12 6.5v11L7.8 14H5v-4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M15 9.5a3.5 3.5 0 0 1 0 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${p[name] || ""}</svg>`;
}

function makeNoise() {
  const size = 160;
  const src = document.createElement("canvas");
  src.width = src.height = size;
  const g = src.getContext("2d");
  const img = g.createImageData(size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = Math.random();
    d[i + 3] = 0;
    if (n > 0.8) {
      const light = Math.random() > 0.62;
      d[i] = d[i + 1] = d[i + 2] = light ? 255 : 12;
      d[i + 3] = light ? 70 + Math.random() * 70 : 110 + Math.random() * 80;
    }
  }
  g.putImageData(img, 0, 0);
  document.documentElement.style.setProperty("--noise", `url("${src.toDataURL("image/png")}")`);
}

function applyLook() {
  document.documentElement.style.setProperty("--grain", String(state.grain));
  document.documentElement.style.setProperty("--bloom-amt", String(state.bloom));
  $("#os").dataset.winTint = state.tint;
  $("#wallpaper").dataset.paper = state.paper === "daylight" ? "" : state.paper;
  for (const w of state.windows) {
    if (w.app === "terminal") continue;
    w.el.classList.remove(
      "tint-seafoam", "tint-aqua", "tint-cobalt", "tint-amber", "tint-frost", "tint-tide"
    );
    w.el.classList.add("tint-" + state.tint);
    w.el.dataset.tint = state.tint;
  }
}

function normalize(parts) {
  const out = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  return out;
}

function getNode(path) {
  let n = fsRoot;
  for (const p of path) {
    if (!n || n.type !== "dir" || !n.children[p]) return null;
    n = n.children[p];
  }
  return n;
}

function parsePath(cwd, input) {
  const raw = (input || "").trim();
  if (!raw || raw === "~") return ["home", "tide"];
  let bits;
  if (raw.startsWith("~/")) bits = ["home", "tide", ...raw.slice(2).split("/")];
  else if (raw.startsWith("/")) bits = raw.split("/");
  else bits = [...cwd, ...raw.split("/")];
  return normalize(bits);
}

function pretty(cwd) {
  if (cwd[0] === "home" && cwd[1] === "tide") {
    const rest = cwd.slice(2).join("/");
    return "~" + (rest ? "/" + rest : "");
  }
  return "/" + cwd.join("/");
}

function parentOf(path) {
  return { dir: path.slice(0, -1), name: path[path.length - 1] };
}

/* ---------- windows ---------- */

function place(win) {
  const topInset = 82;
  const bottomInset = 112;
  if (win.max) {
    win.el.style.left = "14px";
    win.el.style.top = topInset + "px";
    win.el.style.width = window.innerWidth - 28 + "px";
    win.el.style.height = window.innerHeight - topInset - bottomInset + "px";
  } else {
    win.el.style.left = win.x + "px";
    win.el.style.top = win.y + "px";
    win.el.style.width = win.w + "px";
    win.el.style.height = win.h + "px";
  }
  win.el.style.zIndex = String(10 + state.windows.indexOf(win));
  win.el.classList.toggle("is-focus", win === state.windows.at(-1) && !win.min);
  win.el.hidden = !!win.min;
}

function focusWin(win) {
  if (!win) return;
  win.min = false;
  state.windows = state.windows.filter((w) => w !== win).concat(win);
  for (const w of state.windows) place(w);
  paintDock();
  const focusable = win.el.querySelector("input, textarea");
  if (win.app === "terminal" && focusable) focusable.focus();
}

function openApp(id, opts = {}) {
  const app = APPS.find((a) => a.id === id);
  if (!app) return null;
  const existing = state.windows.find((w) => w.app === id);
  if (existing && !opts.force) {
    focusWin(existing);
    if (opts.file && id === "notes") bindNote(existing, opts.file);
    if (opts.path && id === "files") {
      existing.cwd = opts.path;
      paintFiles(existing);
    }
    if (opts.image && id === "gallery") paintGallery(existing, opts.image);
    return existing;
  }
  const i = state.cascade++;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const win = {
    id: "w" + i,
    app: id,
    title: app.title,
    x: opts.x ?? 36 + (i % 5) * 26,
    y: opts.y ?? 92 + (i % 5) * 22,
    w: opts.w ?? Math.min(id === "calc" ? 360 : 520, vw - 48),
    h: opts.h ?? Math.min(id === "calc" ? 460 : 420, vh - 200),
    max: false,
    min: false,
    cwd: ["home", "tide"],
    el: null,
  };
  win.x = Math.max(12, Math.min(win.x, vw - 80));
  win.y = Math.max(82, Math.min(win.y, vh - 140));

  const el = document.createElement("article");
  el.className = `window glass tint-${id === "terminal" ? "tide" : state.tint}`;
  el.dataset.app = id;
  el.dataset.tint = id === "terminal" ? "tide" : state.tint;
  el.innerHTML = `
    <header class="titlebar">
      <div class="controls">
        <button class="ctl close" data-act="close" aria-label="Close"></button>
        <button class="ctl min" data-act="min" aria-label="Minimize"></button>
        <button class="ctl max" data-act="max" aria-label="Maximize"></button>
      </div>
      <div class="title">${esc(app.title)}</div>
    </header>
    <div class="well"></div>
    ${["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((d) => `<div class="resize ${d}" data-dir="${d}"></div>`).join("")}
  `;
  win.el = el;
  desktop().appendChild(el);
  state.windows.push(win);
  wireWindow(win);
  mount(win, opts);
  focusWin(win);
  closeOverview();
  return win;
}

function wireWindow(win) {
  const el = win.el;
  el.addEventListener("pointerdown", () => focusWin(win));
  el.addEventListener("contextmenu", (e) => e.stopPropagation());

  const bar = $(".titlebar", el);
  bar.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button") || win.max) return;
    const sx = e.clientX;
    const sy = e.clientY;
    const ox = win.x;
    const oy = win.y;
    bar.setPointerCapture(e.pointerId);
    const move = (ev) => {
      win.x = ox + ev.clientX - sx;
      win.y = Math.max(76, oy + ev.clientY - sy);
      place(win);
    };
    const up = (ev) => {
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", up);
      if (ev.clientY < 70) {
        win.max = true;
        place(win);
      }
    };
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", up);
  });
  bar.addEventListener("dblclick", (e) => {
    if (e.target.closest("button")) return;
    toggleMax(win);
  });

  el.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "close") closeWin(win);
    if (act === "min") minimize(win);
    if (act === "max") toggleMax(win);
  });

  el.querySelectorAll(".resize").forEach((handle) => {
    handle.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (win.max) return;
      const dir = handle.dataset.dir;
      const sx = e.clientX;
      const sy = e.clientY;
      const start = { x: win.x, y: win.y, w: win.w, h: win.h };
      handle.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const dx = ev.clientX - sx;
        const dy = ev.clientY - sy;
        let { x, y, w, h } = start;
        if (dir.includes("e")) w = start.w + dx;
        if (dir.includes("s")) h = start.h + dy;
        if (dir.includes("w")) {
          w = Math.max(320, start.w - dx);
          x = start.x + (start.w - w);
        }
        if (dir.includes("n")) {
          h = Math.max(240, start.h - dy);
          y = start.y + (start.h - h);
        }
        w = Math.max(320, w);
        h = Math.max(240, h);
        Object.assign(win, { x, y, w, h });
        place(win);
      };
      const up = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
    });
  });
}

function closeWin(win) {
  win.el.remove();
  state.windows = state.windows.filter((w) => w !== win);
  if (state.windows.length) focusWin(state.windows.at(-1));
  else paintDock();
}

function minimize(win) {
  win.min = true;
  place(win);
  paintDock();
}

function toggleMax(win) {
  if (!win.max) {
    win.prev = { x: win.x, y: win.y, w: win.w, h: win.h };
    win.max = true;
  } else {
    Object.assign(win, win.prev || {});
    win.max = false;
  }
  place(win);
}

function paintDock() {
  const active = [...state.windows].reverse().find((w) => !w.min);
  for (const btn of document.querySelectorAll(".dock-btn")) {
    const id = btn.dataset.app;
    const open = state.windows.filter((w) => w.app === id);
    btn.classList.toggle("is-running", open.length > 0);
    btn.classList.toggle("is-active", !!active && active.app === id);
  }
}

function mount(win, opts) {
  const well = $(".well", win.el);
  if (win.app === "terminal") mountTerminal(win, well);
  if (win.app === "files") mountFiles(win, well, opts.path);
  if (win.app === "notes") mountNotes(win, well, opts.file);
  if (win.app === "gallery") paintGallery(win, opts.image);
  if (win.app === "settings") mountSettings(win, well);
  if (win.app === "calc") mountCalc(win, well);
  if (win.app === "welcome") mountWelcome(well);
}

/* ---------- welcome, used as the first window ---------- */

function mountWelcome(well) {
  well.innerHTML = `
    <div class="pad note-card">
      <p class="kicker">shore</p>
      <h1 class="desk-title">The desk</h1>
      <p class="lede">Frosted slabs, color in the glass, a shadow on the paper. The shell is ready.</p>
      <div class="row-actions">
        <button class="pill solid" data-open="terminal">Terminal</button>
        <button class="pill" data-open="files">Files</button>
        <button class="pill" data-open="gallery">Shore photo</button>
      </div>
    </div>`;
  well.addEventListener("click", (e) => {
    const id = e.target.closest("[data-open]")?.dataset.open;
    if (id) openApp(id);
  });
}

/* ---------- files ---------- */

function mountFiles(win, well, path) {
  win.cwd = path || ["home", "tide"];
  win.selected = null;
  well.innerHTML = `
    <div class="files">
      <div class="file-bar">
        <div class="crumbs"></div>
        <button class="pill" data-mk="note">New note</button>
      </div>
      <div class="file-list"></div>
    </div>`;
  $(".file-bar", well).addEventListener("click", (e) => {
    const mk = e.target.closest("[data-mk]")?.dataset.mk;
    if (mk === "note") {
      const name = `note-${state.noteCount++}.txt`;
      const dir = getNode(win.cwd);
      if (dir && dir.type === "dir") {
        dir.children[name] = { type: "file", content: "" };
        openApp("notes", { file: [...win.cwd, name] });
        paintFiles(win);
      }
    }
    const crumb = e.target.closest("[data-depth]");
    if (crumb) {
      const depth = Number(crumb.dataset.depth);
      win.cwd = win.cwd.slice(0, depth);
      win.selected = null;
      paintFiles(win);
    }
  });
  $(".file-list", well).addEventListener("click", (e) => {
    const row = e.target.closest("[data-name]");
    if (!row) return;
    win.selected = row.dataset.name;
    paintFiles(win);
  });
  $(".file-list", well).addEventListener("dblclick", (e) => {
    const row = e.target.closest("[data-name]");
    if (!row) return;
    openEntry(win, row.dataset.name);
  });
  paintFiles(win);
}

function paintFiles(win) {
  const well = $(".well", win.el);
  const node = getNode(win.cwd);
  const crumbs = $(".crumbs", well);
  const list = $(".file-list", well);
  if (!node) return;
  const home = ["home", "tide"];
  const shown = win.cwd[0] === "home" && win.cwd[1] === "tide" ? win.cwd.slice(1) : win.cwd;
  const labels = ["~", ...shown.slice(1)];
  const depths = [];
  if (win.cwd[0] === "home" && win.cwd[1] === "tide") {
    depths.push(2);
    for (let i = 2; i < win.cwd.length; i++) depths.push(i + 1);
  }
  crumbs.innerHTML = labels.map((label, i) =>
    `<button type="button" data-depth="${depths[i] || i + 1}">${esc(label)}</button>`
  ).join("");
  const names = Object.keys(node.children || {}).sort((a, b) => {
    const da = node.children[a].type === "dir" ? 0 : 1;
    const db = node.children[b].type === "dir" ? 0 : 1;
    return da - db || a.localeCompare(b);
  });
  if (!names.length) {
    list.innerHTML = `<div class="empty">This folder is empty.</div>`;
    return;
  }
  list.innerHTML = names.map((name) => {
    const child = node.children[name];
    const tint = child.type === "dir" ? "seafoam" : child.kind === "image" ? "aqua" : "frost";
    const meta = child.type === "dir" ? "folder" : child.kind === "image" ? "picture" : `${child.content.length} chars`;
    const on = win.selected === name ? " is-on" : "";
    return `<button class="file-row${on}" data-name="${esc(name)}" type="button">
      <span class="swatch glass tint-${tint}"></span>
      <span>${esc(name)}</span>
      <span class="meta">${meta}</span>
    </button>`;
  }).join("");
}

function openEntry(win, name) {
  const node = getNode(win.cwd);
  const child = node?.children[name];
  if (!child) return;
  if (child.type === "dir") {
    win.cwd = [...win.cwd, name];
    win.selected = null;
    paintFiles(win);
    return;
  }
  const path = [...win.cwd, name];
  if (child.kind === "image") openApp("gallery", { image: child });
  else openApp("notes", { file: path });
}

/* ---------- notes ---------- */

function mountNotes(win, well, file) {
  well.innerHTML = `
    <div class="notes">
      <input class="notes-name" aria-label="File name" />
      <textarea spellcheck="true" aria-label="Note"></textarea>
    </div>`;
  const nameEl = $(".notes-name", well);
  const area = $("textarea", well);
  nameEl.addEventListener("change", () => {
    if (!win.file) return;
    const next = nameEl.value.trim().replace(/\s+/g, "-");
    if (!next || next.includes("/")) {
      nameEl.value = parentOf(win.file).name;
      return;
    }
    const { dir, name } = parentOf(win.file);
    const folder = getNode(dir);
    if (!folder || (folder.children[next] && next !== name)) {
      nameEl.value = name;
      return;
    }
    if (next === name) return;
    folder.children[next] = folder.children[name];
    delete folder.children[name];
    win.file = [...dir, next];
    $(".title", win.el).textContent = next;
    refreshFiles();
  });
  area.addEventListener("input", () => {
    const node = win.file && getNode(win.file);
    if (node && node.type === "file") node.content = area.value;
  });
  bindNote(win, file || ["home", "tide", "Documents", "field-notes.txt"]);
}

function bindNote(win, path) {
  win.file = path;
  const node = getNode(path);
  if (!node) return;
  const well = $(".well", win.el);
  $(".notes-name", well).value = path[path.length - 1];
  $("textarea", well).value = node.content || "";
  $(".title", win.el).textContent = path[path.length - 1];
}

function refreshFiles() {
  for (const w of state.windows) if (w.app === "files") paintFiles(w);
}

/* ---------- gallery ---------- */

function paintGallery(win, image) {
  const src = image?.src || "HUOZlKiXEAAnU0x.jpeg";
  $(".well", win.el).innerHTML = `
    <figure class="gallery">
      <img src="${esc(src)}" alt="Sea glass pebbles on white paper" />
      <figcaption>Shore glass. Color sits in the body, the face is frosted, and the shadow falls down-right. The desk is built from this, not from clear glass.</figcaption>
    </figure>`;
}

/* ---------- settings ---------- */

function mountSettings(win, well) {
  const tints = ["seafoam", "aqua", "cobalt", "amber", "frost", "tide"];
  const papers = [
    ["daylight", "Daylight"],
    ["sand", "Sand"],
    ["overcast", "Overcast"],
  ];
  well.innerHTML = `
    <div class="settings">
      <div class="set-block">
        <h2>Color in the glass</h2>
        <div class="swatches">
          ${tints.map((t) => `<button class="choice glass tint-${t}${t === state.tint ? " is-on" : ""}" data-tint="${t}" type="button"><span>${t}</span></button>`).join("")}
        </div>
      </div>
      <div class="set-block">
        <h2>Paper</h2>
        <div class="papers">
          ${papers.map(([id, label]) => `<button class="pill${state.paper === id ? " solid" : ""}" data-paper="${id}" type="button">${label}</button>`).join("")}
        </div>
      </div>
      <label class="slider">Frost <input id="grain" type="range" min="0.15" max="1" step="0.01" value="${state.grain}" /> <span id="grain-n"></span></label>
      <label class="slider">Bloom <input id="bloom" type="range" min="0.15" max="1" step="0.01" value="${state.bloom}" /> <span id="bloom-n"></span></label>
      <p class="set-note">Frost is the tumbled face. Bloom is the light pooled inside the slab. Neither one is a clear blur.</p>
    </div>`;
  const grain = $("#grain", well);
  const bloom = $("#bloom", well);
  const gn = $("#grain-n", well);
  const bn = $("#bloom-n", well);
  const show = () => {
    gn.textContent = Math.round(state.grain * 100);
    bn.textContent = Math.round(state.bloom * 100);
  };
  show();
  grain.addEventListener("input", () => {
    state.grain = Number(grain.value);
    localStorage.setItem("shigurasu-grain", String(state.grain));
    applyLook();
    show();
  });
  bloom.addEventListener("input", () => {
    state.bloom = Number(bloom.value);
    localStorage.setItem("shigurasu-bloom", String(state.bloom));
    applyLook();
    show();
  });
  well.addEventListener("click", (e) => {
    const tint = e.target.closest("[data-tint]")?.dataset.tint;
    if (tint) {
      state.tint = tint;
      localStorage.setItem("shigurasu-tint", tint);
      applyLook();
      well.querySelectorAll("[data-tint]").forEach((b) => b.classList.toggle("is-on", b.dataset.tint === tint));
    }
    const paper = e.target.closest("[data-paper]")?.dataset.paper;
    if (paper) {
      state.paper = paper;
      localStorage.setItem("shigurasu-paper", paper);
      applyLook();
      well.querySelectorAll("[data-paper]").forEach((b) => b.classList.toggle("solid", b.dataset.paper === paper));
    }
  });
}

/* ---------- calc ---------- */

function mountCalc(win, well) {
  const ops = [
    ["AC", "ac"], ["±", "sign"], ["%", "pct"], ["÷", "÷"],
    ["7", "7"], ["8", "8"], ["9", "9"], ["×", "×"],
    ["4", "4"], ["5", "5"], ["6", "6"], ["−", "−"],
    ["1", "1"], ["2", "2"], ["3", "3"], ["+", "+"],
    ["0", "0"], [".", "."], ["=", "="],
  ];
  well.innerHTML = `
    <div class="calc">
      <div class="calc-display" aria-live="polite">0</div>
      <div class="keys">
        ${ops.map(([label, v]) => {
          const wide = v === "0" ? ' style="grid-column: span 2"' : "";
          const op = "÷×−+=".includes(v) ? " op" : "";
          return `<button class="key${op}" data-k="${v}" type="button"${wide}>${label}</button>`;
        }).join("")}
      </div>
    </div>`;
  const mem = { acc: null, op: null, entry: "0", fresh: false };
  const display = $(".calc-display", well);
  const show = () => {
    display.textContent = mem.entry;
  };
  const compute = (a, op, b) => {
    if (op === "+") return a + b;
    if (op === "−") return a - b;
    if (op === "×") return a * b;
    if (op === "÷") return b === 0 ? NaN : a / b;
    return b;
  };
  const format = (n) => {
    if (!Number.isFinite(n)) return "No";
    const s = String(Math.round(n * 1e9) / 1e9);
    return s.length > 12 ? n.toExponential(4) : s;
  };
  well.addEventListener("click", (e) => {
    const k = e.target.closest("[data-k]")?.dataset.k;
    if (!k) return;
    if (k === "ac") {
      Object.assign(mem, { acc: null, op: null, entry: "0", fresh: false });
    } else if (k === "sign") {
      mem.entry = mem.entry.startsWith("-") ? mem.entry.slice(1) : mem.entry === "0" ? "0" : "-" + mem.entry;
    } else if (k === "pct") {
      mem.entry = format(parseFloat(mem.entry) / 100);
    } else if (k === ".") {
      if (mem.fresh) { mem.entry = "0."; mem.fresh = false; }
      else if (!mem.entry.includes(".")) mem.entry += ".";
    } else if ("0123456789".includes(k)) {
      if (mem.fresh || mem.entry === "0") mem.entry = k;
      else mem.entry += k;
      mem.fresh = false;
    } else if ("+−×÷".includes(k)) {
      const n = parseFloat(mem.entry);
      if (mem.acc == null || mem.fresh) mem.acc = n;
      else mem.acc = compute(mem.acc, mem.op, n);
      mem.op = k;
      mem.entry = format(mem.acc);
      mem.fresh = true;
    } else if (k === "=") {
      if (mem.op && !mem.fresh) {
        mem.acc = compute(mem.acc, mem.op, parseFloat(mem.entry));
        mem.entry = format(mem.acc);
        mem.op = null;
        mem.fresh = true;
      }
    }
    show();
  });
}

/* ---------- terminal ---------- */

function mountTerminal(win, well) {
  win.term = {
    cwd: ["home", "tide"],
    hist: [],
    hi: -1,
    draft: "",
  };
  well.innerHTML = `
    <div class="term">
      <div class="term-log"></div>
      <form class="term-line">
        <span class="pr"></span>
        <input aria-label="Command" autocomplete="off" spellcheck="false" />
      </form>
    </div>`;
  const form = $(".term-line", well);
  const input = $("input", well);
  const promptEl = $(".pr", well);
  const paintPrompt = () => { promptEl.textContent = promptOf(win); };
  paintPrompt();
  termPush(win, "Shigurasu shell. Type help.");
  well.addEventListener("pointerdown", () => input.focus());
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const line = input.value;
    input.value = "";
    win.term.hi = -1;
    if (line.trim()) win.term.hist.push(line);
    run(win, line);
    paintPrompt();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      $(".term-log", win.el).innerHTML = "";
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const h = win.term.hist;
      if (!h.length) return;
      if (e.key === "ArrowUp") {
        if (win.term.hi === -1) win.term.hi = h.length - 1;
        else win.term.hi = Math.max(0, win.term.hi - 1);
      } else if (win.term.hi >= 0) {
        win.term.hi += 1;
        if (win.term.hi >= h.length) win.term.hi = -1;
      }
      input.value = win.term.hi === -1 ? "" : h[win.term.hi];
    }
  });
}

function promptOf(win) {
  return `tide@shigurasu:${pretty(win.term.cwd)}$`;
}

function termPush(win, html) {
  const log = $(".term-log", win.el);
  const row = document.createElement("div");
  row.innerHTML = html;
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
}

function run(win, raw) {
  const line = raw.replace(/\s+$/, "");
  termPush(win, `<span class="pr">${esc(promptOf(win))}</span> ${esc(line)}`);
  const bits = line.trim().split(/\s+/).filter(Boolean);
  if (!bits.length) return;
  const [cmd, ...args] = bits;
  const cwd = win.term.cwd;
  const say = (t) => termPush(win, esc(t));

  if (cmd === "help") {
    say("help  ls  cd  pwd  cat  mkdir  touch  rm  open");
    say("echo  date  whoami  uname  neofetch  history  clear");
    return;
  }
  if (cmd === "clear") {
    $(".term-log", win.el).innerHTML = "";
    return;
  }
  if (cmd === "echo") return say(args.join(" "));
  if (cmd === "date") return say(new Date().toString());
  if (cmd === "whoami") return say("tide");
  if (cmd === "hostname") return say("shigurasu");
  if (cmd === "pwd") return say(pretty(cwd));
  if (cmd === "uname") return say("Shigurasu tide 1.0 sea-glass browser");
  if (cmd === "history") {
    win.term.hist.forEach((h, i) => say(`${String(i + 1).padStart(4, " ")}  ${h}`));
    return;
  }
  if (cmd === "neofetch") {
    termPush(win, [
      "        .-------.          ",
      "      .'         `.        user    tide",
      "     /   ~     ~   \\       host    shigurasu",
      "    |    sea glass  |      desk    sea glass",
      "     \\   ~     ~   /       shell   tide",
      "      `._       _.'        wm      pebble",
      "         `-----'           ",
    ].map(esc).join("\n"));
    return;
  }
  if (cmd === "ls") {
    const path = args[0] && !args[0].startsWith("-") ? parsePath(cwd, args[0]) : cwd;
    const node = getNode(path);
    if (!node) return say(`ls: no such path: ${args[0] || ""}`);
    if (node.type !== "dir") return say(path.at(-1));
    const names = Object.keys(node.children).sort();
    if (!names.length) return say("");
    termPush(win, names.map((n) => {
      const c = node.children[n];
      const label = c.type === "dir" ? n + "/" : n;
      return esc(label);
    }).join("   "));
    return;
  }
  if (cmd === "cd") {
    const path = parsePath(cwd, args[0] || "~");
    const node = getNode(path);
    if (!node || node.type !== "dir") return say(`cd: not a directory: ${args[0] || ""}`);
    win.term.cwd = path;
    return;
  }
  if (cmd === "cat") {
    if (!args[0]) return say("cat: missing file");
    const path = parsePath(cwd, args[0]);
    const node = getNode(path);
    if (!node) return say(`cat: no such file: ${args[0]}`);
    if (node.type === "dir") return say(`cat: ${args[0]}: is a directory`);
    if (node.kind === "image") return say(`cat: ${args[0]}: picture. try: open ${args[0]}`);
    say(node.content.replace(/\n$/, ""));
    return;
  }
  if (cmd === "mkdir" || cmd === "touch") {
    if (!args[0] || args[0].includes(" ")) return say(`${cmd}: give one name`);
    const path = parsePath(cwd, args[0]);
    const { dir, name } = parentOf(path);
    const folder = getNode(dir);
    if (!folder || folder.type !== "dir") return say(`${cmd}: bad path`);
    if (folder.children[name]) return say(`${cmd}: ${name} already exists`);
    folder.children[name] = cmd === "mkdir"
      ? { type: "dir", children: {} }
      : { type: "file", content: "" };
    refreshFiles();
    return;
  }
  if (cmd === "rm") {
    if (!args[0]) return say("rm: missing file");
    const path = parsePath(cwd, args[0]);
    const node = getNode(path);
    if (!node) return say(`rm: no such file: ${args[0]}`);
    if (node.type === "dir") return say(`rm: ${args[0]}: is a directory`);
    const { dir, name } = parentOf(path);
    delete getNode(dir).children[name];
    refreshFiles();
    return;
  }
  if (cmd === "open") {
    if (!args[0]) return say("open: missing file");
    const path = parsePath(cwd, args[0]);
    const node = getNode(path);
    if (!node) return say(`open: no such file: ${args[0]}`);
    if (node.type === "dir") {
      openApp("files", { path });
      return;
    }
    if (node.kind === "image") openApp("gallery", { image: node });
    else openApp("notes", { file: path });
    return;
  }
  say(`tide: ${cmd}: command not found`);
}

/* ---------- overview, tray, menu, clock ---------- */

function openOverview() {
  const ov = $("#overview");
  const wins = state.windows.filter((w) => !w.min);
  $("#ov-windows").innerHTML = wins.length
    ? wins.map((w) => `<button class="ov-win glass tint-frost" data-win="${w.id}" type="button"><span class="swatch glass tint-${w.el.dataset.tint}"></span>${esc(w.title)}</button>`).join("")
    : `<div class="ov-empty">Nothing open.</div>`;
  ov.hidden = false;
  $("#activities").classList.add("is-on");
}

function closeOverview() {
  $("#overview").hidden = true;
  $("#activities").classList.remove("is-on");
}

function toggleOverview() {
  if ($("#overview").hidden) openOverview();
  else closeOverview();
}

function tick() {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" });
  const short = now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
  const lockTime = $("#lock-time");
  const lockDate = $("#lock-date");
  const clock = $("#clock");
  if (lockTime) lockTime.textContent = time;
  if (lockDate) lockDate.textContent = date;
  if (clock) {
    clock.dateTime = now.toISOString();
    clock.textContent = `${short}  ${time}`;
  }
}

function placePop(pop, anchor) {
  const r = anchor.getBoundingClientRect();
  pop.hidden = false;
  const w = pop.offsetWidth;
  const h = pop.offsetHeight;
  let left = r.right - w;
  let top = r.bottom + 10;
  if (pop.id === "cmenu") {
    left = Math.min(r.left, window.innerWidth - w - 8);
    top = r.top;
  }
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  top = Math.max(8, Math.min(top, window.innerHeight - h - 8));
  pop.style.left = left + "px";
  pop.style.top = top + "px";
}

function openWelcome() {
  const i = state.cascade++;
  const win = {
    id: "w" + i,
    app: "welcome",
    title: "The desk",
    x: Math.max(28, Math.round(window.innerWidth * 0.07)),
    y: 108,
    w: Math.min(460, window.innerWidth - 56),
    h: Math.min(300, window.innerHeight - 210),
    max: false,
    min: false,
    el: null,
  };
  const el = document.createElement("article");
  el.className = "window glass tint-" + state.tint;
  el.dataset.app = "welcome";
  el.dataset.tint = state.tint;
  el.innerHTML = `
    <header class="titlebar">
      <div class="controls">
        <button class="ctl close" data-act="close" aria-label="Close"></button>
        <button class="ctl min" data-act="min" aria-label="Minimize"></button>
        <button class="ctl max" data-act="max" aria-label="Maximize"></button>
      </div>
      <div class="title">The desk</div>
    </header>
    <div class="well"></div>
    ${["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((d) => `<div class="resize ${d}" data-dir="${d}"></div>`).join("")}
  `;
  win.el = el;
  desktop().appendChild(el);
  state.windows.push(win);
  wireWindow(win);
  mountWelcome($(".well", el));
  focusWin(win);
}

function enterDesk() {
  const lock = $("#lock");
  if (lock.classList.contains("is-off")) return;
  lock.classList.add("is-off");
  $("#os").hidden = false;
  $("#os").classList.add("is-on");
  const params = new URLSearchParams(location.search);
  if (params.has("studio")) studio();
  else if (!state.windows.some((w) => w.app === "welcome")) openWelcome();
  setTimeout(() => { lock.hidden = true; }, 480);
}

function studio() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const files = openApp("files", {
    x: 28,
    y: 88,
    w: Math.min(400, W * 0.32),
    h: Math.min(560, H - 200),
  });
  if (files) {
    files.cwd = ["home", "tide", "Documents"];
    paintFiles(files);
  }
  const term = openApp("terminal", {
    x: Math.round(W * 0.34),
    y: 108,
    w: Math.min(560, W * 0.4),
    h: Math.min(390, H * 0.48),
  });
  if (term) run(term, "neofetch");
  openApp("gallery", {
    x: Math.round(W * 0.58),
    y: Math.round(H * 0.42),
    w: Math.min(460, W * 0.36),
    h: Math.min(380, H * 0.46),
  });
}

function boot() {
  makeNoise();
  applyLook();
  tick();
  setInterval(tick, 1000);

  const dock = $("#dock");
  dock.innerHTML = APPS.map((app) => `
    <div class="dock-slot">
      <button class="dock-btn glass tint-${app.pebble}" data-app="${app.id}" type="button" aria-label="${app.title}">
        ${icon(app.id)}
        <span class="dot"></span>
      </button>
      <span class="tip">${app.title}</span>
    </div>`).join("");
  dock.addEventListener("click", (e) => {
    const btn = e.target.closest(".dock-btn");
    if (!btn) return;
    const id = btn.dataset.app;
    const open = state.windows.filter((w) => w.app === id);
    const focused = state.windows.at(-1);
    if (!open.length) openApp(id);
    else if (open.some((w) => w.min)) focusWin(open.find((w) => w.min));
    else if (focused && focused.app === id && !focused.min) minimize(focused);
    else focusWin(open.at(-1));
  });

  $("#status").innerHTML = `${icon("wifi")}${icon("vol")}<span>86%</span>`;
  $("#activities").addEventListener("click", toggleOverview);
  $("#status").addEventListener("click", () => {
    const tray = $("#tray");
    if (!tray.hidden) { tray.hidden = true; $("#status").classList.remove("is-on"); return; }
    $("#cmenu").hidden = true;
    placePop(tray, $("#status"));
    $("#status").classList.add("is-on");
  });
  $("#vol").addEventListener("input", (e) => {
    state.volume = Number(e.target.value);
    $("#vol-n").textContent = state.volume === 0 ? "muted" : state.volume + "%";
  });
  $("#lock-btn").addEventListener("click", () => {
    $("#tray").hidden = true;
    $("#status").classList.remove("is-on");
    const lock = $("#lock");
    lock.hidden = false;
    requestAnimationFrame(() => lock.classList.remove("is-off"));
  });

  $("#overview").addEventListener("click", (e) => {
    if (!e.target.closest("button")) return closeOverview();
    const winId = e.target.closest("[data-win]")?.dataset.win;
    if (winId) {
      const win = state.windows.find((w) => w.id === winId);
      closeOverview();
      focusWin(win);
    }
    const app = e.target.closest("[data-app]")?.dataset.app;
    if (app) openApp(app);
  });
  $("#ov-apps").innerHTML = APPS.map((app) => `
    <button class="ov-app glass tint-${app.pebble}" data-app="${app.id}" type="button">
      ${icon(app.id)}
      <span>${app.title}</span>
    </button>`).join("");

  const menu = $("#cmenu");
  menu.innerHTML = [
    ["terminal", "Open terminal"],
    ["files", "Open files"],
    ["notes", "New note"],
    ["gallery", "Shore photo"],
    ["settings", "Settings"],
  ].map(([id, label]) => `<button class="item" data-app="${id}" type="button">${label}</button>`).join("")
    + `<button class="item" data-act="overview" type="button">Activities</button>`;
  menu.addEventListener("click", (e) => {
    const app = e.target.closest("[data-app]")?.dataset.app;
    const act = e.target.closest("[data-act]")?.dataset.act;
    menu.hidden = true;
    if (app === "notes") {
      const name = `note-${state.noteCount++}.txt`;
      const docs = getNode(["home", "tide", "Documents"]);
      docs.children[name] = { type: "file", content: "" };
      openApp("notes", { file: ["home", "tide", "Documents", name] });
    } else if (app) openApp(app);
    if (act === "overview") openOverview();
  });

  desktop().addEventListener("contextmenu", (e) => {
    if (e.target.closest(".window")) return;
    e.preventDefault();
    $("#tray").hidden = true;
    const fake = { getBoundingClientRect: () => ({ left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY, width: 0, height: 0 }) };
    placePop(menu, fake);
  });

  document.addEventListener("pointerdown", (e) => {
    if (!e.target.closest("#tray, #status")) {
      $("#tray").hidden = true;
      $("#status").classList.remove("is-on");
    }
    if (!e.target.closest("#cmenu")) menu.hidden = true;
  });

  document.addEventListener("keydown", (e) => {
    const lockOn = !$("#lock").hidden && !$("#lock").classList.contains("is-off");
    if (lockOn && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      enterDesk();
      return;
    }
    if (e.key === "Escape") {
      closeOverview();
      menu.hidden = true;
      $("#tray").hidden = true;
    }
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "t") {
      e.preventDefault();
      openApp("terminal");
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a" && e.shiftKey) {
      /* leave text selection alone */
    }
  });

  $("#enter").addEventListener("click", enterDesk);

  const params = new URLSearchParams(location.search);
  if (params.has("enter")) enterDesk();
}

boot();
