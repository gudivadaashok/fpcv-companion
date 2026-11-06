# Infrastructure decisions

## 1. Hosting: GitHub Pages, deployed by GitHub Actions from `main`

**Decision.** Publish with the official Pages Actions (`upload-pages-artifact` then `deploy-pages`) on every push to `main`. Pages source is "GitHub Actions". The workflow copies only the shipped files into `_site/`.

**Rejected.**
- Pages "deploy from branch /(root)": zero config, but it publishes the entire repo (`docs/`, `.claude/`, scratch files like `_t1.html`) and cannot be gated on the CI check.
- Netlify, Cloudflare Pages, Vercel: an extra account and a second place to configure, for a site with no build step, no server code and no redirects. Revisit only if we need preview URLs per PR.
- A `gh-pages` branch pushed by a script: more moving parts than the Actions flow, same result.

**Cost.** Free for a public repo. (Pages on a private repo needs a paid plan; check the repo visibility before enabling.) One workflow file, one setting.

**Exact changes.**
1. Create `.github/workflows/pages.yml`:
```yaml
name: Check and deploy
on:
  push: { branches: [main] }
  pull_request:
  workflow_dispatch:
permissions: { contents: read }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/check.mjs
        env: { STRICT: "1" }      # remove this line while pages are still missing
  deploy:
    needs: check
    if: github.event_name != 'pull_request'
    runs-on: ubuntu-latest
    permissions: { pages: write, id-token: write }
    environment: { name: github-pages, url: "${{ steps.d.outputs.page_url }}" }
    steps:
      - uses: actions/checkout@v4
      - run: |
          mkdir _site
          cp index.html site.css common.js _site/
          for f in $(grep -o '"[a-z-]*\.html"' common.js | tr -d '"' | sort -u); do cp "$f" _site/; done
      - uses: actions/upload-pages-artifact@v3
        with: { path: _site }
      - id: d
        uses: actions/deploy-pages@v4
```
2. One-time setting: `gh api -X POST repos/gudivadaashok/fpcv-companion/pages -f build_type=workflow` (or Settings > Pages > Source: GitHub Actions).
3. Add `.gitignore` with `_t*.html`, `node_modules/`, `.DS_Store`. Delete `_t1.html` and `_t2.html`.
4. All links are relative (`index.html`, `site.css`), so the site works under `/fpcv-companion/` with no change. Keep it that way: no root-absolute `/…` URLs.

## 2. Testing tool: Playwright (Node, Chromium), run from a scratch directory

**Decision.** The tester installs `playwright` in a scratch directory outside the repo (`mkdir $SCRATCH/pw && cd $SCRATCH/pw && npm init -y && npm i playwright && npx playwright install chromium`) and drives the pages with `file://` URLs. Nothing is added to the repo: no `package.json`, no lockfile, so principle 1 (no npm dependencies) holds.

**Why file://.** The site is static and works from `file://`, which is also what a student does. Blob uploads (`setInputFiles`) and canvas `toDataURL` on procedural canvases work there.

**Harness rules.**
- `page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort())` so runs are offline and fast. Fail on any other non-`file:` request.
- Fail on `pageerror` and on `console.error`.
- Page-level checks for every page: nav link `aria-current` equals the file; pager targets exist; no horizontal overflow at 375 x 800 (`document.documentElement.scrollWidth <= innerWidth`); all `.seg` buttons toggle `aria-pressed`; screenshot in `colorScheme: 'light'` and `'dark'`.
- Pages expose test hooks on `window` (precedent: `window.AM`, `window.NN`). The new pages expose `window.FD` and `window.AI` (see the design docs) so the tester asserts numbers, not pixels. Do not assert on timings, only on counts.

**Rejected.**
- Puppeteer: same capability, smaller ecosystem for assertions and screenshots, no gain.
- jsdom / happy-dom: no canvas or layout, so the product is untestable.
- Cypress, Selenium: heavier install, slower, no benefit for static pages.
- Playwright via Python: works, but `playwright` is not installed for the local python3 and Node is already present.
- Committing a Playwright suite to the repo: adds `package.json` and ~150 MB of browsers to every contributor's tree. Revisit if the suite stabilises and CI needs it; then add a `tests/` folder with its own `package.json` so the root stays dependency-free.

**Cost.** One-off browser download in the scratch directory.

## 3. CI check: yes, a dependency-free Node script

**Decision.** Add `scripts/check.mjs` (about 30 lines, Node built-ins only, Node is preinstalled on the runner) and run it in the `check` job above and locally with `node scripts/check.mjs`. It is worth it because the failure modes it catches are exactly the ones this review found: a registry entry with no file, a wrong `nav()` filename after copy-paste, a missing footer, a typo that makes an inline script fail to parse, and a broken `href`/`src`. It takes under a second.

It checks: `common.js` and every inline `<script>` parse (`vm.Script`, no execution); every registry file exists (warning unless `STRICT=1`); every page's `nav("...")` equals its filename and the page is in the registry; the footer element and `footer()` call exist; every local `href`/`src` resolves.

**Rejected.**
- ESLint / Prettier: needs npm and config; style is not our problem.
- A link-checker package or lychee: external-link checking is flaky in CI and the only external links are the course site and YouTube.
- Running Playwright in CI: see 2. Revisit later.

**Cost.** One file. Tested in the scratch dir against the current tree: passes with two warnings (the two unbuilt pages), and fails under `STRICT=1`, as intended.

**Exact change.** Create `scripts/check.mjs`:
```js
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
```

## 4. Shared additions to `common.js` / `site.css` (proposed, not applied)

I did not edit `common.js` or `site.css`. The developer adding the two new pages should land these first, as one commit, then run `node --check common.js` and the tester's smoke pass over all pages. All are additions to `window.VB`; no existing name changes, so no existing caller can break. (Adding a key to the export object cannot affect pages that do not destructure it.)

| Helper | Signature | Why now | Callers today |
|---|---|---|---|
| `debounce` | `debounce(fn, ms = 50) -> fn` (trailing call, `clearTimeout`) | Both new pages; replaces 5 copies | new: face-detection, active-illumination. Migrate later: image-sensing, boundary-detection, image-formation, image-stitching, sift-detector |
| `frame` | `frame(fn) -> () => void` (coalesces many calls into one `requestAnimationFrame`) | Slider drags in both new pages; replaces 8 copies | same idea as camera-calibration:207, photometric-stereo:150, shape-from-shading:152, radiometry-reflectance:232, structure-from-motion:331, uncalibrated-stereo:233 |
| `clamp` | `clamp(v, lo = 0, hi = 1) -> number` | Used in `heat`; 2 local copies | boundary-detection:115, image-sensing:115 |
| `heat` | `heat(v) -> [r, g, b]` (v clamped to 0..1; 0 dark blue-violet, 1 bright yellow-white; use the boundary-detection ramp, :121) | Score map in face-detection, error/depth maps in active-illumination | boundary-detection, object-tracking, neural-networks have their own |
| `integral` | `integral(a, w, h) -> Float64Array((w+1)*(h+1))`, row-major, zero first row and column; and `rectSum(I, w, x0, y0, x1, y1) -> number` with exclusive upper bounds | face-detection (hot loop; inline the four lookups there). Refactor `boxSum` to call `integral` | `boxSum` is called by boundary-detection:239, depth-from-defocus:116/160/184, optical-flow:114/135. Keep `boxSum`'s behaviour byte-for-byte; the refactor is optional |
| `grayCanvas` | `grayCanvas(g, w, h) -> HTMLCanvasElement` (= `show(createElement("canvas"), w, h, g)`) | Both new pages build small canvases from arrays | sift-detector:222 |

CSS to add to `site.css` (also fixes review #10): `canvas.drag { cursor: grab; touch-action: none; } canvas.drag:active { cursor: grabbing; }`, `.eq.pre { white-space: pre; }`, `.calc-lines` (3 rules from shape-from-shading), `.mats`, `td.hi`, `.dot`. The new pages use `canvas.drag`, `.calc-lines`, `td.hi`, `.dot`.

Not shared yet (one new caller only): an orbit/3D drag view. `#view3d` exists in camera-calibration, photometric-stereo and appearance-matching with a per-page copy; active-illumination would be a fourth. Because the three existing copies differ, extract `VB.orbit` as its own task after the new pages ship; active-illumination keeps a local copy marked `// TODO VB.orbit`.
