// scripts/check.mjs: dependency-free static check. Run from repo root: node scripts/check.mjs
// Set STRICT=1 to fail (not warn) when a page listed in CHAPTERS does not exist yet.
// Set MATH_STRICT=1 for the final math-migration gate: no class="eq" on any page, no .eq rule in site.css.
import fs from "node:fs"; import path from "node:path"; import vm from "node:vm";
const root = process.cwd(); let bad = 0;
const fail = m => { console.error("FAIL " + m); bad++; };
const pages = fs.readdirSync(root).filter(f => f.endsWith(".html") && !f.startsWith("_"));
const common = fs.readFileSync(path.join(root, "common.js"), "utf8");
try { new vm.Script(common, { filename: "common.js" }); } catch (e) { fail("common.js: " + e.message); }
const reg = [...common.matchAll(/\["([a-z-]+\.html)",/g)].map(m => m[1]);
for (const r of reg) if (!pages.includes(r)) (process.env.STRICT ? fail : console.warn)(`registry lists ${r} but the file is missing`);
for (const p of pages) {
  const s = fs.readFileSync(path.join(root, p), "utf8");
  [...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { new vm.Script(m[1], { filename: `${p}#script${i}` }); } catch (e) { fail(`${p} inline script ${i}: ${e.message}`); } });
  for (const m of s.matchAll(/(?:href|src)="([^":#?${}]+)(?:[#?][^"]*)?"/g)) if (!fs.existsSync(path.join(root, m[1]))) fail(`${p}: broken local reference ${m[1]}`);
  if (p !== "index.html") {
    const nv = s.match(/nav\("([^"]*)"\)/);
    if (!nv || nv[1] !== p) fail(`${p}: nav() argument is ${nv ? nv[1] : "missing"}`);
    if (!reg.includes(p)) fail(`${p}: not listed in CHAPTERS`);
  }
  if (!s.includes('<footer class="wrap site">') || !/footer\(\)/.test(s)) fail(`${p}: footer element or footer() call missing`);
}
// KaTeX vendor folder: license, version and every font the CSS references must exist
const kd = path.join(root, "vendor/katex");
if (fs.existsSync(kd)) {
  for (const f of ["LICENSE", "VERSION", "katex.min.js", "katex.min.css"]) if (!fs.existsSync(path.join(kd, f))) fail(`vendor/katex/${f} missing`);
  if (fs.existsSync(path.join(kd, "katex.min.css"))) for (const m of new Set([...fs.readFileSync(path.join(kd, "katex.min.css"), "utf8").matchAll(/url\((fonts\/[^)]+?\.woff2)\)/g)].map(m => m[1]))) if (!fs.existsSync(path.join(kd, m))) fail(`vendor/katex: font ${m} missing`);
}
for (const p of pages) {
  const s = fs.readFileSync(path.join(root, p), "utf8");
  const text = s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "");
  const usesMath = /\\\(|\\\[|VB\.tex\b|\btex\(|mathRows/.test(s);
  if (usesMath) {
    const k = s.indexOf('<script src="vendor/katex/katex.min.js"></script>'), cj = s.search(/<script src="common\.js"/);
    if (!s.includes('href="vendor/katex/katex.min.css"')) fail(`${p}: uses math but lacks the vendor/katex/katex.min.css link`);
    if (k < 0) fail(`${p}: uses math but lacks a plain <script src="vendor/katex/katex.min.js"> (no defer/async)`);
    else if (cj >= 0 && k > cj) fail(`${p}: katex.min.js must come before common.js`);
    const o = (text.match(/\\\(/g) || []).length, c2 = (text.match(/\\\)/g) || []).length;
    if (o !== c2) fail(`${p}: unbalanced \\( \\) in page text (${o} open, ${c2} close)`);
    const o2 = (text.match(/\\\[/g) || []).length, c3 = (text.match(/\\\]/g) || []).length;
    if (o2 !== c3) fail(`${p}: unbalanced \\[ \\] in page text (${o2} open, ${c3} close)`);
  }
  if (process.env.MATH_STRICT && /class="eq[ "]/.test(s)) fail(`${p}: legacy class="eq" remains (MATH_STRICT)`);
}
if (process.env.MATH_STRICT && /^\.eq\b/m.test(fs.readFileSync(path.join(root, "site.css"), "utf8"))) fail("site.css: legacy .eq rule remains (MATH_STRICT)");
console.log(bad ? `${bad} problem(s)` : `ok: ${pages.length} pages`); process.exit(bad ? 1 : 0);
