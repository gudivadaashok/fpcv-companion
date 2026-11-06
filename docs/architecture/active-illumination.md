# Design: active-illumination.html

Chapter Reconstruction I, after Depth from Defocus. Registry entry exists (common.js:25). `nav("active-illumination.html")`. Pager: prev Depth from Defocus, next Camera Calibration (Reconstruction II).

Content spec: `docs/specs/active-illumination.md`. Scope: structured-light range finding: one stripe, sweep, binary code, Gray code, decode to depth. Time of flight is one prose paragraph, photometric stereo systems link to `photometric-stereo.html`. Phase shifting is out of scope for the first build (stage 07 deferred).

No upload: depth must be known. Stage 00 says so in a `.note`. Do not use `VB.picker` (it adds the upload tile); use a `seg` of three scenes plus a checkbox.

## Geometry (single source of truth; state it in the prose)

Rectified camera-projector pair. Camera at x = 0, projector at x = b, both looking along +z, same focal length f (pixels). A scene point (x, z):

- camera column (relative to centre) `c = f x / z`
- projector column (relative to centre) `p = f (x - b) / z`
- disparity `d = c - p = f b / z`, so `z = f b / d`
- angle form for stage 01: with alpha, beta the angles between the baseline and the two rays, `z = b / (cot alpha + cot beta)`; with x measured from the camera, `cot alpha = x / z`, `cot beta = (b - x) / z`, which is consistent with the above.
- depth resolution per column: `dz = z^2 / (f b)`; a larger baseline gives finer depth and more shadow.

Constants: camera 256 x 192, projector 256 columns (so 8 bits give exactly one code per column), f = 256 px, default b = 0.40 m, scene depths 1.0-2.5 m so disparities are 41-102 px (the 2% depth criterion needs d >= 41: rounding d to whole columns costs at most 0.5 / 41 = 1.2%). Baseline slider range 0.10-0.60 m. Absolute columns: `c_abs = c + 128`, `p_abs = p + 128`.

## Shared model (page-local code, all stages use it)

- `buildScene(name) -> { Z: Float32Array(256*192), alb: Float32Array(256*192) }` in camera view. Scenes: "Tilted plane" (Z linear in column and row, albedo constant 0.8; this is the verifiable one), "Ball on floor" (floor plane tilted, sphere radius 0.35 m centred about 1.6 m), "Steps" (three fronto-parallel blocks at 1.2, 1.7, 2.2 m over a back wall at 2.5 m; shows occlusion). Checkbox "Dark patch" sets albedo to 0.04 in a rectangle (decode failure demo). Everything analytic, no randomness except albedo texture noise from `rng(3)` on non-plane scenes.
- `project(Z, b) -> { P: Int16Array, lit: Uint8Array }`:
  1. per pixel: `d = f * b / Z`, `P = round(c_abs - d)`, valid if `0 <= P < 256`;
  2. projector z-buffer: for each (P, row) keep the minimum Z among pixels mapping there (`zbuf[row*256 + P]`);
  3. `lit = P valid && Z <= zbuf + 0.01` (pixel is not behind a nearer surface along its projector ray). Shadowed and out-of-range pixels have `lit = 0`.
  Single pass, 49k pixels.
- `pattern(kind, k, nbits, blurSigma) -> Float32Array(256)`: projector intensity 0..1 for bit k (k = 0 is the most significant). Binary bit of column n is `(n >> (nbits-1-k)) & 1`; Gray uses `g = n ^ (n >> 1)` first. Optional 1-D Gaussian blur of the projector row (sigma in projector columns, range 0-4), the way a defocused projector blurs stripe edges.
- `capture(model, patArr, noiseSigma, frameSeed) -> Float32Array(49152)`: `I = ambient + alb * (lit ? pat[P] : 0) * 200 + noise`, ambient = 20, clamped to 0..255. Noise: a precomputed bank of 10 standard-normal frames (`rng(900 + k)`), scaled by the slider, so the same slider value always gives the same image. Reference frames: all-white (pat = 1) and all-black (pat = 0).
- `decode(frames, refW, refB, kind, nbits) -> { col: Int16Array, valid: Uint8Array }`: per pixel `mid = (refW + refB)/2`, valid only if `refW - refB > 40`; bit k = `frame_k > mid`; binary value or Gray prefix-XOR (`b0 = g0; bk = b(k-1) ^ gk`).
- `toDepth(col, valid, b) -> Float32Array`: `d = c_abs - col`, valid only if `d > 0`; `Z = f b / d`.
- Expose `window.AI = { buildScene, project, pattern, capture, decode, toDepth, st }`.

## Stages

### 00 Choose a scene
`seg("scene")` (Tilted plane / Ball on floor / Steps), checkbox `#dark` "Add a dark patch", and a `.note`: "Upload is not available here: structured light needs a scene whose depth we know." Shows two small views: depth map (`VB.heat`, near = bright) and the camera view under white light (`alb`). Computes `project` once for the current b.

### 01 Triangulation
Idea: a ray from the projector and a ray from the camera meet at the surface; the angles and baseline give depth.
- Canvas `#geo` (top-down 2-D diagram, hiDPI, `canvas.drag`): camera at left, projector at right, baseline drawn and labelled b, a draggable scene point with both rays, the angles alpha, beta marked, and the formula `z = b / (cot alpha + cot beta)` with live numbers in a `.calc-lines` block. Drag sets (x, z) within bounds; keyboard alternative: range sliders `gz` (depth 1.0-2.5 m) and `gx`.
- Canvas `#strip` (256 x 48, `canvas.view`): the camera's view of a single stripe at projector column `pcol` (slider) hitting the point at depth z; the stripe's camera column `c = p + f b / z` moves right/left as depth changes. Chips: c, disparity d, z.
- Controls: `b` baseline range (synced with stage 06 via a shared `st.b`), `gz`, `gx`, `pcol`. Prose: derive `d = f b / z`.
- Monotonicity: increasing z strictly decreases d, so the stripe moves toward the projector-side column; state direction in the prose and test it.

### 02 One light stripe
Idea: one stripe gives one profile; displacement from the stripe's straight position gives depth along it.
- Canvas `#oneView` (camera image of the scene with the stripe overlaid in the accent colour): pixels with `lit && P === pcol2` (a one-pixel-wide band; draw 2 px wide for visibility).
- Canvas `#profile` (`canvas.plot`, hiDPI): left axis disparity `d(row)` of the stripe pixels against image row; second line Z(row), the ground truth. Shadowed rows show a gap.
- Controls: `pcol2` stripe column range (0-255), `b` (shared). Chips: stripe pixels found, mean disparity, depth range.
- Cost: scan 49k pixels once per slider event (use `VB.frame`).

### 03 Sweeping is slow
Idea: N stripes need N images.
- Canvas `#sweepView`: accumulating depth map (`VB.heat`) filled as the stripe sweeps; the current stripe highlighted. Chip "Frame k of 256", "30 fps: 8.5 s", and "Binary code: 8 frames" for comparison.
- Controls: Play / Pause button (`button.btn.primary`, label toggles), Step button (+1 stripe), `Show all` button, speed `seg("spd")` 1x / 4x / 16x (stripes per tick), Reset. `rAF` or 40 ms `setInterval`; cleared on pause and on scene change.
- Pre-bucket pixels by `P` once (`byCol: Int32Array` offsets) so each step touches only that column's pixels.

### 04 Binary code patterns
Idea: `log2 N` patterns label each projector column with a bit string.
- Controls: `nbits` range 1-8 (default 8) as the number of patterns used, `bit` range 1..`nbits` selecting which pattern to view, `seg("code")` is not used in this stage (binary only).
- Canvases: `#projPat` (projector row, 256 x 24, the current pattern, upscaled; stripes are `2^k` for bit k, MSB first), `#camPat` (camera image of the pattern on the scene), `#codeAcc` (decoded code map using bits 1..`bit`, colour `VB.heat`-style by `col >> (8 - bit)`, invalid pixels in the stage background colour), and a small `table.calc` with the first 16 columns' codes in binary with the current bit column highlighted (`td.hi`).
- Chips: number of patterns, number of codes `2^nbits`, "exactly correct: x%" over valid pixels (decoded `col === P`).
- Noise and blur controls are in stage 05; here they are zero so the result is exact.

### 05 Gray code
Idea: adjacent columns differ by one bit, so an error at a stripe boundary moves the code by at most one column.
- Controls: `noise` range 0-40 grey levels (default 12), `blur` range 0-4 projector columns (default 1.5), `seg("code")` Binary / Gray for the main view, `nbits` shared with stage 04.
- Canvases (two, side by side in `.two`): `#errBin` and `#errGray`: absolute column error `|col - P|` as `VB.heat` (0 = black, saturating at 16 columns), invalid pixels dark gray. Both are always shown; the seg picks which one `#decView` (full decoded column map) displays.
- Table `table.calc`: columns 0-15, binary code and Gray code, bits changed between neighbours (binary 7 to 8 changes 4 bits, Gray 1).
- Chips per code: mean absolute error (columns), pixels with error > 1 column (%), count of invalid pixels.
- Why binary is worse: at a boundary where several bits flip at once, one wrong bit shifts the column by up to `2^(n-1)`.

### 06 Decode to depth
Idea: decoded column gives the projector ray; intersect with the camera ray.
- Controls: `seg("code")` shared (default Gray), `b` baseline (shared with stage 01; changing either updates both outputs and values), `noise` and `blur` shared with stage 05.
- Canvases: `#depthView` (recovered depth, `VB.heat`, invalid pixels shown in a hatched dark colour, never as a depth), `#gtView` (ground truth), `#relief` (3-D point cloud of the recovered depth sub-sampled 64 x 48, drag to rotate, local orbit code with `// TODO VB.orbit`), and a legend that explains the colours and the invalid colour.
- Chips: median relative depth error vs ground truth on valid, lit pixels; valid pixel %; shadow % (pixels with `lit = 0`); depth resolution `dz` at z = 1.5 m for the current b.
- Prose: larger b gives finer dz but a bigger shadow region (show both numbers moving). One paragraph on time of flight (no demo) and a link to Photometric Stereo.

## VB helpers to reuse
`$, nav, footer, rng, show, showRGB, sized, hiDPI, onTheme, seg, setSeg, segVal, fmt, esc, imgXY, cssVar, arrow` (geometry diagram rays), `gaussKernel` (1-D blur for the projector row, via `sepConv` with a 1-element ky or direct).

## New shared helpers needed (see decisions.md, section 4)
`debounce`, `frame`, `clamp`, `heat(v) -> [r,g,b]`, `grayCanvas`. Page-local: scene builders, `project/pattern/capture/decode/toDepth`, orbit view.

## Performance risks and limits
- Everything is 256 x 192 = 49k pixels. One full pipeline (project + 8 captures + 2 refs + decode + depth) is about 600k pixel operations, a few milliseconds. Binary and Gray both decoded for stage 05 doubles that.
- Gaussian blur is applied to the 256-sample projector row, not to images.
- The noise bank is 10 frames x 49k floats = 2 MB, generated once at load.
- `rAF` for the sweep must stop on pause, scene change and when stage 03 is not visible if it is still running (keep it simple: stop when the `Play` button is paused or the scene is changed).
- Relief view: 3k points, sorted by depth once per redraw; drawing with plain `fillRect` is fine. Do not draw all 49k.
- Recompute on slider `input` through `VB.frame` (one render per animation frame); never recompute from `change` only (it feels laggy).

## Acceptance criteria (tester)
1. No console errors or `pageerror`; no requests other than blocked fonts. Nav shows Active Illumination active; pager prev "Depth from Defocus", next "Camera Calibration".
2. Stage 01: stepping `gz` upward strictly decreases disparity and moves the stripe in `#strip` monotonically; the shown z equals `f b / d` to within 1e-6 and equals `b / (cot alpha + cot beta)` to within 1e-6.
3. Stage 04 (plane, 8 patterns, noise 0, blur 0): `AI.decode` returns `col === P` for 100% of valid pixels (`valid` and `lit`); the chip reads "100%".
4. Stage 04: bit plane k (1-based) of the projector pattern contains exactly `2^k` stripes (transitions + 1) for k = 1..8; the viewed pattern for k = 8 alternates every column.
5. Stage 05: for every n in 0..254 the Gray codes of n and n + 1 differ in exactly one bit (checked on the table and via `AI.pattern`); at noise 12 and blur 1.5 on every scene, mean absolute column error for Gray is <= binary.
6. Stage 06 on the plane at default b: the median relative depth error over valid, lit pixels is <= 2%, and every `lit = 0` pixel is drawn as invalid (its depth output is NaN / unset, not a number).
7. Raising b from 0.20 to 0.60: `dz` at 1.5 m decreases and the shadow percentage on "Steps" increases.
8. Dark-patch checkbox on: the patch pixels are invalid (not wrong), and the valid count drops by about the patch area.
9. 375 px wide: no horizontal overflow; all controls labelled; seg buttons have `aria-pressed`; drag canvases (`#geo`, `#relief`) have `aria-label` and a range-slider alternative; both colour schemes legible (canvas colours via `cssVar`, redraw on `onTheme`).
10. Same inputs produce identical numbers on every reload (no `Math.random`).
