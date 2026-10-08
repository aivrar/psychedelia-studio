# Patterns: Effect Reference

[All effects](Effect-Catalog.md) · [Using controls](Interface-Guide.md) · [Palettes](Palette-Reference.md)

Generated from the running app by `node tools/build-wiki-reference.mjs`. Values are base defaults, before presets or audio modulation. Select values are zero-based indices in saved data; the UI shows labels. Ranges use the app’s stored units; controls marked as percentages may display a scaled value.

- [Truchet Tiles](#truchet-tiles)
- [Quasicrystal](#quasicrystal)
- [Op Art](#op-art)
- [Islamic Star Patterns](#islamic-star-patterns)

## Truchet Tiles

Endless Truchet paths: quarter arcs, diagonal maze, woven ribbons and flowing dashed rings with smooth tile flips

Effect ID: `truchet`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Tile Style · `style` | Quarter Arcs (0) | Quarter Arcs; Diagonal Maze; Woven Ribbons; Flowing Rings | — |
| Tile Count · `tiles` | 9 | 3 to 30 | 1 |
| Path Width · `width` | 0.14 | 0.02 to 0.4 | 0.01 |
| Flip Rate · `flip_rate` | 0.18 | 0 to 2 | 0.02 |
| Scroll · `scroll` | 0.15 | -1 to 1 | 0.02 |
| Color Speed · `color_speed` | 0.3 | 0 to 3 | 0.05 |
| Glow · `glow` | 0.8 | 0 to 2 | 0.05 |
| Palette · `palette` | Rainbow (0) | Rainbow; Neon; + [71 shared palettes](Palette-Reference.md) | — |

## Quasicrystal

Quasi-periodic wave interference with N-fold symmetry: smooth waves, interference stripes, polar rosettes and Penrose-like contours

Effect ID: `quasicrystal`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Style · `style` | Smooth Waves (0) | Smooth Waves; Interference Stripes; Polar Rosette; Contour Glow | — |
| Symmetry · `symmetry` | 7 | 3 to 15 | 1 |
| Frequency · `frequency` | 18 | 2 to 60 | 0.5 |
| Speed · `speed` | 0.8 | 0 to 3 | 0.05 |
| Rotation · `rotation` | 0.05 | -1 to 1 | 0.01 |
| Contrast · `contrast` | 1.4 | 0.5 to 3 | 0.05 |
| Color Speed · `color_speed` | 0.25 | 0 to 3 | 0.05 |
| Palette · `palette` | Rainbow (0) | Rainbow; Neon; + [71 shared palettes](Palette-Reference.md) | — |

## Op Art

Riley waves, Vasarely bulge, moire rings, zebra flow and kinetic squares in stark black and white or neon duotones

Effect ID: `op_art`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Style · `style` | Riley Waves (0) | Riley Waves; Vasarely Bulge; Moire Rings; Zebra Flow; Kinetic Squares | — |
| Density · `density` | 22 | 4 to 60 | 1 |
| Distortion · `amplitude` | 0.8 | 0 to 2 | 0.05 |
| Speed · `speed` | 0.6 | 0 to 3 | 0.05 |
| Sharpness · `sharpness` | 0.85 | 0.1 to 1 | 0.05 |
| Colors · `palette` | Black & White (0) | Black & White; Neon Duotone; + [71 shared palettes](Palette-Reference.md) | — |

## Islamic Star Patterns

Breathing geometric star patterns built with Hankin’s method on square and hexagonal tilings

Effect ID: `islamic_stars`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Tiling · `tiling` | Square (8-point stars) (0) | Square (8-point stars); Hexagonal (6-point stars) | — |
| Tiles Across · `scale` | 5 | 2 to 14 | 0.1 |
| Contact Angle · `angle` | 70 | 20 to 80 | 0.5 |
| Angle Breathing · `breathe` | 0.35 | 0 to 1 | 0.01 |
| Band Width · `band` | 0.045 | 0.01 to 0.12 | 0.001 |
| Band Outline · `outline` | 0.6 | 0 to 1 | 0.01 |
| Rotation · `spin` | 0.04 | -1 to 1 | 0.01 |
| Shimmer · `shimmer` | 0.5 | 0 to 1 | 0.01 |
| Colours · `scheme` | Zellige Blue (0) | Zellige Blue; Gold & Lapis; Emerald Court; Neon Night; + [71 shared palettes](Palette-Reference.md) | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |
