# Spec: Active Illumination (active-illumination.html)
Chapter Reconstruction I. Lecture reference: FPCV "Active Illumination Methods" (Structured Light Range Finding, Phase Shifting, Structured Light Systems; also Photometric Stereo Systems and Time of Flight).

**Scope:** build around structured-light range finding. Light-stripe triangulation is the base idea; binary/Gray code patterns solve the speed problem. Defer: Time of Flight (one prose paragraph, no demo), photometric stereo systems (link to photometric-stereo.html). Phase shifting: include only as optional stage 06 if size permits; otherwise defer.

**Title:** Active Illumination, Interactively
**Lead:** Instead of waiting for texture, project your own light. Where a known pattern lands in the camera tells you how far away the surface is.

## Stages
- **00 Choose a scene.** Synthetic depth scenes (see samples). Student picks one.
- **01 Triangulation.** Idea: projector and camera separated by baseline b; a ray from each meets at the surface point; depth z follows from the angles (z = b / (cot theta_p + cot theta_c) in course notation, state assumed geometry). Student drags a point's depth and sees the stripe shift in the camera image.
- **02 One light stripe.** Idea: a single stripe gives one depth profile per image; the stripe displacement d maps to depth. Slider moves the stripe column; display the displacement curve and profile.
- **03 Sweeping is slow.** Idea: N stripes need N images. Show stripe sweep with a frame counter, N images for N columns.
- **04 Binary code patterns.** Idea: log2(N) patterns encode each column as a bit string. Student steps through bit planes 1..k and sees the projected pattern, the camera image, and the code accumulating per pixel.
- **05 Gray code.** Idea: neighboring columns differ by one bit, so decode errors at stripe boundaries are at most one column. Toggle binary vs Gray with a noise/blur control and compare decoded column maps and error counts.
- **06 Decode to depth.** Idea: decoded column -> projector angle -> triangulate. Output: depth map (colormap), 3D/relief view, and baseline slider (larger baseline = finer depth resolution, more occlusion shadow).
- **07 (optional) Phase shifting.** Defer if scope grows.

## Samples
1. Plane tilted (simple, verifiable depth).
2. Sphere/ball on a floor.
3. Stepped blocks (shows occlusion shadows and discontinuities).
All are generated as depth maps; camera images are rendered by shifting projector columns by depth-based disparity. Optionally a surface with a dark patch to show decode failure. Upload is not applicable (needs known depth); state this on the page.

## Acceptance criteria
1. Page loads with no console errors; nav and pager (prev Depth from Defocus, next Camera Calibration) work.
2. Stage 01: increasing depth moves the stripe monotonically; values match the displayed formula.
3. Stage 04: with 8 patterns for 256 columns, every pixel's decoded column equals its true projector column on the noise-free plane sample (100%).
4. Stage 04: bit-plane k shows exactly 2^k stripes.
5. Stage 05: Gray code pattern has exactly one bit changing between adjacent columns (checkable); at the same noise level with blur > 0, Gray's mean column error is less than or equal to binary's (with no blur both errors are under 0.001 column and count as equal).
6. Stage 06: recovered depth on the plane sample is within 2% of ground truth away from occlusion; occluded/shadowed pixels are shown as invalid, not wrong depth.
7. Increasing baseline increases depth resolution and shadow area visibly.
8. Usable at 375 px; controls labeled and keyboard accessible; no network requests.
