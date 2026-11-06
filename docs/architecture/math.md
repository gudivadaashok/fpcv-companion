# Math typesetting (KaTeX)

Status: designed, pilot in progress on `image-sensing.html`. Nothing here is applied to `common.js`, `site.css` or the pages yet, except the pilot's local copy of the grid CSS.

## 1. Decision: KaTeX, confirmed

| Criterion | KaTeX 0.19 | MathJax 3 / 4 (CHTML or SVG) | Temml / native MathML | Pre-rendered images |
|---|---|---|---|---|
| Look vs Jupyter | LaTeX Computer Modern fonts. Jupyter uses MathJax with the same typeface family, so the look is equivalent for our formulas | Same glyphs | Rejected by the owner ("robotic") | Good, but static |
| Live re-render on slider input | Synchronous `renderToString`, about 0.2 to 1 ms for a small formula, 2 to 5 ms for a 5-row block. Safe inside a 50 ms debounce | Asynchronous typeset queue, tens of ms per expression, reflow flicker | Fast | Not possible with live numbers |
| Size | 268 KB JS, 28 KB CSS, about 600 KB on disk, and the browser only fetches the fonts used | 1 MB or more (tex-chtml with fonts; tex-svg is one file of about 1.3 MB) | Small | Large over 22 pages |
| `file://` | Works (classic UMD script; verified, no console errors) | v3 `tex-svg` works. v4 loads font chunks by dynamic import, which Chromium blocks on `file://` (not tested; treat as a risk) | Works | Works |
| Offline and privacy | Same-origin vendor files, no CDN, no requests | Same if vendored | n/a | n/a |
| Accessibility | Default output `htmlAndMathml`: a visually hidden `<span class="katex-mathml">` MathML copy for screen readers, with the visual HTML `aria-hidden` | Own assistive MathML, heavier | Native | Needs alt text per image |
| Dark mode | Inherits `color` (currentColor), so it follows the theme with no work. KaTeX draws rules with borders in `currentColor` | Same with CHTML | Same | Needs two image sets |

**Verdict.** Keep KaTeX. MathJax gives no visual gain and costs speed, size and `file://` risk. Do not use KaTeX `output: "mathml"` (that is the rejected look).

Constraints we accept: KaTeX supports a LaTeX subset (no `\begin{align}` auto-numbering; use `aligned`, `matrix`, `pmatrix`, `cases`, `array`, which it does support). Leave `trust` off. Do not use `\href`, `\class` or `\htmlStyle`.

## 2. Shared API (add to `common.js`, export on `window.VB`)

All functions read `window.katex` at call time, so the only ordering rule is that `katex.min.js` has executed before the page's inline script (see the head snippet).

```js
const _tex = new Map();                       // memo: "d|latex" -> html. Cap at 500 entries, clear() when exceeded.
function tex(latex, opts = {}) {              // -> HTML string (safe to put in innerHTML)
  const d = !!opts.display, key = (d ? "D|" : "I|") + latex;
  let h = _tex.get(key);
  if (h === undefined) {
    h = window.katex
      ? katex.renderToString(latex, { displayMode: d, throwOnError: false, strict: "ignore", output: "htmlAndMathml" })
      : `<code class="tex-fallback">${esc(latex)}</code>`;   // KaTeX missing: show the source, never blank
    if (_tex.size > 500) _tex.clear(); _tex.set(key, h);
  }
  return h;
}
function mathRows(el, rows) {                 // writes the label | formula | value grid into el
  // rows: [{ label, tex, value?, note? }]
  //   value  = LaTeX for the right column; rendered as "= " + value (omit it for a formula-only row)
  //   no label -> the label cell is empty. note = plain HTML paragraph placed under the grid.
  el.innerHTML = `<div class="mgrid">` + rows.map(r =>
    `<div class="mrow"><div class="ml">${r.label || ""}</div><div class="me">${tex("\\displaystyle " + r.tex)}</div>` +
    `<div class="mv">${r.value != null ? tex("= " + r.value) : ""}</div></div>`).join("") + `</div>`;
}
function mathify(root = document.body) { ... }   // static prose, see below
```

Number helper: build LaTeX numbers with the existing `fmt`; for units use `\,\mathrm{dB}`, `\,e^{-}`. Negative numbers: `fmt` output is fine (`-3.2` renders with a proper minus sign in math mode).

**Static prose convention (one only): `\( ... \)` inline and `\[ ... \]` display, written directly in the HTML text.** Rejected: `<span class="tex">`, which is verbose to author across 150 or so snippets and does not read well in the source. `mathify(root)` walks the text nodes under `root` with a `TreeWalker`, skips `script, style, code, pre, textarea, .katex`, splits on those delimiters, and replaces each match with `tex(latex, { display })`. Rules for authors:

- Write `&lt;`, `&gt;`, `&amp;` inside the formula source (the parser decodes them before `mathify` sees them). `<` followed by a letter would start a tag.
- Do not nest HTML tags inside `\( \)`. If the formula needs emphasis, use `\mathbf{}` or `\boldsymbol{}`.
- A delimiter pair must sit in a single text node.
- Strings assigned later through `innerHTML` use `tex()` directly (so backslashes must be doubled in JS template strings). `mathify` is for source-HTML prose only. If a page injects prose with delimiters at runtime, call `VB.mathify(thatElement)` after the assignment.
- `footer()` calls `mathify(document.querySelector("main"))`, so static prose renders on every page with no per-page call. `footer()` is already called on every page and is checked by `check.mjs`.

Static display equations replace `<div class="eq">` with `<div class="eqd">\[ ... \]</div>`. Live ones use `mathRows` (multi-line) or `el.innerHTML = tex(..., { display: true })` (single).

Live-update cost and caching: KaTeX is synchronous and fast enough to call on every `input` event, but still render through the page's existing `debounce` or `frame`. Static halves of a live formula (`\sigma_s = \sqrt{N}`) hit the memo, so only numbers that change are re-parsed. Do not put the changing number inside a long constant LaTeX string if you can render it separately. Target: under 10 ms for a full `mathRows` update at the largest page (neural-networks and face-detection are the worst case).

## 3. CSS for `site.css`

```css
/* KaTeX: inherit the page colour; slightly larger than body for readability */
.katex { font-size: 1.08em; }
.katex-display { margin: 0.6em 0; overflow-x: auto; overflow-y: hidden; padding: 2px 0; }   /* long equations scroll, never clip the page */
.eqd { margin: 10px 0; }
.tex-fallback { font-family: var(--mono); font-size: 0.9em; }

/* label | formula | value grid */
.mgrid { container-type: inline-size; padding: 4px 2px; }
.mrow { display: grid; grid-template-columns: max-content max-content max-content; align-items: center; gap: 0 12px; padding: 7px 0; }
.mgrid { display: grid; grid-template-columns: max-content max-content max-content; column-gap: 12px; row-gap: 14px; overflow-x: auto; }
.mrow { display: contents; }
.ml { color: var(--muted); font-size: 0.88rem; padding-right: 12px; }
.me { justify-self: end; font-size: 1.12rem; }
.mv { justify-self: start; font-size: 1.12rem; color: var(--accent); }
.mgrid + .note { margin-top: 12px; }

/* narrow stages: label on its own line, formula and value flow together and wrap */
@container (max-width: 560px) {
  .mgrid { display: block; overflow: visible; }
  .mrow { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; padding: 8px 0; border-bottom: 1px solid var(--line); }
  .mrow:last-child { border-bottom: 0; }
  .ml { flex: 1 0 100%; padding: 0; }
  .me, .mv { justify-self: auto; min-width: 0; max-width: 100%; overflow-x: auto; overflow-y: hidden; }
}
```

Tidy-up for the developer: the first `.mrow` rule is a leftover; keep only `display: contents` for wide and the flex block for narrow. Container queries (Chrome 105, Safari 16, Firefox 110) key off the stage width, not the viewport, so the grid also adapts inside `.three` columns. At 375 px the stage content is roughly 300 px: label line, then formula, with `= value` wrapping under the formula when the two do not fit on one line. Colours come only from `currentColor`, `--muted`, `--accent`; never put hex colours in LaTeX. Remove `.eq`'s `white-space: pre` styling only after the last page is migrated (then delete `.eq` and `.eq.pre`).

## 4. Deploy and infra

Head snippet for every page that uses math (order matters; no `defer`, no `async`, because the inline script runs immediately and a deferred script would not have run yet):

```html
<link rel="stylesheet" href="vendor/katex/katex.min.css">
<link rel="stylesheet" href="site.css">
<script src="vendor/katex/katex.min.js"></script>
```

and `common.js` stays where it is (end of body, before the inline script). Pages with no math skip the snippet; `mathify` and `tex` degrade to the source text if `katex` is missing, which the checker below prevents on math pages.

**Workflow (`.github/workflows/pages.yml`).**
- Add `cp -r vendor _site/` next to the existing copy (the loop only copies the HTML pages). Optional trim: `rm -rf _site/vendor/katex/LICENSE`. Do not remove it; MIT requires the notice to ship.
- Cache busting: vendor files are not renamed per release, so extend the existing `sed` to cover `vendor/katex/katex.min.css` and `vendor/katex/katex.min.js` with `?v=$v` (same pattern as site.css), and extend the guard `grep` to match. Fonts are loaded by relative `url()` from the CSS and are immutable for a given KaTeX version, so they need no `?v`. When upgrading KaTeX, replace the whole folder in one commit (JS and CSS must match versions, or KaTeX warns and glyph metrics drift).
- `check` job: unchanged (it runs `scripts/check.mjs`).

**`scripts/check.mjs` additions.**
1. The broken-reference regex already covers `vendor/katex/...` hrefs and srcs; no change needed for that.
2. Parse `url(fonts/...)` from `vendor/katex/katex.min.css` and fail if a font file is missing; fail if `vendor/katex/LICENSE` or `VERSION` is missing.
3. For each page whose source contains `\(`, `\[`, `VB.tex`, `tex(` or `mathRows`: fail unless it has the stylesheet link and the plain `<script src="vendor/katex/katex.min.js">` tag (reject `defer` or `async`) before `common.js`.
4. After migration (STRICT): fail on `class="eq"` and on the `.eq` rule in `site.css`.
5. Static scan for unbalanced `\(`/`\)` in each page's text.

`.gitignore`: n/a (`vendor/` is committed; it is currently untracked, so `git add vendor/` is part of the pilot commit). README: add to Credits: "Math is typeset with [KaTeX](https://katex.org) (MIT, Copyright Khan Academy and other contributors), vendored in `vendor/katex/`." Keep `vendor/katex/LICENSE` and `VERSION` in the tree. The README statement "no dependencies" needs a one-line amendment: "one vendored library (KaTeX), no npm".

## 5. Migration

Counts per page (matches of `class="eq"` / `class="math` / `<sub>` or `<sup>` / `<i>`; lines, so approximate). Raw Unicode math glyphs appear on most pages too (sift-detector 28 lines, neural-networks 18); search for `[√σμ∑∫≈≤≥×·⁻]` as part of each page's sweep.

| Page | eq | math | sub/sup | i | Notes |
|---|---|---|---|---|---|
| camera-calibration | 3 | 5 | 3 | 0 | Matrices (K, R, t): use `pmatrix`. Live numbers from a 3D view; keep canvas code untouched |
| image-formation | 3 | 7 | 3 | 0 | Thin lens, pinhole equations; many `1/f = 1/u + 1/v` |
| structure-from-motion | 7 | 5 | 1 | 1 | Matrices and SVD |
| uncalibrated-stereo | 3 | 5 | 0 | 0 | Fundamental matrix, epipolar constraint `x'^T F x = 0` |
| image-stitching | 4 | 9 | 0 | 0 | Homography matrix, RANSAC counts |
| depth-from-defocus | 1 | 4 | 4 | 1 | Blur radius formulas |
| optical-flow | 2 | 2 | 1 | 3 | Lucas-Kanade 2x2 system, `\sum` |
| radiometry-reflectance | 1 | 3 | 4 | 4 | Radiance, irradiance symbols `L`, `E`, `\Omega` |
| photometric-stereo | 2 | 3 | 2 | 4 | Vector equations `\mathbf{n}`, `\mathbf{s}` |
| shape-from-shading | 3 | 3 | 0 | 3 | Has `.calc-lines` rows; convert them to `mathRows` |
| active-illumination | 0 | 4 | 5 | 10 | Many italic variables in prose; inline `\( \)` |
| appearance-matching | 4 | 6 | 4 | 0 | PCA, eigen-decomposition |
| sift-detector | 3 | 6 | 4 | 0 | Most Unicode glyphs (28 lines): DoG, `\sigma`, `\sqrt{2}`, Hessian |
| face-detection | 0 | 6 | 4 | 10 | Integral image sums, Haar features, `\sum`; page is the largest (665 lines) |
| image-processing | 2 | 5 | 3 | 10 | Convolution `\ast`, `\sum`; italic-heavy |
| edge-detection | 1 | 2 | 1 | 0 | Smallest page |
| boundary-detection | 3 | 3 | 3 | 0 | Gradient magnitude, non-maximum suppression |
| binary-images | 5 | 3 | 4 | 5 | Moments `m_{pq}`, set operations, morphology symbols `\oplus`, `\ominus` |
| image-segmentation | 7 | 6 | 0 | 2 | Cost functions, `\arg\min` |
| neural-networks | 6 | 9 | 1 | 0 | Live layer math: matrices and `\sigma(\cdot)`; heaviest live updates, measure latency |
| object-tracking | 6 | 7 | 0 | 0 | Kalman and mean-shift equations; matrices |
| image-sensing | 3 | 4 | 8 | 0 | **Pilot**, noise block done, rest of page to finish |

`index.html` has one Unicode math glyph in a title; leave it unless it is a formula.

### Three parallel batches (no file overlap; each developer owns only the listed pages)

0. **Pilot and shared layer** (one developer, first, alone): `image-sensing.html` (finish the other stages), then add `tex`, `mathRows`, `mathify`, the `footer()` hook and the CSS to `common.js` and `site.css`, the workflow change, `check.mjs` and README credits. Batches below start only after this lands, because they depend on the API.
1. **Batch A, geometry and cameras** (about 85 items): camera-calibration, image-formation, structure-from-motion, uncalibrated-stereo, image-stitching, depth-from-defocus, optical-flow, radiometry-reflectance.
2. **Batch B, photometry and recognition** (about 86 items): photometric-stereo, shape-from-shading, active-illumination, appearance-matching, sift-detector, face-detection.
3. **Batch C, image processing and learning** (about 94 items): image-processing, edge-detection, boundary-detection, binary-images, image-segmentation, neural-networks, object-tracking.

Per-page procedure: replace each `<div class="eq">` with `mathRows` (live) or `.eqd` with `\[ \]` (static); convert `<i>x</i><sub>y</sub>` and Unicode math in stage prose to `\( \)`; keep the course's notation (principle 3); keep non-math monospace (code, tables of numbers) as is; do not change canvas or algorithm code; run `node scripts/check.mjs`. Gotchas: `<` in formulas must be `&lt;`; template literals need `\\`; an `innerHTML` that contains `\(` must be followed by `VB.mathify(el)`; `<b>` highlights inside the old `.eq` become `\mathbf{}` or move to the value column (accent colour).

## 6. Acceptance criteria for the tester

1. **Renders everywhere:** every page in the table loads with no console errors, and `document.querySelectorAll(".katex").length > 0` on each. Zero visible `\(`, `\[`, `\frac`, `\sigma` or `$` in `document.body.innerText` (excluding `.katex-mathml`), and no `.katex-error` elements (`throwOnError:false` renders errors in red; fail on any).
2. **No legacy:** no `class="eq"` or `<sub>` math remains; Unicode math glyphs only where they are not formulas.
3. **375 px:** `document.documentElement.scrollWidth <= innerWidth` on every page; the noise block shows label, formula, value without clipping (screenshot), and a deliberately long display equation scrolls inside its own box, not the page.
4. **Themes:** light, dark, and `data-theme` toggle: formula colour follows the theme (no black on dark), the value column uses the accent, and the contrast is readable.
5. **Live latency:** with the slider driven by script (100 `input` events), the median time of the render function is under 5 ms and the maximum under 16 ms on neural-networks and face-detection; the UI never blocks for more than one frame.
6. **Accessibility:** each rendered formula contains a `.katex-mathml` element with a `<math>` and an `<annotation encoding="application/x-tex">`; the visual `.katex-html` is `aria-hidden`.
7. **`file://`:** open three pages straight from disk (including a pilot and neural-networks) with no network: math renders and no failed requests for `vendor/`.
8. **Fallback:** with `katex.min.js` blocked, pages still load; math appears as `code.tex-fallback` source text and nothing throws.
9. **Deploy:** the built `_site/` contains `vendor/katex/` with `LICENSE`, the hrefs have `?v=`, and a deployed page loads the fonts (network tab: woff2 200).
10. **Regression:** the existing smoke pass (all 22 pages, canvases draw) is unchanged.
