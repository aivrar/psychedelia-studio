# Geometry: Effect Reference

[All effects](Effect-Catalog.md) · [Using controls](Interface-Guide.md) · [Palettes](Palette-Reference.md)

Generated from the running app by `node tools/build-wiki-reference.mjs`. Values are base defaults, before presets or audio modulation. Select values are zero-based indices in saved data; the UI shows labels. Ranges use the app’s stored units; controls marked as percentages may display a scaled value.

- [Hyperbolic Tiling](#hyperbolic-tiling)
- [Liquid Chrome](#liquid-chrome)
- [Gyroid Tunnels](#gyroid-tunnels)

## Hyperbolic Tiling

Escher-style {p,q} hyperbolic tilings in the Poincare disk or band model, drifting through the infinite plane

Effect ID: `hyperbolic_tiling`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Polygon Sides (p) · `p_sides` | 7 | 3 to 12 | 1 |
| Meeting at Vertex (q) · `q_meet` | 3 | 3 to 10 | 1 |
| Projection · `projection` | Poincare Disk (0) | Poincare Disk; Band (Fill Screen) | — |
| Style · `style` | Checker Tiles (0) | Checker Tiles; Glow Edges; Depth Bands; Stained Glass | — |
| Drift · `drift` | 0.6 | 0 to 1.5 | 0.05 |
| Spin · `spin` | 0.1 | -1 to 1 | 0.02 |
| Line Width · `line_width` | 1 | 0 to 3 | 0.05 |
| Color Speed · `color_speed` | 0.3 | 0 to 3 | 0.05 |
| Palette · `palette` | Rainbow (0) | Rainbow; Neon; + [71 shared palettes](Palette-Reference.md) | — |

## Liquid Chrome

Mercury blobs melting into each other and mirroring a neon world

Effect ID: `liquid_chrome`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Blobs · `blobs` | 6 | 3 to 8 | 1 |
| Melting · `melt` | 0.55 | 0.05 to 1.2 | 0.01 |
| Flow Speed · `speed` | 0.5 | 0 to 2 | 0.01 |
| Blob Size · `size` | 1 | 0.4 to 1.6 | 0.01 |
| Reflected World · `world` | Neon City (0) | Neon City; Sunset; Studio; Rainbow Sky | — |
| Metal · `metal` | Chrome (0) | Chrome; Gold; Oil Slick; Black Mirror | — |
| Camera Orbit · `orbit` | 0.3 | 0 to 1 | 0.01 |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |

## Gyroid Tunnels

Flight through an iridescent gyroid lattice, an organic minimal surface

Effect ID: `gyroid_tunnels`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Lattice Scale · `scale` | 2.6 | 1 to 6 | 0.01 |
| Wall Thickness · `thickness` | 0.12 | 0.02 to 0.4 | 0.005 |
| Flight Speed · `speed` | 1 | 0 to 4 | 0.01 |
| Twist · `twist` | 0.12 | -0.6 to 0.6 | 0.01 |
| Surface Detail · `detail` | 0.3 | 0 to 1 | 0.01 |
| Neon Glow · `glow` | 0.8 | 0 to 2 | 0.01 |
| Iridescence · `iridescence` | 0.75 | 0 to 1 | 0.01 |
| Palette · `palette` | Oil Slick (0) | Oil Slick; Neon; Bone; Aurora; + [71 shared palettes](Palette-Reference.md) | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |
