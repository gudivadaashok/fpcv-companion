# Spec: Face Detection (face-detection.html)
Chapter Features. Lecture reference: FPCV "Face Detection" (Haar Features for Face Detection, Integral Image, Nearest Neighbor Classifier, Support Vector Machine).

**Scope note:** the course covers Haar features, integral image, and a learned classifier (NN, SVM) applied over a sliding window. Boosting and cascades (Viola-Jones) are NOT in the lecture list. Assumption: show the sliding-window pipeline with a simple trained classifier; add a single optional "early rejection" note in prose in stage 05 only, no separate boosting demo. Defer AdaBoost training.

**Title:** Face Detection, Interactively
**Lead:** A face is a pattern of light and dark patches. Slide a small window over the image, measure a few cheap rectangle contrasts, and let a classifier say face or not face.

## Stages
- **00 Choose an image.** Samples + upload. Idea: input. Student picks one.
- **01 Haar features.** Idea: a feature = sum(white rects) - sum(black rects). Show 2-, 3-, 4-rectangle types on a 24x24 face patch; student drags a feature over the patch (eyes darker than cheeks, nose bridge brighter) and reads its value.
- **02 Integral image.** Idea: S(x,y)=sum of I over all pixels above-left; any rectangle sum = 4 lookups, A+D-B-C. Student hovers a rectangle; see the 4 corners, the sum, and the brute-force sum match.
- **03 Classifier.** Idea: map a window's feature vector to face/non-face. Students toggle Nearest Neighbor vs linear SVM on a 2-feature scatter plot of face/non-face training windows; click to add a test point, see decision boundary/margin.
- **04 Sliding window.** Idea: scan every position and scale. Controls: window size, stride, scale step. Student sees the scanned window and per-window score as a heat map.
- **05 Detections.** Idea: many overlapping hits merge into one box. Threshold slider and merge (non-max suppression/grouping) toggle; count of windows evaluated shown, and time saved by integral image.

## Samples
1. Synthetic faces: 3 generated face-like blobs (ellipse, dark eye/mouth regions) of different sizes, canvas-drawn.
2. Face-free texture (false-positive check).
3. Mixed scene: 2 faces + clutter.
Plus a built-in set of generated 24x24 face/non-face training patches (seeded, deterministic). No external files.

## Acceptance criteria
1. Page loads with no console errors; nav shows Face Detection active, pager links to next Radiometry & Reflectance (CHAPTERS order) and previous Image Stitching.
2. Stage 01: moving the feature changes shown value; over eye/cheek region the value has the expected sign; over flat region it is near 0.
3. Stage 02: displayed integral-image rectangle sum equals the direct sum for any rectangle (exact).
4. Stage 03: switching NN/SVM changes the boundary; a clicked point is labeled and colored by the active classifier.
5. Stage 04: window size/stride changes the reported window count correctly (count = floor-based grid formula shown).
6. Stage 05: on the 2-face sample, the default settings yield exactly 2 merged boxes over the faces; on the texture sample, 0 boxes at the default threshold; lowering threshold shows more boxes.
7. Uploaded image works; processing stays local; large uploads are downscaled so a scan finishes in under 3 s on a laptop.
8. Usable at 375 px width; controls keyboard-accessible with labels; math rendered in prose beside demos.
