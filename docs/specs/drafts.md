# Stray drafts

## _t1.html vs object-tracking.html
`diff` shows one difference: _t1.html has a trailing `<script>` block (before `</body>`) that clicks #occl/#distr toggles, sets noise=30, jumps to frame 119, selects SSD mode and clicks #rebox via `window.__tt`. It is a test-driver harness that pre-sets demo state, not a content change.
**Recommendation: keep current (object-tracking.html); delete _t1.html.** The draft would load the page in a forced, noisy, occluded state and depends on a debug hook `window.__tt`.

## _t2.html vs image-segmentation.html
Identical except a trailing `<script>` that clicks #kAx La, sets #kL=0.6, restarts and steps k-means twice, sets #gProg=40, selects sample 2. Same kind of test harness.
**Recommendation: keep current (image-segmentation.html); delete _t2.html.**

Note: the harnesses show which controls were being exercised (occlusion, distractor, SSD mode, k-means stepping, graph progress); the tester can reuse them as scenarios. Neither draft should ship or be linked.
