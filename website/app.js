(() => {
'use strict';

/* ---------- constants & definitions ---------- */
const { C, H, F } = Models;
const LIM = 20;       // build area: cells -LIM..LIM
const MAXLV = 7;
const MAXPIECES = 20000;

const SETS = {
  atreides:  { label: 'Atreides',  main: 0x6f8fb0, accent: 0x2f4a66 },
  harkonnen: { label: 'Harkonnen', main: 0x57505a, accent: 0x9a2f2f },
  fremen:    { label: 'Fremen',    main: 0xc9ab7a, accent: 0x7d5f3a },
  smuggler:  { label: 'Smuggler',  main: 0x9a6444, accent: 0x3f8f8a },
  choam:     { label: 'CHOAM',     main: 0xd6d1c6, accent: 0xc79a2e },
  sardaukar: { label: 'Sardaukar', main: 0x5b5f68, accent: 0xb8861f },
};

Object.keys(SETS).forEach(k => { SETS[k].main = Models.STYLES[k].main; SETS[k].accent = Models.STYLES[k].trim; });

// slot: which position class a piece snaps to (also its occupancy key)
const DEFS = {
  foundation: { label: 'Foundation',   cat: 'Floors',  slot: 'floor',  hint: 'Square slab' },
  triangle:   { label: 'Triangle',     cat: 'Floors',  slot: 'floor',  hint: 'Half slab', rot: true },
  ramp:       { label: 'Slope',        cat: 'Floors',  slot: 'floor',  hint: 'Rises toward its facing', rot: true },
  stairs:     { label: 'Stairs',       cat: 'Floors',  slot: 'floor',  hint: 'Rises toward its facing', rot: true },
  halfstairs: { label: 'Half stairs',  cat: 'Floors',  slot: 'floor',  hint: 'Half-height steps', rot: true },
  wall:       { label: 'Wall',         cat: 'Walls',   slot: 'edge',   hint: 'Snaps to cell edge' },
  doorway:    { label: 'Doorway',      cat: 'Walls',   slot: 'edge',   hint: 'Snaps to cell edge' },
  window:     { label: 'Window',       cat: 'Walls',   slot: 'edge',   hint: 'Snaps to cell edge' },
  railing:    { label: 'Railing',      cat: 'Walls',   slot: 'edge',   hint: 'Low barrier' },
  ladder:     { label: 'Ladder',       cat: 'Walls',   slot: 'edge',   hint: 'Climb between levels' },
  pillar:     { label: 'Pillar',       cat: 'Support', slot: 'corner', hint: 'Snaps to cell corner' },
  column:     { label: 'Column',       cat: 'Support', slot: 'column', hint: 'Round, cell centre' },
  roof:       { label: 'Roof',         cat: 'Roofs',   slot: 'roof',   hint: 'Ceiling slab' },
  hatch:      { label: 'Roof hatch',   cat: 'Roofs',   slot: 'roof',   hint: 'Slab with opening' },
  dome:       { label: 'Dome roof',    cat: 'Roofs',   slot: 'roof',   hint: 'Rounded cap' },
  machine:    { label: 'Machine',      cat: 'Placeables', slot: 'center', hint: 'Fabricator / storage', rot: true },
  light:      { label: 'Light',        cat: 'Placeables', slot: 'light',  hint: 'Ceiling lamp' },
};
const TYPES = Object.keys(DEFS);

const keyOf = p => {
  const s = DEFS[p.t].slot;
  const pos = `${p.x},${p.y},${p.z}`;
  if (s === 'edge') return `e${p.r}:${pos}`;
  if (s === 'corner') return `k${p.r}:${pos}`;
  return `${s}:${pos}`;
};

/* ---------- small helpers ---------- */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let toastTimer;
function toast(msg, err) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast' + (err ? ' err' : '');
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}
const slug = s => (s || 'blueprint').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'blueprint';

function validate(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.pieces)) throw new Error('Not a blueprint file.');
  if (data.pieces.length > MAXPIECES) throw new Error('Too many pieces.');
  const map = new Map();
  for (const q of data.pieces) {
    if (!q || !DEFS[q.t]) continue;
    const p = { t: q.t, x: q.x | 0, y: q.y | 0, z: q.z | 0, r: ((q.r | 0) % 4 + 4) % 4 };
    if (Math.abs(p.x) > LIM || Math.abs(p.z) > LIM || p.y < 0 || p.y > MAXLV) continue;
    map.set(keyOf(p), p);
  }
  return {
    name: String(data.name || 'Imported base').slice(0, 60),
    set: SETS[data.set] ? data.set : 'fremen',
    pieces: [...map.values()],
  };
}

/* ---------- sample blueprints ---------- */
function Builder() {
  const m = new Map();
  const b = {
    put(t, x, y, z, r = 0) { const p = { t, x, y, z, r }; m.set(keyOf(p), p); return b; },
    del(t, x, y, z, r = 0) { m.delete(keyOf({ t, x, y, z, r })); return b; },
    room(x0, z0, w, d, y, o = {}) {
      for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) if (!o.skip || !o.skip(x, z)) b.put('foundation', x, y, z);
      for (let x = x0; x < x0 + w; x++) {
        const i = x - x0;
        b.put(i % 2 === 1 && o.windows ? 'window' : 'wall', x, y, z0, 0);
        b.put(i % 2 === 1 && o.windows ? 'window' : 'wall', x, y, z0 + d - 1, 2);
      }
      for (let z = z0; z < z0 + d; z++) {
        const i = z - z0;
        b.put(i % 2 === 1 && o.windows ? 'window' : 'wall', x0, y, z, 3);
        b.put(i % 2 === 1 && o.windows ? 'window' : 'wall', x0 + w - 1, y, z, 1);
      }
      b.put('pillar', x0, y, z0, 0).put('pillar', x0 + w - 1, y, z0, 1).put('pillar', x0 + w - 1, y, z0 + d - 1, 2).put('pillar', x0, y, z0 + d - 1, 3);
      if (o.roof) for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) b.put('roof', x, y, z);
      return b;
    },
    list: () => [...m.values()],
  };
  return b;
}

function makeSamples() {
  const s = [];

  let b = Builder().room(0, 0, 5, 4, 0, { windows: true, roof: true });
  b.del('wall', 2, 0, 3, 2).put('doorway', 2, 0, 3, 2)
   .put('machine', 1, 0, 1).put('machine', 3, 0, 1, 1).put('light', 2, 0, 1)
   .put('ramp', 2, 0, 4, 0).put('foundation', 2, 0, 5);
  s.push({ name: 'Sietch Outpost', set: 'fremen', tags: ['outpost', 'starter'], pieces: b.list() });

  b = Builder();
  for (let y = 0; y < 4; y++) {
    b.room(0, 0, 3, 3, y, { skip: (x, z) => y > 0 && y < 4 && x === 1 && z === 1 });
    if (y < 3) b.put('stairs', 1, y, 1, 1);
    if (y > 0) b.put('light', 0, y, 0);
  }
  b.del('wall', 1, 0, 2, 2).put('doorway', 1, 0, 2, 2);
  for (let y = 1; y < 4; y++) b.put('window', 1, y, 0, 0).put('window', 1, y, 2, 2);
  for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++) b.put('roof', x, 3, z);
  s.push({ name: 'Harkonnen Watchtower', set: 'harkonnen', tags: ['tower', 'stronghold'], pieces: b.list() });

  b = Builder().room(0, 0, 3, 3, 0, { windows: true, roof: true }).room(5, 0, 3, 3, 0, { windows: true, roof: true });
  for (let x = 3; x <= 4; x++) for (let z = 0; z < 3; z++) b.put('foundation', x, 0, z);
  b.del('wall', 2, 0, 1, 1).del('wall', 5, 0, 1, 3).put('doorway', 2, 0, 1, 1).put('doorway', 5, 0, 1, 3);
  b.put('wall', 3, 0, 0, 0).put('wall', 4, 0, 0, 0).put('wall', 3, 0, 2, 2).put('wall', 4, 0, 2, 2)
   .put('pillar', 3, 0, 0, 0).put('pillar', 4, 0, 0, 1)
   .put('machine', 1, 0, 1).put('machine', 6, 0, 1).put('light', 1, 0, 0).put('light', 6, 0, 0);
  s.push({ name: 'Atreides Courtyard Estate', set: 'atreides', tags: ['estate', 'large'], pieces: b.list() });

  b = Builder().room(0, 0, 4, 3, 0, { roof: false });
  b.del('wall', 1, 0, 2, 2).put('doorway', 1, 0, 2, 2).put('ramp', 1, 0, 3, 0)
   .put('machine', 0, 0, 0).put('machine', 3, 0, 0, 1).put('light', 2, 0, 1);
  for (let x = 2; x < 4; x++) for (let z = 0; z < 3; z++) b.put('foundation', x, 1, z);
  b.put('stairs', 1, 0, 0, 1).put('foundation', 1, 1, 0).put('wall', 1, 1, 0, 0).put('wall', 2, 1, 0, 0).put('wall', 3, 1, 0, 0)
   .put('wall', 3, 1, 1, 1).put('wall', 3, 1, 2, 1).put('wall', 3, 1, 2, 2);
  s.push({ name: 'Smuggler Hideout', set: 'smuggler', tags: ['hideout', 'two-level'], pieces: b.list() });

  b = Builder();
  for (let x = 0; x < 2; x++) for (let z = 0; z < 2; z++) b.put('foundation', x, 0, z).put('roof', x, 0, z);
  b.put('pillar', 0, 0, 0, 0).put('pillar', 1, 0, 0, 1).put('pillar', 1, 0, 1, 2).put('pillar', 0, 0, 1, 3).put('machine', 0, 0, 0).put('light', 0, 0, 0);
  s.push({ name: 'CHOAM Trade Stall', set: 'choam', tags: ['stall', 'tiny'], pieces: b.list() });

  b = Builder().room(0, 0, 4, 4, 0, { windows: true });
  b.del('wall', 1, 0, 3, 2).put('doorway', 1, 0, 3, 2).put('column', 1, 0, 1).put('column', 2, 0, 2);
  for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) b.put(x === 1 && z === 0 ? 'hatch' : 'dome', x, 0, z);
  for (let x = 0; x < 4; x++) b.put('railing', x, 0, 4, 2);
  b.put('machine', 3, 0, 0, 3).put('light', 2, 0, 1);
  s.push({ name: 'Sardaukar Barracks', set: 'sardaukar', tags: ['barracks', 'imperial'], pieces: b.list() });

  s.forEach(x => { x.author = 'Sample'; });
  return s;
}
const SAMPLES = makeSamples();

/* ---------- 3D scene ---------- */
const canvas = $('gl');
const viewport = $('viewport');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e0e10);
scene.fog = new THREE.Fog(0x0e0e10, 120, 260);
const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 600);
camera.position.set(28, 26, 32);
const controls = new THREE.OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2 - 0.02;
controls.maxDistance = 200;
controls.minDistance = 4;

scene.add(new THREE.HemisphereLight(0xdde8ff, 0x3a2f22, 0.75));
const sun = new THREE.DirectionalLight(0xfff0d0, 0.9);
sun.position.set(30, 60, 20);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x88aaff, 0.25);
fill.position.set(-30, 20, -40);
scene.add(fill);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(600, 600),
  new THREE.MeshLambertMaterial({ color: 0x2b2118 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.06;
scene.add(ground);

const GRID_N = LIM * 2 + 1;
const grid = new THREE.GridHelper(GRID_N * C, GRID_N, 0xd4a24c, 0x4a3a2c);
grid.material.transparent = true;
grid.material.opacity = 0.55;
grid.position.set(0, 0.02, 0);
scene.add(grid);

const root = new THREE.Group();
scene.add(root);

let mats = Models.materials('fremen');
const ghostMats = Models.ghostMats;
const build = (type, m) => Models.instance(type, state.set, m);

function place(obj, p) {
  obj.position.set(p.x * C, p.y * H, p.z * C);
  const t = p.t;
  obj.rotation.y = (t === 'ramp' || t === 'stairs') ? -(p.r - 2) * Math.PI / 2 : -p.r * Math.PI / 2;
}

/* ---------- editor state ---------- */
const state = {
  pieces: new Map(),   // key -> {p, obj}
  tool: 'build',
  type: 'foundation',
  rot: 0,
  level: 0,
  set: 'fremen',
  dirty: false,
};
let hist = [], hi = -1;

function applySet(id) {
  state.set = id;
  mats = Models.materials(id);
  $('bpSet').value = id;
  list().forEach(addObj);
  ghostSig = '';
  updateSelection();
  renderThumbs();
  updateGhost();
}

function addObj(p) {
  const k = keyOf(p);
  removeObj(k);
  const obj = build(p.t, mats);
  place(obj, p);
  obj.userData.key = k;
  root.add(obj);
  state.pieces.set(k, { p, obj });
}
function removeObj(k) {
  const e = state.pieces.get(k);
  if (!e) return false;
  selKeys.delete(k);
  root.remove(e.obj);
  state.pieces.delete(k);
  return true;
}
function list() { return [...state.pieces.values()].map(e => e.p); }

function snap() { return JSON.stringify(list()); }
function commit() {
  hist = hist.slice(0, hi + 1);
  hist.push(snap());
  if (hist.length > 100) hist.shift();
  hi = hist.length - 1;
  state.dirty = true;
  refresh();
}
function restore(s) {
  for (const k of [...state.pieces.keys()]) removeObj(k);
  JSON.parse(s).forEach(addObj);
  state.dirty = true;
  updateSelection();
  refresh();
}
function undo() { if (hi > 0) { hi--; restore(hist[hi]); } }
function redo() { if (hi < hist.length - 1) { hi++; restore(hist[hi]); } }

function load(data) {
  const v = validate(data);
  for (const k of [...state.pieces.keys()]) removeObj(k);
  applySet(v.set);
  $('bpName').value = v.name;
  v.pieces.forEach(addObj);
  selKeys.clear();
  hist = [snap()]; hi = 0;
  state.dirty = false;
  state.level = 0;
  updateSelection();
  refresh();
  frame();
  return v;
}

function frame() {
  const ps = list();
  if (!ps.length) { controls.target.set(0, 0, 0); return; }
  const box = new THREE.Box3();
  ps.forEach(p => box.expandByPoint(new THREE.Vector3(p.x * C, p.y * H, p.z * C)));
  const c = box.getCenter(new THREE.Vector3());
  const size = Math.max(box.getSize(new THREE.Vector3()).length() + C * 2, 14);
  controls.target.set(c.x, c.y + 2, c.z);
  camera.position.set(c.x + size * 0.8, c.y + size * 0.7, c.z + size * 0.9);
  controls.update();
}

function exportData() {
  return {
    app: 'salusa-blueprint',
    version: 1,
    name: $('bpName').value.trim() || 'Untitled base',
    set: state.set,
    pieces: list().map(p => ({ t: p.t, x: p.x, y: p.y, z: p.z, r: p.r })),
  };
}
function download(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = slug(name) + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- UI refresh ---------- */
function refresh() {
  const counts = {};
  list().forEach(p => { counts[p.t] = (counts[p.t] || 0) + 1; });
  const bl = $('buildList');
  bl.textContent = '';
  let total = 0;
  TYPES.forEach(t => {
    if (!counts[t]) return;
    total += counts[t];
    const d = document.createElement('div');
    const a = document.createElement('span'); a.textContent = DEFS[t].label;
    const b = document.createElement('b'); b.textContent = counts[t];
    d.append(a, b);
    bl.appendChild(d);
  });
  if (!total) { bl.textContent = 'Nothing placed yet.'; bl.className = 'buildlist muted'; } else bl.className = 'buildlist';
  $('total').textContent = total;
  $('lvNow').textContent = state.level;
  grid.position.y = state.level * H + 0.02;
  $('undo').disabled = hi <= 0;
  $('redo').disabled = hi >= hist.length - 1;
  document.querySelectorAll('.piece').forEach(b => b.classList.toggle('on', b.dataset.t === state.type && state.tool === 'build'));
  $('toolBuild').classList.toggle('on', state.tool === 'build');
  $('toolSelect').classList.toggle('on', state.tool === 'select');
  $('toolErase').classList.toggle('on', state.tool === 'erase');
  updateGhost();
}

function buildPalette() {
  const pl = $('pieceList');
  let lastCat = '';
  TYPES.forEach((t, i) => {
    if (DEFS[t].cat !== lastCat) {
      lastCat = DEFS[t].cat;
      const gh = document.createElement('div');
      gh.className = 'pgroup';
      gh.textContent = lastCat;
      pl.appendChild(gh);
    }
    const b = document.createElement('button');
    b.className = 'piece';
    b.dataset.t = t;
    b.title = DEFS[t].label + ' – ' + DEFS[t].hint;
    const img = document.createElement('img');
    img.alt = '';
    b.appendChild(img);
    const left = document.createElement('span');
    left.textContent = DEFS[t].label;
    const sm = document.createElement('small');
    sm.textContent = DEFS[t].hint;
    left.appendChild(sm);
    const k = document.createElement('kbd');
    if (i < 10) { k.textContent = (i + 1) % 10; b.append(left, k); } else b.append(left);
    b.onclick = () => selectType(t);
    pl.appendChild(b);
  });
  Object.entries(SETS).forEach(([id, s]) => {
    const o = document.createElement('option');
    o.value = id; o.textContent = s.label;
    $('bpSet').appendChild(o);
  });
}
function selectType(t) { state.type = t; state.tool = 'build'; refresh(); }
function rotateSel() {
  state.rot = (state.rot + 1) % 4;
  updateGhost();
}

/* ---------- piece thumbnails ---------- */
const thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
thumbR.setSize(112, 112);
const thumbScene = new THREE.Scene();
thumbScene.add(new THREE.HemisphereLight(0xffffff, 0x554433, 0.9));
const thumbSun = new THREE.DirectionalLight(0xfff0d0, 0.9);
thumbSun.position.set(5, 10, 6);
thumbScene.add(thumbSun);
const thumbCam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
function renderThumbs() {
  const m = Models.materials(state.set);
  document.querySelectorAll('.piece').forEach(btn => {
    const o = Models.instance(btn.dataset.t, state.set, m);
    thumbScene.add(o);
    const box = new THREE.Box3().setFromObject(o);
    const c = box.getCenter(new THREE.Vector3());
    const r = box.getSize(new THREE.Vector3()).length() / 2;
    thumbCam.position.copy(c).add(new THREE.Vector3(1, 0.85, 1.15).normalize().multiplyScalar(r * 2.9));
    thumbCam.lookAt(c);
    thumbR.render(thumbScene, thumbCam);
    btn.querySelector('img').src = thumbR.domElement.toDataURL();
    thumbScene.remove(o);
  });
}

/* ---------- selection ---------- */
const selKeys = new Set();
const selBoxes = [];
function updateSelection() {
  for (const k of [...selKeys]) if (!state.pieces.has(k)) selKeys.delete(k);
  selBoxes.forEach(b => scene.remove(b));
  selBoxes.length = 0;
  let n = 0;
  for (const k of selKeys) {
    if (n++ > 150) break;
    const b = new THREE.Box3Helper(new THREE.Box3().setFromObject(state.pieces.get(k).obj), 0xffb02e);
    scene.add(b);
    selBoxes.push(b);
  }
  const panel = $('selPanel');
  if (panel) {
    panel.hidden = !selKeys.size;
    $('selCount').textContent = selKeys.size;
  }
}
function mutateSelection(fn) {
  const ps = [...selKeys].map(k => state.pieces.get(k)).filter(Boolean).map(e => ({ ...e.p }));
  if (!ps.length) return;
  const out = ps.map(fn);
  if (out.some(p => !p || Math.abs(p.x) > LIM || Math.abs(p.z) > LIM || p.y < 0 || p.y > MAXLV)) { toast('Out of bounds.', true); return; }
  ps.forEach(p => removeObj(keyOf(p)));
  selKeys.clear();
  out.forEach(p => { addObj(p); selKeys.add(keyOf(p)); });
  commit();
  updateSelection();
}
const moveSel = (dx, dy, dz) => mutateSelection(p => ({ ...p, x: p.x + dx, y: p.y + dy, z: p.z + dz }));
const rotSel = () => mutateSelection(p => ({ ...p, r: (p.r + 1) % 4 }));
function deleteSel() {
  if (!selKeys.size) return;
  [...selKeys].forEach(removeObj);
  selKeys.clear();
  commit();
  updateSelection();
}
function dupSel() {
  const ps = [...selKeys].map(k => state.pieces.get(k).p);
  if (!ps.length) return;
  const w = Math.max(...ps.map(p => p.x)) - Math.min(...ps.map(p => p.x)) + 1;
  const copies = ps.map(p => ({ ...p, x: p.x + w }));
  if (copies.some(p => p.x > LIM)) { toast('No room to the east.', true); return; }
  selKeys.clear();
  copies.forEach(p => { addObj(p); selKeys.add(keyOf(p)); });
  commit();
  updateSelection();
}

/* ---------- ghost & hover ---------- */
let ghost = null, ghostSig = '';
const hoverBox = new THREE.Box3Helper(new THREE.Box3(), 0xe5534b);
hoverBox.visible = false;
scene.add(hoverBox);
let hoverCell = null;     // {x,z,lx,lz}
let hoverKey = null;

function target() {
  if (!hoverCell) return null;
  const def = DEFS[state.type];
  const { x, z, lx, lz } = hoverCell;
  let r = state.rot;
  if (def.slot === 'edge') r = Math.abs(lx) > Math.abs(lz) ? (lx > 0 ? 1 : 3) : (lz < 0 ? 0 : 2);
  else if (def.slot === 'corner') r = lx < 0 ? (lz < 0 ? 0 : 3) : (lz < 0 ? 1 : 2);
  return { t: state.type, x, y: state.level, z, r };
}
function updateGhost() {
  const tg = state.tool === 'build' && !walk.on ? target() : null;
  const sig = tg ? `${tg.t}|${tg.x}|${tg.y}|${tg.z}|${tg.r}` : '';
  if (sig === ghostSig) return;
  ghostSig = sig;
  if (ghost) { scene.remove(ghost); ghost = null; }
  if (!tg) return;
  ghost = build(tg.t, ghostMats);
  place(ghost, tg);
  scene.add(ghost);
}
function updateHud() {
  const hud = $('hud');
  if (walk.on) { hud.textContent = 'Walk-through'; return; }
  if (state.tool === 'erase') { hud.textContent = hoverKey ? 'Click to remove piece' : 'Erase tool: point at a piece'; return; }
  if (state.tool === 'select') { hud.textContent = hoverKey ? 'Click to select (Shift to add)' : 'Select tool: click a piece'; return; }
  const tg = target();
  hud.textContent = tg
    ? `${DEFS[tg.t].label} · cell ${tg.x}, ${tg.z} · level ${tg.y}` + (DEFS[tg.t].rot || DEFS[tg.t].slot === 'edge' || DEFS[tg.t].slot === 'corner' ? ` · facing ${['N', 'E', 'S', 'W'][tg.r]}` : '')
    : 'Move over the grid to place pieces';
}

/* ---------- pointer interaction ---------- */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();

function setNdc(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
}
function pieceAtPointer() {
  const hits = ray.intersectObjects(root.children, true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.key) o = o.parent;
    if (o) return o;
  }
  return null;
}
function onMove(e) {
  if (walk.on) return;
  setNdc(e);
  if (state.tool === 'build') {
    plane.constant = -state.level * H;
    if (ray.ray.intersectPlane(plane, hit)) {
      const x = Math.round(hit.x / C), z = Math.round(hit.z / C);
      hoverCell = Math.abs(x) <= LIM && Math.abs(z) <= LIM ? { x, z, lx: hit.x - x * C, lz: hit.z - z * C } : null;
    } else hoverCell = null;
    hoverBox.visible = false; hoverKey = null;
  } else {
    hoverCell = null;
    const o = pieceAtPointer();
    hoverKey = o ? o.userData.key : null;
    if (o) { hoverBox.box.setFromObject(o); hoverBox.visible = true; } else hoverBox.visible = false;
  }
  updateGhost();
  updateHud();
}
let down = null;
canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, b: e.button }; });
canvas.addEventListener('pointermove', onMove);
canvas.addEventListener('pointerleave', () => { hoverCell = null; hoverKey = null; hoverBox.visible = false; updateGhost(); updateHud(); });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerup', e => {
  if (!down || walk.on) { down = null; return; }
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5;
  const btn = down.b;
  down = null;
  if (moved) return;
  setNdc(e);
  if (btn === 2 || (btn === 0 && state.tool === 'erase')) {
    const o = pieceAtPointer();
    if (o && removeObj(o.userData.key)) { hoverBox.visible = false; commit(); }
  } else if (btn === 0 && state.tool === 'select') {
    const o = pieceAtPointer();
    if (!e.shiftKey) selKeys.clear();
    if (o) { const k = o.userData.key; if (e.shiftKey && selKeys.has(k)) selKeys.delete(k); else selKeys.add(k); }
    updateSelection();
  } else if (btn === 0) {
    onMove(e);
    const tg = target();
    if (tg) {
      const ex = state.pieces.get(keyOf(tg));
      if (ex && ex.p.t === tg.t && ex.p.r === tg.r) return;
      addObj(tg);
      commit();
    }
  }
});

/* ---------- walk-through mode ---------- */
const walk = { on: false, yaw: 0, pitch: 0, vy: 0, pos: new THREE.Vector3(), keys: new Set(), saved: null, locked: false };
const wRay = new THREE.Raycaster();
const DOWN = new THREE.Vector3(0, -1, 0);
const normalOf = h => h.face.normal.clone().transformDirection(h.object.matrixWorld);

function floorAt(x, z, y) {
  wRay.set(new THREE.Vector3(x, y + 0.7, z), DOWN);
  wRay.far = 3.5;
  for (const h of wRay.intersectObjects(root.children, true)) if (normalOf(h).y > 0.5) return h.point.y;
  return 0;
}
function blocked(x, z, dx, dz) {
  const dir = new THREE.Vector3(dx, 0, dz).normalize();
  wRay.far = 0.35 + Math.hypot(dx, dz);
  for (const hy of [0.6, 1.4]) {
    wRay.set(new THREE.Vector3(x, walk.pos.y + hy, z), dir);
    for (const h of wRay.intersectObjects(root.children, true)) if (Math.abs(normalOf(h).y) < 0.5) return true;
  }
  return false;
}
function enterWalk() {
  if (walk.on) return;
  walk.saved = { pos: camera.position.clone(), target: controls.target.clone(), fov: camera.fov };
  const ps = list().filter(p => p.t === 'foundation' || p.t === 'triangle');
  let sx = 0, sz = 0, sy = 0;
  if (ps.length) {
    sy = Math.min(...ps.map(p => p.y));
    const low = ps.filter(p => p.y === sy);
    const cx = low.reduce((a, p) => a + p.x, 0) / low.length, cz = low.reduce((a, p) => a + p.z, 0) / low.length;
    const best = low.reduce((a, p) => (Math.hypot(p.x - cx, p.z - cz) < Math.hypot(a.x - cx, a.z - cz) ? p : a));
    sx = best.x; sz = best.z;
  }
  walk.pos.set(sx * C, sy * H + F, sz * C);
  walk.pos.y = floorAt(walk.pos.x, walk.pos.z, walk.pos.y);
  walk.yaw = 0; walk.pitch = 0; walk.vy = 0;
  walk.on = true;
  controls.enabled = false;
  grid.visible = false; hoverBox.visible = false;
  camera.fov = 70; camera.updateProjectionMatrix();
  camera.rotation.order = 'YXZ';
  $('walkHint').hidden = false; $('cross').hidden = false;
  $('walkBtn').textContent = 'Exit walk-through (Esc)';
  updateGhost(); updateHud();
  toast('Click the view to capture the mouse. WASD to move, Esc to exit.');
}
function exitWalk() {
  if (!walk.on) return;
  walk.on = false;
  walk.keys.clear();
  if (document.pointerLockElement) document.exitPointerLock();
  camera.fov = walk.saved.fov; camera.updateProjectionMatrix();
  camera.rotation.order = 'XYZ';
  camera.position.copy(walk.saved.pos);
  controls.target.copy(walk.saved.target);
  controls.enabled = true; controls.update();
  grid.visible = true;
  $('walkHint').hidden = true; $('cross').hidden = true;
  $('walkBtn').textContent = 'Walk through (F)';
  updateGhost(); updateHud();
}
function stepWalk(dt) {
  const k = walk.keys;
  const fwd = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
  const side = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
  if (fwd || side) {
    const sp = (k.has('shift') ? 7 : 3.5) * dt;
    const sin = Math.sin(walk.yaw), cos = Math.cos(walk.yaw);
    let dx = (-sin * fwd + cos * side), dz = (-cos * fwd - sin * side);
    const len = Math.hypot(dx, dz);
    dx = dx / len * sp; dz = dz / len * sp;
    if (dx && !blocked(walk.pos.x, walk.pos.z, dx, 0)) walk.pos.x += dx;
    if (dz && !blocked(walk.pos.x, walk.pos.z, 0, dz)) walk.pos.z += dz;
  }
  const gy = floorAt(walk.pos.x, walk.pos.z, walk.pos.y);
  if (walk.pos.y > gy + 0.03) {
    walk.vy -= 22 * dt;
    walk.pos.y = Math.max(gy, walk.pos.y + walk.vy * dt);
    if (walk.pos.y === gy) walk.vy = 0;
  } else {
    walk.vy = 0;
    walk.pos.y += (gy - walk.pos.y) * Math.min(1, 15 * dt);
  }
  camera.position.set(walk.pos.x, walk.pos.y + 1.7, walk.pos.z);
  camera.rotation.set(walk.pitch, walk.yaw, 0);
}
function look(e) {
  walk.yaw -= e.movementX * 0.0025;
  walk.pitch = clamp(walk.pitch - e.movementY * 0.0025, -1.45, 1.45);
}
canvas.addEventListener('pointermove', e => { if (walk.on && (walk.locked || e.buttons)) look(e); });
canvas.addEventListener('click', () => {
  if (walk.on && !walk.locked && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch { /* drag-to-look still works */ } }
});
document.addEventListener('pointerlockchange', () => {
  const was = walk.locked;
  walk.locked = document.pointerLockElement === canvas;
  if (was && !walk.locked) exitWalk();
});
window.addEventListener('keyup', e => walk.keys.delete(e.key.toLowerCase()));
$('walkBtn').onclick = () => (walk.on ? exitWalk() : enterWalk());

/* ---------- keyboard ---------- */
window.addEventListener('keydown', e => {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || $('view-studio').hidden) return;
  const k = e.key.toLowerCase();
  if (walk.on) {
    if (k === 'escape' || k === 'f') exitWalk();
    else { walk.keys.add(k); if (k.startsWith('arrow') || k === ' ') e.preventDefault(); }
    return;
  }
  if (k === 'f' && !e.ctrlKey && !e.metaKey) { enterWalk(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); }
  else if (e.ctrlKey || e.metaKey || e.altKey) return;
  else if (state.tool === 'select' && selKeys.size && ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'pageup', 'pagedown', 'delete', 'backspace', 'd', 'r', 'escape'].includes(k)) {
    e.preventDefault();
    if (k === 'arrowleft') moveSel(-1, 0, 0); else if (k === 'arrowright') moveSel(1, 0, 0);
    else if (k === 'arrowup') moveSel(0, 0, -1); else if (k === 'arrowdown') moveSel(0, 0, 1);
    else if (k === 'pageup') moveSel(0, 1, 0); else if (k === 'pagedown') moveSel(0, -1, 0);
    else if (k === 'delete' || k === 'backspace') deleteSel();
    else if (k === 'd') dupSel(); else if (k === 'r') rotSel();
    else { selKeys.clear(); updateSelection(); }
  }
  else if (k === 'r') rotateSel();
  else if (k === 's') { state.tool = 'select'; refresh(); }
  else if (k === 'b') { state.tool = 'build'; refresh(); }
  else if (k === 'x') { state.tool = state.tool === 'erase' ? 'build' : 'erase'; refresh(); }
  else if (k === '[' || k === 'pagedown') { state.level = clamp(state.level - 1, 0, MAXLV); refresh(); }
  else if (k === ']' || k === 'pageup') { state.level = clamp(state.level + 1, 0, MAXLV); refresh(); }
  else if (/^[0-9]$/.test(k)) { const t = TYPES[(+k + 9) % 10]; if (t) selectType(t); }
});

/* ---------- buttons ---------- */
$('toolBuild').onclick = () => { state.tool = 'build'; refresh(); };
$('toolErase').onclick = () => { state.tool = 'erase'; refresh(); };
$('toolSelect').onclick = () => { state.tool = 'select'; refresh(); };
$('selMove').onclick = e => { const d = e.target.dataset; if (d.m) { const [dx, dy, dz] = d.m.split(',').map(Number); moveSel(dx, dy, dz); } };
$('selRot').onclick = rotSel;
$('selDup').onclick = dupSel;
$('selDel').onclick = deleteSel;
$('lvDown').onclick = () => { state.level = clamp(state.level - 1, 0, MAXLV); refresh(); };
$('lvUp').onclick = () => { state.level = clamp(state.level + 1, 0, MAXLV); refresh(); };
$('rotate').onclick = rotateSel;
$('undo').onclick = undo;
$('redo').onclick = redo;
$('clear').onclick = () => {
  if (!state.pieces.size) return;
  if (!confirm('Remove every piece? You can still undo.')) return;
  for (const k of [...state.pieces.keys()]) removeObj(k);
  commit();
};
$('bpSet').onchange = e => { applySet(e.target.value); state.dirty = true; };
$('bpName').oninput = () => { state.dirty = true; };
$('exportBtn').onclick = () => { download($('bpName').value, exportData()); state.dirty = false; toast('Exported.'); };
$('copyBtn').onclick = async () => {
  try { await navigator.clipboard.writeText(JSON.stringify(exportData(), null, 2)); toast('JSON copied.'); state.dirty = false; }
  catch { toast('Copy failed: use Export instead.', true); }
};

function importText(text) {
  if (state.dirty && state.pieces.size && !confirm('Replace your current unexported blueprint?')) return false;
  try { const v = load(JSON.parse(text)); toast(`Loaded "${v.name}" (${v.pieces.length} pieces).`); return true; }
  catch (err) { toast(err.message || 'Invalid file.', true); return false; }
}
function importFile(input) {
  const f = input.files[0];
  input.value = '';
  if (!f) return;
  if (f.size > 8e6) return toast('File too large.', true);
  f.text().then(t => { if (importText(t)) go('studio'); });
}
$('importFile').onchange = e => importFile(e.target);
$('homeImport').onchange = e => importFile(e.target);
$('pasteBtn').onclick = () => { $('pasteText').value = ''; $('pasteDlg').showModal(); };
$('pasteDlg').addEventListener('close', () => {
  if ($('pasteDlg').returnValue === 'ok' && $('pasteText').value.trim()) importText($('pasteText').value);
});

window.addEventListener('beforeunload', e => {
  if (state.dirty && state.pieces.size) { e.preventDefault(); e.returnValue = ''; }
});

/* drag & drop a .json anywhere */
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if (f) f.text().then(t => { if (importText(t)) go('studio'); });
});

/* ---------- library ---------- */
let libSet = 'all';
function thumb(cv, bp) {
  const dpr = 2, w = 320, h = 240;
  cv.width = w * dpr; cv.height = h * dpr;
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  const ps = bp.pieces;
  if (!ps.length) return;
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  ps.forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); });
  const s = Math.min((w - 40) / (x1 - x0 + 1), (h - 40) / (z1 - z0 + 1), 48);
  const ox = (w - (x1 - x0 + 1) * s) / 2, oz = (h - (z1 - z0 + 1) * s) / 2;
  const X = x => ox + (x - x0) * s, Z = z => oz + (z - z0) * s;
  const col = SETS[bp.set];
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  const maxY = Math.max(...ps.map(p => p.y));
  g.fillStyle = hex(col.main);
  ps.filter(p => ['foundation', 'triangle', 'ramp', 'stairs', 'halfstairs'].includes(p.t)).sort((a, b) => a.y - b.y).forEach(p => {
    g.globalAlpha = 0.45 + 0.55 * (maxY ? p.y / maxY : 1);
    g.fillRect(X(p.x) + 1, Z(p.z) + 1, s - 2, s - 2);
  });
  g.globalAlpha = 1;
  g.strokeStyle = hex(col.accent); g.lineWidth = 3;
  g.fillStyle = '#e6edf3';
  ps.forEach(p => {
    const cx = X(p.x) + s / 2, cz = Z(p.z) + s / 2, hs = s / 2;
    if (p.t === 'wall' || p.t === 'window' || p.t === 'doorway' || p.t === 'railing' || p.t === 'ladder') {
      g.setLineDash(p.t === 'doorway' ? [4, 6] : []);
      g.strokeStyle = p.t === 'window' ? '#88ccee' : hex(col.accent);
      g.beginPath();
      if (p.r % 2 === 0) { const zz = cz + (p.r === 0 ? -hs : hs); g.moveTo(cx - hs, zz); g.lineTo(cx + hs, zz); }
      else { const xx = cx + (p.r === 1 ? hs : -hs); g.moveTo(xx, cz - hs); g.lineTo(xx, cz + hs); }
      g.stroke();
    } else if (p.t === 'machine') { g.fillStyle = '#d4a24c'; g.fillRect(cx - 4, cz - 4, 8, 8); }
  });
  g.setLineDash([]);
}
function levelsOf(bp) { return Math.max(...bp.pieces.map(p => p.y)) + 1; }
function renderLibrary() {
  const q = $('libSearch').value.trim().toLowerCase();
  const sort = $('libSort').value;
  let items = SAMPLES.filter(b => (libSet === 'all' || b.set === libSet) && (!q || (b.name + ' ' + b.tags.join(' ') + ' ' + SETS[b.set].label).toLowerCase().includes(q)));
  items.sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'pieces' ? b.pieces.length - a.pieces.length : levelsOf(b) - levelsOf(a));
  const grid = $('libGrid');
  grid.textContent = '';
  items.forEach(bp => {
    const c = document.createElement('article');
    c.className = 'card';
    const cv = document.createElement('canvas');
    const body = document.createElement('div'); body.className = 'body';
    const h = document.createElement('h4'); h.textContent = bp.name;
    const tag = document.createElement('div'); tag.className = 'tag';
    tag.textContent = `${SETS[bp.set].label} · ${bp.pieces.length} pieces · ${levelsOf(bp)} level${levelsOf(bp) > 1 ? 's' : ''}`;
    const tg = document.createElement('div'); tg.className = 'muted small'; tg.textContent = bp.tags.map(t => '#' + t).join(' ');
    const act = document.createElement('div'); act.className = 'actions';
    const open = document.createElement('button'); open.className = 'primary'; open.textContent = 'Open in Studio';
    open.onclick = () => {
      if (state.dirty && state.pieces.size && !confirm('Replace your current unexported blueprint?')) return;
      load({ app: 'salusa-blueprint', name: bp.name, set: bp.set, pieces: bp.pieces });
      go('studio');
    };
    const dl = document.createElement('button'); dl.textContent = 'Download';
    dl.onclick = () => download(bp.name, { app: 'salusa-blueprint', version: 1, name: bp.name, set: bp.set, pieces: bp.pieces });
    act.append(open, dl);
    body.append(h, tag, tg, act);
    c.append(cv, body);
    grid.appendChild(c);
    thumb(cv, bp);
  });
  $('libEmpty').hidden = items.length > 0;
}
function buildChips() {
  const box = $('libChips');
  [['all', 'All'], ...Object.entries(SETS).map(([k, v]) => [k, v.label])].forEach(([k, label]) => {
    const b = document.createElement('button');
    b.className = 'chip' + (k === 'all' ? ' on' : '');
    b.textContent = label;
    b.onclick = () => {
      libSet = k;
      box.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b));
      renderLibrary();
    };
    box.appendChild(b);
  });
}
$('libSearch').oninput = renderLibrary;
$('libSort').onchange = renderLibrary;

/* ---------- routing & render loop ---------- */
function go(view) { if (location.hash !== '#' + view) location.hash = view; else route(); }
function route() {
  const v = ['home', 'studio', 'guide'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
  ['home', 'studio', 'guide'].forEach(n => { $('view-' + n).hidden = n !== v; });
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === v));
  $('siteFoot').hidden = v === 'studio';
  if (v !== 'studio') $('view-' + v).appendChild($('siteFoot'));
  if (v !== 'studio' && walk.on) exitWalk();
  if (v === 'studio') resize();
}
window.addEventListener('hashchange', route);

function resize() {
  const w = viewport.clientWidth, h = viewport.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport);

let lastT = performance.now();
function loop() {
  requestAnimationFrame(loop);
  if ($('view-studio').hidden) return;
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (walk.on) stepWalk(dt); else controls.update();
  renderer.render(scene, camera);
}

/* ---------- init ---------- */
buildPalette();
buildChips();
renderLibrary();
applySet('fremen');
hist = [snap()]; hi = 0;
refresh();
route();
loop();
})();
