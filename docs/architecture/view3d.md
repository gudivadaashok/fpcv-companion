# VB.view3d: shared 3D view (canvas 2D, no dependencies)

Implements Option A of `threejs.md`. Lives in `common.js` (classic script, works from `file://`). Pilot: `photometric-stereo.html`.

## API

```js
const v = VB.view3d(canvas, { height: 380, fit: 80, yaw: 0.6, pitch: 0.9, pitchRange: [0.05, 1.5], label, onChange });
v.draw({ items, light: [x, y, z], ambient: 0.15 });   // stores the scene, redraws via requestAnimationFrame
v.setView({ yaw, pitch, zoom }); v.reset(); v.project([x, y, z]); // -> [screenX, screenY, depth]
v.view; v.ms;                                         // current view, last render time in ms
VB.view3d.surface(z, w, h, { step: 2, mask, rgb: i => [r, g, b], zscale: 1 }) // height field -> shaded quad items
```

World: x right, y away from the viewer, z up, scene centred on the origin; `fit` is the scene radius in world units (zoom 1 fits it in the canvas). Everything is depth-sorted together (mean depth per item). Items, by `p.length`:

| Item | Fields |
|---|---|
| point | `{ p:[P], r, color }` |
| line | `{ p:[A,B], color, w, dash }` |
| polygon | `{ p:[...], fill, stroke, w }` |
| text | `{ p:[P], text, color, font }` |
| shaded polygon | polygon plus `n:[[nx,ny,nz]...]` (a unit normal per vertex) and `rgb:[r,g,b]`; Lambert, two-sided, from the averaged vertex normals, light fixed in world space |

Colors are CSS colors or custom property names (`"--accent"`), re-read at every redraw. The helper redraws itself on theme change and resize (`VB.onTheme`).

Input: drag orbits (mouse and touch), wheel and two-finger pinch zoom (0.3x to 8x), arrow keys rotate, `+`/`-` zoom, `0` resets. The canvas gets `tabindex=0`, `touch-action:none` and the `label` as `aria-label`.

## Example

```js
const v = VB.view3d(cv, { fit: 70, label: "3D view of the points" });
v.draw({ items: [
  { p: [[0,0,0],[60,0,0]], color: "--accent", w: 2 },     // axis
  ...pts.map(p => ({ p: [p], r: 3, color: "--ink" })),    // point cloud
] });
```
