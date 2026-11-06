// scripts/check.mjs: dependency-free static check. Run from repo root: node scripts/check.mjs
// Set STRICT=1 to fail (not warn) when a page listed in CHAPTERS does not exist yet.
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
console.log(bad ? `${bad} problem(s)` : `ok: ${pages.length} pages`); process.exit(bad ? 1 : 0);
