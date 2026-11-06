/* Vision Bench: shared helpers for every topic page. */
(() => {
"use strict";
const $ = id => document.getElementById(id);

const TOPICS = [
  ["binary-images.html", "Binary Images"],
  ["image-processing.html", "Image Processing"],
  ["edge-detection.html", "Edge Detection"],
  ["photometric-stereo.html", "Photometric Stereo"],
  ["optical-flow.html", "Optical Flow"],
];

function nav(active) {
  const h = document.querySelector("header.site");
  if (!h) return;
  const links = TOPICS.map(([href, name]) =>
    `<a href="${href}"${href === active ? ' class="on" aria-current="page"' : ""}>${name}</a>`).join("");
  h.innerHTML = `<div class="wrap"><div class="brand"><a href="index.html">Vision Bench</a> <span>· an interactive companion to First Principles of Computer Vision</span></div><nav class="topics" aria-label="Topics">${links}</nav></div>`;
}

function footer() {
  const f = document.querySelector("footer.site");
  if (!f) return;
  f.innerHTML = `<p>An unofficial study companion. Concepts and notation follow the lectures in <a href="https://fpcv.cs.columbia.edu/">First Principles of Computer Vision</a> by Shree Nayar, Columbia University. Watch them there or on the <a href="https://www.youtube.com/channel/UCf0WB91t8Ky6AuYcQV0CcLw">FPCV YouTube channel</a>.</p><p>Sample images are generated in your browser. Uploaded images are processed locally and never sent anywhere.</p>`;
}

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function addNoise(ctx, w, h, amt, seed) { const r = rng(seed); const im = ctx.getImageData(0, 0, w, h); const d = im.data; for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 2 * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; } ctx.putImageData(im, 0, 0); }
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function hslToRgb(h, s, l) { s /= 100; l /= 100; const k = n => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [f(0) * 255, f(8) * 255, f(4) * 255]; }
function hsvToRgb(h, s, v) { const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return [f(5) * 255, f(3) * 255, f(1) * 255]; }

/* segmented buttons */
function seg(id, fn) { const el = $(id); el.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; for (const x of el.children) x.setAttribute("aria-pressed", String(x === b)); fn(b.dataset.v); }); }
function setSeg(id, v) { for (const x of $(id).children) x.setAttribute("aria-pressed", String(x.dataset.v === String(v))); }
function segVal(id) { const b = [...$(id).children].find(x => x.getAttribute("aria-pressed") === "true"); return b && b.dataset.v; }

/* ---------- shared sample images (480×360) ---------- */
const SAMPLES = {
  scene: { name: "Scene", draw(c, w, h) {
    const sky = c.createLinearGradient(0, 0, 0, h * 0.6); sky.addColorStop(0, "#8fb3d9"); sky.addColorStop(1, "#e8eef3"); c.fillStyle = sky; c.fillRect(0, 0, w, h);
    c.fillStyle = "#fff6d0"; c.beginPath(); c.arc(390, 70, 30, 0, 7); c.fill();
    c.fillStyle = "#6c7a89"; c.beginPath(); c.moveTo(0, 210); c.lineTo(90, 110); c.lineTo(170, 190); c.lineTo(260, 95); c.lineTo(370, 200); c.lineTo(480, 140); c.lineTo(480, 260); c.lineTo(0, 260); c.fill();
    const gr = c.createLinearGradient(0, 230, 0, h); gr.addColorStop(0, "#7da35a"); gr.addColorStop(1, "#3f5e2a"); c.fillStyle = gr; c.fillRect(0, 230, w, h - 230);
    c.fillStyle = "#c9b79c"; c.fillRect(70, 200, 130, 100); c.fillStyle = "#7a3b2e"; c.beginPath(); c.moveTo(55, 205); c.lineTo(135, 150); c.lineTo(215, 205); c.fill();
    c.fillStyle = "#2f3a48"; c.fillRect(90, 225, 28, 28); c.fillRect(150, 225, 28, 28); c.fillStyle = "#5a3a22"; c.fillRect(122, 255, 26, 45);
    c.fillStyle = "#4b3621"; c.fillRect(330, 220, 12, 70); c.fillStyle = "#2f5d34"; c.beginPath(); c.arc(336, 205, 38, 0, 7); c.fill();
    c.strokeStyle = "#e9e3d3"; c.lineWidth = 6; for (let x = 230; x < 470; x += 22) { c.beginPath(); c.moveTo(x, 300); c.lineTo(x, 340); c.stroke(); } c.beginPath(); c.moveTo(225, 312); c.lineTo(470, 312); c.stroke();
    addNoise(c, w, h, 6, 1);
  } },
  shapes: { name: "Shapes", draw(c, w, h) {
    c.fillStyle = "#d9d7d2"; c.fillRect(0, 0, w, h); c.fillStyle = "#2a2b30"; c.strokeStyle = "#2a2b30";
    c.save(); c.translate(110, 110); c.rotate(-0.5); c.fillRect(-70, -14, 140, 28); c.restore();
    c.beginPath(); c.arc(330, 95, 48, 0, 7); c.fill();
    c.save(); c.translate(240, 255); c.rotate(0.35); c.beginPath(); c.ellipse(0, 0, 80, 34, 0, 0, 7); c.fill(); c.restore();
    c.lineWidth = 16; c.beginPath(); c.arc(400, 260, 42, 0, 7); c.stroke();
    c.beginPath(); c.moveTo(40, 330); c.lineTo(130, 330); c.lineTo(70, 200); c.closePath(); c.fill();
    c.fillStyle = "#8a8a90"; c.save(); c.translate(200, 140); c.rotate(0.9); c.fillRect(-22, -22, 44, 44); c.restore();
    addNoise(c, w, h, 4, 7);
  } },
  text: { name: "Text", draw(c, w, h) {
    c.fillStyle = "#f1f0ec"; c.fillRect(0, 0, w, h); c.fillStyle = "#1d1d22"; c.textAlign = "center"; c.textBaseline = "middle";
    c.font = "bold 96px Georgia, serif"; c.fillText("Vision", w / 2, 100);
    c.font = "38px Georgia, serif"; c.fillText("first principles", w / 2, 190);
    c.font = "20px Georgia, serif"; c.fillText("The quick brown fox jumps over", w / 2, 255); c.fillText("the lazy dog 0123456789", w / 2, 290);
    addNoise(c, w, h, 4, 11);
  } },
  bricks: { name: "Bricks", draw(c, w, h) {
    const r = rng(5); c.fillStyle = "#cfc8bd"; c.fillRect(0, 0, w, h);
    for (let row = 0, y = 0; y < h; row++, y += 30) for (let x = (row % 2) * -32; x < w; x += 64) { const v = 120 + r() * 60; c.fillStyle = `rgb(${v + 40},${v * 0.6},${v * 0.45})`; c.fillRect(x + 2, y + 2, 60, 26); }
    addNoise(c, w, h, 22, 13);
  } },
  stripes: { name: "Stripes", draw(c, w, h) {
    c.fillStyle = "#ddd"; c.fillRect(0, 0, w, h);
    c.save(); c.translate(w / 2, h / 2); c.rotate(0.5); c.fillStyle = "#333"; for (let x = -400; x < 400; x += 36) c.fillRect(x, -400, 16, 800); c.restore();
    addNoise(c, w, h, 4, 17);
  } },
  blobs: { name: "Blobs", draw(c, w, h) {
    const r = rng(23); c.fillStyle = "#808080"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) { const v = Math.round(r() * 255); c.fillStyle = `rgb(${v},${v},${v})`; c.beginPath(); c.arc(r() * w, r() * h, 6 + r() * 26, 0, 7); c.fill(); }
    addNoise(c, w, h, 6, 29);
  } },
};
function sampleCanvas(s, w = 480, h = 360) { const c = document.createElement("canvas"); c.width = w; c.height = h; s.draw(c.getContext("2d"), w, h); return c; }

/* ---------- picker with upload ---------- */
function picker({ el, samples, noteEl, onImage }) {
  const root = typeof el === "string" ? $(el) : el; root.classList.add("picker");
  const fileId = root.id + "-file";
  const drop = document.createElement("label"); drop.className = "drop"; drop.htmlFor = fileId; drop.tabIndex = 0;
  drop.innerHTML = `<span><strong>Use your own image</strong>Click to choose, or drop a file here<br>JPG, PNG, WebP</span>`;
  const file = document.createElement("input"); file.type = "file"; file.accept = "image/*"; file.hidden = true; file.id = fileId;
  const note = noteEl ? (typeof noteEl === "string" ? $(noteEl) : noteEl) : null;
  const buttons = [];
  for (const s of samples) {
    const cv = s.canvas || sampleCanvas(s); s.canvas = cv;
    const b = document.createElement("button"); b.type = "button"; b.className = "sample"; b.setAttribute("aria-pressed", "false");
    const img = document.createElement("img"); img.src = cv.toDataURL(); img.alt = "";
    const t = document.createElement("b"); t.textContent = s.name; b.append(img, t);
    b.addEventListener("click", () => pick(s)); root.append(b); buttons.push([b, s]);
  }
  root.append(drop, file);
  function mark(s) { for (const [b, x] of buttons) b.setAttribute("aria-pressed", String(x === s)); }
  function pick(s) { mark(s); if (note) note.innerHTML = s.note || ""; onImage(s.canvas, s.canvas.width, s.canvas.height, { sample: s }); }
  function load(f) {
    if (!f || !f.type.startsWith("image/")) { if (note) note.textContent = "That file isn't an image. Choose a JPG, PNG or WebP file."; return; }
    const url = URL.createObjectURL(f); const img = new Image();
    img.onload = () => { mark(null); if (note) note.innerHTML = "<b>Your image:</b> " + esc(f.name); onImage(img, img.naturalWidth, img.naturalHeight, { upload: true, name: f.name }); URL.revokeObjectURL(url); };
    img.onerror = () => { if (note) note.textContent = "This image couldn't be read. Try saving it as a JPG or PNG first."; };
    img.src = url;
  }
  file.addEventListener("change", e => { load(e.target.files[0]); e.target.value = ""; });
  ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e => load(e.dataTransfer.files[0]));
  drop.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); file.click(); } });
  return { pick, load };
}
function esc(s) { return String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch])); }

/* ---------- image arrays ---------- */
// Returns {w, h, g: Float32Array 0..255}
function toGray(src, sw, sh, maxdim, fixedW, fixedH) {
  let w, h;
  if (fixedW) { w = fixedW; h = fixedH; } else { const k = Math.min(1, maxdim / Math.max(sw, sh)); w = Math.max(1, Math.round(sw * k)); h = Math.max(1, Math.round(sh * k)); }
  const c = document.createElement("canvas"); c.width = w; c.height = h; const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
  if (fixedW) { const k = Math.max(w / sw, h / sh); const dw = sw * k, dh = sh * k; ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh); }
  else ctx.drawImage(src, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data; const g = new Float32Array(w * h);
  for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2];
  return { w, h, g };
}
function sized(cv, w, h) { if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } return cv.getContext("2d"); }
// mode: "clamp" (0..255), "auto" (min..max), "signed" (0 → mid gray), "abs" (|v| scaled)
function show(cv, w, h, a, mode = "clamp") {
  if (typeof cv === "string") cv = $(cv);
  const ctx = sized(cv, w, h); const im = ctx.createImageData(w, h); const d = im.data;
  let lo = 0, hi = 255, m = 0;
  if (mode === "auto") { lo = Infinity; hi = -Infinity; for (const v of a) { if (v < lo) lo = v; if (v > hi) hi = v; } if (hi - lo < 1e-9) hi = lo + 1; }
  if (mode === "signed" || mode === "abs") { for (const v of a) m = Math.max(m, Math.abs(v)); m = m || 1; }
  for (let i = 0, j = 0; i < a.length; i++, j += 4) {
    let v = a[i];
    if (mode === "auto") v = (v - lo) / (hi - lo) * 255; else if (mode === "signed") v = 128 + v / m * 127; else if (mode === "abs") v = Math.abs(v) / m * 255;
    v = v < 0 ? 0 : v > 255 ? 255 : v; d[j] = d[j + 1] = d[j + 2] = v; d[j + 3] = 255;
  }
  ctx.putImageData(im, 0, 0); return ctx;
}
function showRGB(cv, w, h, fn) { if (typeof cv === "string") cv = $(cv); const ctx = sized(cv, w, h); const im = ctx.createImageData(w, h); const d = im.data; for (let i = 0, j = 0; i < w * h; i++, j += 4) { const [r, g, b] = fn(i); d[j] = r; d[j + 1] = g; d[j + 2] = b; d[j + 3] = 255; } ctx.putImageData(im, 0, 0); return ctx; }

/* filters */
function gaussKernel(sigma) { const r = Math.max(1, Math.ceil(3 * sigma)); const k = new Float32Array(2 * r + 1); let s = 0; for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-i * i / (2 * sigma * sigma)); s += k[i + r]; } for (let i = 0; i < k.length; i++) k[i] /= s; return k; }
function sepConv(a, w, h, kx, ky) {
  const t = new Float32Array(w * h), o = new Float32Array(w * h); const rx = (kx.length - 1) >> 1, ry = (ky.length - 1) >> 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let k = -rx; k <= rx; k++) { const xx = x + k < 0 ? 0 : x + k >= w ? w - 1 : x + k; s += a[y * w + xx] * kx[k + rx]; } t[y * w + x] = s; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let k = -ry; k <= ry; k++) { const yy = y + k < 0 ? 0 : y + k >= h ? h - 1 : y + k; s += t[yy * w + x] * ky[k + ry]; } o[y * w + x] = s; }
  return o;
}
function gaussBlur(a, w, h, sigma) { if (sigma <= 0.01) return Float32Array.from(a); const k = gaussKernel(sigma); return sepConv(a, w, h, k, k); }
function conv2(a, w, h, K, kw, kh) {
  const o = new Float32Array(w * h); const rx = (kw - 1) >> 1, ry = (kh - 1) >> 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let j = -ry; j <= ry; j++) { const yy = y + j < 0 ? 0 : y + j >= h ? h - 1 : y + j; for (let i = -rx; i <= rx; i++) { const xx = x + i < 0 ? 0 : x + i >= w ? w - 1 : x + i; s += a[yy * w + xx] * K[(j + ry) * kw + (i + rx)]; } } o[y * w + x] = s; }
  return o;
}
// box sum over (2r+1)^2 using integral image
function boxSum(a, w, h, r) {
  const I = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) { let row = 0; for (let x = 0; x < w; x++) { row += a[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row; } }
  const o = new Float32Array(w * h);
  for (let y = 0; y < h; y++) { const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1); for (let x = 0; x < w; x++) { const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1); o[y * w + x] = I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0]; } }
  return o;
}
function bilinear(a, w, h, x, y) {
  if (x < 0) x = 0; if (y < 0) y = 0; if (x > w - 1) x = w - 1; if (y > h - 1) y = h - 1;
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1), fx = x - x0, fy = y - y0;
  return (a[y0 * w + x0] * (1 - fx) + a[y0 * w + x1] * fx) * (1 - fy) + (a[y1 * w + x0] * (1 - fx) + a[y1 * w + x1] * fx) * fy;
}

/* FFT (radix-2, in place) */
function fft1(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = 2 * Math.PI / len * (inv ? 1 : -1), wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let j = 0; j < len / 2; j++) { const a = i + j, b = a + len / 2; const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr; re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
function fft2(re, im, n, inv) {
  const r = new Float64Array(n), i2 = new Float64Array(n);
  for (let y = 0; y < n; y++) { for (let x = 0; x < n; x++) { r[x] = re[y * n + x]; i2[x] = im[y * n + x]; } fft1(r, i2, inv); for (let x = 0; x < n; x++) { re[y * n + x] = r[x]; im[y * n + x] = i2[x]; } }
  for (let x = 0; x < n; x++) { for (let y = 0; y < n; y++) { r[y] = re[y * n + x]; i2[y] = im[y * n + x]; } fft1(r, i2, inv); for (let y = 0; y < n; y++) { re[y * n + x] = r[y]; im[y * n + x] = i2[y]; } }
}

/* canvas click → image coords */
function imgXY(e, cv, w, h) { const r = cv.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * w), Math.floor((e.clientY - r.top) / r.height * h)]; }
function hiDPI(cv, cssH) { const dpr = window.devicePixelRatio || 1; const W = Math.round((cv.clientWidth || 600) * dpr), H = Math.round((cssH || cv.clientHeight || 200) * dpr); const ctx = sized(cv, W, H); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return { ctx, W: W / dpr, H: H / dpr }; }
function onTheme(fn) { window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", fn); new MutationObserver(fn).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }); window.addEventListener("resize", fn); }
function arrow(ctx, x0, y0, x1, y1, color, lw = 1.5, head = 4) {
  const a = Math.atan2(y1 - y0, x1 - x0); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - head * Math.cos(a - 0.45), y1 - head * Math.sin(a - 0.45)); ctx.lineTo(x1 - head * Math.cos(a + 0.45), y1 - head * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill();
}
const fmt = (v, d = 1) => (Object.is(v, -0) ? 0 : v).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

window.VB = { $, nav, footer, rng, addNoise, cssVar, hslToRgb, hsvToRgb, seg, setSeg, segVal, SAMPLES, sampleCanvas, picker, esc, toGray, sized, show, showRGB, gaussKernel, sepConv, gaussBlur, conv2, boxSum, bilinear, fft1, fft2, imgXY, hiDPI, onTheme, arrow, fmt };
})();
