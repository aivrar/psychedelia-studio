# Retro: Effect Reference

[All effects](Effect-Catalog.md) · [Using controls](Interface-Guide.md) · [Palettes](Palette-Reference.md)

Generated from the running app by `node tools/build-wiki-reference.mjs`. Values are base defaults, before presets or audio modulation. Select values are zero-based indices in saved data; the UI shows labels. Ranges use the app’s stored units; controls marked as percentages may display a scaled value.

- [Synthwave Grid](#synthwave-grid)

## Synthwave Grid

Outrun horizon with a striped sun, mountains, stars and an endless neon grid

Effect ID: `synthwave`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Speed · `speed` | 1 | 0 to 4 | 0.05 |
| Grid Density · `grid_density` | 14 | 4 to 40 | 1 |
| Horizon · `horizon` | 0.48 | 0.3 to 0.7 | 0.01 |
| Sun Size · `sun_size` | 0.26 | 0.08 to 0.5 | 0.01 |
| Mountains · `mountains` | 0.8 | 0 to 1 | 0.05 |
| Glow · `glow` | 1 | 0 to 2 | 0.05 |
| Road Curve · `curve` | 0.2 | -1 to 1 | 0.02 |
| Color Scheme · `scheme` | Outrun (0) | Outrun; Miami Vice; Toxic Night; Blood Moon; Ice Laser | — |
