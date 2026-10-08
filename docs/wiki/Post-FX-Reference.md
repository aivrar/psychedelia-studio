# Post FX Reference

[How to use FX and overlays](FX-and-Overlays.md) · [Smart Shuffle](Smart-Shuffle.md)

Generated from the running app by `node tools/build-wiki-reference.mjs`. Values are base defaults, before presets or audio modulation. Select values are zero-based indices in saved data; the UI shows labels. Ranges use the app’s stored units; controls marked as percentages may display a scaled value.

- [Mirror](#mirror) — Distort
- [Droste Tunnel](#droste-tunnel) — Distort
- [Swirl](#swirl) — Distort
- [Wave Warp](#wave-warp) — Distort
- [Lens Bulge](#lens-bulge) — Distort
- [Shockwave](#shockwave) — Distort
- [Zoom Blur](#zoom-blur) — Distort
- [Pixelate](#pixelate) — Distort
- [Heat Haze & Caustic Light](#heat-haze--caustic-light) — Distort
- [Feedback Trails](#feedback-trails) — Feedback
- [RGB Time Echo](#rgb-time-echo) — Feedback
- [Slit-Scan Time Warp](#slit-scan-time-warp) — Feedback
- [Datamosh](#datamosh) — Feedback
- [Color Grading](#color-grading) — Colour
- [Palette Map](#palette-map) — Colour
- [Acid Colours](#acid-colours) — Colour
- [Posterize / Toon](#posterize--toon) — Colour
- [Vision Modes](#vision-modes) — Colour
- [Edge Glow](#edge-glow) — Stylize
- [Halftone](#halftone) — Stylize
- [LED Wall](#led-wall) — Stylize
- [Sharpen](#sharpen) — Stylize
- [Oil Paint](#oil-paint) — Stylize
- [Relief Lighting](#relief-lighting) — Stylize
- [Holo Foil](#holo-foil) — Stylize
- [Pixel Sort](#pixel-sort) — Stylize
- [Stained Glass](#stained-glass) — Stylize
- [Watercolour](#watercolour) — Stylize
- [Bloom](#bloom) — Glow & Blur
- [Focus Blur](#focus-blur) — Glow & Blur
- [God Rays](#god-rays) — Glow & Blur
- [Anamorphic Flare](#anamorphic-flare) — Lens & Retro
- [Chromatic Aberration](#chromatic-aberration) — Lens & Retro
- [Glitch](#glitch) — Lens & Retro
- [VHS Tape](#vhs-tape) — Lens & Retro
- [CRT](#crt) — Lens & Retro
- [ASCII Text Mode](#ascii-text-mode) — Lens & Retro
- [Retro Dither](#retro-dither) — Lens & Retro
- [Film Grain](#film-grain) — Lens & Retro

## Mirror



Category: **Distort**. ID: `mirror`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Mode · `mode` | Horizontal (0) | Horizontal; Vertical; Quad; Kaleidoscope; Diagonal | 1 |
| Segments · `segments` | 6 | 2 to 16 | 1 |
| Rotation · `rotation` | 0 | 0 to 1 | 0.01 |
| Spin Speed · `spin` | 0 | -1 to 1 | 0.01 |
| Zoom · `zoom` | 1 | 0.25 to 4 | 0.01 |
| Centre X · `center_x` | 0.5 | 0 to 1 | 0.01 |
| Centre Y · `center_y` | 0.5 | 0 to 1 | 0.01 |

## Droste Tunnel

Repeats the picture inside itself as an endless zooming spiral.

Category: **Distort**. ID: `droste`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Zoom Speed · `zoom_speed` | 0.35 | -2 to 2 | 0.01 |
| Repeat Scale · `scale` | 3 | 1.5 to 8 | 0.05 |
| Spiral Arms · `twist` | 1 | -3 to 3 | 1 |
| Spin Speed · `spin` | 0 | -1 to 1 | 0.01 |
| Mix · `mix` | 1 | 0 to 1 | 0.01 |

## Swirl



Category: **Distort**. ID: `swirl`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Strength · `strength` | 0.6 | -2 to 2 | 0.01 |
| Radius · `radius` | 0.6 | 0.05 to 1.5 | 0.01 |
| Wobble · `wobble` | 0.3 | 0 to 1 | 0.01 |
| Wobble Speed · `speed` | 1 | 0 to 4 | 0.05 |
| Centre X · `center_x` | 0.5 | 0 to 1 | 0.01 |
| Centre Y · `center_y` | 0.5 | 0 to 1 | 0.01 |

## Wave Warp



Category: **Distort**. ID: `wave`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Mode · `mode` | Liquid (3) | Horizontal Waves; Vertical Waves; Ripples; Liquid | 1 |
| Amplitude · `amplitude` | 0.015 | 0 to 0.1 | 0.001 |
| Frequency · `frequency` | 10 | 1 to 60 | 0.5 |
| Speed · `speed` | 1 | -5 to 5 | 0.05 |
| Turbulence · `turbulence` | 0.25 | 0 to 1 | 0.01 |

## Lens Bulge



Category: **Distort**. ID: `fisheye`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Bulge / Pinch · `strength` | 0.45 | -1 to 1 | 0.01 |
| Radius · `radius` | 0.7 | 0.1 to 1.5 | 0.01 |
| Centre X · `center_x` | 0.5 | 0 to 1 | 0.01 |
| Centre Y · `center_y` | 0.5 | 0 to 1 | 0.01 |

## Shockwave

A ripple ring fired by the beat. Without audio it uses the interval.

Category: **Distort**. ID: `shockwave`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Fire On · `sync` | Kick (1) | Free Run; Kick; Snare; Beat; Bar; Drops | 1 |
| Interval (sec) · `interval` | 1 | 0.2 to 4 | 0.05 |
| Strength · `strength` | 0.06 | 0 to 0.15 | 0.001 |
| Ring Width · `width` | 0.06 | 0.01 to 0.3 | 0.005 |
| Ring Speed · `speed` | 1.1 | 0.2 to 3 | 0.05 |
| Ring Glow · `glow` | 0.4 | 0 to 1 | 0.01 |
| Colour Fringe · `chroma` | 0.4 | 0 to 1 | 0.01 |
| Centre X · `center_x` | 0.5 | 0 to 1 | 0.01 |
| Centre Y · `center_y` | 0.5 | 0 to 1 | 0.01 |

## Zoom Blur



Category: **Distort**. ID: `zoom_blur`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Mode · `mode` | Zoom (0) | Zoom; Spin | 1 |
| Strength · `strength` | 0.12 | 0 to 0.6 | 0.005 |
| Quality · `quality` | Medium (1) | Fast; Medium; High | 1 |
| Streak Glow · `glow` | 0.3 | 0 to 1.5 | 0.01 |
| Centre X · `center_x` | 0.5 | 0 to 1 | 0.01 |
| Centre Y · `center_y` | 0.5 | 0 to 1 | 0.01 |

## Pixelate



Category: **Distort**. ID: `pixelate`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Pixel Size · `size` | 4 | 1 to 32 | 1 |
| Shape · `shape` | Square (0) | Square; Round Dots; Diamonds | 1 |
| Gap · `gap` | 0 | 0 to 0.8 | 0.01 |

## Heat Haze & Caustic Light

Rising heat shimmer, dancing underwater light nets, or both.

Category: **Distort**. ID: `heat_haze`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Effect · `mode` | Both (2) | Heat Haze; Caustic Light; Both | 1 |
| Shimmer · `strength` | 0.8 | 0 to 2 | 0.01 |
| Pattern Size · `scale` | 2 | 0.5 to 6 | 0.05 |
| Speed · `speed` | 1 | 0 to 3 | 0.01 |
| Light Strength · `caustic` | 0.7 | 0 to 2 | 0.01 |
| Light Hue · `hue` | 0.5 | 0 to 1 | 0.005 |
| Mix · `mix` | 1 | 0 to 1 | 0.01 |

## Feedback Trails



Category: **Feedback**. ID: `trails`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Trail Length · `amount` | 0.85 | 0 to 0.98 | 0.01 |
| Trail Zoom · `zoom` | 1.006 | 0.96 to 1.04 | 0.001 |
| Trail Twist · `rotate` | 0.004 | -0.05 to 0.05 | 0.001 |
| Hue Drift · `hue` | 0.003 | -0.03 to 0.03 | 0.001 |
| Blend · `blend` | Lighten (0) | Lighten; Screen; Smear | 1 |
| Drift X · `drift_x` | 0 | -0.01 to 0.01 | 0.0005 |
| Drift Y · `drift_y` | 0 | -0.01 to 0.01 | 0.0005 |

## RGB Time Echo

Each colour channel lags behind by a different amount, so moving shapes leave rainbow echoes.

Category: **Feedback**. ID: `rgb_echo`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Echo Colours · `mode` | Green + Blue Lag (0) | Green + Blue Lag; Red + Blue Lag; Cyan Lag; All Channels | 1 |
| First Lag · `lag1` | 0.65 | 0 to 0.98 | 0.01 |
| Second Lag · `lag2` | 0.88 | 0 to 0.98 | 0.01 |
| Echo Zoom · `drift` | 0.004 | -0.02 to 0.03 | 0.0005 |
| Echo Twist · `twist` | 0 | -0.03 to 0.03 | 0.0005 |
| Mix · `mix` | 1 | 0 to 1 | 0.01 |

## Slit-Scan Time Warp

Only a thin slit (or ring) shows the live picture; the past scrolls away from it, stretching time into space.

Category: **Feedback**. ID: `slit_scan`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Scan · `mode` | Horizontal Slit (0) | Horizontal Slit; Vertical Slit; Time Tunnel Outward; Time Tunnel Inward | 1 |
| Scan Speed (px/frame) · `speed` | 2 | 0.5 to 12 | 0.1 |
| Slit Position · `slit` | 0.5 | 0 to 1 | 0.01 |
| Slit Width (px) · `width` | 4 | 1 to 60 | 0.5 |
| Mix · `mix` | 1 | 0 to 1 | 0.01 |

## Datamosh

Broken-video smearing: blocks drag the old picture along, until a refresh on the beat snaps it back.

Category: **Feedback**. ID: `datamosh`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Refresh On · `sync` | Bar (4) | Free Run; Kick; Snare; Beat; Bar; Drops | 1 |
| Refresh Every (free, sec) · `interval` | 2 | 0.3 to 8 | 0.05 |
| Smear · `smear` | 1 | 0 to 3 | 0.01 |
| Block Size · `block` | 16 | 4 to 64 | 1 |
| Live Bleed · `bleed` | 0.12 | 0 to 1 | 0.01 |
| Block Jitter · `jitter` | 0.3 | 0 to 1 | 0.01 |
| Mix · `mix` | 1 | 0 to 1 | 0.01 |

## Color Grading



Category: **Colour**. ID: `color_grade`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Brightness · `brightness` | 0 | -0.5 to 0.5 | 0.01 |
| Contrast · `contrast` | 1 | 0.5 to 2 | 0.05 |
| Saturation · `saturation` | 1 | 0 to 3 | 0.05 |
| Hue Shift · `hue_shift` | 0 | 0 to 1 | 0.01 |
| Gamma · `gamma` | 1 | 0.4 to 2.5 | 0.01 |
| Temperature · `temperature` | 0 | -1 to 1 | 0.01 |
| Tint · `tint` | 0 | -1 to 1 | 0.01 |
| Vibrance · `vibrance` | 0 | -1 to 1 | 0.01 |
| Invert · `invert` | 0 | 0 to 1 | 0.01 |

## Palette Map



Category: **Colour**. ID: `palette_map`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Palette · `palette` | Acid Trip (0) | Acid Trip; Electric Kool-Aid; Liquid Light Show; Mushroom Glow; DMT Hyperspace; Tie-Dye; Blacklight Poster; Peyote Desert; Kaleido Candy; Chromadepth; Full Spectrum; Neon Jungle; Third Eye; Fever Dream; Synthwave; Vaporwave; Cyberpunk; Outrun Sunset; Tron Grid; Plasma Arc; Laser Show; Arcade; Calm Lagoon; Dreamy Pastel; Melancholy Blue; Romantic Rose; Midnight Mystery; Euphoria; Unease; Warm Nostalgia; Ethereal; Haunted; Rage; Zen Garden; Cosmic Awe; Bliss; Ocean Depths; Coral Reef; Aurora Borealis; Sunset Blaze; Lava Flow; Forest Canopy; Autumn Leaves; Glacier; Desert Dunes; Thunderstorm; Bioluminescence; Nebula; Ultra Fractal; Fire; Ice; Electric Blue; Copper Teal; Black Gold; Zebra; Sapphire Ruby; Emerald Amethyst; Viridis; Magma; Inferno; Plasma; Turbo; Twilight; Cubehelix; Chrome; Silver Moon; Ink Wash; Rose Gold; Bronze Age; Obsidian Glass; Night Vision | 1 |
| Mix · `mix` | 0.85 | 0 to 1 | 0.01 |
| Spread · `spread` | 1 | 0.25 to 4 | 0.05 |
| Cycle Speed · `cycle` | 0.05 | -1 to 1 | 0.01 |
| Map From · `source` | Brightness (0) | Brightness; Hue; Both | 1 |
| Offset · `offset` | 0 | 0 to 1 | 0.01 |
| Bands (0 = smooth) · `posterize` | 0 | 0 to 16 | 1 |

## Acid Colours

Rolls the hues across the picture in waves.

Category: **Colour**. ID: `color_wash`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Pattern · `mode` | Radial (0) | Radial; Diagonal; By Brightness; Liquid | 1 |
| Amount · `amount` | 0.6 | 0 to 1 | 0.01 |
| Scale · `scale` | 2 | 0.2 to 12 | 0.05 |
| Speed · `speed` | 0.5 | -3 to 3 | 0.01 |
| Saturation · `saturation` | 1.2 | 0 to 2 | 0.01 |

## Posterize / Toon



Category: **Colour**. ID: `posterize`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Colour Levels · `levels` | 5 | 2 to 16 | 1 |
| Gamma · `gamma` | 1 | 0.4 to 2.5 | 0.01 |
| Ink Outlines · `ink` | 0.6 | 0 to 1 | 0.01 |
| Ink Threshold · `ink_threshold` | 0.12 | 0.02 to 0.5 | 0.01 |
| Mix · `mix` | 1 | 0 to 1 | 0.01 |

## Vision Modes

See the scene through a thermal camera, night-vision goggles, an X-ray or infrared film.

Category: **Colour**. ID: `vision`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Vision · `mode` | Thermal Camera (0) | Thermal Camera; Night Vision; X-Ray; Infrared Film | 1 |
| Gain · `gain` | 1.2 | 0.5 to 3 | 0.01 |
| Sensor Noise · `noise` | 0.25 | 0 to 1 | 0.01 |
| Scanlines · `scanlines` | 0.3 | 0 to 1 | 0.01 |
| Goggle Mask · `vignette` | 0.5 | 0 to 1 | 0.01 |
| Mix · `mix` | 1 | 0 to 1 | 0.01 |

## Edge Glow



Category: **Stylize**. ID: `edge_glow`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Intensity · `intensity` | 1 | 0 to 3 | 0.1 |
| Threshold · `threshold` | 0.1 | 0 to 0.5 | 0.01 |
| Color Speed · `color_speed` | 1 | 0 to 5 | 0.1 |
| Mode · `mode` | Overlay (0) | Overlay; Edges Only | 1 |
| Line Width · `width` | 1 | 0.5 to 4 | 0.1 |
| Edge Colour · `color_mode` | Rainbow (0) | Rainbow; Original Colour; White | 1 |

## Halftone



Category: **Stylize**. ID: `halftone`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Dot Size · `size` | 8 | 3 to 40 | 0.5 |
| Screen Angle · `angle` | 0.125 | 0 to 1 | 0.005 |
| Style · `mode` | Colour Dots (1) | Ink on Paper; Colour Dots; CMY Print | 1 |
| Contrast · `contrast` | 1.2 | 0.5 to 2.5 | 0.01 |
| Mix · `mix` | 1 | 0 to 1 | 0.01 |

## LED Wall



Category: **Stylize**. ID: `led_wall`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| LED Size · `cell` | 9 | 3 to 40 | 0.5 |
| Roundness · `roundness` | 1 | 0 to 1 | 0.01 |
| Gap · `gap` | 0.12 | 0 to 0.45 | 0.01 |
| Glow · `glow` | 0.4 | 0 to 1 | 0.01 |
| Brightness · `brightness` | 1.3 | 0.5 to 3 | 0.01 |

## Sharpen



Category: **Stylize**. ID: `sharpen`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Amount · `amount` | 1 | 0 to 4 | 0.05 |
| Radius · `radius` | 1 | 0.5 to 4 | 0.05 |

## Oil Paint

Kuwahara filter: flattens colour into brush strokes, like a painting.

Category: **Stylize**. ID: `oil_paint`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Brush Size · `radius` | 4 | 1 to 6 | 1 |
| Brush Spread · `spacing` | 1 | 1 to 3 | 1 |
| Saturation · `saturation` | 1.15 | 0 to 2 | 0.01 |
| Canvas Texture · `canvas` | 0.35 | 0 to 1 | 0.01 |
| Mix · `mix` | 1 | 0 to 1 | 0.01 |

## Relief Lighting

Treats brightness as height and lights it, so the image looks sculpted in clay, chrome or gold.

Category: **Stylize**. ID: `relief`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Material · `material` | Clay (0) | Clay; Chrome; Gold; Emboss | 1 |
| Height · `height` | 2.5 | 0 to 8 | 0.05 |
| Light Angle · `angle` | 0.15 | 0 to 1 | 0.005 |
| Light Height · `elevation` | 0.45 | 0.1 to 1 | 0.01 |
| Shine · `shine` | 0.5 | 0 to 1 | 0.01 |
| Bump Width · `spread` | 1.5 | 0.5 to 4 | 0.05 |
| Mix · `mix` | 1 | 0 to 1 | 0.01 |

## Holo Foil

Rainbow foil like a holographic card: colours shift with the slope of the image, with glints.

Category: **Stylize**. ID: `holo_foil`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Foil Amount · `amount` | 0.6 | 0 to 1 | 0.01 |
| Rainbow Scale · `scale` | 2.5 | 0.5 to 8 | 0.05 |
| Tilt · `tilt` | 0.5 | 0 to 1 | 0.01 |
| Shimmer Speed · `shimmer` | 0.4 | 0 to 2 | 0.01 |
| Sparkle · `sparkle` | 0.5 | 0 to 1 | 0.01 |
| Mix · `mix` | 1 | 0 to 1 | 0.01 |

## Pixel Sort

Glitch-art streaks: runs of pixels within the brightness band are sorted or smeared along a direction.

Category: **Stylize**. ID: `pixel_sort`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Direction · `direction` | Down (0) | Down; Up; Right; Left | 1 |
| Style · `mode` | Sort Bright to Dark (0) | Sort Bright to Dark; Sort Dark to Bright; Smear | 1 |
| Band Low · `low` | 0.35 | 0 to 1 | 0.01 |
| Band High · `high` | 1 | 0 to 1 | 0.01 |
| Max Streak (px) · `length` | 180 | 8 to 480 | 1 |
| Mix · `mix` | 1 | 0 to 1 | 0.01 |

## Stained Glass

Turns the image into a lit stained-glass window: irregular glass pieces with lead lines.

Category: **Stylize**. ID: `stained_glass`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Piece Size · `cell` | 38 | 8 to 140 | 1 |
| Irregularity · `jitter` | 0.9 | 0 to 1 | 0.01 |
| Lead Width · `lead` | 0.35 | 0 to 1 | 0.01 |
| Saturation · `saturation` | 1.35 | 0 to 2 | 0.01 |
| Light Glow · `glow` | 0.6 | 0 to 1.5 | 0.01 |
| Glass Ripple · `ripple` | 0.4 | 0 to 1 | 0.01 |
| Mix · `mix` | 1 | 0 to 1 | 0.01 |

## Watercolour

Paints the image in watercolour: colours bleed, pigment pools at edges, paper grain shows through.

Category: **Stylize**. ID: `watercolour`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Colour Bleed · `bleed` | 2.5 | 0 to 6 | 0.05 |
| Wash Levels · `levels` | 6 | 2 to 12 | 1 |
| Edge Darkening · `edges` | 0.7 | 0 to 1.5 | 0.01 |
| Paper Texture · `paper` | 0.5 | 0 to 1 | 0.01 |
| Granulation · `granulation` | 0.4 | 0 to 1 | 0.01 |
| Mix · `mix` | 1 | 0 to 1 | 0.01 |

## Bloom



Category: **Glow & Blur**. ID: `bloom`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Intensity · `intensity` | 0.8 | 0 to 3 | 0.05 |
| Threshold · `threshold` | 0.4 | 0 to 1 | 0.05 |
| Radius · `radius` | 3 | 1 to 8 | 0.5 |
| Softness · `softness` | 0.6 | 0.01 to 1 | 0.01 |
| Tint Hue · `tint_hue` | 0.8 | 0 to 1 | 0.01 |
| Tint Amount · `tint` | 0 | 0 to 1 | 0.01 |
| Blend · `blend` | Add (0) | Add; Screen | 1 |

## Focus Blur

Tilt-shift miniature look, or a radial focus spot.

Category: **Glow & Blur**. ID: `tilt_shift`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Mode · `mode` | Band (tilt-shift) (0) | Band (tilt-shift); Radial Spot | 1 |
| Focus Position · `focus` | 0.5 | 0 to 1 | 0.01 |
| Focus Width · `width` | 0.3 | 0 to 1 | 0.01 |
| Blur · `blur` | 5 | 0 to 12 | 0.1 |
| Saturation · `saturation` | 1.25 | 0 to 2 | 0.01 |

## God Rays

Light shafts streaming from bright areas toward the light point.

Category: **Glow & Blur**. ID: `god_rays`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Light X · `light_x` | 0.5 | 0 to 1 | 0.01 |
| Light Y · `light_y` | 0.55 | 0 to 1 | 0.01 |
| Ray Length · `length` | 0.8 | 0.1 to 1.5 | 0.01 |
| Falloff · `decay` | 0.975 | 0.9 to 1 | 0.001 |
| Threshold · `threshold` | 0.35 | 0 to 1 | 0.01 |
| Intensity · `intensity` | 1 | 0 to 3 | 0.01 |
| Tint Hue · `tint_hue` | 0.1 | 0 to 1 | 0.01 |
| Tint Amount · `tint` | 0.25 | 0 to 1 | 0.01 |

## Anamorphic Flare

Cinematic horizontal lens streaks and ghosts from the highlights.

Category: **Lens & Retro**. ID: `anamorphic`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Threshold · `threshold` | 0.55 | 0 to 1 | 0.01 |
| Streak Length · `length` | 0.45 | 0.05 to 1 | 0.01 |
| Intensity · `intensity` | 1 | 0 to 3 | 0.01 |
| Streak Hue · `tint_hue` | 0.58 | 0 to 1 | 0.01 |
| Lens Ghosts · `ghosts` | 0.3 | 0 to 1 | 0.01 |

## Chromatic Aberration



Category: **Lens & Retro**. ID: `chromatic`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Amount · `amount` | 5 | 0 to 30 | 0.5 |
| Falloff · `falloff` | 1.5 | 0.5 to 3 | 0.1 |
| Direction · `mode` | Radial (0) | Radial; Fixed Angle | 1 |
| Angle · `angle` | 0 | 0 to 1 | 0.01 |
| Centre X · `center_x` | 0.5 | 0 to 1 | 0.01 |
| Centre Y · `center_y` | 0.5 | 0 to 1 | 0.01 |

## Glitch



Category: **Lens & Retro**. ID: `glitch`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Intensity · `intensity` | 1 | 0 to 3 | 0.1 |
| Speed · `speed` | 1 | 0.1 to 5 | 0.1 |
| Block Size · `block_size` | 30 | 5 to 100 | 1 |
| RGB Shift · `rgb_shift` | 1 | 0 to 3 | 0.05 |
| Static Lines · `static` | 0.3 | 0 to 1 | 0.01 |
| Block Glitches · `blocks` | 0 | 0 to 1 | 0.01 |
| Colour Swaps · `color_swap` | 0 | 0 to 1 | 0.01 |

## VHS Tape



Category: **Lens & Retro**. ID: `vhs`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Wobble · `wobble` | 0.5 | 0 to 1 | 0.01 |
| Line Jitter · `jitter` | 0.4 | 0 to 1 | 0.01 |
| Tracking Bar · `tracking` | 0.35 | 0 to 1 | 0.01 |
| Colour Bleed · `bleed` | 0.5 | 0 to 1 | 0.01 |
| Noise · `noise` | 0.4 | 0 to 1 | 0.01 |
| Saturation · `saturation` | 0.85 | 0 to 1.5 | 0.01 |

## CRT



Category: **Lens & Retro**. ID: `crt`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Curvature · `curvature` | 1.5 | 0 to 5 | 0.1 |
| Scanlines · `scan_intensity` | 0.25 | 0 to 0.8 | 0.05 |
| Vignette · `vignette` | 0.8 | 0 to 1 | 0.05 |
| RGB Mask · `mask` | 0.25 | 0 to 1 | 0.01 |
| Flicker · `flicker` | 0 | 0 to 1 | 0.01 |
| Brightness · `brightness` | 1.1 | 0.8 to 1.6 | 0.01 |

## ASCII Text Mode

Redraws the picture with text characters, like an old terminal.

Category: **Lens & Retro**. ID: `ascii`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Character Size · `size` | 10 | 4 to 32 | 1 |
| Colours · `mode` | Green Terminal (0) | Green Terminal; Original Colours; Amber; White on Black; Cyan Neon | 1 |
| Contrast · `contrast` | 1.3 | 0.5 to 3 | 0.01 |
| Picture Behind · `background` | 0.08 | 0 to 1 | 0.01 |
| Mix · `mix` | 1 | 0 to 1 | 0.01 |

## Retro Dither

Ordered (Bayer) dithering with retro palettes: 1-bit Mac, Game Boy, CGA, amber monitor, Pico-8.

Category: **Lens & Retro**. ID: `dither`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Palette · `mode` | Game Boy (2) | 1-Bit; Colour Levels; Game Boy; CGA; Amber Monitor; Pico-8 | 1 |
| Pixel Size · `pixel` | 2 | 1 to 8 | 1 |
| Colour Levels · `levels` | 4 | 2 to 8 | 1 |
| Dither Strength · `dither` | 1 | 0 to 1.5 | 0.01 |
| Contrast · `contrast` | 1.15 | 0.5 to 2.5 | 0.01 |
| Brightness · `brightness` | 0 | -0.5 to 0.5 | 0.01 |
| Mix · `mix` | 1 | 0 to 1 | 0.01 |

## Film Grain



Category: **Lens & Retro**. ID: `grain`.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Intensity · `intensity` | 0.12 | 0 to 0.5 | 0.01 |
| Grain Size · `size` | 1.5 | 1 to 4 | 0.5 |
| Colour Grain · `colored` | 0 | 0 to 1 | 0.01 |
| Shadow Weight · `shadows` | 0 | 0 to 1 | 0.01 |
| Grain FPS (0 = still) · `fps` | 60 | 0 to 60 | 1 |
