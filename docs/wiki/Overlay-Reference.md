# Overlay Reference

[How to use FX and overlays](FX-and-Overlays.md) · [Smart Shuffle](Smart-Shuffle.md)

Generated from the running app by `node tools/build-wiki-reference.mjs`. Values are base defaults, before presets or audio modulation. Select values are zero-based indices in saved data; the UI shows labels. Ranges use the app’s stored units; controls marked as percentages may display a scaled value.

- [Strobe](#strobe) — Light Show
- [Lasers](#lasers) — Light Show
- [Stage Lights](#stage-lights) — Light Show
- [Lightning](#lightning) — Light Show
- [Fireworks](#fireworks) — Light Show
- [3D Laser Room](#3d-laser-room) — Light Show
- [Figures](#figures) — Shapes
- [Pulse Rings](#pulse-rings) — Shapes
- [Plexus](#plexus) — Shapes
- [Tron Hex Grid](#tron-hex-grid) — Shapes
- [Sacred Geometry](#sacred-geometry) — Shapes
- [Neon Frame](#neon-frame) — Shapes
- [Particles](#particles) — Atmosphere
- [Bokeh Lights](#bokeh-lights) — Atmosphere
- [Matrix Rain](#matrix-rain) — Atmosphere
- [Vignette](#vignette) — Atmosphere
- [Scanlines](#scanlines) — Atmosphere
- [Cinematic](#cinematic) — Atmosphere
- [Spectrum Visualizer](#spectrum-visualizer) — Audio & Text
- [Text / Title](#text--title) — Audio & Text
- [Lyrics / Text Sequence](#lyrics--text-sequence) — Audio & Text
- [Image / Logo](#image--logo) — Audio & Text

## Strobe

Sync it to kicks or beats below; without audio it uses the period.

Category: **Light Show**. ID: `strobe`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Period (sec) · `strobe_period` | 0.25 | 0.03 to 4 | 0.01 |
| Duration (sec) · `strobe_duration` | 0.08 | 0.005 to 2 | 0.005 |
| Intensity · `strobe_intensity` | 0.8 | 0.05 to 1 | 0.05 |
| Blend Original · `strobe_blend_original` | 0 | 0 to 1 | 0.05 |
| Color Source · `strobe_mode` | White Flash (0) | White Flash; Solid Color; Color Cycle; Invert | 1 |
| Strobe Color · `strobe_color` | #ffffff | color | — |
| Operator · `strobe_operator` | Copy (0) | Copy; Screen/Add; Multiply; Overlay; Hard Light; Difference | 1 |
| Waveform · `strobe_waveform` | Square Gate (0) | Square Gate; Sine Fade; Ramp Up; Ramp Down; Double Flash | 1 |
| Random Probability · `strobe_random_probability` | 1 | 0 to 1 | 0.05 |
| Random Seed · `strobe_random_seed` | 13 | 0 to 999 | 1 |
| Edge Softness · `strobe_softness` | 0.04 | 0 to 0.45 | 0.01 |
| Phase · `strobe_phase` | 0 | 0 to 1 | 0.01 |
| Fire On · `strobe_sync` | Free Run (0) | Free Run; Kick; Snare; Hi-hat; Beat; Bar; Drops | 1 |
| Every Nth Hit · `strobe_every` | 1 | 1 to 8 | 1 |

## Lasers



Category: **Light Show**. ID: `lasers`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Count · `laser_count` | 4 | 1 to 24 | 1 |
| Speed · `laser_speed` | 1 | 0 to 5 | 0.05 |
| Thickness · `laser_thickness` | 3 | 0.5 to 10 | 0.5 |
| Glow · `laser_glow` | 15 | 0 to 40 | 1 |
| Mode · `laser_mode` | From Center (0) | From Center; Rain; Scan; Random Bounce; Stage Fan; Crossfire; Spiral Spokes | 1 |
| Colour · `laser_color_mode` | Rainbow Cycle (0) | Rainbow Cycle; Solid Colour; Two-Tone | 1 |
| Colour 1 · `laser_color` | #00ff80 | color | — |
| Colour 2 · `laser_color2` | #ff00ff | color | — |
| Opacity · `laser_opacity` | 0.9 | 0.05 to 1 | 0.01 |
| Beam Length · `laser_length` | 1 | 0.1 to 1.5 | 0.01 |
| Fan Spread · `laser_spread` | 1 | 0.05 to 1 | 0.01 |
| Flicker · `laser_flicker` | 0 | 0 to 1 | 0.01 |
| Flash On · `laser_sync` | Free Run (0) | Free Run; Kick; Snare; Hi-hat; Beat; Bar; Drops | 1 |
| Blend · `laser_blend` | Additive Glow (0) | Additive Glow; Normal | 1 |

## Stage Lights

Sweeping concert spotlight cones.

Category: **Light Show**. ID: `spotlights`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Count · `spot_count` | 4 | 1 to 12 | 1 |
| Mounted · `spot_origin` | Top (0) | Top; Bottom; Sides; Top & Bottom | 1 |
| Beam Width · `spot_width` | 0.12 | 0.02 to 0.5 | 0.005 |
| Beam Length · `spot_length` | 1.15 | 0.3 to 1.8 | 0.01 |
| Sweep Speed · `spot_speed` | 0.6 | 0 to 3 | 0.01 |
| Sweep Range · `spot_sweep` | 0.6 | 0 to 1.4 | 0.01 |
| Intensity · `spot_intensity` | 0.45 | 0.05 to 1 | 0.01 |
| Colour · `spot_color_mode` | Rainbow Cycle (0) | Rainbow Cycle; Solid Colour; Two-Tone | 1 |
| Colour 1 · `spot_color` | #ffffff | color | — |
| Colour 2 · `spot_color2` | #ff4fb0 | color | — |
| Haze · `spot_haze` | 0.6 | 0 to 1 | 0.01 |
| Flash On · `spot_sync` | Free Run (0) | Free Run; Kick; Snare; Hi-hat; Beat; Bar; Drops | 1 |

## Lightning

Bolts fire on the chosen hit; Free Run strikes at random.

Category: **Light Show**. ID: `lightning`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Fire On · `bolt_sync` | Free Run (0) | Free Run; Kick; Snare; Hi-hat; Beat; Bar; Drops | 1 |
| Strikes / sec (free) · `bolt_rate` | 1.5 | 0.2 to 8 | 0.1 |
| Bolts per Strike · `bolt_count` | 2 | 1 to 6 | 1 |
| Branches · `bolt_branches` | 0.4 | 0 to 1 | 0.01 |
| Jaggedness · `bolt_jagged` | 0.5 | 0 to 1 | 0.01 |
| Life (sec) · `bolt_life` | 0.25 | 0.05 to 1 | 0.01 |
| Thickness · `bolt_thickness` | 2 | 0.5 to 6 | 0.5 |
| Glow · `bolt_glow` | 18 | 0 to 40 | 1 |
| Colour · `bolt_color` | #aee8ff | color | — |
| Strikes From · `bolt_origin` | Top (0) | Top; Centre; Edges; Anywhere | 1 |
| Sky Flash · `bolt_flash` | 0.25 | 0 to 1 | 0.01 |

## Fireworks

Rockets and bursts fired on the chosen hit; Free Run launches at random.

Category: **Light Show**. ID: `fireworks`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Fire On · `fw_sync` | Free Run (0) | Free Run; Kick; Snare; Hi-hat; Beat; Bar; Drops | 1 |
| Bursts / sec (free) · `fw_rate` | 0.8 | 0.1 to 4 | 0.05 |
| Burst Style · `fw_style` | Mixed (5) | Peony; Ring; Willow; Palm; Heart; Mixed | 1 |
| Sparks per Burst · `fw_count` | 120 | 20 to 300 | 5 |
| Burst Size · `fw_size` | 0.22 | 0.05 to 0.6 | 0.01 |
| Gravity · `fw_gravity` | 0.6 | 0 to 2 | 0.01 |
| Spark Life (sec) · `fw_life` | 1.8 | 0.4 to 4 | 0.05 |
| Trail Length · `fw_trail` | 0.55 | 0 to 1 | 0.01 |
| Glitter · `fw_glitter` | 0.4 | 0 to 1 | 0.01 |
| Launch · `fw_launch` | Rockets from Below (0) | Rockets from Below; Burst in Place | 1 |
| Burst Height · `fw_height` | 0.35 | 0.1 to 0.9 | 0.01 |
| Colour · `fw_color_mode` | Random per Burst (0) | Random per Burst; Rainbow Cycle; Solid Colour; Two-Tone | 1 |
| Colour 1 · `fw_color` | #ffd27a | color | — |
| Colour 2 · `fw_color2` | #ff4fb0 | color | — |
| Opacity · `fw_opacity` | 1 | 0.1 to 1 | 0.01 |

## 3D Laser Room

Laser beams in 3D perspective: tunnels of rings, fanned sheets, criss-crossing beams or a laser grid, in hazy air.

Category: **Light Show**. ID: `laser_room`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Style · `lr_style` | Tunnel Rings (0) | Tunnel Rings; Fan Sheets; Crossing Beams; Laser Grid | 1 |
| Flash On · `lr_sync` | Free Run (0) | Free Run; Kick; Snare; Hi-hat; Beat; Bar; Drops | 1 |
| Speed · `lr_speed` | 1 | 0 to 3 | 0.01 |
| Beams / Rings · `lr_count` | 10 | 2 to 24 | 1 |
| Spread · `lr_spread` | 0.6 | 0 to 1 | 0.01 |
| Ring Shape · `lr_ring_shape` | Rectangle (0) | Rectangle; Circle; Hexagon; Triangle | 1 |
| Twist · `lr_twist` | 0.4 | -2 to 2 | 0.01 |
| Beam Width · `lr_width` | 1.6 | 0.5 to 8 | 0.1 |
| Glow · `lr_glow` | 14 | 0 to 40 | 1 |
| Haze · `lr_haze` | 0.4 | 0 to 1 | 0.01 |
| Camera Sway · `lr_sway` | 0.3 | 0 to 1 | 0.01 |
| Colour · `lr_color_mode` | Two-Tone (2) | Rainbow Cycle; Solid Colour; Two-Tone | 1 |
| Colour 1 · `lr_color` | #ff2a6d | color | — |
| Colour 2 · `lr_color2` | #05d9e8 | color | — |
| Opacity · `lr_opacity` | 0.9 | 0.1 to 1 | 0.01 |

## Figures



Category: **Shapes**. ID: `figures`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Shape · `figure_type` | Circle (0) | Circle; Triangle; Star; Hexagon; Cross; Infinity; Spiral; Flower of Life; Square; Octagon; Heart; Diamond | 1 |
| Count · `figure_count` | 1 | 1 to 12 | 1 |
| Size · `figure_size` | 0.3 | 0.05 to 0.8 | 0.01 |
| Rotation Speed · `figure_rotation` | 1 | -5 to 5 | 0.05 |
| Thickness · `figure_thickness` | 2 | 0.5 to 10 | 0.5 |
| Glow · `figure_glow` | 10 | 0 to 40 | 1 |
| Pulse · `figure_pulse` | 0.5 | 0 to 3 | 0.05 |
| Layout · `figure_layout` | Stacked Centre (0) | Stacked Centre; Orbit Ring; Grid; Tunnel | 1 |
| Spread · `figure_spread` | 0.25 | 0 to 0.5 | 0.01 |
| Colour · `figure_color_mode` | Rainbow Cycle (0) | Rainbow Cycle; Solid Colour; Two-Tone | 1 |
| Colour 1 · `figure_color` | #ff00ff | color | — |
| Colour 2 · `figure_color2` | #33e0ff | color | — |
| Hue Speed · `figure_hue_speed` | 1 | 0 to 3 | 0.05 |
| Fill · `figure_fill` | 0 | 0 to 1 | 0.01 |
| Opacity · `figure_opacity` | 1 | 0.05 to 1 | 0.01 |

## Pulse Rings

Expanding rings, fired on the beat or on a timer.

Category: **Shapes**. ID: `rings`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Fire On · `ring_sync` | Free Run (0) | Free Run; Kick; Snare; Hi-hat; Beat; Bar; Drops | 1 |
| Interval (free) · `ring_interval` | 0.6 | 0.1 to 4 | 0.05 |
| Expand Speed · `ring_speed` | 0.5 | 0.05 to 2 | 0.01 |
| Life (sec) · `ring_life` | 1.6 | 0.2 to 4 | 0.05 |
| Thickness · `ring_thickness` | 4 | 0.5 to 30 | 0.5 |
| Glow · `ring_glow` | 14 | 0 to 40 | 1 |
| Shape · `ring_shape` | Circle (0) | Circle; Square; Hexagon; Triangle; Star | 1 |
| Spin · `ring_rotation` | 0.3 | -3 to 3 | 0.05 |
| Colour · `ring_color_mode` | Rainbow Cycle (0) | Rainbow Cycle; Solid Colour; Two-Tone | 1 |
| Colour 1 · `ring_color` | #33e0ff | color | — |
| Colour 2 · `ring_color2` | #ff4fb0 | color | — |
| Opacity · `ring_opacity` | 0.85 | 0.05 to 1 | 0.01 |
| Centre X · `ring_center_x` | 0.5 | 0 to 1 | 0.01 |
| Centre Y · `ring_center_y` | 0.5 | 0 to 1 | 0.01 |

## Plexus

Drifting points joined by lines whenever they come close.

Category: **Shapes**. ID: `plexus`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Points · `px_count` | 110 | 20 to 220 | 1 |
| Link Distance · `px_distance` | 0.18 | 0.03 to 0.4 | 0.01 |
| Drift Speed · `px_speed` | 0.5 | 0 to 3 | 0.01 |
| Point Size · `px_point_size` | 3 | 0.5 to 8 | 0.1 |
| Line Width · `px_line_width` | 1.6 | 0.2 to 4 | 0.1 |
| Glow · `px_glow` | 8 | 0 to 30 | 1 |
| Depth · `px_depth` | 0.6 | 0 to 1 | 0.01 |
| Colour · `px_color_mode` | Rainbow Cycle (0) | Rainbow Cycle; Solid Colour; Two-Tone | 1 |
| Colour 1 · `px_color` | #33e0ff | color | — |
| Colour 2 · `px_color2` | #b07cff | color | — |
| Opacity · `px_opacity` | 0.95 | 0.1 to 1 | 0.01 |

## Tron Hex Grid

A glowing hexagon grid, flat or as a floor; pulses ripple out from the centre on the chosen hit.

Category: **Shapes**. ID: `hexgrid`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| View · `hx_view` | Flat Screen (0) | Flat Screen; Floor in Perspective | 1 |
| Hex Size · `hx_size` | 0.06 | 0.02 to 0.2 | 0.005 |
| Line Width · `hx_line` | 1.4 | 0.5 to 6 | 0.1 |
| Glow · `hx_glow` | 12 | 0 to 40 | 1 |
| Grid Brightness · `hx_base` | 0.3 | 0 to 1 | 0.01 |
| Pulse On · `hx_sync` | Free Run (0) | Free Run; Kick; Snare; Hi-hat; Beat; Bar; Drops | 1 |
| Pulse Every (free, sec) · `hx_interval` | 1.2 | 0.2 to 4 | 0.05 |
| Pulse Speed · `hx_pulse_speed` | 1 | 0.2 to 3 | 0.05 |
| Random Cells · `hx_flicker` | 0.3 | 0 to 1 | 0.01 |
| Scroll Speed · `hx_scroll` | 0.25 | 0 to 2 | 0.01 |
| Colour · `hx_color_mode` | Two-Tone (2) | Rainbow Cycle; Solid Colour; Two-Tone | 1 |
| Colour 1 · `hx_color` | #20e8ff | color | — |
| Colour 2 · `hx_color2` | #ff3cac | color | — |
| Opacity · `hx_opacity` | 0.85 | 0.1 to 1 | 0.01 |

## Sacred Geometry

Sacred geometry that draws itself line by line in time with the music, holds, then fades and starts again.

Category: **Shapes**. ID: `sacred`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Figure · `sg_shape` | Cycle Through All (6) | Seed of Life; Flower of Life; Metatron's Cube; Sri Yantra; Golden Spiral; Merkaba; Cycle Through All | 1 |
| One Drawing Per · `sg_cycle` | 4 Bars (2) | 1 Bar; 2 Bars; 4 Bars; 8 Bars; 16 Bars; Timed (seconds) | 1 |
| Seconds per Drawing · `sg_seconds` | 8 | 2 to 60 | 0.5 |
| Hold Before Fading · `sg_hold` | 0.35 | 0 to 0.8 | 0.01 |
| Size · `sg_size` | 0.62 | 0.1 to 1 | 0.01 |
| Position X · `sg_x` | 0.5 | 0 to 1 | 0.01 |
| Position Y · `sg_y` | 0.5 | 0 to 1 | 0.01 |
| Rotation Speed · `sg_rotation` | 0.1 | -2 to 2 | 0.01 |
| Line Width · `sg_line` | 2.6 | 0.5 to 8 | 0.1 |
| Glow · `sg_glow` | 18 | 0 to 40 | 1 |
| Colour · `sg_color_mode` | Rainbow Cycle (0) | Rainbow Cycle; Solid Colour; Two-Tone | 1 |
| Colour 1 · `sg_color` | #ffd27a | color | — |
| Colour 2 · `sg_color2` | #7ad0ff | color | — |
| Opacity · `sg_opacity` | 0.9 | 0.05 to 1 | 0.01 |

## Neon Frame



Category: **Shapes**. ID: `frame`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Style · `frame_style` | Full Border (0) | Full Border; Corner Brackets; Rounded; Double Line | 1 |
| Thickness · `frame_thickness` | 4 | 1 to 20 | 0.5 |
| Inset · `frame_inset` | 0.03 | 0 to 0.2 | 0.005 |
| Corner Size · `frame_corner` | 0.12 | 0.02 to 0.45 | 0.01 |
| Glow · `frame_glow` | 16 | 0 to 40 | 1 |
| Colour · `frame_color_mode` | Solid Colour (0) | Solid Colour; Rainbow Chase; Two-Tone Pulse | 1 |
| Colour 1 · `frame_color` | #b07cff | color | — |
| Colour 2 · `frame_color2` | #33e0ff | color | — |
| Chase Speed · `frame_chase_speed` | 0.6 | 0 to 3 | 0.05 |
| Opacity · `frame_opacity` | 0.9 | 0.05 to 1 | 0.01 |

## Particles



Category: **Atmosphere**. ID: `particles`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Count · `particle_count` | 40 | 5 to 400 | 5 |
| Speed · `particle_speed` | 1 | 0 to 5 | 0.05 |
| Size · `particle_size` | 3 | 0.5 to 12 | 0.5 |
| Brightness · `particle_brightness` | 0.8 | 0.05 to 1 | 0.05 |
| Style · `particle_style` | Drift (0) | Drift; Rise; Orbit; Starfield Warp; Snow Fall; Fireflies; Bubbles | 1 |
| Shape · `particle_shape` | Glow Dot (0) | Glow Dot; Star Spark; Ring; Soft Square | 1 |
| Colour · `particle_color_mode` | Rainbow (0) | Rainbow; Solid Colour; White Sparkle | 1 |
| Colour · `particle_color` | #ffd27a | color | — |
| Size Variety · `particle_size_var` | 0.5 | 0 to 1 | 0.01 |
| Twinkle · `particle_twinkle` | 0.3 | 0 to 1 | 0.01 |
| Kick Burst · `particle_burst` | 0 | 0 to 1 | 0.01 |

## Bokeh Lights

Soft out-of-focus lights drifting in front of the scene; they flare on the chosen hit.

Category: **Atmosphere**. ID: `bokeh`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Lights · `bk_count` | 40 | 5 to 150 | 1 |
| Size · `bk_size` | 0.08 | 0.01 to 0.3 | 0.01 |
| Size Variety · `bk_size_var` | 0.7 | 0 to 1 | 0.01 |
| Softness · `bk_blur` | 0.5 | 0 to 1 | 0.01 |
| Aperture · `bk_shape` | Circle (0) | Circle; Hexagon; Heart; Star | 1 |
| Motion · `bk_motion` | Rise (0) | Rise; Drift; Fall; Swirl | 1 |
| Speed · `bk_speed` | 0.4 | 0 to 3 | 0.01 |
| Twinkle · `bk_twinkle` | 0.35 | 0 to 1 | 0.01 |
| Flare On · `bk_sync` | Free Run (0) | Free Run; Kick; Snare; Hi-hat; Beat; Bar; Drops | 1 |
| Colour · `bk_color_mode` | Warm Lights (0) | Warm Lights; Rainbow; Solid Colour; Two-Tone | 1 |
| Colour 1 · `bk_color` | #ffb347 | color | — |
| Colour 2 · `bk_color2` | #ff6fb5 | color | — |
| Opacity · `bk_opacity` | 0.6 | 0.05 to 1 | 0.01 |

## Matrix Rain

Falling columns of glyphs; the chosen hit drops a new wave of streams and flashes the heads.

Category: **Atmosphere**. ID: `matrix`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Glyphs · `mx_charset` | Katakana (0) | Katakana; Binary; Hex; Latin; Runes | 1 |
| Glyph Size · `mx_size` | 18 | 8 to 48 | 1 |
| Fall Speed · `mx_speed` | 1 | 0.1 to 4 | 0.01 |
| Density · `mx_density` | 0.7 | 0.05 to 1 | 0.01 |
| Trail Length · `mx_trail` | 18 | 4 to 40 | 1 |
| Glyph Flicker · `mx_flicker` | 1 | 0 to 3 | 0.01 |
| New Wave On · `mx_sync` | Free Run (0) | Free Run; Kick; Snare; Hi-hat; Beat; Bar; Drops | 1 |
| Head Glow · `mx_glow` | 10 | 0 to 30 | 1 |
| Darken Behind · `mx_dim` | 0 | 0 to 0.9 | 0.01 |
| Colour · `mx_color_mode` | Solid Colour (1) | Rainbow Cycle; Solid Colour; Two-Tone | 1 |
| Colour 1 · `mx_color` | #33ff77 | color | — |
| Colour 2 · `mx_color2` | #33c8ff | color | — |
| Opacity · `mx_opacity` | 0.85 | 0.1 to 1 | 0.01 |

## Vignette



Category: **Atmosphere**. ID: `vignette`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Strength · `vignette_strength` | 0.5 | 0.05 to 1 | 0.05 |
| Clear Centre · `vignette_size` | 0.2 | 0.02 to 0.9 | 0.01 |
| Softness · `vignette_softness` | 1 | 0.1 to 1.5 | 0.01 |
| Shape · `vignette_shape` | Circle (0) | Circle; Fit Screen | 1 |
| Colour · `vignette_color` | #000000 | color | — |

## Scanlines



Category: **Atmosphere**. ID: `scanlines`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Density · `scanline_density` | 2 | 1 to 8 | 1 |
| Opacity · `scanline_opacity` | 0.15 | 0.02 to 0.8 | 0.01 |
| Scroll Speed · `scanline_speed` | 0 | -200 to 200 | 1 |
| Direction · `scanline_orientation` | Horizontal (0) | Horizontal; Vertical; Grid | 1 |
| Colour · `scanline_color` | #000000 | color | — |

## Cinematic

Widescreen letterbox bars, warm film-burn flares and dips to black, like a movie.

Category: **Atmosphere**. ID: `cinematic`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Letterbox · `cn_aspect` | 2.39:1 Scope (3) | Off; 1.85:1 Film; 2:1; 2.39:1 Scope; 2.76:1 Ultra Wide | 1 |
| Bar Opacity · `cn_bar_opacity` | 1 | 0 to 1 | 0.01 |
| Bars Slide In (sec) · `cn_bar_slide` | 1.5 | 0 to 5 | 0.1 |
| Film Burn · `cn_burn` | 0.5 | 0 to 1 | 0.01 |
| Burn On · `cn_burn_sync` | Free Run (0) | Free Run; Kick; Snare; Hi-hat; Beat; Bar; Drops | 1 |
| Burn Every (free, sec) · `cn_burn_every` | 9 | 2 to 30 | 0.5 |
| Burn Colour · `cn_burn_color` | #ff7a2a | color | — |
| Dip to Black On · `cn_dip` | Never (0) | Never; Every Bar; Every 4 Bars; Drops | 1 |
| Dip Strength · `cn_dip_amount` | 0.7 | 0 to 1 | 0.01 |
| Projector Flicker · `cn_flicker` | 0.15 | 0 to 1 | 0.01 |

## Spectrum Visualizer

Shows the live audio from the Audio tab source.

Category: **Audio & Text**. ID: `spectrum`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Style · `spectrum_style` | Bars (0) | Bars; Mirrored Bars; Circle; Wave Line; Oscilloscope | 1 |
| Bars · `spectrum_bars` | 48 | 8 to 128 | 1 |
| Height · `spectrum_height` | 0.3 | 0.05 to 1 | 0.01 |
| Position · `spectrum_position` | Bottom (0) | Bottom; Centre; Top | 1 |
| Colour · `spectrum_color_mode` | Rainbow (0) | Rainbow; Solid Colour; Heat by Level | 1 |
| Colour · `spectrum_color` | #4dffa0 | color | — |
| Opacity · `spectrum_opacity` | 0.85 | 0.1 to 1 | 0.01 |
| Glow · `spectrum_glow` | 10 | 0 to 30 | 1 |
| Smoothing · `spectrum_smoothing` | 0.6 | 0 to 0.95 | 0.01 |
| Bar Gap · `spectrum_gap` | 0.25 | 0 to 0.8 | 0.01 |
| Circle Radius · `spectrum_radius` | 0.18 | 0.05 to 0.45 | 0.01 |
| Line Width · `spectrum_thickness` | 2 | 1 to 8 | 0.5 |

## Text / Title



Category: **Audio & Text**. ID: `text`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Text · `text_content` | PSYCHEDELIA | text | — |
| Font · `text_font` | Bold Sans (0) | Bold Sans; Impact; Serif; Mono; Script | 1 |
| Size · `text_size` | 0.12 | 0.02 to 0.4 | 0.005 |
| Position X · `text_x` | 0.5 | 0 to 1 | 0.01 |
| Position Y · `text_y` | 0.5 | 0 to 1 | 0.01 |
| Colour · `text_color_mode` | Solid Colour (0) | Solid Colour; Rainbow Letters; Gradient Sweep | 1 |
| Colour · `text_color` | #ffffff | color | — |
| Glow · `text_glow` | 20 | 0 to 60 | 1 |
| Outline · `text_outline` | 0 | 0 to 10 | 0.5 |
| Opacity · `text_opacity` | 0.9 | 0.05 to 1 | 0.01 |
| Letter Spacing · `text_spacing` | 0.08 | 0 to 0.6 | 0.01 |
| Animation · `text_animation` | None (0) | None; Pulse; Wave Letters; Flicker; Glitch Jitter; Slow Spin | 1 |
| Animation Speed · `text_anim_speed` | 1 | 0 to 4 | 0.05 |

## Lyrics / Text Sequence

Your lines, one after another, changing on the beat or the bar. Write one line per row.

Category: **Audio & Text**. ID: `lyrics`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Lines (one per row) · `ly_lines` | FEEL THE BEAT LET IT FLOW INTO THE LIGHT WE ARE ONE | textarea | — |
| Next Line · `ly_advance` | Every Bar (2) | Every Beat; Every 2 Beats; Every Bar; Every 2 Bars; Every 4 Bars; Timed (seconds) | 1 |
| Seconds per Line (timed) · `ly_seconds` | 2 | 0.5 to 10 | 0.1 |
| Animation · `ly_style` | Pop (1) | Fade; Pop; Typewriter; Slide Up; Glitch; Word by Word | 1 |
| Font · `ly_font` | Bold Sans (0) | Bold Sans; Impact; Serif; Mono; Script | 1 |
| Size · `ly_size` | 0.09 | 0.03 to 0.25 | 0.005 |
| Position Y · `ly_y` | 0.78 | 0 to 1 | 0.01 |
| Letters · `ly_case` | As Typed (0) | As Typed; UPPERCASE; lowercase | 1 |
| Colour · `ly_color_mode` | Solid Colour (0) | Solid Colour; Rainbow per Line; Two-Tone | 1 |
| Colour 1 · `ly_color` | #ffffff | color | — |
| Colour 2 · `ly_color2` | #ff4fb0 | color | — |
| Glow · `ly_glow` | 18 | 0 to 60 | 1 |
| Opacity · `ly_opacity` | 0.95 | 0.05 to 1 | 0.01 |
| At the End · `ly_end` | Loop (0) | Loop; Hold Last Line; Clear | 1 |

## Image / Logo

Your own picture or logo on top (PNG with transparency works best). It pulses on the kick.

Category: **Audio & Text**. ID: `image_layer`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Image · `img_file` |  | image | — |
| Size · `img_size` | 0.4 | 0.05 to 1.5 | 0.01 |
| Position X · `img_x` | 0.5 | 0 to 1 | 0.01 |
| Position Y · `img_y` | 0.5 | 0 to 1 | 0.01 |
| Kick Pulse · `img_pulse` | 0.3 | 0 to 1 | 0.01 |
| Spin · `img_spin` | 0 | -3 to 3 | 0.01 |
| Float · `img_wobble` | 0 | 0 to 1 | 0.01 |
| Glow · `img_glow` | 14 | 0 to 60 | 1 |
| Glow Colour · `img_glow_color` | #ffffff | color | — |
| Blend · `img_blend` | Normal (0) | Normal; Add (Glow); Screen; Multiply; Difference | 1 |
| Opacity · `img_opacity` | 1 | 0 to 1 | 0.01 |
