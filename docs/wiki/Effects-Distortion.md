# Distortion: Effect Reference

[All effects](Effect-Catalog.md) · [Using controls](Interface-Guide.md) · [Palettes](Palette-Reference.md)

Generated from the running app by `node tools/build-wiki-reference.mjs`. Values are base defaults, before presets or audio modulation. Select values are zero-based indices in saved data; the UI shows labels. Ranges use the app’s stored units; controls marked as percentages may display a scaled value.

- [Kaleidoscope](#kaleidoscope)
- [Feedback Loop](#feedback-loop)
- [Swirl Vortex](#swirl-vortex)
- [Wave Distortion](#wave-distortion)
- [Droste Effect](#droste-effect)

## Kaleidoscope

Mirror-chamber kaleidoscope: wedge, three-mirror tube, square, hex, recursive and spiral folds over animated source patterns

Effect ID: `kaleidoscope`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Mirror Style · `fold_style` | Three-Mirror Tube (1) | Polar Wedge; Three-Mirror Tube; Square Mirrors; Hex Mirrors; Recursive Fold; Spiral Tunnel | — |
| Segments · `segments` | 6 | 2 to 16 | 1 |
| Source Pattern · `source_mode` | Voronoi Shards (1) | Wave Glass; Voronoi Shards; Fractal Ink; Star Lattice; Bubble Cells; Flame Wisps; Bent Blades; Concentric Bloom; Cosine Lace; Smoke Petals; Ribbon Fans; Neuron Web | — |
| Speed · `speed` | 0.8 | 0.1 to 3 | 0.1 |
| Zoom · `zoom` | 2 | 0.5 to 5 | 0.1 |
| Mirror Size · `chamber` | 0.55 | 0.15 to 1.5 | 0.01 |
| Rotation Speed · `rotation` | 0.2 | -2 to 2 | 0.05 |
| Object Drift · `drift` | 0.6 | 0 to 2 | 0.05 |
| Complexity · `complexity` | 3 | 1 to 5 | 0.5 |
| Edge Glow · `edge_glow` | 0.8 | 0 to 2 | 0.05 |
| Mirror Seams · `seam_glow` | 0.5 | 0 to 2 | 0.05 |
| Palette · `palette` | Rainbow Glass (0) | Rainbow Glass; Neon Prism; + [71 shared palettes](Palette-Reference.md) | — |
| Color Speed · `color_speed` | 0.4 | 0 to 3 | 0.05 |
| Vividness · `vividness` | 1.25 | 0 to 2 | 0.05 |
| Contrast · `contrast` | 1.3 | 0.5 to 2.5 | 0.05 |

## Feedback Loop

Video feedback trails: sources stream through zoom, swirl, kaleido, ripple or tunnel transforms with independent flow speed

Effect ID: `feedback`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Source · `source_pattern` | Plasma (0) | Plasma; Noise; Rings; Dots; Spiral; Lissajous; Voronoi Cells; Kaleido Shards; Flow Ribbons; Mandala Bloom; Starburst Rays; Julia Flicker; Hex Lattice; Orbiting Orbs; Plasma Worms | — |
| Source Colors · `source_palette` | Rainbow (0) | Rainbow; Neon; Fire; Ice; Acid; Pastel; Sunset; Mono | — |
| Source Speed · `source_speed` | 0.55 | 0.02 to 3 | 0.02 |
| Source Strength · `source_strength` | 0.08 | 0 to 0.3 | 0.01 |
| Transform · `transform_mode` | Zoom & Rotate (0) | Zoom & Rotate; Swirl Vortex; Kaleido Mirror; Ripple Lens; Tunnel Drift; Mirror Split | — |
| Flow Speed · `flow_speed` | 1 | 0.05 to 3 | 0.05 |
| Zoom · `zoom` | 0.98 | 0.95 to 1.05 | 0.002 |
| Rotation · `rotation` | 0.02 | -0.1 to 0.1 | 0.005 |
| Warp Amount · `warp` | 0.4 | 0 to 1 | 0.02 |
| Trail Length · `decay` | 0.97 | 0.9 to 1 | 0.005 |
| Color Shift · `color_shift` | 0.02 | 0 to 0.1 | 0.005 |
| Hue Drift · `hue_drift` | 0 | -0.02 to 0.02 | 0.001 |
| Blend · `blend_mode` | Add (0) | Add; Screen; Lighten | — |

## Swirl Vortex

Hypnotic vortices: classic spiral, op-art rings, spiral galaxy, liquid whirlpool, twin vortex and black-hole lensing

Effect ID: `swirl`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Style · `style` | Classic Spiral (0) | Classic Spiral; Hypnotic Rings; Spiral Galaxy; Liquid Whirlpool; Twin Vortex; Black Hole | — |
| Speed · `speed` | 1 | 0.1 to 3 | 0.1 |
| Twist Amount · `twist` | 8 | 1 to 20 | 0.5 |
| Arms · `arms` | 3 | 1 to 8 | 1 |
| Radius · `radius` | 1 | 0.2 to 2 | 0.1 |
| Color Speed · `color_speed` | 0.5 | 0 to 2 | 0.05 |
| Palette · `palette` | Rainbow (0) | Rainbow; Neon; + [71 shared palettes](Palette-Reference.md) | — |
| Contrast · `contrast` | 1.1 | 0.5 to 2 | 0.05 |

## Wave Distortion

Rippling wave distortions creating liquid, flag-like motion

Effect ID: `waves`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Speed · `speed` | 1.5 | 0.1 to 5 | 0.1 |
| Amplitude · `amplitude` | 0.08 | 0.01 to 0.3 | 0.01 |
| Frequency · `frequency` | 8 | 1 to 20 | 0.5 |
| Layers · `layers` | 3 | 1 to 6 | 1 |
| Source · `color_mode` | Rainbow Grid (0) | Rainbow Grid; Noise; Circles; Plasma | — |

## Droste Effect

Recursive infinite zoom - an image contains itself at every scale

Effect ID: `droste`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Zoom Speed · `speed` | 0.5 | 0.1 to 3 | 0.1 |
| Branches · `branches` | 1 | 1 to 6 | 1 |
| Twist · `rotation` | 0.5 | 0 to 3 | 0.1 |
| Pattern · `pattern` | Spiral (0) | Spiral; Squares; Mandala; Noise | — |
| Color Speed · `color_speed` | 0.5 | 0 to 2 | 0.05 |
