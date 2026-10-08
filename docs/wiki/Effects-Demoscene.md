# Demoscene: Effect Reference

[All effects](Effect-Catalog.md) · [Using controls](Interface-Guide.md) · [Palettes](Palette-Reference.md)

Generated from the running app by `node tools/build-wiki-reference.mjs`. Values are base defaults, before presets or audio modulation. Select values are zero-based indices in saved data; the UI shows labels. Ranges use the app’s stored units; controls marked as percentages may display a scaled value.

- [Plasma](#plasma)
- [Tunnel](#tunnel)
- [Fire](#fire)
- [Starfield](#starfield)
- [Metaballs](#metaballs)
- [Rotozoom](#rotozoom)
- [Moire Patterns](#moire-patterns)
- [Water Ripple](#water-ripple)

## Plasma

Classic lava lamp plasma with flowing, pulsing color blobs

Effect ID: `plasma`. CPU fallback declared: **yes**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Speed · `speed` | 1 | 0.1 to 5 | 0.1 |
| Scale · `scale` | 6 | 1 to 20 | 0.5 |
| Complexity · `complexity` | 4 | 1 to 8 | 1 |
| Saturation · `saturation` | 0.85 | 0 to 1 | — |
| Brightness · `brightness` | 0.9 | 0.2 to 1.5 | — |

## Tunnel

Classic demoscene tunnel - flying through an infinite psychedelic tube

Effect ID: `tunnel`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Speed · `speed` | 1.5 | 0.1 to 5 | 0.1 |
| Twist · `twist` | 1 | 0 to 5 | 0.1 |
| Ring Density · `rings` | 8 | 1 to 20 | 1 |
| Segments · `segments` | 6 | 1 to 16 | 1 |
| Color Shift · `color_shift` | 0.5 | 0 to 2 | 0.05 |
| Wobble · `wobble` | 0.5 | 0 to 2 | 0.1 |

## Fire

Realistic procedural flames with customizable palette

Effect ID: `fire`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Speed · `speed` | 2 | 0.5 to 5 | 0.1 |
| Intensity · `intensity` | 1.5 | 0.5 to 3 | 0.1 |
| Detail · `detail` | 5 | 1 to 8 | 1 |
| Wind · `wind` | 0 | -2 to 2 | 0.1 |
| Palette · `palette_mode` | Classic Fire (0) | Classic Fire; Blue Fire; Green Toxic; Purple Magic; Rainbow | — |

## Starfield

Flying through a 3D starfield at warp speed

Effect ID: `starfield`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Speed · `speed` | 3 | 0.5 to 10 | 0.5 |
| Star Density · `density` | 80 | 10 to 200 | 10 |
| Star Size · `star_size` | 1.5 | 0.5 to 5 | 0.1 |
| Trail Length · `trail_length` | 0.5 | 0 to 1 | 0.05 |
| Colorful · `colorful` | 0.3 | 0 to 1 | 0.05 |

## Metaballs

Organic blobs that merge and split like living organisms

Effect ID: `metaballs`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Speed · `speed` | 1 | 0.1 to 3 | 0.1 |
| Blob Count · `count` | 6 | 3 to 12 | 1 |
| Blob Size · `size` | 0.08 | 0.02 to 0.2 | 0.01 |
| Glow · `glow` | 0.8 | 0 to 2 | 0.1 |
| Color Mode · `color_mode` | Rainbow (0) | Rainbow; Neon; Monochrome; Acid | — |

## Rotozoom

Hypnotic rotating and zooming tiled pattern

Effect ID: `rotozoom`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Rotation Speed · `rot_speed` | 0.5 | 0.1 to 3 | 0.1 |
| Zoom Speed · `zoom_speed` | 0.7 | 0.1 to 3 | 0.1 |
| Pattern · `pattern` | Checkerboard (0) | Checkerboard; Circles; Diamonds; Waves; Noise | — |
| Scale · `scale` | 8 | 1 to 20 | 0.5 |
| Color Speed · `color_speed` | 0.5 | 0 to 2 | 0.05 |

## Moire Patterns

Shimmering interference patterns from overlapping ring structures

Effect ID: `moire`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Speed · `speed` | 0.8 | 0.1 to 3 | 0.1 |
| Ring Width · `ring_width` | 3 | 0.5 to 10 | 0.5 |
| Centers · `centers` | 3 | 2 to 6 | 1 |
| Color Speed · `color_speed` | 0.3 | 0 to 2 | 0.05 |
| Mode · `mode` | Rings (0) | Rings; Lines; Mixed | — |

## Water Ripple

Expanding water ripples with refraction and caustic effects

Effect ID: `water_ripple`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Speed · `speed` | 2 | 0.5 to 5 | 0.1 |
| Drop Rate · `drop_rate` | 1.5 | 0.5 to 5 | 0.1 |
| Damping · `damping` | 2 | 0.5 to 5 | 0.1 |
| Refraction · `refraction` | 0.05 | 0 to 0.2 | 0.01 |
| Color · `color_mode` | Water (0) | Water; Mercury; Rainbow; Dark Pool | — |
