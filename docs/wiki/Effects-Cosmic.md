# Cosmic: Effect Reference

[All effects](Effect-Catalog.md) · [Using controls](Interface-Guide.md) · [Palettes](Palette-Reference.md)

Generated from the running app by `node tools/build-wiki-reference.mjs`. Values are base defaults, before presets or audio modulation. Select values are zero-based indices in saved data; the UI shows labels. Ranges use the app’s stored units; controls marked as percentages may display a scaled value.

- [Black Hole](#black-hole)
- [Nebula Flythrough](#nebula-flythrough)
- [Living Sun](#living-sun)
- [Spiral Galaxy](#spiral-galaxy)

## Black Hole

Gravitationally lensed accretion disk, photon ring and bent starlight around a black hole

Effect ID: `black_hole`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Camera Distance · `distance` | 15 | 6 to 30 | 0.1 |
| Camera Height · `inclination` | 0.1 | -0.9 to 0.9 | 0.01 |
| Orbit Speed · `orbit_speed` | 0.3 | -2 to 2 | 0.01 |
| Disk Spin · `disk_speed` | 1 | 0 to 4 | 0.01 |
| Disk Brightness · `disk_brightness` | 1.2 | 0.1 to 3 | 0.01 |
| Disk Size · `disk_size` | 11 | 5 to 20 | 0.1 |
| Doppler Beaming · `doppler` | 0.8 | 0 to 1.5 | 0.01 |
| Lensing · `lensing` | 1 | 0 to 1.5 | 0.01 |
| Stars · `stars` | 1 | 0 to 2 | 0.01 |
| Disk Colour · `scheme` | Interstellar Gold (0) | Interstellar Gold; Blue Giant; Neon Violet; Ember | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |

## Nebula Flythrough

Fly through glowing volumetric gas clouds and dark dust lanes of a star nursery

Effect ID: `nebula`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `speed` | 0.6 | 0 to 3 | 0.01 |
| Gas Density · `density` | 1 | 0.2 to 3 | 0.01 |
| Emission · `glow` | 1 | 0.2 to 3 | 0.01 |
| Turbulence · `turbulence` | 0.8 | 0 to 2 | 0.01 |
| Dark Dust · `dust` | 0.5 | 0 to 1 | 0.01 |
| Stars · `stars` | 1 | 0 to 2 | 0.01 |
| Camera Sway · `sway` | 0.5 | 0 to 1 | 0.01 |
| Detail (steps) · `detail` | 48 | 24 to 80 | 1 |
| Nebula · `scheme` | Orion (0) | Orion; Carina; Eagle Pillars; Neon Dream | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |

## Living Sun

A boiling star with granulation, sunspots, a streaky corona and looping prominences

Effect ID: `living_sun`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Star Size · `size` | 0.42 | 0.2 to 1.2 | 0.01 |
| Rotation · `rotation` | 0.15 | -1 to 1 | 0.01 |
| Boiling · `boil` | 1 | 0 to 3 | 0.01 |
| Granule Scale · `granules` | 9 | 2 to 24 | 0.1 |
| Sunspots · `sunspots` | 0.45 | 0 to 1 | 0.01 |
| Corona · `corona` | 1 | 0 to 2 | 0.01 |
| Corona Streaks · `rays` | 0.6 | 0 to 1 | 0.01 |
| Prominences · `prominences` | 0.6 | 0 to 1 | 0.01 |
| Star Type · `scheme` | Yellow Star (0) | Yellow Star; Red Dwarf; Blue Giant; Ultraviolet | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |

## Spiral Galaxy

A slowly turning spiral galaxy with dust lanes, star clusters and a glowing core

Effect ID: `spiral_galaxy`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Arms · `arms` | 2 | 2 to 6 | 1 |
| Arm Winding · `twist` | 1.3 | 0.4 to 3 | 0.01 |
| Rotation Speed · `speed` | 0.12 | -1 to 1 | 0.01 |
| Viewing Tilt · `tilt` | 0.85 | 0 to 1.35 | 0.01 |
| Size · `size` | 1 | 0.3 to 2 | 0.01 |
| Dust Lanes · `dust` | 0.6 | 0 to 1 | 0.01 |
| Star Clusters · `clusters` | 1 | 0 to 2 | 0.01 |
| Core Glow · `core` | 1 | 0 to 2 | 0.01 |
| Background Stars · `stars` | 1 | 0 to 2 | 0.01 |
| Colours · `scheme` | Milky Way (0) | Milky Way; Andromeda; Neon; Ember; + [71 shared palettes](Palette-Reference.md) | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |
