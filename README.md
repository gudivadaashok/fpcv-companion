# Vision Bench

**Interactive demos for every lecture in [First Principles of Computer Vision](https://fpcv.cs.columbia.edu/).**

▶ **Live site: https://ashokg.dev/fpcv-companion/**

Vision Bench is an unofficial study companion to Shree Nayar's lecture series at Columbia University. Each lecture has a page where you can run the algorithm yourself:

- pick a sample image or upload your own
- move the sliders
- watch each step happen, with the math beside it

Watch a lecture, then try the idea here.

Everything runs in your browser. Sample images are drawn in code, and uploaded images never leave your device.

## Topics

| Chapter | Pages |
|---|---|
| **Imaging** | [Image Formation](https://ashokg.dev/fpcv-companion/image-formation.html) · [Image Sensing](https://ashokg.dev/fpcv-companion/image-sensing.html) · [Binary Images](https://ashokg.dev/fpcv-companion/binary-images.html) · [Image Processing](https://ashokg.dev/fpcv-companion/image-processing.html) |
| **Features** | [Edge Detection](https://ashokg.dev/fpcv-companion/edge-detection.html) · [Boundary Detection](https://ashokg.dev/fpcv-companion/boundary-detection.html) · [SIFT Detector](https://ashokg.dev/fpcv-companion/sift-detector.html) · [Image Stitching](https://ashokg.dev/fpcv-companion/image-stitching.html) · [Face Detection](https://ashokg.dev/fpcv-companion/face-detection.html) |
| **Reconstruction I** | [Radiometry & Reflectance](https://ashokg.dev/fpcv-companion/radiometry-reflectance.html) · [Photometric Stereo](https://ashokg.dev/fpcv-companion/photometric-stereo.html) · [Shape from Shading](https://ashokg.dev/fpcv-companion/shape-from-shading.html) · [Depth from Defocus](https://ashokg.dev/fpcv-companion/depth-from-defocus.html) · [Active Illumination](https://ashokg.dev/fpcv-companion/active-illumination.html) |
| **Reconstruction II** | [Camera Calibration](https://ashokg.dev/fpcv-companion/camera-calibration.html) · [Uncalibrated Stereo](https://ashokg.dev/fpcv-companion/uncalibrated-stereo.html) · [Optical Flow](https://ashokg.dev/fpcv-companion/optical-flow.html) · [Structure from Motion](https://ashokg.dev/fpcv-companion/structure-from-motion.html) |
| **Perception** | [Object Tracking](https://ashokg.dev/fpcv-companion/object-tracking.html) · [Image Segmentation](https://ashokg.dev/fpcv-companion/image-segmentation.html) · [Appearance Matching](https://ashokg.dev/fpcv-companion/appearance-matching.html) · [Neural Networks](https://ashokg.dev/fpcv-companion/neural-networks.html) |

Each page is split into numbered stages. Each stage teaches one idea, and each idea builds on the one before. For example, Optical Flow goes from two frames, to image gradients, to Lucas–Kanade, to the aperture problem.

## Run it locally

You don't need to build or install anything. The site is plain HTML, CSS and JavaScript.

```sh
git clone https://github.com/gudivadaashok/fpcv-companion.git
cd fpcv-companion
open index.html                 # or serve it: python3 -m http.server 8000
```

## How it's built

- **No framework, no build step, no dependencies.** Each lecture is a single self-contained `<topic>.html` file.
- **`common.js`** holds everything the pages share. It exposes it all on `window.VB`:
  - the chapter and topic registry (`CHAPTERS`), which drives the home page, the nav bar and the previous/next links
  - the procedural sample images and the image picker / upload control
  - image-processing routines: grayscale, Gaussian blur, convolution, box sums, bilinear sampling and the FFT
  - canvas and UI helpers
- **`site.css`** is the shared design system, with light and dark themes and layouts that work on phones.
- Sample images are drawn in code with a seeded random generator. The repo has no binary assets, and every run gives the same results.

```
index.html             home page (built from CHAPTERS)
<topic>.html           one page per lecture (22 pages)
common.js              shared registry, samples and image-processing helpers
site.css               shared styles
scripts/check.mjs      static checks run in CI
.github/workflows/     check and deploy to GitHub Pages
docs/specs/            what each page teaches and its acceptance criteria
docs/architecture/     technical designs, review notes and stack decisions
.claude/agents/        AI agent roles used to plan, build and test the site
```

## Checks and deployment

```sh
STRICT=1 node scripts/check.mjs
```

The check needs only Node and has no dependencies. It confirms:
- every inline script parses
- every page in `CHAPTERS` exists and calls `nav()` with its own file name
- every page has the shared footer
- no local link is broken

On every push to `main`, GitHub Actions runs the check, then deploys the site to GitHub Pages. The deploy publishes only the site files, not `docs/`, `scripts/` or `.claude/`. It also adds the commit ID to the links for `site.css` and `common.js`, so browsers never mix fresh pages with stale shared files.

## Contributing

Issues and pull requests are welcome, whether it's a bug, an unclear explanation, or a demo that could teach an idea better.

To add or change a page:
1. Copy the structure of an existing page. [optical-flow.html](optical-flow.html) is a good reference.
2. Reuse the `VB` helpers rather than re-implementing them.
3. Make sure the page's entry in `CHAPTERS` in `common.js` matches its file name.
4. Run `STRICT=1 node scripts/check.mjs`.
5. Try the page in light and dark mode, and at phone width.

Keep notation and terminology consistent with the lectures.

## Credits

The concepts, notation and structure follow **First Principles of Computer Vision** by **Shree Nayar**, Columbia University. Watch the lectures at [fpcv.cs.columbia.edu](https://fpcv.cs.columbia.edu/) or on the [FPCV YouTube channel](https://www.youtube.com/channel/UCf0WB91t8Ky6AuYcQV0CcLw).

This is an independent project, not affiliated with or endorsed by Columbia University or the FPCV team.

## License

The code in this repository is released under the [MIT License](LICENSE). The license covers the code only. The lectures, and the course's own materials and name, belong to their authors.
