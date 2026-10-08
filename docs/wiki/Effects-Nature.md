# Nature: Effect Reference

[All effects](Effect-Catalog.md) · [Using controls](Interface-Guide.md) · [Palettes](Palette-Reference.md)

Generated from the running app by `node tools/build-wiki-reference.mjs`. Values are base defaults, before presets or audio modulation. Select values are zero-based indices in saved data; the UI shows labels. Ranges use the app’s stored units; controls marked as percentages may display a scaled value.

- [Rainy Window](#rainy-window)
- [Aurora](#aurora)
- [Seascape](#seascape)
- [Underwater](#underwater)
- [Endless Terrain](#endless-terrain)

## Rainy Window

Rain running down a window over blurred city lights; every drop refracts a sharp view

Effect ID: `rainy_window`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Rain Amount · `rain` | 0.65 | 0 to 1 | 0.01 |
| Drop Size · `drop_size` | 1 | 0.4 to 2.5 | 0.01 |
| Run Speed · `speed` | 1 | 0 to 3 | 0.01 |
| Background Blur · `blur` | 0.75 | 0 to 1 | 0.01 |
| Refraction · `refraction` | 1 | 0 to 2 | 0.01 |
| Condensation · `fog` | 0.35 | 0 to 1 | 0.01 |
| City Lights · `lights` | 0.55 | 0.1 to 1 | 0.01 |
| Traffic · `light_motion` | 0.4 | 0 to 2 | 0.01 |
| Lightning · `lightning` | 0.2 | 0 to 1 | 0.01 |
| City Mood · `scheme` | City Night (0) | City Night; Neon Tokyo; Warm Street; Blue Hour | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |

## Aurora

Northern lights over a mirror lake with mountains, stars and reflections

Effect ID: `aurora`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Intensity · `intensity` | 1.2 | 0.1 to 3 | 0.01 |
| Drift Speed · `speed` | 1 | 0 to 3 | 0.01 |
| Curtain Scale · `scale` | 1 | 0.3 to 3 | 0.01 |
| Curtain Height · `height` | 1 | 0.3 to 2 | 0.01 |
| Ray Streaks · `rays` | 0.7 | 0 to 1 | 0.01 |
| Colours · `scheme` | Classic Green (0) | Classic Green; Magenta Storm; Polar Blue; Rainbow Veil | — |
| Stars · `stars` | 1 | 0 to 2 | 0.01 |
| Lake Reflection · `reflection` | 0.75 | 0 to 1 | 0.01 |
| Mountains · `mountains` | 0.8 | 0 to 1 | 0.01 |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |

## Seascape

Rolling ocean at sunset with reflections, sun glitter and foam

Effect ID: `seascape`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Wave Height · `wave_height` | 0.9 | 0.1 to 2.5 | 0.01 |
| Choppiness · `choppy` | 1.8 | 0.5 to 4 | 0.01 |
| Wind Speed · `wind` | 1 | 0 to 3 | 0.01 |
| Sun Height · `sun_height` | 0.1 | -0.1 to 0.8 | 0.01 |
| Camera Height · `cam_height` | 2.2 | 0.6 to 6 | 0.01 |
| Foam · `foam` | 0.4 | 0 to 1 | 0.01 |
| Wave Detail · `detail` | 6 | 3 to 7 | 1 |
| Sky · `scheme` | Golden Sunset (0) | Golden Sunset; Pink Dusk; Moonlit Night; Stormy Grey; Tropical Noon | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |

## Underwater

Sun shafts, dancing caustics on the sand and drifting plankton under the sea

Effect ID: `underwater`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Look Up / Down · `look` | 0.05 | -0.5 to 0.6 | 0.01 |
| Caustics · `caustics` | 1 | 0 to 2 | 0.01 |
| Caustic Size · `caustic_scale` | 1 | 0.3 to 3 | 0.01 |
| Light Shafts · `rays` | 1 | 0 to 2 | 0.01 |
| Plankton · `plankton` | 1 | 0 to 2 | 0.01 |
| Current · `current` | 0.6 | 0 to 3 | 0.01 |
| Murkiness · `depth` | 0.45 | 0 to 1 | 0.01 |
| Water · `scheme` | Tropical (0) | Tropical; Deep Blue; Kelp Green; Night Dive | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |

## Endless Terrain

Fly over endless eroded mountains, lakes and clouds with sun and aerial fog

Effect ID: `endless_terrain`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `speed` | 1 | 0 to 3 | 0.01 |
| Altitude · `altitude` | 1 | 0.2 to 3 | 0.01 |
| Mountain Height · `mountains` | 1 | 0.3 to 2.5 | 0.01 |
| Roughness · `roughness` | 0.5 | 0.3 to 0.65 | 0.005 |
| Snow Line · `snow` | 0.55 | 0 to 1 | 0.01 |
| Water Level · `water` | 0.18 | 0 to 0.6 | 0.01 |
| Clouds · `clouds` | 0.5 | 0 to 1 | 0.01 |
| Haze · `fog` | 1 | 0 to 2 | 0.01 |
| Detail (steps) · `detail` | 120 | 60 to 200 | 1 |
| Light · `scheme` | Golden Hour (1) | Midday; Golden Hour; Dusk; Alien World | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |
