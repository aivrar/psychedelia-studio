# Color: Effect Reference

[All effects](Effect-Catalog.md) · [Using controls](Interface-Guide.md) · [Palettes](Palette-Reference.md)

Generated from the running app by `node tools/build-wiki-reference.mjs`. Values are base defaults, before presets or audio modulation. Select values are zero-based indices in saved data; the UI shows labels. Ranges use the app’s stored units; controls marked as percentages may display a scaled value.

- [Color Cycling](#color-cycling)

## Color Cycling

Classic color palette rotation - static patterns appear to flow and shimmer

Effect ID: `color_cycle`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Cycle Speed · `speed` | 1 | 0.1 to 5 | 0.1 |
| Pattern · `pattern` | Mandala (0) | Mandala; Landscape; Geometric; Organic; Fractal | — |
| Palette · `palette` | Rainbow (0) | Rainbow; Sunset; Ocean; Neon; Pastel | — |
| Color Bands · `bands` | 12 | 4 to 32 | 1 |
