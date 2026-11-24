// news-image-20261123 — draws one image summing up the world news of Monday 23 November 2026.
//
// Node 22, standard library only, no network, no randomness and no clock: the same bytes come out
// on every run. The page is composed in a 1024x1024 frame, rasterised at 3x and box-filtered down,
// then written as a PNG to $MAKEFUN_OUTPUT_DIR/entry.png (the grader's /output).

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const SIZE = 1024;
const SS = 3;
const DIM = SIZE * SS;
const PI = Math.PI;

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const C = {
  bgTop: hex('#0A1017'),
  bgBot: hex('#101A25'),
  panel: hex('#131D28'),
  panel2: hex('#0E1620'),
  edge: hex('#243342'),
  ink: hex('#F4F7FA'),
  dim: hex('#B9C7D5'),
  faint: hex('#8496A6'),
  amber: hex('#F2A93B'),
  red: hex('#E4505A'),
  teal: hex('#57AFA2'),
};

// ------------------------------------------------------------------ raster

const fb = new Uint8Array(DIM * DIM * 3);

function setPx(x, y, c) {
  const o = (y * DIM + x) * 3;
  fb[o] = c[0];
  fb[o + 1] = c[1];
  fb[o + 2] = c[2];
}

function fillRect(x, y, w, h, c) {
  const x0 = Math.max(0, Math.round(x * SS));
  const y0 = Math.max(0, Math.round(y * SS));
  const x1 = Math.min(DIM, Math.round((x + w) * SS));
  const y1 = Math.min(DIM, Math.round((y + h) * SS));
  for (let py = y0; py < y1; py++) {
    const row = py * DIM;
    for (let px = x0; px < x1; px++) {
      const o = (row + px) * 3;
      fb[o] = c[0];
      fb[o + 1] = c[1];
      fb[o + 2] = c[2];
    }
  }
}

function disc(cx, cy, r, c) {
  const x0 = Math.max(0, Math.floor((cx - r) * SS));
  const y0 = Math.max(0, Math.floor((cy - r) * SS));
  const x1 = Math.min(DIM, Math.ceil((cx + r) * SS));
  const y1 = Math.min(DIM, Math.ceil((cy + r) * SS));
  const rr = r * SS;
  for (let py = y0; py < y1; py++) {
    const dy = py + 0.5 - cy * SS;
    for (let px = x0; px < x1; px++) {
      const dx = px + 0.5 - cx * SS;
      if (dx * dx + dy * dy <= rr * rr) setPx(px, py, c);
    }
  }
}

function roundRect(x, y, w, h, r, c) {
  const x0 = Math.max(0, Math.floor(x * SS));
  const y0 = Math.max(0, Math.floor(y * SS));
  const x1 = Math.min(DIM, Math.ceil((x + w) * SS));
  const y1 = Math.min(DIM, Math.ceil((y + h) * SS));
  const cx = (x + w / 2) * SS;
  const cy = (y + h / 2) * SS;
  const hw = (w / 2) * SS;
  const hh = (h / 2) * SS;
  const rr = r * SS;
  for (let py = y0; py < y1; py++) {
    const dy = Math.abs(py + 0.5 - cy) - (hh - rr);
    for (let px = x0; px < x1; px++) {
      const dx = Math.abs(px + 0.5 - cx) - (hw - rr);
      if (dx <= 0 && dy <= 0) {
        setPx(px, py, c);
      } else {
        const qx = dx > 0 ? dx : 0;
        const qy = dy > 0 ? dy : 0;
        if (qx * qx + qy * qy <= rr * rr) setPx(px, py, c);
      }
    }
  }
}

function poly(pts, c) {
  const n = pts.length;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 1; i < n; i += 2) {
    if (pts[i] < minY) minY = pts[i];
    if (pts[i] > maxY) maxY = pts[i];
  }
  const y0 = Math.max(0, Math.floor(minY * SS));
  const y1 = Math.min(DIM - 1, Math.ceil(maxY * SS));
  const xs = [];
  for (let py = y0; py <= y1; py++) {
    const yc = (py + 0.5) / SS;
    xs.length = 0;
    for (let i = 0; i < n; i += 2) {
      const ax = pts[i];
      const ay = pts[i + 1];
      const bx = pts[(i + 2) % n];
      const by = pts[(i + 3) % n];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) {
        xs.push(ax + ((yc - ay) * (bx - ax)) / (by - ay));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const sx = Math.max(0, Math.round(xs[k] * SS));
      const ex = Math.min(DIM, Math.round(xs[k + 1] * SS));
      for (let px = sx; px < ex; px++) setPx(px, py, c);
    }
  }
}

function seg(ax, ay, bx, by, h, c) {
  const x0 = Math.max(0, Math.floor((Math.min(ax, bx) - h) * SS));
  const y0 = Math.max(0, Math.floor((Math.min(ay, by) - h) * SS));
  const x1 = Math.min(DIM, Math.ceil((Math.max(ax, bx) + h) * SS));
  const y1 = Math.min(DIM, Math.ceil((Math.max(ay, by) + h) * SS));
  const hh = h * SS;
  const axs = ax * SS;
  const ays = ay * SS;
  const bxs = bx * SS;
  const bys = by * SS;
  const vx = bxs - axs;
  const vy = bys - ays;
  const len2 = vx * vx + vy * vy;
  for (let py = y0; py < y1; py++) {
    const pyc = py + 0.5;
    for (let px = x0; px < x1; px++) {
      const pxc = px + 0.5;
      let t = 0;
      if (len2 > 0) {
        t = ((pxc - axs) * vx + (pyc - ays) * vy) / len2;
        if (t < 0) t = 0;
        else if (t > 1) t = 1;
      }
      const dx = pxc - (axs + t * vx);
      const dy = pyc - (ays + t * vy);
      if (dx * dx + dy * dy <= hh * hh) setPx(px, py, c);
    }
  }
}

function stroke(pts, w, c) {
  const h = w / 2;
  for (let i = 0; i + 1 < pts.length; i += 2) disc(pts[i], pts[i + 1], h, c);
  for (let i = 0; i + 3 < pts.length; i += 2) seg(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], h, c);
}

// ------------------------------------------------------------------ glyphs

function arcPts(cx, cy, rx, ry, a0, a1, n = 14) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = a0 + ((a1 - a0) * i) / n;
    out.push(cx + rx * Math.cos(t), cy + ry * Math.sin(t));
  }
  return out;
}

function cat(...ps) {
  const o = [];
  for (const p of ps) for (let i = 0; i < p.length; i++) o.push(p[i]);
  return o;
}

const ADV = 0.62;   // glyph advance in em
const GW = 0.6;     // glyph box width in em

// A single-stroke geometric face: every glyph is a set of polylines on a 0.6 x 1 em box.
const GLYPHS = {
  A: [[0, 1, 0.3, 0, 0.6, 1], [0.115, 0.68, 0.485, 0.68]],
  B: [
    [0, 0, 0, 1],
    cat([0, 0, 0.33, 0], arcPts(0.33, 0.26, 0.21, 0.26, -PI / 2, PI / 2), [0.33, 0.52, 0, 0.52]),
    cat([0, 0.52, 0.37, 0.52], arcPts(0.37, 0.76, 0.23, 0.24, -PI / 2, PI / 2), [0.37, 1, 0, 1]),
  ],
  C: [arcPts(0.32, 0.5, 0.29, 0.5, 0.72, 2 * PI - 0.72)],
  D: [[0, 0, 0, 1], cat([0, 0, 0.27, 0], arcPts(0.27, 0.5, 0.33, 0.5, -PI / 2, PI / 2), [0.27, 1, 0, 1])],
  E: [[0.55, 0, 0, 0, 0, 1, 0.55, 1], [0, 0.52, 0.45, 0.52]],
  F: [[0.55, 0, 0, 0, 0, 1], [0, 0.5, 0.42, 0.5]],
  G: [
    arcPts(0.31, 0.5, 0.29, 0.5, 0.72, 2 * PI - 0.72),
    [0.6, 0.5, 0.35, 0.5],
    [0.6, 0.5, 0.6, 0.78, 0.55, 0.83],
  ],
  H: [[0, 0, 0, 1], [0.6, 0, 0.6, 1], [0, 0.52, 0.6, 0.52]],
  I: [[0.3, 0, 0.3, 1]],
  J: [cat([0.55, 0, 0.55, 0.77], arcPts(0.31, 0.77, 0.24, 0.23, 0, PI))],
  K: [[0, 0, 0, 1], [0.58, 0, 0, 0.56], [0.19, 0.4, 0.6, 1]],
  L: [[0, 0, 0, 1, 0.55, 1]],
  M: [[0, 1, 0, 0, 0.3, 0.62, 0.6, 0, 0.6, 1]],
  N: [[0, 1, 0, 0, 0.6, 1, 0.6, 0]],
  O: [arcPts(0.3, 0.5, 0.3, 0.5, 0, 2 * PI)],
  P: [cat([0, 1, 0, 0, 0.35, 0], arcPts(0.35, 0.27, 0.22, 0.27, -PI / 2, PI / 2), [0.35, 0.54, 0, 0.54])],
  Q: [arcPts(0.3, 0.5, 0.3, 0.5, 0, 2 * PI), [0.37, 0.73, 0.62, 1.02]],
  R: [
    cat([0, 1, 0, 0, 0.35, 0], arcPts(0.35, 0.27, 0.22, 0.27, -PI / 2, PI / 2), [0.35, 0.54, 0, 0.54]),
    [0.26, 0.54, 0.6, 1],
  ],
  S: [[0.58, 0.09, 0.44, 0.0, 0.15, 0.0, 0.02, 0.14, 0.06, 0.36, 0.3, 0.46, 0.55, 0.58, 0.58, 0.83, 0.41, 0.99, 0.1, 0.99, 0.0, 0.88]],
  T: [[0, 0, 0.6, 0], [0.3, 0, 0.3, 1]],
  U: [cat([0, 0, 0, 0.76], arcPts(0.3, 0.76, 0.3, 0.24, PI, 0), [0.6, 0.76, 0.6, 0])],
  V: [[0, 0, 0.3, 1, 0.6, 0]],
  W: [[0, 0, 0.14, 1, 0.3, 0.36, 0.46, 1, 0.6, 0]],
  X: [[0, 0, 0.6, 1], [0.6, 0, 0, 1]],
  Y: [[0, 0, 0.3, 0.5, 0.6, 0], [0.3, 0.5, 0.3, 1]],
  Z: [[0, 0, 0.6, 0, 0, 1, 0.6, 1]],
  '0': [arcPts(0.3, 0.5, 0.3, 0.5, 0, 2 * PI), [0.13, 0.85, 0.47, 0.15]],
  '1': [[0.1, 0.17, 0.31, 0, 0.31, 1]],
  '2': [[0.02, 0.2, 0.12, 0.04, 0.32, 0, 0.52, 0.07, 0.58, 0.25, 0.47, 0.45, 0.02, 1, 0.6, 1]],
  '3': [[0.03, 0.07, 0.29, 0, 0.55, 0.1, 0.55, 0.3, 0.33, 0.44], [0.33, 0.44, 0.56, 0.58, 0.56, 0.85, 0.33, 1, 0.05, 0.93]],
  '4': [[0.44, 1, 0.44, 0, 0.02, 0.7, 0.6, 0.7]],
  '5': [[0.54, 0, 0.09, 0, 0.06, 0.43, 0.33, 0.37, 0.55, 0.52, 0.55, 0.81, 0.32, 1, 0.05, 0.91]],
  '6': [[0.5, 0.02, 0.24, 0.1, 0.08, 0.36, 0.05, 0.72, 0.2, 0.97, 0.42, 0.97, 0.56, 0.79, 0.46, 0.59, 0.24, 0.5, 0.06, 0.58]],
  '7': [[0.02, 0, 0.6, 0, 0.24, 1]],
  '8': [arcPts(0.3, 0.26, 0.24, 0.26, 0, 2 * PI), arcPts(0.3, 0.75, 0.28, 0.25, 0, 2 * PI)],
  '9': [[0.1, 0.98, 0.36, 0.9, 0.52, 0.64, 0.55, 0.28, 0.4, 0.03, 0.18, 0.03, 0.05, 0.22, 0.14, 0.42, 0.36, 0.5, 0.54, 0.42]],
  '.': [arcPts(0.3, 0.94, 0.055, 0.055, 0, 2 * PI, 10)],
  ',': [[0.34, 0.87, 0.26, 1.04]],
  '-': [[0.11, 0.55, 0.49, 0.55]],
  ':': [arcPts(0.3, 0.35, 0.05, 0.05, 0, 2 * PI, 10), arcPts(0.3, 0.8, 0.05, 0.05, 0, 2 * PI, 10)],
  '/': [[0.55, 0, 0.05, 1]],
  "'": [[0.3, 0, 0.3, 0.2]],
  '(': [arcPts(0.52, 0.5, 0.3, 0.6, 2.35, 3.93)],
  ')': [arcPts(0.08, 0.5, 0.3, 0.6, -0.79, 0.79)],
  '!': [[0.3, 0, 0.3, 0.7], arcPts(0.3, 0.93, 0.055, 0.055, 0, 2 * PI, 10)],
  '$': [
    [0.58, 0.09, 0.44, 0.0, 0.15, 0.0, 0.02, 0.14, 0.06, 0.36, 0.3, 0.46, 0.55, 0.58, 0.58, 0.83, 0.41, 0.99, 0.1, 0.99, 0.0, 0.88],
    [0.3, -0.08, 0.3, 1.08],
  ],
  '%': [
    arcPts(0.15, 0.18, 0.13, 0.13, 0, 2 * PI),
    arcPts(0.45, 0.82, 0.13, 0.13, 0, 2 * PI),
    [0.55, 0, 0.05, 1],
  ],
  '&': [[0.58, 1, 0.1, 0.62, 0.06, 0.34, 0.2, 0.2, 0.34, 0.34, 0.3, 0.56, 0.06, 0.76, 0.12, 0.96, 0.34, 0.96, 0.58, 0.66], [0.3, 0.52, 0.58, 0.24]],
  '"': [[0.2, 0, 0.2, 0.2], [0.4, 0, 0.4, 0.2]],
  ';': [cat(arcPts(0.3, 0.34, 0.05, 0.05, 0, 2 * PI, 10), [0.34, 0.8, 0.26, 0.97])],
  '?': [cat([0.04, 0.18, 0.16, 0.03, 0.36, 0.01, 0.53, 0.12, 0.5, 0.3, 0.3, 0.44, 0.3, 0.6]), arcPts(0.3, 0.93, 0.055, 0.055, 0, 2 * PI, 10)],
  ' ': [],
};

// Every character the page sets must have a glyph; a missing one would drop silently.
function assertGlyphs() {
  const used = new Set();
  const add = (s) => { for (const ch of String(s).toUpperCase()) used.add(ch); };
  for (const line of LEAD.head) add(line);
  for (const line of LEAD.note) add(line);
  add(LEAD.kicker);
  add('MONDAY');
  add('THE WORLD IN ONE PICTURE');
  add('23 NOVEMBER 2026');
  for (const t of TILES) {
    add(t.kicker);
    for (const line of t.head) add(line);
    add(t.note);
  }
  for (const a of ALSO) add(a);
  add('ALSO TODAY');
  add('ALL AS FIRST REPORTED THAT DAY');
  const missing = [...used].filter((ch) => !(ch in GLYPHS));
  if (missing.length) throw new Error('no glyph for: ' + JSON.stringify(missing));
}

function textWidth(s, size, tracking) {
  if (s.length === 0) return 0;
  return (s.length * (ADV + tracking) - tracking) * size;
}

function text(s, x, baseline, size, color, tracking = 0.1, weight = 0.11) {
  let pen = x;
  const w = size * weight;
  for (const ch of s.toUpperCase()) {
    const g = GLYPHS[ch];
    if (g) {
      for (const p of g) {
        if (p.length === 2) {
          disc(pen + p[0] * size, baseline - size + p[1] * size, w / 2, color);
          continue;
        }
        const pts = [];
        for (let i = 0; i + 1 < p.length; i += 2) {
          pts.push(pen + p[i] * size, baseline - size + p[i + 1] * size);
        }
        stroke(pts, w, color);
      }
    }
    pen += (ADV + tracking) * size;
  }
  return textWidth(s, size, tracking);
}

function textRight(s, xRight, baseline, size, color, tracking = 0.1, weight = 0.11) {
  text(s, xRight - textWidth(s, size, tracking), baseline, size, color, tracking, weight);
}

// Draw a line at the largest size that fits, never above `size`.
function fitText(s, x, baseline, size, maxW, color, tracking = 0.1, weight = 0.11) {
  let sz = size;
  while (sz > 6 && textWidth(s, sz, tracking) > maxW) sz -= 0.5;
  return text(s, x, baseline, sz, color, tracking, weight);
}

// Greedy word wrap into lines that fit maxW at `size`.
function wrap(s, size, maxW, tracking) {
  const words = s.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur === '' ? w : cur + ' ' + w;
    if (textWidth(trial, size, tracking) <= maxW || cur === '') cur = trial;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

// ------------------------------------------------------------------ art

function ring(cx, cy, r, w, c, n = 44) {
  stroke(arcPts(cx, cy, r, r, 0, 2 * PI, n), w, c);
}

function wave(x, y, w, amp, color, thick) {
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push(x + t * w, y + Math.sin(t * PI * 2) * amp);
  }
  stroke(pts, thick, color);
}

// A quadcopter seen from the side: a bar with two rotors and a body.
function drone(cx, cy, s, color) {
  stroke([cx - s, cy, cx + s, cy], 3.2 * s / 16, color);
  stroke([cx - s * 0.62, cy, cx - s * 0.62, cy - s * 0.4], 2.8 * s / 16, color);
  stroke([cx + s * 0.62, cy, cx + s * 0.62, cy - s * 0.4], 2.8 * s / 16, color);
  stroke([cx - s * 0.85, cy - s * 0.4, cx - s * 0.4, cy - s * 0.4], 2.8 * s / 16, color);
  stroke([cx + s * 0.4, cy - s * 0.4, cx + s * 0.85, cy - s * 0.4], 2.8 * s / 16, color);
  disc(cx, cy + s * 0.16, s * 0.22, color);
}

// Three ticks radiating from a point: an impact.
function burst(cx, cy, r0, r1, color, w) {
  for (let i = 0; i < 3; i++) {
    const a = -PI / 2 + i * (PI / 3);
    stroke([
      cx + Math.cos(a) * r0, cy + Math.sin(a) * r0,
      cx + Math.cos(a) * r1, cy + Math.sin(a) * r1,
    ], w, color);
  }
}

// Five-storey block, one corner sheared off, smoke above.
function block(x, y, w, h, ink, broken) {
  if (broken) {
    stroke([x, y + h, x, y, x + w * 0.62, y, x + w * 0.62, y + h * 0.3, x + w, y + h * 0.3, x + w, y + h, x, y + h], 4.5, ink);
  } else {
    stroke([x, y + h, x, y, x + w, y, x + w, y + h, x, y + h], 4.5, ink);
  }
  const cols = 3;
  const rows = 3;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = x + w * 0.12 + c * (w * 0.27);
      const wy = y + h * 0.18 + r * (h * 0.24);
      if (broken && r === 0 && c === 2) continue;
      fillRect(wx, wy, w * 0.15, h * 0.13, ink);
    }
  }
}

// ---------------------------------------------------- lead scene: Ukraine

function sceneUkraine(x, y) {
  const ink = C.ink;
  block(x + 6, y + 40, 132, 96, ink, true);
  // glow in one window
  fillRect(x + 6 + 132 * 0.12 + 2 * (132 * 0.27), y + 40 + 96 * 0.42, 132 * 0.15, 96 * 0.13, C.red);
  // rubble
  poly([x, y + 136, x + 20, y + 122, x + 38, y + 136], ink);
  poly([x + 96, y + 136, x + 112, y + 124, x + 128, y + 136], ink);
  // ground
  stroke([x - 2, y + 136, x + 146, y + 136], 3, C.edge);
  // drone coming in
  drone(x + 128, y + 18, 15, C.amber);
  // flight path
  const trail = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    trail.push(x + 168 + t * 34, y + 6 + t * 24);
  }
  stroke(trail, 2.5, C.amber);
}

// ---------------------------------------------------- icon: Strait of Hormuz

function iconHormuz(x, y) {
  const ink = C.ink;
  // hull
  poly([x + 8, y + 56, x + 92, y + 56, x + 82, y + 78, x + 18, y + 78], ink);
  // superstructure and bow
  fillRect(x + 54, y + 30, 20, 26, ink);
  fillRect(x + 20, y + 46, 28, 10, ink);
  fillRect(x + 61, y + 18, 6, 12, ink);
  // waterline
  wave(x + 2, y + 88, 96, 3, C.dim, 3.5);
  // closed
  ring(x + 20, y + 18, 15, 4.5, C.red, 30);
  stroke([x + 9.5, y + 7.5, x + 30.5, y + 28.5], 4.5, C.red);
  // boom across the channel
  for (let i = 0; i < 4; i++) fillRect(x + 48 + i * 12, y + 14, 7, 3.5, C.red);
}

// ---------------------------------------------------- icon: Khartoum drone strike

function iconKhartoum(x, y) {
  const ink = C.ink;
  // compound
  fillRect(x + 26, y + 44, 46, 44, ink);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) fillRect(x + 33 + c * 13, y + 52 + r * 15, 7, 9, C.panel);
  }
  // flag
  stroke([x + 49, y + 44, x + 49, y + 22], 3.5, C.dim);
  poly([x + 49, y + 22, x + 64, y + 27, x + 49, y + 32], C.teal);
  // impact on the roof corner
  burst(x + 78, y + 44, 5, 14, C.red, 4);
  // drone
  drone(x + 18, y + 16, 13, C.amber);
}

// ---------------------------------------------------- icon: Nepal flood aid

function iconNepal(x, y) {
  const ink = C.ink;
  // ridge line
  stroke([x + 2, y + 82, x + 30, y + 30, x + 56, y + 82], 4, ink);
  stroke([x + 44, y + 82, x + 70, y + 44, x + 98, y + 82], 4, ink);
  // flood water
  wave(x + 2, y + 90, 96, 3, C.teal, 4);
  // parachute and crate
  stroke(arcPts(x + 50, y + 30, 24, 15, PI, 2 * PI, 16), 3.5, ink);
  stroke([x + 27, y + 30, x + 44, y + 44], 2.5, ink);
  stroke([x + 73, y + 30, x + 56, y + 44], 2.5, ink);
  fillRect(x + 41, y + 44, 18, 16, ink);
  stroke([x + 50, y + 46, x + 50, y + 58], 2.5, C.panel);
  stroke([x + 43, y + 52, x + 57, y + 52], 2.5, C.panel);
}

// ---------------------------------------------------- icon: chip and index

function iconChip(x, y) {
  const ink = C.ink;
  roundRect(x + 28, y + 40, 44, 44, 6, ink);
  roundRect(x + 38, y + 50, 24, 24, 3, C.panel);
  for (let i = 0; i < 4; i++) {
    fillRect(x + 35 + i * 8, y + 31, 4, 9, ink);
    fillRect(x + 35 + i * 8, y + 84, 4, 9, ink);
    fillRect(x + 19, y + 47 + i * 8, 9, 4, ink);
    fillRect(x + 72, y + 47 + i * 8, 9, 4, ink);
  }
  // the index it lifted
  stroke([x + 4, y + 26, x + 26, y + 14, x + 48, y + 22, x + 92, y + 2], 4, C.amber);
  poly([x + 92, y + 2, x + 80, y + 1, x + 88, y + 13], C.amber);
}

// ---------------------------------------------------- icon: COP31 collapse

function iconGlobe(x, y) {
  const ink = C.ink;
  ring(x + 50, y + 50, 38, 4, ink, 52);
  stroke(arcPts(x + 50, y + 50, 17, 38, 0, 2 * PI, 34), 2.8, ink);
  stroke([x + 12, y + 50, x + 88, y + 50], 2.8, ink);
  stroke(arcPts(x + 50, y + 50, 38, 14, 0, 2 * PI, 30), 2.4, ink);
  // the split
  stroke([x + 46, y + 13, x + 55, y + 31, x + 42, y + 44, x + 57, y + 54, x + 44, y + 68, x + 52, y + 86], 4.5, C.red);
}

// ------------------------------------------------------------------ page

const M = 40;
const COL_W = 304;
const GAP = 16;

const LEAD = {
  kicker: 'UKRAINE WAR',
  head: ['RUSSIAN STRIKES', 'KILL 15 NEAR KYIV'],
  note: 'Overnight barrages hit Dymer and Vyshneve; at least 15 killed across the Kyiv region',
};

const TILES = [
  { kicker: 'MIDDLE EAST', head: ['IRAN DEFIES', 'HORMUZ BLOCKADE'], note: 'Tehran vows "every means" against the US blockade', art: iconHormuz },
  { kicker: 'AFRICA', head: ['DRONE STRIKE', 'HITS UN IN SUDAN'], note: 'The UN and US condemn the Khartoum attack', art: iconKhartoum },
  { kicker: 'ASIA', head: ['INDIA GIVES', '$1.6BN TO NEPAL'], note: 'Flood recovery aid after August disaster', art: iconNepal },
  { kicker: 'UNITED STATES', head: ['NVIDIA REINSTATES', 'HUANG AS CEO'], note: 'The S&P 500 climbs 4.7% in one session', art: iconChip },
  { kicker: 'CLIMATE', head: ['COP31 ENDS', 'WITH NO DEAL'], note: 'Fossil fuel wording sinks the Antalya text', art: iconGlobe },
];

const ALSO = [
  'EU agrees a 22nd sanctions package against Russia',
  'Drone strike hits a police base in Cucuta, Colombia',
  "NATO's Rutte to meet Trump on Wednesday",
];

function panel(x, y, w, h) {
  roundRect(x, y, w, h, 10, C.panel);
  stroke([x + 12, y + 0.75, x + w - 12, y + 0.75], 1.5, C.edge);
  stroke([x + 12, y + h - 0.75, x + w - 12, y + h - 0.75], 1.5, C.edge);
  stroke([x + 0.75, y + 12, x + 0.75, y + h - 12], 1.5, C.edge);
  stroke([x + w - 0.75, y + 12, x + w - 0.75, y + h - 12], 1.5, C.edge);
}

function build() {
  for (let py = 0; py < DIM; py++) {
    const t = py / (DIM - 1);
    const r = Math.round(C.bgTop[0] + (C.bgBot[0] - C.bgTop[0]) * t);
    const g = Math.round(C.bgTop[1] + (C.bgBot[1] - C.bgTop[1]) * t);
    const b = Math.round(C.bgTop[2] + (C.bgBot[2] - C.bgTop[2]) * t);
    const row = py * DIM;
    for (let px = 0; px < DIM; px++) {
      const o = (row + px) * 3;
      fb[o] = r;
      fb[o + 1] = g;
      fb[o + 2] = b;
    }
  }

  // masthead
  fillRect(0, 0, SIZE, 7, C.amber);
  fillRect(0, 0, 128, 7, C.red);
  text('MONDAY', M, 58, 14.5, C.amber, 0.42, 0.14);
  textRight('THE WORLD IN ONE PICTURE', SIZE - M, 56, 11.5, C.faint, 0.32, 0.14);
  fitText('23 NOVEMBER 2026', M, 136, 62, SIZE - 2 * M, C.ink, 0.06, 0.115);
  fillRect(M, 158, SIZE - 2 * M, 1.5, C.edge);
  fillRect(M, 158, 76, 1.5, C.amber);

  // lead band
  const ly = 172;
  const lh = 196;
  panel(M, ly, SIZE - 2 * M, lh);
  sceneUkraine(M + 24, ly + 26);
  const lx = M + 208;
  fillRect(lx, ly + 26, 24, 3, C.amber);
  text(LEAD.kicker, lx, ly + 51, 12.5, C.amber, 0.3, 0.14);
  fitText(LEAD.head[0], lx, ly + 96, 32, SIZE - M - 24 - lx, C.ink, 0.02, 0.115);
  fitText(LEAD.head[1], lx, ly + 132, 32, SIZE - M - 24 - lx, C.ink, 0.02, 0.115);
  let ny = ly + 162;
  for (const line of wrap(LEAD.note, 15.5, SIZE - M - 24 - lx, 0.02)) {
    text(line, lx, ny, 15.5, C.dim, 0.02, 0.13);
    ny += 22;
  }

  // five story cards and the also-today panel
  const y0 = 384;
  const rowH = 292;
  TILES.forEach((t, i) => {
    const x = M + (i % 3) * (COL_W + GAP);
    const y = y0 + Math.floor(i / 3) * (rowH + GAP);
    panel(x, y, COL_W, rowH);
    fillRect(x + 20, y + 20, 24, 3, C.amber);
    text(t.kicker, x + 20, y + 45, 12.5, C.amber, 0.3, 0.14);
    t.art(x + 97, y + 50);
    fitText(t.head[0], x + 20, y + 194, 31, COL_W - 40, C.ink, 0.01, 0.115);
    fitText(t.head[1], x + 20, y + 228, 31, COL_W - 40, C.ink, 0.01, 0.115);
    let ty = y + 264;
    for (const line of wrap(t.note, 17, COL_W - 40, 0.02)) {
      text(line, x + 20, ty, 17, C.dim, 0.02, 0.125);
      ty += 22;
    }
  });

  // also today
  const ax = M + 2 * (COL_W + GAP);
  const ay = y0 + rowH + GAP;
  panel(ax, ay, COL_W, rowH);
  fillRect(ax + 20, ay + 20, 24, 3, C.amber);
  text('ALSO TODAY', ax + 20, ay + 45, 12.5, C.amber, 0.3, 0.14);
  let ty = ay + 78;
  for (const item of ALSO) {
    disc(ax + 24, ty - 5, 2.6, C.faint);
    for (const line of wrap(item, 16, COL_W - 60, 0.02)) {
      text(line, ax + 36, ty, 16, C.dim, 0.02, 0.125);
      ty += 21;
    }
    ty += 15;
  }
  fillRect(ax + 20, ay + rowH - 42, COL_W - 40, 1, C.edge);
  text('ALL AS FIRST REPORTED THAT DAY', ax + 20, ay + rowH - 20, 10.5, C.faint, 0.1, 0.15);
}

// ------------------------------------------------------------------ png

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crcBuf = new Uint8Array(4 + data.length);
  crcBuf.set(out.subarray(4, 8 + data.length));
  dv.setUint32(8 + data.length, crc32(crcBuf));
  return out;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function encodePNG(width, height, rgb) {
  const stride = width * 3;
  const raw = new Uint8Array((stride + 1) * height);
  const cand = [
    new Uint8Array(stride), new Uint8Array(stride), new Uint8Array(stride),
    new Uint8Array(stride), new Uint8Array(stride),
  ];
  const best = new Uint8Array(stride);

  for (let y = 0; y < height; y++) {
    const rowOff = y * stride;
    let bestType = 0;
    let bestSum = Infinity;
    for (let f = 0; f < 5; f++) {
      const outRow = cand[f];
      let sum = 0;
      for (let i = 0; i < stride; i++) {
        const v0 = rgb[rowOff + i];
        const a = i >= 3 ? rgb[rowOff + i - 3] : 0;
        const b = y > 0 ? rgb[rowOff - stride + i] : 0;
        const cc = i >= 3 && y > 0 ? rgb[rowOff - stride + i - 3] : 0;
        let v;
        if (f === 0) v = v0;
        else if (f === 1) v = (v0 - a) & 0xff;
        else if (f === 2) v = (v0 - b) & 0xff;
        else if (f === 3) v = (v0 - ((a + b) >> 1)) & 0xff;
        else v = (v0 - paeth(a, b, cc)) & 0xff;
        outRow[i] = v;
        sum += v < 128 ? v : 256 - v;
      }
      if (sum < bestSum) {
        bestSum = sum;
        bestType = f;
        best.set(outRow);
      }
    }
    raw[y * (stride + 1)] = bestType;
    raw.set(best, y * (stride + 1) + 1);
  }

  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // truecolour
  ihdr[10] = 0;  // deflate
  ihdr[11] = 0;  // adaptive filtering
  ihdr[12] = 0;  // no interlace

  const idat = new Uint8Array(deflateSync(raw, { level: 9 }));
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', new Uint8Array(0)),
  ];
  let total = 0;
  for (const p of parts) total += p.length;
  const png = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    png.set(p, off);
    off += p.length;
  }
  return png;
}

// ------------------------------------------------------------------ main

assertGlyphs();
build();

const out = new Uint8Array(SIZE * SIZE * 3);
const inv = 1 / (SS * SS);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let r = 0;
    let g = 0;
    let b = 0;
    for (let sy = 0; sy < SS; sy++) {
      const row = (y * SS + sy) * DIM;
      for (let sx = 0; sx < SS; sx++) {
        const o = (row + x * SS + sx) * 3;
        r += fb[o];
        g += fb[o + 1];
        b += fb[o + 2];
      }
    }
    const o = (y * SIZE + x) * 3;
    out[o] = Math.round(r * inv);
    out[o + 1] = Math.round(g * inv);
    out[o + 2] = Math.round(b * inv);
  }
}

const png = encodePNG(SIZE, SIZE, out);
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'entry.png'), png);
