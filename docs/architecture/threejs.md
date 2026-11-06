# Decision: should Vision Bench adopt three.js?

Date 2026-11-06. Author: architect. Status: decided, **Option A** (shared hand-rolled `VB.view3d`, no three.js now).

## Verdict

three.js would make the 3D panels look better (z-buffer, smooth shading, zoom, pinch) but it does not fix a measured problem, and it breaks two properties of the site: opening pages from `file://` and "no dependency without a concrete problem". The real defect is that the orbit/projection/painter code is copy-pasted into six pages. Fix that with a shared helper first. Revisit three.js only if a trigger below fires.

## 1. Inventory of 3D and pseudo-3D rendering

Every 3D view is a hand-rolled 2D-canvas projection: yaw/pitch rotation, perspective-free orthographic scale, `Array.sort` on face depth (painter's algorithm), drag-to-rotate with pointer capture. Pages with 3D today:

| Page | Canvas | What is drawn | Code (approx.) | Weaknesses | What three.js would add for teaching |
|---|---|---|---|---|---|
| structure-from-motion | `#view3d` | true vs recovered points (~dozens), shape edges, error segments, axes; click-to-select | `project`, `drawShape`, handler: ~28 lines (L285-310) | no zoom/pan; no wheel/pinch; points only, no surface | little. Few points; nothing to light. Orbit controls only |
| camera-calibration | `#view3d` | 3 checkerboard planes (3 x ~(NC+1)^2 quads), camera frustum, axes | `draw3d` ~30 lines (L255-285) | per-quad painter's sort: planes meeting at the origin interpenetrate, sorting by mean depth gives wrong overlap at the seams; no zoom (camera can sit far away, scale is capped) | proper depth test at plane intersections; frustum as a real object; zoom to inspect the camera. Moderate gain |
| uncalibrated-stereo | `#view3d` | point cloud (coloured dots, sorted back to front) + two camera frusta | `draw3d` ~16 lines (L248-263) | point sprites are flat discs, no size attenuation; no zoom | marginal. Points + frusta already read well |
| photometric-stereo | `#view3d` | 64x64 quad mesh of recovered height (128 px map, step 2), one fixed light, albedo-modulated grey | `draw3d` ~25 lines (L215-238) | 4096 quads sorted every frame; fixed Lambert light, no specular, flat-shaded facets; no zoom; light cannot be moved | **best case**: smooth vertex normals, a light you can place (ties to stage 01 light directions), specular highlight to show normals matter. Real gain |
| shape-from-shading | `#v3r`, `#v3t` | two 48x48 height meshes (N=96, step 2) side by side, one fixed light, synchronised rotation | `draw3d` ~16 lines (L265-278), called twice per frame | 2 x 2304 quads sorted per frame; same fixed light; bump/crater convex/concave ambiguity is exactly what proper lighting would show | **best case** with photometric-stereo: same lit-surface component, light dial drives it. Real gain |
| active-illumination | `#relief` | 64x48 recovered-depth point cloud, yaw/pitch sliders + drag + arrow keys (the only keyboard-accessible one) | `drawRelief` + `setView` ~25 lines (L470-503) | dots only; no mesh; no zoom | a lit mesh of the depth map would read better than dots. Moderate gain |

Pseudo-3D that is **not** a candidate: image-formation (2D diagrams: pinhole side view, top view, ray diagrams), radiometry-reflectance (rendered sphere is per-pixel CPU shading into a 2D image, which is the lesson), depth-from-defocus (2D lens diagram), sift-detector (scale-space stacks), optical-flow, image-stitching (homography warps). They draw 2D and should stay 2D.

Duplication: the drag handler `st.rot[0] += dx*0.01; st.rot[1] = clamp(...)` appears 7 times (SfM, calibration, uncalibrated, photometric, shape-from-shading x loop, active-illumination plus its sliders), each with a different pitch clamp and no wheel or multi-touch support. The mesh painter (project grid, build quads, sort, flat Lambert) is duplicated verbatim in photometric-stereo and shape-from-shading.

## 2. Measurements (Playwright, headless Chromium, file://, 1100 px viewport)

Method: dispatch a synthetic pointerdown, 40 pointermoves, pointerup on the 3D canvas; time each synchronous `pointermove` handler (which redraws). Median / p95 in ms per frame, at 1x CPU and with 4x CPU throttling (a weak phone). Script: `scratchpad/m.js`.

| Page / canvas | Size (px) | 1x med / p95 | 4x med / p95 |
|---|---|---|---|
| structure-from-motion | 1014x440 | 0.1 / 0.4 | 0.5 / 1.5 |
| camera-calibration | 598x380 | 0.2 / 0.8 | 0.6 / 1.6 |
| uncalibrated-stereo | 598x360 | 0.3 / 0.8 | 0.8 / 2.1 |
| active-illumination | 1014x340 | 0.8 / 5.2 | 2.9 / 16.9 |
| photometric-stereo (4096 quads) | 598x380 | 2.1 / 4.0 | 7.9 / 10.2 |
| shape-from-shading (2 x 2304 quads, per canvas; both redraw per move so double) | 499x330 | 3.8 / 6.1 | 15.6 / 17.8 |

Reading: all within the 100 ms budget by a wide margin, and within one 16.7 ms frame at 1x. The worst case is shape-from-shading at 4x throttle: about 31 ms per drag event (two meshes), i.e. ~30 fps on a very slow device. That is acceptable, not a problem. **There is no performance case for three.js.** Headless Chromium does expose WebGL 2 (software), so WebGL tests are possible but would use SwiftShader.

Quality defects are real but visual: facet shimmer in the painter's sort on meshes, wrong overlap where calibration planes meet, no zoom, no pinch.

## 3. Cost of adopting three.js here

- **file:// is the blocker.** Tested: `<script type="module">import ... from './three.module.min.js'` from a `file://` page fails in Chromium with a CORS error ("origin 'null'"). The site's current contract (architect.md: every page opens from `file://`, and the tester drives `file://`) would break on every page that imports three. Import maps do not help; they still load modules.
- **No classic build any more.** three.js removed `build/three.min.js` at r160. The last classic build is r159 (668 KB min, 166 KB gzip) and it prints a deprecation warning; its `examples/js/controls/OrbitControls.js` is gone (404), so no controls. Staying on r159 means freezing a deprecated release. Alternative: a one-off esbuild bundle into an IIFE that exposes `window.THREE`, committed as a vendored file. That is a build step (run rarely, outside CI) and the output is not reviewable.
- **Payload** (measured from jsDelivr):

| Version | Files | Min | Gzip |
|---|---|---|---|
| r170 | `three.module.min.js` | 692 KB | 171 KB |
| r187 (current) | `three.module.min.js` + `three.core.min.js` | 392 + 422 KB | 89 + 105 = 195 KB |
| any | `OrbitControls.js` (unminified) | 32-41 KB | 7-8.5 KB |

  Today the whole site is 797 KB of HTML plus 244 lines of `common.js`, no libraries. ~200 KB gzip of three.js is more than the code of all 22 pages combined, to draw 5 canvases.
- **Delivery.** CDN: privacy regression (the site promises everything runs in the browser; fonts already hit Google, a second third party is worse), offline fails, and the Playwright harness rule "fail on any non-file request" would have to be relaxed. Vendored: add `vendor/three/` and extend `.github/workflows/pages.yml` `cp` step (it copies only `index.html site.css common.js` and registry pages, so `vendor/` would silently 404 in production) and `scripts/check.mjs` (resolve `import` specifiers).
- **common.js interaction.** `common.js` is a classic script exposing `window.VB`. Pages using modules would need `<script type="module">`, which defers execution and changes the inline IIFE pattern (`const {...} = VB` still works if `common.js` stays classic and loads first, but test hooks like `window.NN` timing change). Dynamic `import()` from classic scripts also fails on `file://`.
- **Theming.** WebGL canvases do not read CSS variables; every colour (`--accent`, `--muted`, `--line`) must be re-read into `THREE.Color` on `VB.onTheme`. Doable, but one more code path to keep in sync with light/dark.
- **Testing.** Pixel and number assertions on WebGL need SwiftShader and are slower and less deterministic; tester currently asserts numbers via `window` hooks, which still works. Screenshots in CI would differ by GPU.
- **Fallback.** Needs a canvas-2D fallback when WebGL is unavailable (privacy browsers, old phones, context loss). That means keeping the current hand-rolled code anyway, so three.js adds code rather than replacing it.
- **Accessibility.** The present active-illumination view has arrow keys and `tabindex`; any three.js version must re-implement keyboard orbit (OrbitControls has `listenToKeyEvents`, partial).
- **Churn.** three.js ships a release roughly monthly and changes import layout (the r187 core/module split is a recent example). Pin one version and never upgrade without a visual check of 5 pages.

## 4. Options

### A. Keep canvas, add a shared `VB.view3d` helper (recommended)

Add to `common.js` (~120-150 lines, ~2 KB gzip):

```js
VB.view3d(canvas, { height, yaw, pitch, pitchRange, dist, fit, onChange, onPick })
  -> { draw(scene), setView(yaw, pitch), project(p) -> [x, y, depth] }
// scene = array of primitives, drawn depth-sorted together:
//   { pts: [[x,y,z]...], r, color | colors }            points, size attenuated by depth
//   { lines: [[a, b]...], color, dash, w }
//   { mesh: { V, nx, ny, shade: {light: [x,y,z], albedo, ambient, spec} } }  grid mesh, smooth vertex normals
//   { poly: [p...], fill, stroke }                      frusta, planes
//   { arrow, label }
```

Behaviour it centralises: pointer drag orbit with pointer capture, wheel zoom, two-finger pinch and pan (pointer events, `touch-action:none`), arrow-key orbit with `tabindex`, `+`/`-` zoom, reset button, dark/light colours via `cssVar`, hiDPI, click-pick with the projected positions. Improvements it brings over today: one depth sort across all primitives (fixes calibration plane overlap), smooth vertex-normal shading with a movable light and a specular term (photometric-stereo, shape-from-shading), mesh decimation by canvas size, zoom/pinch everywhere, keyboard access everywhere. Optional later: Z-buffer for meshes via ImageData if facets still shimmer (a 600 x 380 scanline z-buffer is ~40 lines and costs a few ms).

Effort: helper 4 h (including tests of pinch/wheel in Playwright with synthetic pointers); migration 6 pages: SfM 1 h, calibration 1.5 h, uncalibrated 1 h, active-illumination 1 h (keep the sliders, wire to `setView`), photometric-stereo 1.5 h, shape-from-shading 1.5 h (two linked views, share `rot`). **About 11-12 h total.** Removes ~150 lines of duplicated page code, net `common.js` +130 lines.

Steps:
1. Implement `VB.view3d` + `VB.shade` in `common.js`; add a hidden demo to nothing (test through a page).
2. Migrate photometric-stereo first (biggest visual win, validates mesh shading), then shape-from-shading (reuse), then calibration (validates poly + frustum), then SfM, uncalibrated-stereo, active-illumination.
3. Per page: keep existing `window` test hooks; tester checks that the draw call count matches, no console errors, no horizontal overflow at 375 px, wheel and pinch change `rot`/`dist`, both themes.
4. List all callers in the commit; `scripts/check.mjs` already guards parse errors.

### B. three.js on 2-4 pages only, vendored, lazy-loaded

Targets: photometric-stereo, shape-from-shading, maybe camera-calibration. Requires: a vendored pinned build under `vendor/three/`, the file:// problem resolved (either drop file:// support for those pages, or a committed IIFE bundle built by esbuild, i.e. a build step), a canvas-2D fallback (so Option A's helper is still needed), `pages.yml` and `check.mjs` changes. Effort: ~6 h per page for the first (infrastructure, theming, fallback, tests), ~2-3 h per further page; ~15-20 h for three pages, plus ~200 KB gzip lazy load and ongoing pin maintenance. Gain over A: true Z-buffer and PBR-quality lighting, which the lectures do not need (they use Lambertian shading and normals).

### C. three.js site-wide

Rejected. 17 of 22 pages draw only 2D images and plots; loading ~200 KB gzip and WebGL contexts for them has no benefit, and it forces the module/file:// change everywhere.

## Recommendation

**A.** It addresses every observed defect (duplication, facet sorting artefacts, no zoom/touch, fixed light) at ~12 h, ~2 KB gzip, with no dependency, no deploy change and `file://` intact.

**Triggers to reconsider B** (any one): (1) a lecture needs a mesh with more than ~20k triangles or a textured model; (2) shadows, environment lighting, or a real specular BRDF shown on 3D geometry (radiometry could grow here); (3) the helper's 2D z-sorting still shows visible artefacts after the optional Z-buffer; (4) the project decides to drop `file://` support (then a vendored r187 ES module with an import map is clean). If B is ever chosen: pin an exact version (e.g. r187), vendor `three.module.min.js`, `three.core.min.js` and `OrbitControls.js` into `vendor/three/`, add `vendor/` to `pages.yml`, keep `VB.view3d` as the fallback, and relax the harness rule for `file:` only for module requests.
