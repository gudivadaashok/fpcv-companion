# Design: face-detection.html

Chapter Features, after Image Stitching. Registry entry already exists (common.js:15). Pager: prev Image Stitching, next Radiometry & Reflectance (the first page of the next chapter; the PO spec's "next: Active Illumination" is wrong, because Active Illumination closes Reconstruction I). `nav("face-detection.html")`.

Content spec: `docs/specs/face-detection.md`. That spec is authoritative on scope: lecture covers Haar features, integral image, and a learned classifier (nearest neighbor, linear SVM) over a sliding window. No AdaBoost, no trained cascade. Early rejection appears as one counter in stage 05 only.

## Shared setup

- Page head, `header.site`, `main.wrap`, `.intro` (h1 "Face Detection, Interactively"), stages as `section.stage` with `.stage-head` (`.num` 00..05), `footer.wrap.site`, one IIFE script. Inline `<style>` only for `#scanView` cursor etc.
- Working image: `toGray(src, sw, sh, 240)` gives at most 240 px on the long side (a 480x360 sample becomes 240x180). Everything below runs on that array.
- State: `st = { w, h, g, I, I2, clf: "svm"|"nn", fa, fb, ... }`. Expose `window.FD = { st, haar, integral, rectSum, classify, scan, group, train, DATA }` for the tester.
- Determinism: all synthetic data from `rng(seed)`; the training set is built once at load (`DATA`, below) with fixed seeds.

## Synthetic data (shared by stages 01, 03, 04, 05)

`drawFace(ctx, cx, cy, s, r)` draws a stylised face of width s on a canvas: skin-tone ellipse (gray level 150-200 chosen from `r`), hair band above, two dark eye ellipses at y = 0.38s, brighter nose bridge, dark mouth bar at y = 0.75s, small jitter of each part (about 6% of s). Used for (a) the 24x24 training patches, (b) the faces drawn into the samples. Same generator on both sides is what makes the detector work; keep it that way.

`DATA`: 150 face patches and 250 non-face patches, each 24x24, built by `rng(101)`. Non-faces: flat gradients, random blobs, stripes, bricks/blobs/scene crops taken from `VB.SAMPLES` at random offsets (hard negatives), pure noise. Each patch gets additive noise and a random contrast/brightness. Store as `Float32Array(576)`.

Features: six fixed Haar features `FEATS[i] = { name, rects: [[x0, y0, x1, y1, weight], ...] }` in fractions of the window (0..1), covering the three types from the lecture: 2-rectangle (eyes vs cheeks, forehead vs eyes), 3-rectangle (eye | nose bridge | eye; mouth band), 4-rectangle (diagonal). Convention: value = sum(white) - sum(black), where "black" rectangles have weight -1. Eyes band is black, cheeks white, so a face gives a positive value on the eyes/cheeks feature.

`haar(I, W, x, y, s, f)`: `W = w + 1`. Rect corners are `Math.round(x + s * fx)`. Raw value = sum of `weight * rectSum`. Normalised value = `raw / (s * s * sigma)` where `sigma = sqrt(max(1e-6, S2/n - (S/n)^2))` from `I` and the squared-integral `I2` over the window (lighting normalisation). Returns 0 when `sigma < 2` (flat window, so flat regions give about 0 and never fire).

`featureVector(I, I2, W, x, y, s) -> Float32Array(6)`.

## Stages

### 00 Choose an image
`VB.picker({ el, samples, noteEl, onImage })` with three samples: "Two faces" (two `drawFace` at s = 70 and 100 on a mid-gray background with mild clutter), "Texture" (bricks/blob style, no faces), "Mixed" (two faces plus shapes and stripes). Each sample gets a `note` stating what it is for, including "trained on drawn faces: photos of real faces will mostly not be detected". On image: `toGray(...,240)`, build `I`, `I2`, rerun stages 02-05. Upload allowed.

### 01 Haar features
Idea: a feature is the sum under white rectangles minus the sum under black rectangles.
- Canvas `#patchView` (canvas.view with `canvas.drag`, 24x24 patch drawn at 12x, 288 px, CSS-scaled): mean face of the 150 positives (or flat / noise patch via `seg("patchSrc")`: Mean face, Flat, Noise). Feature rectangles overlaid white/black at 60% alpha.
- Controls: `seg("ftype")` 2-rect horizontal split, 2-rect vertical split, 3-rect, 4-rect; ranges `fx`, `fy`, `fw`, `fh` (position and size in patch pixels); the overlay can also be dragged. Labels on every range, `aria-pressed` on seg.
- Readout `.chip`s: white sum, black sum, value, normalised value, and a `.calc-lines` line "white - black = ...".
- Prose: the definition, why three types, why normalise by sigma.
- Compute: direct pixel sums on 24x24 (cheap).

### 02 Integral image
Idea: `S(x, y) = sum of I over pixels above and to the left`; any rectangle sum costs four lookups, `A + D - B - C`.
- A 12x12 toy image of integers 0-9 (seeded) as an HTML table (`table.calc`) next to its integral image table. Click-drag on the toy image selects a rectangle; the four corner cells of the integral table get `td.hi`, and a `.calc-lines` block shows `D - B - C + A = ... ` and the brute-force sum, with a tag "match".
- Button "Check on the loaded image": 2000 random rectangles on `st.I`; reports max |difference| (must be 0: integer sums in Float64 are exact). Uses a `rng(7)`.
- Cost statement: "any rectangle: 4 reads, regardless of size", shown as a chip "3 x 3 = 9 reads vs 4" updating with rectangle size.

### 03 Classifier
Idea: map the feature vector of a window to face / not face. Two classifiers: nearest neighbor and linear SVM.
- Canvas `#scatter` (`canvas.plot canvas.click`, hiDPI via `VB.hiDPI`): the 400 training patches plotted by two chosen features. Controls: `<select id="fa">` and `<select id="fb">` (features 0-5, labelled "x feature" and "y feature"), `seg("clf")` Nearest neighbor / Linear SVM (aria-pressed; this also sets the classifier used in stages 04-05), range `k` (1, 3, 5, shown for NN only).
- Decision region: raster a 96x72 grid of the plot area, colour by class at 25% alpha (NN: majority of k nearest in the 2-D standardised space; SVM: sign of `w.x + b`). SVM draws the boundary and the +-1 margin lines and rings support vectors (those with `y(w.x+b) <= 1 + 1e-3`).
- Click on the plot: add a test point; label it with the active classifier and print its score (NN: `(d_neg - d_pos)/(d_neg + d_pos)`; SVM: signed margin). "Clear points" button.
- `train(kind, dims)`: standardise features (mean, std from `DATA`); SVM by Pegasos: lambda = 0.01, 3000 steps, sample index from `rng(55)`, deterministic; returns `{ w, b, mu, sd }`. Used with `dims = [fa, fb]` in this stage and with all six dims in stages 04-05 (cached by kind; the 6-D models are trained once at load, about 5 ms for SVM).
- Prose: NN rule, SVM margin objective `min lambda/2 |w|^2 + mean max(0, 1 - y(w.x+b))`.

### 04 Sliding window
Idea: scan every position at every scale and classify each window.
- Canvases: `#scanView` (the image, with the current window outlined) and `#heatView` (score heat map for the chosen scale, `VB.heat`, upsampled to image size with `image-rendering: pixelated`).
- Controls (all labelled): `winMin` base window 24-64 (default 24), `step` scale factor 1.1-1.5 (default 1.25), `stride` 1-8 px (default 2), `scaleIdx` slider to pick which scale to view, `pos` slider to move the highlighted window along the scan order. Classifier seg is the one from stage 03 (mirror it with `setSeg`).
- Window sizes: `s_i = round(winMin * step^i)` while `s_i <= min(w, h)`. Stride is constant in image pixels. Count at scale i: `nx = floor((w - s_i) / stride) + 1`, `ny = floor((h - s_i) / stride) + 1`; show the formula, per-scale count and the total as chips.
- `scan(opts) -> { scales: [{ s, nx, ny, score: Float32Array(nx*ny) }], total }`. Window score = `classify(featureVector(...))` in -1..1. Features are evaluated at window size `s_i` directly on the one integral image (no image pyramid; this is the point of the integral image).
- Compute and cache by key `(clf, winMin, step, stride, imageId)`; recompute through `VB.debounce(fn, 100)` and show "Scanning..." in `#scanMsg` (`aria-live="polite"`). Slider moves that only change the viewed scale or position redraw without rescanning.

### 05 Detections
Idea: one face fires many overlapping windows; keep the strong ones and merge.
- Canvas `#detView`: the image with boxes. Hits (score >= threshold) in thin amber; merged boxes in thick accent colour.
- Controls: `thr` threshold slider (-1..1, step 0.05, default calibrated so the two-face sample gives exactly 2 boxes), `minN` minimum neighbours 0-10 (default 3), `seg("merge")` Off / On (On default).
- Grouping: cluster hits whose IoU >= 0.3 (union-find over hits sorted by score; O(n^2) on hits only, capped at 4000 hits), drop clusters with fewer than `minN` members, output the score-weighted average box. Off shows all raw hits.
- Chips: windows evaluated (the stage-04 total), hits, boxes after merge, "stage-1 test (feature 0 only) rejects X% of windows before the other five are computed" (this is the only cascade-flavoured content), time for the scan using the integral image, and an estimate for the naive per-window pixel sums (time 300 windows summing pixels directly and scale up; label it "estimated").
- Prose: threshold trades missed faces for false alarms; minimum neighbours removes isolated false alarms.

## VB helpers to reuse
`$, nav, footer, picker, SAMPLES, sampleCanvas, rng, toGray, show, sized, hiDPI, onTheme, seg, setSeg, segVal, fmt, esc, imgXY, cssVar`.

## New shared helpers needed (see decisions.md, section 4)
`debounce(fn, ms)`, `frame(fn)`, `clamp(v, lo, hi)`, `heat(v) -> [r,g,b]`, `integral(a, w, h) -> Float64Array((w+1)*(h+1))`, `rectSum(I, w, x0, y0, x1, y1)`, `grayCanvas(g, w, h)`. Inline the four lookups in `scan()`; use `rectSum` elsewhere. Page-local: `drawFace`, `FEATS`, `haar`, `train`, `classify`, `group`.

## Performance risks and limits
- Windows: at 240x180 with winMin 24, step 1.25, stride 2 the total is roughly 20k; stride 1 is about 80k; winMin 24, step 1.1, stride 1 can exceed 150k. Cap at 120k windows: when exceeded, raise the stride automatically and say so in `#scanMsg`.
- Cost per window: 6 features x up to 4 rectangles x 4 lookups plus normalisation, about 150 operations; 100k windows is about 15M, well under 100 ms.
- Nearest neighbor is the expensive classifier: 400 training vectors x 6 dims per window, so 100k windows is about 240M multiply-adds (around 300-600 ms). Mitigations: first reject with the stage-1 feature (windows with a clearly non-face feature 0 get score -1 without NN, the early-rejection counter) and use a typed-array distance loop with no allocation. Hold NN to the 100 ms debounce plus "Scanning..." message; do not scan on every input event.
- Do not use `getImageData` per window; one `Float32Array` for gray, `Float64Array` for `I`, `I2`.
- The 96x72 decision raster in stage 03 with NN: 6912 cells x 400 points, about 3M ops, fine.
- Hit grouping capped at 4000 hits to keep O(n^2) bounded; above that, raise threshold message.
- Uploads: already downscaled to 240 px by `toGray`.

## Acceptance criteria (tester)
1. No console errors or `pageerror`; no requests other than blocked fonts. Nav shows Face Detection active; pager prev "Image Stitching", next "Radiometry & Reflectance".
2. Stage 01: on "Mean face", the 2-rectangle feature with black on the eyes band and white on the cheeks gives a normalised value > 0; its mirror (swap) gives < 0; on "Flat" every feature is 0 (|v| < 1e-6).
3. Stage 02: for 2000 random rectangles `rectSum` equals the brute-force sum exactly (reported max difference is 0). Toy-image selection shows equal integral and direct sums.
4. Stage 03: toggling NN / SVM changes `FD.st.clf` and the plotted region; a clicked point gets a label and a score; SVM training twice gives identical `w, b` (determinism).
5. Stage 04: for 240x180, winMin 24, step 1.25, stride 2 the displayed total equals `sum over scales of (floor((w - s)/2) + 1) * (floor((h - s)/2) + 1)` and equals `FD.scan(...).total`. Changing the stride changes the total accordingly.
6. Stage 05, default controls: sample "Two faces" gives exactly 2 merged boxes, each with IoU > 0.5 against the drawn face box; "Texture" gives 0 boxes; "Mixed" gives the 2 faces and at most 1 extra box. Lowering the threshold to its minimum with merge Off shows more hits than at the default. This needs tuning of `thr` and `FEATS` by the developer; record final defaults in the PR.
7. Uploading a 4000x3000 JPEG completes the first scan in under 3 s on a laptop (stage 04 message returns to idle); no network request carries the file.
8. 375 px wide: no horizontal overflow; all controls have labels; seg buttons have `aria-pressed`; scatter and detection canvases have `aria-label`s; pointer-only interactions in stages 01-03 have keyboard equivalents (the range sliders).
9. Both colour schemes render legibly (boxes and scatter colours use `cssVar`, redrawn through `onTheme`).
