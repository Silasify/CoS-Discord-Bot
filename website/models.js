/* Piece models: stylised after the in-game building sets.
   Each piece is built once per (type, set) from box/cylinder parts, merged per material slot,
   then instanced cheaply. Dimensions are approximations, not game data. */
(() => {
'use strict';

const C = 4;            // cell size
const H = 3.4;          // level height (floor top to next floor top)
const F = 0.6;          // foundation / floor thickness
const WH = H - F;       // wall height above the floor
const WT = 0.45;        // wall thickness

const STYLES = {
  atreides:  { main: 0xd2c6a8, accent: 0x3f7570, trim: 0xa5946e, glow: 0x6fe0d2, tex: 'blocks',     tex2: 'sand',   detail: 'pilaster', seg: 12 },
  harkonnen: { main: 0x474c55, accent: 0x1a1d22, trim: 0x7d2626, glow: 0xff3b30, tex: 'plates',     tex2: 'plates', detail: 'ribs',     seg: 6,  metal: 0.55 },
  fremen:    { main: 0xc4a572, accent: 0x8a6a40, trim: 0xa38256, glow: 0xffb35a, tex: 'sand',       tex2: 'sand',   detail: 'rough',    seg: 20 },
  smuggler:  { main: 0x946d49, accent: 0x34383a, trim: 0x6a5039, glow: 0x4cd2c8, tex: 'corrugated', tex2: 'plates', detail: 'scrap',    seg: 8,  metal: 0.4 },
  choam:     { main: 0xd8d9d6, accent: 0x7c8084, trim: 0xe07b2a, glow: 0xff9a3c, tex: 'plates',     tex2: 'plates', detail: 'panel',    seg: 8,  metal: 0.25 },
  sardaukar: { main: 0x5d626b, accent: 0x2a2d33, trim: 0xc79a2e, glow: 0xffcf5a, tex: 'angular',    tex2: 'angular', detail: 'angular', seg: 6,  metal: 0.5 },
};

/* ---------- textures & materials ---------- */
function makeTex(kind, color) {
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const g = cv.getContext('2d');
  const col = new THREE.Color(color);
  const css = k => '#' + col.clone().multiplyScalar(k).getHexString();
  g.fillStyle = css(1);
  g.fillRect(0, 0, s, s);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.06)';
    g.fillRect(rnd() * s, rnd() * s, 2 + rnd() * 3, 2);
  }
  g.strokeStyle = 'rgba(0,0,0,.32)';
  g.lineWidth = 2;
  if (kind === 'blocks') {
    for (let r = 0; r < 4; r++) {
      const y = r * 32;
      g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke();
      for (let x = (r % 2) * 32; x < s; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); }
    }
  } else if (kind === 'plates') {
    g.beginPath(); g.moveTo(0, 64); g.lineTo(s, 64); g.moveTo(64, 0); g.lineTo(64, s); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.35)';
    for (const [x, y] of [[8, 8], [120, 8], [8, 120], [120, 120], [56, 56], [72, 72], [56, 72], [72, 56]]) { g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); }
  } else if (kind === 'corrugated') {
    for (let x = 0; x < s; x += 8) {
      const gr = g.createLinearGradient(x, 0, x + 8, 0);
      gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.25)');
      g.fillStyle = gr; g.fillRect(x, 0, 8, s);
    }
    g.fillStyle = 'rgba(120,50,10,.25)';
    for (let i = 0; i < 14; i++) g.fillRect(rnd() * s, rnd() * s, 6 + rnd() * 16, 3 + rnd() * 10);
  } else if (kind === 'angular') {
    g.beginPath(); g.moveTo(0, 0); g.lineTo(s, s); g.moveTo(s, 0); g.lineTo(0, s); g.stroke();
    g.strokeRect(6, 6, s - 12, s - 12);
  } else if (kind === 'sand') {
    for (let i = 0; i < 24; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.06)' : 'rgba(255,240,200,.08)'; g.beginPath(); g.arc(rnd() * s, rnd() * s, 6 + rnd() * 14, 0, 7); g.fill(); }
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

const matCache = {};
const shared = {
  glass: new THREE.MeshStandardMaterial({ color: 0x8cc6e0, transparent: true, opacity: 0.42, roughness: 0.1, metalness: 0.2 }),
  tech: new THREE.MeshStandardMaterial({ color: 0xe9e5da, roughness: 0.45, metalness: 0.15 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xd2691e, roughness: 0.5 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.5, metalness: 0.6 }),
};
function materials(id) {
  if (!matCache[id]) {
    const st = STYLES[id], mt = st.metal || 0.05;
    matCache[id] = {
      main: new THREE.MeshStandardMaterial({ map: makeTex(st.tex, st.main), roughness: 0.88, metalness: mt }),
      accent: new THREE.MeshStandardMaterial({ map: makeTex(st.tex2, st.accent), roughness: 0.75, metalness: mt }),
      trim: new THREE.MeshStandardMaterial({ map: makeTex('sand', st.trim), roughness: 0.7, metalness: mt }),
      glow: new THREE.MeshBasicMaterial({ color: st.glow }),
      ...shared,
    };
  }
  return matCache[id];
}
const ghostMat = new THREE.MeshBasicMaterial({ color: 0xd4a24c, transparent: true, opacity: 0.5, depthWrite: false });
const ghostMats = {};
['main', 'accent', 'trim', 'glow', 'glass', 'tech', 'orange', 'dark'].forEach(k => { ghostMats[k] = ghostMat; });

/* ---------- geometry helpers ---------- */
const boxCache = new Map();
function boxGeo(w, h, d) {
  const k = `${w}|${h}|${d}`;
  if (!boxCache.has(k)) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    // world-scaled UVs: one texture tile per 2 units. Face order: +x -x +y -y +z -z
    const sc = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * sc[f][0] / 2, uv.getY(i) * sc[f][1] / 2);
    }
    boxCache.set(k, g.toNonIndexed());
  }
  return boxCache.get(k);
}
function wedgeGeo() {
  const sh = new THREE.Shape();
  sh.moveTo(-C / 2, 0); sh.lineTo(C / 2, 0); sh.lineTo(C / 2, H); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: C, bevelEnabled: false });
  g.translate(0, F, -C / 2);
  g.rotateY(-Math.PI / 2); // high side faces +z (south)
  return g.toNonIndexed();
}
function triGeo() {
  const sh = new THREE.Shape();
  sh.moveTo(-C / 2, -C / 2); sh.lineTo(C / 2, -C / 2); sh.lineTo(-C / 2, C / 2); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: F, bevelEnabled: false });
  g.rotateX(Math.PI / 2);
  g.translate(0, F, 0);
  return g.toNonIndexed();
}

/* ---------- facade detail per set ---------- */
// Local frame: wall centre at origin, face at z = th/2, detail protrudes along +z.
function facade(st, add, w, hgt, y0, th) {
  const mid = y0 + hgt / 2, f = th / 2;
  switch (st.detail) {
    case 'pilaster':
      add(0.45, hgt, 0.14, -w / 2 + 0.22, mid, f + 0.07, 'trim');
      add(0.45, hgt, 0.14, w / 2 - 0.22, mid, f + 0.07, 'trim');
      add(w, 0.3, 0.22, 0, y0 + hgt - 0.15, f + 0.11, 'trim');
      add(w, 0.28, 0.12, 0, y0 + 0.14, f + 0.06, 'trim');
      add(w - 1.3, hgt - 1.3, 0.05, 0, mid, f + 0.025, 'accent');
      break;
    case 'ribs':
      for (let i = 0; i < 7; i++) add(0.16, hgt - 0.6, 0.14, -w / 2 + 0.4 + i * (w - 0.8) / 6, mid - 0.1, f + 0.07, 'accent');
      add(w, 0.34, 0.2, 0, y0 + hgt - 0.17, f + 0.1, 'accent');
      add(w, 0.34, 0.16, 0, y0 + 0.17, f + 0.08, 'accent');
      add(w - 0.5, 0.07, 0.05, 0, y0 + hgt - 0.42, f + 0.03, 'glow');
      break;
    case 'rough':
      add(w, 0.7, 0.18, 0, y0 + 0.35, f + 0.09, 'trim');
      add(w, 0.35, 0.16, 0, y0 + hgt - 0.18, f + 0.08, 'trim');
      add(0.5, hgt * 0.85, 0.2, -w / 2 + 0.3, mid, f + 0.1, 'trim');
      add(0.5, hgt * 0.85, 0.2, w / 2 - 0.3, mid, f + 0.1, 'trim');
      break;
    case 'scrap':
      for (let x = -w / 2 + 0.2; x < w / 2 - 0.1; x += 0.28) add(0.08, hgt - 0.5, 0.06, x, mid, f + 0.03, 'accent');
      add(1.1, 0.9, 0.08, -0.8, y0 + 1.0, f + 0.07, 'trim');
      add(0.8, 0.6, 0.08, 0.9, y0 + 1.9, f + 0.07, 'trim');
      add(w, 0.14, 0.1, 0, y0 + hgt - 0.18, f + 0.05, 'accent');
      add(w, 0.14, 0.1, 0, y0 + 0.2, f + 0.05, 'accent');
      break;
    case 'panel':
      add(w, 0.1, 0.05, 0, y0 + hgt * 0.34, f + 0.025, 'accent');
      add(w, 0.1, 0.05, 0, y0 + hgt * 0.67, f + 0.025, 'accent');
      add(0.1, hgt, 0.05, 0, mid, f + 0.025, 'accent');
      add(w, 0.3, 0.06, 0, y0 + 0.85, f + 0.03, 'trim');
      add(w, 0.22, 0.12, 0, y0 + hgt - 0.11, f + 0.06, 'accent');
      break;
    case 'angular': {
      const a = Math.atan2(w, hgt), L = Math.hypot(w, hgt) - 0.5;
      add(0.2, L, 0.08, 0, mid, f + 0.04, 'accent', { rz: -a });
      add(0.2, L, 0.08, 0, mid, f + 0.04, 'accent', { rz: a });
      add(w, 0.24, 0.14, 0, y0 + hgt - 0.12, f + 0.07, 'trim');
      add(w, 0.24, 0.14, 0, y0 + 0.12, f + 0.07, 'trim');
      add(0.08, hgt * 0.5, 0.05, -w / 2 + 0.3, mid, f + 0.03, 'glow');
      add(0.08, hgt * 0.5, 0.05, w / 2 - 0.3, mid, f + 0.03, 'glow');
      break;
    }
  }
}

/* ---------- template builder ---------- */
const tplCache = new Map();
function template(type, setId) {
  const key = type + '|' + setId;
  if (tplCache.has(key)) return tplCache.get(key);
  const st = STYLES[setId];
  const parts = {};   // slot -> [geometry]
  let fm = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpV = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const push = (slot, geo, m) => { (parts[slot] = parts[slot] || []).push(geo.clone().applyMatrix4(m)); };
  const localM = (x, y, z, o) => {
    tmpE.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ');
    tmpQ.setFromEuler(tmpE);
    return fm.clone().multiply(new THREE.Matrix4().compose(tmpV.set(x, y, z), tmpQ, one));
  };
  const add = (w, h, d, x, y, z, slot, o = {}) => push(slot, boxGeo(w, h, d), localM(x, y, z, o));
  const cyl = (rt, rb, h, seg, x, y, z, slot) => push(slot, new THREE.CylinderGeometry(rt, rb, h, seg).toNonIndexed(), localM(x, y, z, {}));
  const frame = (ry, ox, oz, fn) => {
    const prev = fm;
    fm = prev.clone().multiply(new THREE.Matrix4().makeTranslation(ox, 0, oz)).multiply(new THREE.Matrix4().makeRotationY(ry));
    fn();
    fm = prev;
  };
  const wallFrames = fn => { frame(0, 0, -C / 2, fn); frame(Math.PI, 0, -C / 2, fn); };
  const wallY = F;

  switch (type) {
    case 'foundation':
      add(C, F, C, 0, F / 2, 0, 'main');
      add(C + 0.1, 0.1, C + 0.1, 0, F - 0.08, 0, 'trim');
      add(C + 0.06, 0.14, C + 0.06, 0, 0.07, 0, 'accent');
      add(C - 0.9, 0.03, C - 0.9, 0, F + 0.005, 0, 'accent');
      for (let i = 0; i < 4; i++) frame(i * Math.PI / 2, 0, 0, () => {
        add(0.4, F, 0.3, -C / 2 + 0.05, F / 2, C / 2, 'trim');
        add(C - 1.2, 0.05, 0.05, 0, F * 0.5, C / 2 + 0.02, st.glow && ['ribs', 'panel', 'angular', 'scrap'].includes(st.detail) ? 'glow' : 'accent');
      });
      break;
    case 'triangle':
      push('main', triGeo(), fm);
      add(C * 1.414 + 0.1, 0.12, 0.12, 0, F - 0.06, 0, 'trim', { ry: Math.PI / 4 });
      break;
    case 'wall':
      add(C, WH, WT, 0, wallY + WH / 2, -C / 2, 'main');
      wallFrames(() => facade(st, add, C, WH, wallY, WT));
      break;
    case 'doorway': {
      const dw = 1.9, dh = 2.35, sw = (C - dw) / 2;
      add(sw, WH, WT, -(dw / 2 + sw / 2), wallY + WH / 2, -C / 2, 'main');
      add(sw, WH, WT, (dw / 2 + sw / 2), wallY + WH / 2, -C / 2, 'main');
      add(dw, WH - dh, WT, 0, wallY + dh + (WH - dh) / 2, -C / 2, 'main');
      wallFrames(() => {
        add(0.2, dh, WT + 0.16, -dw / 2 - 0.1, wallY + dh / 2, 0, 'trim');
        add(0.2, dh, WT + 0.16, dw / 2 + 0.1, wallY + dh / 2, 0, 'trim');
        add(dw + 0.4, 0.25, WT + 0.2, 0, wallY + dh + 0.12, 0, 'trim');
        add(sw - 0.1, 0.3, 0.16, -(dw / 2 + sw / 2), wallY + WH - 0.15, WT / 2 + 0.08, 'accent');
        add(sw - 0.1, 0.3, 0.16, (dw / 2 + sw / 2), wallY + WH - 0.15, WT / 2 + 0.08, 'accent');
      });
      add(dw - 0.2, 0.06, 0.08, 0, wallY + dh - 0.05, -C / 2, 'glow');
      break;
    }
    case 'window': {
      const ww = 2.1, wb = 0.95, wh = 1.3, sw = (C - ww) / 2, top = WH - wb - wh;
      add(C, wb, WT, 0, wallY + wb / 2, -C / 2, 'main');
      add(C, top, WT, 0, wallY + wb + wh + top / 2, -C / 2, 'main');
      add(sw, wh, WT, -(ww / 2 + sw / 2), wallY + wb + wh / 2, -C / 2, 'main');
      add(sw, wh, WT, (ww / 2 + sw / 2), wallY + wb + wh / 2, -C / 2, 'main');
      add(ww, wh, 0.06, 0, wallY + wb + wh / 2, -C / 2, 'glass');
      add(0.07, wh, 0.1, 0, wallY + wb + wh / 2, -C / 2, 'accent');
      add(ww, 0.07, 0.1, 0, wallY + wb + wh / 2, -C / 2, 'accent');
      wallFrames(() => {
        add(ww + 0.3, 0.14, WT + 0.16, 0, wallY + wb - 0.07, 0, 'trim');
        add(ww + 0.3, 0.14, WT + 0.16, 0, wallY + wb + wh + 0.07, 0, 'trim');
        add(0.14, wh, WT + 0.16, -ww / 2 - 0.07, wallY + wb + wh / 2, 0, 'trim');
        add(0.14, wh, WT + 0.16, ww / 2 + 0.07, wallY + wb + wh / 2, 0, 'trim');
      });
      break;
    }
    case 'railing': {
      const th = 0.14;
      add(C, 0.12, th, 0, F + 1.05, -C / 2, 'trim');
      add(C, 0.07, 0.08, 0, F + 0.55, -C / 2, 'accent');
      add(C, 0.07, 0.08, 0, F + 0.2, -C / 2, 'accent');
      for (let i = 0; i < 5; i++) add(0.14, 1.1, 0.14, -C / 2 + 0.12 + i * (C - 0.24) / 4, F + 0.55, -C / 2, 'trim');
      break;
    }
    case 'ladder':
      add(0.1, WH, 0.1, -0.35, wallY + WH / 2, -C / 2 + 0.22, 'dark');
      add(0.1, WH, 0.1, 0.35, wallY + WH / 2, -C / 2 + 0.22, 'dark');
      for (let i = 0; i < 9; i++) add(0.7, 0.06, 0.06, 0, wallY + 0.25 + i * 0.3, -C / 2 + 0.22, 'trim');
      add(0.9, 0.12, 0.12, 0, wallY + 0.1, -C / 2 + 0.22, 'accent');
      break;
    case 'pillar':
      frame(0, -C / 2, -C / 2, () => {
        add(0.75, WH, 0.75, 0, wallY + WH / 2, 0, 'main');
        add(0.95, 0.3, 0.95, 0, wallY + 0.15, 0, 'trim');
        add(0.95, 0.3, 0.95, 0, wallY + WH - 0.15, 0, 'trim');
        add(0.4, WH - 0.6, 0.12, 0, wallY + WH / 2, 0.42, 'accent');
        add(0.4, WH - 0.6, 0.12, 0, wallY + WH / 2, -0.42, 'accent');
        add(0.12, WH - 0.6, 0.4, 0.42, wallY + WH / 2, 0, 'accent');
        add(0.12, WH - 0.6, 0.4, -0.42, wallY + WH / 2, 0, 'accent');
      });
      break;
    case 'column':
      cyl(0.5, 0.55, WH, st.seg, 0, wallY + WH / 2, 0, 'main');
      cyl(0.72, 0.72, 0.3, st.seg, 0, wallY + 0.15, 0, 'trim');
      cyl(0.72, 0.72, 0.3, st.seg, 0, wallY + WH - 0.15, 0, 'trim');
      add(1.5, 0.12, 1.5, 0, wallY + WH - 0.36, 0, 'accent');
      break;
    case 'roof':
      add(C, 0.3, C, 0, H - 0.13, 0, 'main');
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(0.5, 0.03, 0.5, x, H - 0.31, z, 'glow');
      break;
    case 'hatch': {
      const o = 1.4, e = (C - o) / 2, y = H - 0.13;
      add(C, 0.3, e, 0, y, -(o / 2 + e / 2), 'main');
      add(C, 0.3, e, 0, y, (o / 2 + e / 2), 'main');
      add(e, 0.3, o, -(o / 2 + e / 2), y, 0, 'main');
      add(e, 0.3, o, (o / 2 + e / 2), y, 0, 'main');
      add(o + 0.3, 0.12, o + 0.3, 0, H + 0.08, 0, 'trim');
      add(o, 0.05, o, 0, H - 0.1, 0, 'glass');
      break;
    }
    case 'dome': {
      const d = new THREE.SphereGeometry(C / 2 + 0.1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed();
      push('main', d, localM(0, H, 0, {}).multiply(new THREE.Matrix4().makeScale(1, 0.75, 1)));
      add(C, 0.3, C, 0, H - 0.15, 0, 'main');
      cyl(C / 2 + 0.14, C / 2 + 0.14, 0.14, 24, 0, H + 0.04, 0, 'trim');
      cyl(0.28, 0.32, 0.25, 12, 0, H + C / 2 * 0.75 + 0.02, 0, 'accent');
      break;
    }
    case 'ramp':
      push('main', wedgeGeo(), fm);
      break;
    case 'stairs': case 'halfstairs': {
      const n = type === 'stairs' ? 8 : 4, rise = type === 'stairs' ? H : H / 2;
      for (let i = 0; i < n; i++) {
        const h = rise * (i + 1) / n, z = -C / 2 + (i + 0.5) * C / n;
        add(C - 0.5, h, C / n, 0, F + h / 2, z, i % 2 ? 'main' : 'accent');
        add(0.25, h + 0.05, C / n, -C / 2 + 0.125, F + (h + 0.05) / 2, z, 'trim');
        add(0.25, h + 0.05, C / n, C / 2 - 0.125, F + (h + 0.05) / 2, z, 'trim');
      }
      break;
    }
    case 'machine':
      add(1.9, 0.18, 1.4, 0, F + 0.09, 0, 'dark');
      add(1.7, 1.0, 1.2, 0, F + 0.68, 0, 'tech');
      add(1.74, 0.16, 1.24, 0, F + 0.42, 0, 'orange');
      add(1.2, 0.08, 0.9, 0, F + 1.22, 0, 'dark');
      cyl(0.26, 0.26, 0.4, 14, -0.45, F + 1.45, 0, 'tech');
      cyl(0.26, 0.26, 0.4, 14, 0.45, F + 1.45, 0, 'tech');
      add(0.3, 0.2, 0.05, 0, F + 0.78, 0.62, 'glow');
      break;
    case 'light':
      add(0.5, 0.08, 0.5, 0, H - 0.04, 0, 'dark');
      add(0.07, 0.5, 0.07, 0, H - 0.33, 0, 'dark');
      cyl(0.32, 0.18, 0.28, 14, 0, H - 0.72, 0, 'glow');
      break;
  }

  const out = Object.entries(parts).map(([slot, geos]) => ({
    slot,
    geo: THREE.BufferGeometryUtils.mergeBufferGeometries(geos, false),
  }));
  tplCache.set(key, out);
  return out;
}

function instance(type, setId, mats) {
  const g = new THREE.Group();
  for (const { slot, geo } of template(type, setId)) g.add(new THREE.Mesh(geo, mats[slot]));
  return g;
}

window.Models = { C, H, F, WH, STYLES, materials, ghostMats, instance };
})();
