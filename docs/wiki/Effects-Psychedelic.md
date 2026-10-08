# Psychedelic: Effect Reference

[All effects](Effect-Catalog.md) · [Using controls](Interface-Guide.md) · [Palettes](Palette-Reference.md)

Generated from the running app by `node tools/build-wiki-reference.mjs`. Values are base defaults, before presets or audio modulation. Select values are zero-based indices in saved data; the UI shows labels. Ranges use the app’s stored units; controls marked as percentages may display a scaled value.

- [Liquid Light Show](#liquid-light-show)
- [Glow Lab](#glow-lab)
- [Soap Bubbles](#soap-bubbles)

## Liquid Light Show

Overhead-projector oil and water light show: merging dye blobs, thin-film rainbow rims and projector bloom

Effect ID: `liquid_light`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Style · `style` | Oil & Water (0) | Oil & Water; Dye Bloom; Bubble Lens; Tie-Dye Swirl | — |
| Flow Speed · `speed` | 0.5 | 0 to 3 | 0.05 |
| Blob Scale · `scale` | 1.6 | 0.5 to 4 | 0.05 |
| Swirl · `swirl` | 1.2 | 0 to 3 | 0.05 |
| Film Rainbow · `film` | 1 | 0 to 2 | 0.05 |
| Saturation · `saturation` | 1.15 | 0.3 to 1.6 | 0.05 |
| Color Speed · `color_speed` | 0.25 | 0 to 3 | 0.05 |
| Palette · `palette` | Sixties Dye (0) | Sixties Dye; Neon; + [71 shared palettes](Palette-Reference.md) | — |

## Glow Lab

Neon light accumulated through tiny raymarch loops: vortex, cosmic surf, wormhole, lattice, plasma orb and accretion ring

Effect ID: `glow_lab`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Mode · `mode` | Vortex (0) | Vortex; Cosmic Surf; Wormhole; Neon Lattice; Plasma Orb; Accretion Ring | — |
| Speed · `speed` | 1 | 0 to 3 | 0.01 |
| Field of View · `zoom` | 1 | 0.4 to 2.5 | 0.01 |
| Twist · `twist` | 1 | 0 to 3 | 0.01 |
| Turbulence · `turbulence` | 0.4 | 0 to 1.5 | 0.01 |
| Glow · `glow` | 1 | 0.2 to 4 | 0.01 |
| Hue Shift · `hue` | 0 | 0 to 1 | 0.01 |
| Colour Spread · `spread` | 1 | 0 to 3 | 0.01 |
| Detail (steps) · `detail` | 64 | 30 to 90 | 1 |
| Palette · `palette` | Spectrum (0) | Spectrum; + [71 shared palettes](Palette-Reference.md) | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |

## Soap Bubbles

Iridescent soap bubbles with swirling thin-film colours and glassy reflections

Effect ID: `soap_bubbles`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Bubbles · `count` | 8 | 1 to 16 | 1 |
| Size · `size` | 1 | 0.3 to 2 | 0.01 |
| Size Variety · `variety` | 0.6 | 0 to 1 | 0.01 |
| Float Speed · `speed` | 0.5 | 0 to 2 | 0.01 |
| Film Thickness · `film` | 1.2 | 0.3 to 3 | 0.01 |
| Film Swirl · `swirl` | 0.8 | 0 to 2 | 0.01 |
| Background · `background` | Night City Bokeh (1) | Dark Room; Night City Bokeh; Pastel Sky; Deep Purple | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |
