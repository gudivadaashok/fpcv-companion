# Coverage audit (source: fpcv.cs.columbia.edu, fetched 2026-11-06)

Site lists 5 chapters after an Introduction: Imaging, Features, Reconstruction I, Reconstruction II, Perception (23 lectures incl. Introduction; Image Processing is two lectures). CHAPTERS in common.js has 22 entries across the same five chapters.

## Result
- Chapter names, grouping and order match the site exactly.
- **Missing pages (registered in CHAPTERS, no HTML file):** `face-detection.html`, `active-illumination.html`. Both appear in nav/pager and will 404 until built. Specs: face-detection.md, active-illumination.md.
- **Misnamed:** "Active Illumination" should be "Active Illumination Methods" (site title). Optional.
- **Merged lectures:** `image-processing.html` covers Image Processing I and II (site lists them separately). Acceptable; confirm the page covers template matching (I) and deconvolution/aliasing (II), or scope-note it.
- **No page for "Introduction":** fine, index.html serves that role; no action.
- **Description drift:** Face Detection blurb says "sliding-window cascade", but the course lists Haar features, integral image, nearest neighbor, SVM (no boosting/cascade). Recommend blurb: "Haar-like features, integral images, and a sliding-window classifier."
- **Files not in registry:** `_t1.html`, `_t2.html` (drafts, see drafts.md).
- Misordered: none.
