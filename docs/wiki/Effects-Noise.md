# Noise: Effect Reference

[All effects](Effect-Catalog.md) · [Using controls](Interface-Guide.md) · [Palettes](Palette-Reference.md)

Generated from the running app by `node tools/build-wiki-reference.mjs`. Values are base defaults, before presets or audio modulation. Select values are zero-based indices in saved data; the UI shows labels. Ranges use the app’s stored units; controls marked as percentages may display a scaled value.

- [Flow Field](#flow-field)
- [Perlin Noise](#perlin-noise)
- [Domain Warp](#domain-warp)
- [Fractal Brownian Motion](#fractal-brownian-motion)

## Flow Field

Noise-driven currents: turbulent colour, curl streamlines, marbled paper, topographic contours, aurora curtains and silk threads

Effect ID: `flowfield`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Style · `style` | Turbulent Color (0) | Turbulent Color; Curl Streamlines; Marbled Paper; Topographic Contours; Aurora Currents; Silk Threads | — |
| Speed · `speed` | 0.6 | 0.1 to 3 | 0.1 |
| Scale · `scale` | 3 | 0.5 to 8 | 0.5 |
| Turbulence · `turbulence` | 1.5 | 0.1 to 3 | 0.1 |
| Color Spread · `color_spread` | 1 | 0.1 to 3 | 0.1 |
| Brightness · `brightness` | 1 | 0.3 to 2 | 0.1 |
| Palette · `palette` | Rainbow (0) | Rainbow; Neon; + [71 shared palettes](Palette-Reference.md) | — |

## Perlin Noise

Smooth organic evolving cloud and smoke patterns

Effect ID: `perlin`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Speed · `speed` | 0.5 | 0.1 to 3 | 0.1 |
| Scale · `scale` | 3 | 0.5 to 10 | 0.5 |
| Octaves · `octaves` | 5 | 1 to 8 | 1 |
| Contrast · `contrast` | 1.5 | 0.5 to 3 | 0.1 |
| Color Mode · `color_mode` | Rainbow (0) | Rainbow; Smoke; Lava; Ocean; Aurora | — |

## Domain Warp

Nested noise creates alien landscapes and marbled paint effects

Effect ID: `domainwarp`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Speed · `speed` | 0.2 | 0.05 to 1 | 0.05 |
| Scale · `scale` | 2 | 0.5 to 5 | 0.5 |
| Warp Strength · `warp_strength` | 2 | 0.5 to 5 | 0.1 |
| Warp Depth · `iterations` | 2 | 1 to 4 | 1 |
| Color · `color_mode` | Psychedelic (1) | Marble; Psychedelic; Earth; Alien; Neon | — |

## Fractal Brownian Motion

Multi-octave noise creating organic cloud and terrain textures

Effect ID: `fbm`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Speed · `speed` | 0.3 | 0.05 to 1 | 0.05 |
| Scale · `scale` | 2 | 0.5 to 6 | 0.5 |
| Octaves · `octaves` | 6 | 1 to 8 | 1 |
| Lacunarity · `lacunarity` | 2 | 1.5 to 3 | 0.1 |
| Gain · `gain` | 0.5 | 0.3 to 0.7 | 0.05 |
| Ridged · `ridged` | 0 | 0 to 1 | — |
| Color · `color_mode` | Psychedelic (0) | Psychedelic; Terrain; Clouds; Magma; Abstract | — |
