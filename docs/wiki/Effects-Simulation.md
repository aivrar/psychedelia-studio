# Simulation: Effect Reference

[All effects](Effect-Catalog.md) · [Using controls](Interface-Guide.md) · [Palettes](Palette-Reference.md)

Generated from the running app by `node tools/build-wiki-reference.mjs`. Values are base defaults, before presets or audio modulation. Select values are zero-based indices in saved data; the UI shows labels. Ranges use the app’s stored units; controls marked as percentages may display a scaled value.

- [Reaction-Diffusion](#reaction-diffusion)
- [Game of Life](#game-of-life)
- [Physarum](#physarum)
- [Fluid Ink](#fluid-ink)
- [Lenia](#lenia)
- [Curl-Noise Silk](#curl-noise-silk)

## Reaction-Diffusion

True Gray-Scott reaction-diffusion with stateful ping-pong chemical buffers

Effect ID: `reaction_diffusion`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Feed Rate · `feed` | 0.055 | 0.01 to 0.1 | 0.001 |
| Kill Rate · `kill` | 0.062 | 0.03 to 0.08 | 0.001 |
| Speed · `speed` | 1 | 0.5 to 5 | 0.5 |
| Color · `color_mode` | Chemical (0) | Chemical; Rainbow; Heat; Neon | — |

## Game of Life

True stateful Conway cellular automata with ping-pong buffer history

Effect ID: `game_of_life`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Speed · `speed` | 0.8 | 0.1 to 3 | 0.1 |
| Scale · `scale` | 40 | 10 to 100 | 5 |
| Rule Variation · `rule_variation` | 0.3 | 0 to 1 | 0.05 |
| Color · `color_mode` | Rainbow Trail (0) | Rainbow Trail; Green Matrix; Neon; Classic | — |

## Physarum

Slime-mould simulation: hundreds of thousands of agents weave a living network of glowing veins

Effect ID: `physarum`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Agents · `agents` | 262K (1) | 65K; 262K; 1M | — |
| Start Shape · `start` | Scattered (0) | Scattered; Circle Inward; Ring; Centre Burst | — |
| Sensor Angle · `sensor_angle` | 0.78 | 0.1 to 1.5 | 0.01 |
| Sensor Reach · `sensor_dist` | 20 | 2 to 40 | 0.5 |
| Turn Speed · `turn_speed` | 0.3 | 0.05 to 1 | 0.01 |
| Move Speed · `move_speed` | 1.5 | 0.2 to 4 | 0.05 |
| Wander · `wander` | 0.05 | 0 to 0.5 | 0.01 |
| Deposit · `deposit` | 1 | 0.1 to 5 | 0.05 |
| Trail Decay · `decay` | 0.93 | 0.8 to 0.995 | 0.005 |
| Diffusion · `diffuse` | 0.4 | 0 to 1 | 0.01 |
| Sim Steps / Frame · `steps` | 1 | 1 to 4 | 1 |
| Trail Resolution · `resolution` | Half (0) | Half; Three Quarters; Full | — |
| Brightness · `brightness` | 1 | 0.2 to 4 | 0.01 |
| Contrast · `contrast` | 1 | 0.4 to 2.5 | 0.01 |
| Palette · `palette` | Slime Gold (0) | Slime Gold; Bioluminescent; + [71 shared palettes](Palette-Reference.md) | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |

## Fluid Ink

A real fluid simulation: swirling coloured ink poured and pushed around in water. Stir it with the mouse.

Effect ID: `fluid_ink`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Ink Sources · `emitters` | 3 | 1 to 6 | 1 |
| Push Force · `force` | 1 | 0 to 3 | 0.01 |
| Stream Size · `splat_size` | 1 | 0.2 to 3 | 0.01 |
| Source Motion · `motion` | 1 | 0 to 3 | 0.01 |
| Swirl (Vorticity) · `swirl` | 1 | 0 to 2 | 0.01 |
| Flow Persistence · `persistence` | 0.99 | 0.9 to 1 | 0.001 |
| Ink Persistence · `ink_fade` | 0.985 | 0.9 to 1 | 0.001 |
| Gloss · `shading` | 0.6 | 0 to 1 | 0.01 |
| Brightness · `brightness` | 1 | 0.3 to 2.5 | 0.01 |
| Simulation Detail · `resolution` | Medium (1) | Low; Medium; High | — |
| Ink Colours · `palette` | Rainbow Cycle (0) | Rainbow Cycle; Ink & Gold; Neon; Pastel; + [71 shared palettes](Palette-Reference.md) | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |

## Lenia

Continuous cellular automata: smooth, organic creatures that glide, pulse and divide

Effect ID: `lenia`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Rule · `rule` | SmoothLife (gliders) (0) | SmoothLife (gliders); Lenia (smooth ring) | — |
| Creature Size · `radius` | 15 | 6 to 24 | 1 |
| Steps / Second · `speed` | 24 | 4 to 60 | 1 |
| Lenia Sweet Spot · `mu` | 0.15 | 0.05 to 0.4 | 0.001 |
| Lenia Growth Width · `sigma` | 0.017 | 0.005 to 0.08 | 0.0005 |
| Lenia Time Step · `time_step` | 0.1 | 0.02 to 0.3 | 0.005 |
| Seed Rain · `seed_rain` | 1 | 0 to 3 | 0.05 |
| World Size · `resolution` | Medium (1) | Small; Medium; Large | — |
| Brightness · `brightness` | 1.2 | 0.5 to 3 | 0.01 |
| Glow · `glow` | 1 | 0 to 2 | 0.01 |
| Palette · `palette` | Bioluminescent (0) | Bioluminescent; Ember; Ink on Paper; + [71 shared palettes](Palette-Reference.md) | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |

## Curl-Noise Silk

Hundreds of thousands of particles flowing through swirling curl noise, leaving silky long-exposure trails

Effect ID: `curl_silk`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Particles · `particles` | 262K (1) | 65K; 262K; 1M | — |
| Particles Start From · `spawn` | A Circle (1) | Everywhere; A Circle; A Line; The Sides | — |
| Swirl Size · `flow_scale` | 2 | 0.5 to 8 | 0.05 |
| Flow Speed · `speed` | 1 | 0 to 3 | 0.01 |
| Turbulence · `turbulence` | 0.5 | 0 to 1.5 | 0.01 |
| Field Change · `evolve` | 0.3 | 0 to 2 | 0.01 |
| Exposure Length · `trail` | 0.985 | 0.8 to 0.998 | 0.001 |
| Particle Life (sec) · `life` | 6 | 1 to 20 | 0.5 |
| Brightness · `brightness` | 1 | 0.2 to 4 | 0.01 |
| Colour By · `color_by` | Direction (0) | Direction; Particle; Position | — |
| Palette · `palette` | Silk (0) | Silk; Neon; Fire; Ice; + [71 shared palettes](Palette-Reference.md) | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |
