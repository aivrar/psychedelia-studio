# Fractals: Effect Reference

[All effects](Effect-Catalog.md) · [Using controls](Interface-Guide.md) · [Palettes](Palette-Reference.md)

Generated from the running app by `node tools/build-wiki-reference.mjs`. Values are base defaults, before presets or audio modulation. Select values are zero-based indices in saved data; the UI shows labels. Ranges use the app’s stored units; controls marked as percentages may display a scaled value.

- [Mandelbrot](#mandelbrot)
- [Julia Set](#julia-set)
- [Burning Ship](#burning-ship)
- [Newton Fractal](#newton-fractal)
- [Multibrot](#multibrot)
- [Mandelbrot Deep](#mandelbrot-deep)
- [Phoenix Fractal](#phoenix-fractal)
- [Nova Fractal](#nova-fractal)
- [Orbit Trap](#orbit-trap)
- [Tricorn](#tricorn)
- [Flame Variation Field](#flame-variation-field)
- [Lyapunov Fractal](#lyapunov-fractal)
- [Sierpinski](#sierpinski)
- [Mandelbulb Slice](#mandelbulb-slice)
- [2D Formula Lab](#2d-formula-lab)
- [Analytic Field Lab](#analytic-field-lab)
- [Procedural Field Lab](#procedural-field-lab)
- [IFS / L-System Lab](#ifs--l-system-lab)
- [Fractal Flame Lab](#fractal-flame-lab)
- [Buddhabrot Lab](#buddhabrot-lab)
- [Attractor Density Lab](#attractor-density-lab)
- [FLAM3 Density Lab](#flam3-density-lab)
- [Mandelbulb Flight](#mandelbulb-flight)
- [Triplex Mutation Flight](#triplex-mutation-flight)
- [KIFS Fold Flight](#kifs-fold-flight)
- [DIFS Tunnel Flight](#difs-tunnel-flight)
- [Mandelbox Flight](#mandelbox-flight)
- [Folded Box Variants Flight](#folded-box-variants-flight)
- [Quaternion Julia Flight](#quaternion-julia-flight)
- [Hypercomplex Slice Flight](#hypercomplex-slice-flight)
- [Schottky Inversion Flight](#schottky-inversion-flight)
- [Apollonian Foam Flight](#apollonian-foam-flight)
- [Polyfold Flight](#polyfold-flight)
- [3D Fractal Flame Volume Flight](#3d-fractal-flame-volume-flight)
- [Strange Attractor Flight](#strange-attractor-flight)
- [L-System Tube Flight](#l-system-tube-flight)
- [Glass Fractal DE Flight](#glass-fractal-de-flight)
- [Kleinian Group](#kleinian-group)

## Mandelbrot

Infinite fractal zoom into the Mandelbrot set with smooth coloring

Effect ID: `mandelbrot`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Zoom Speed · `zoom_speed` | 0.75 | 0 to 2 | 0.05 |
| Zoom Mode · `zoom_mode` | Infinite Dive (0) | Infinite Dive; Classic One-Way | — |
| Loop Depth · `zoom_depth` | 9 | 6 to 24 | 1 |
| Max Iterations · `max_iter` | 150 | 50 to 500 | 10 |
| Color Speed · `color_speed` | 0.3 | 0 to 8 | 0.05 |
| Target X · `target_x` | -0.7435 | -2 to 1 | 0.0001 |
| Target Y · `target_y` | 0.1314 | -1.5 to 1.5 | 0.0001 |
| Palette · `palette_type` | Rainbow (0) | Rainbow; Neon; Fire; Ocean; Psychedelic; + [71 shared palettes](Palette-Reference.md) | — |

## Julia Set

Morphing Julia set fractals that smoothly transform between organic shapes

Effect ID: `julia`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Morph Speed · `morph_speed` | 0.3 | 0.05 to 2 | 0.05 |
| Zoom · `zoom` | 1.5 | 0.5 to 5 | 0.1 |
| Max Iterations · `max_iter` | 200 | 50 to 400 | 10 |
| Color Cycle · `color_speed` | 0.5 | 0 to 8 | 0.05 |
| Orbit Radius · `orbit_radius` | 0.7885 | 0.1 to 1.2 | 0.01 |
| Palette · `palette_type` | Rainbow Veil (0) | Rainbow Veil; Electric Orchid; Deep Ocean; Amber Glass; Mint Ruby; Mono Plasma; + [71 shared palettes](Palette-Reference.md) | — |

## Burning Ship

The eerie Burning Ship fractal with flame-like tendrils

Effect ID: `burning_ship`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Zoom Speed · `zoom_speed` | 0.55 | 0 to 1.5 | 0.05 |
| Zoom Mode · `zoom_mode` | Infinite Dive (0) | Infinite Dive; Classic One-Way | — |
| Loop Depth · `zoom_depth` | 9 | 6 to 24 | 1 |
| Iterations · `max_iter` | 150 | 50 to 400 | 10 |
| Target X · `target_x` | -1.755 | -2 to 1 | 0.001 |
| Target Y · `target_y` | -0.03 | -1 to 1 | 0.001 |
| Color Speed · `color_speed` | 0.5 | 0 to 8 | 0.05 |
| Smoothing · `smoothing` | 2x2 Anti-Alias (1) | Off; 2x2 Anti-Alias | — |
| Palette · `palette_type` | Ember Hull (0) | Ember Hull; Blue Furnace; Acid Smoke; Magenta Brass; Ghost Flame; Solar Ash; + [71 shared palettes](Palette-Reference.md) | — |

## Newton Fractal

Smooth interlocking basins from Newton's method applied to polynomials

Effect ID: `newton`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Power (z^n - 1) · `power` | 3 | 3 to 8 | 1 |
| Zoom · `zoom` | 1.5 | 0.5 to 5 | 0.1 |
| Iterations · `max_iter` | 40 | 10 to 100 | 5 |
| Color Speed · `color_speed` | 0.3 | 0 to 8 | 0.05 |
| Basin Motion · `motion` | 0.35 | 0 to 1.5 | 0.05 |
| Root Spin · `root_spin` | 0.35 | -2 to 2 | 0.05 |
| Warp Motion · `distort` | 0.25 | 0 to 1.5 | 0.05 |

## Multibrot

Mandelbrot with variable power - morphs between alien symmetric forms

Effect ID: `multibrot`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Power · `power` | 3 | 2 to 12 | 0.1 |
| Zoom Speed · `zoom_speed` | 0.6 | 0 to 1.5 | 0.05 |
| Zoom Mode · `zoom_mode` | Infinite Dive (0) | Infinite Dive; Classic One-Way | — |
| Loop Depth · `zoom_depth` | 8 | 6 to 24 | 1 |
| Iterations · `max_iter` | 200 | 50 to 500 | 10 |
| Target X · `target_x` | 0.36 | -2 to 2 | 0.01 |
| Target Y · `target_y` | 0 | -2 to 2 | 0.01 |
| Color Speed · `color_speed` | 0.4 | 0 to 8 | 0.05 |
| Auto Morph Power · `morph` | 0 | 0 to 1 | 0.05 |
| Palette · `palette_type` | Electric Symmetry (0) | Electric Symmetry; Amber Crown; Blue Magenta; Green Acid; Violet Gold; + [71 shared palettes](Palette-Reference.md) | — |

## Mandelbrot Deep

Ultra-detailed Mandelbrot with distance estimation, orbit coloring, and stripe patterns

Effect ID: `mandelbrot_deep`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Zoom Speed · `zoom_speed` | 0.5 | 0 to 1.5 | 0.05 |
| Zoom Mode · `zoom_mode` | Infinite Dive (0) | Infinite Dive; Classic One-Way | — |
| Loop Depth · `zoom_depth` | 10 | 8 to 28 | 1 |
| Iterations · `max_iter` | 300 | 100 to 1000 | 50 |
| Target X · `target_x` | -0.7491 | -2 to 1 | 0.0001 |
| Target Y · `target_y` | 0.1003 | -1.5 to 1.5 | 0.0001 |
| Coloring · `coloring` | Stripe (1) | Smooth; Stripe; Orbit Avg; Distance Est; Triangle Ineq; Curvature | — |
| Stripe/Detail Density · `stripe_density` | 5 | 1 to 20 | 0.5 |
| Color Speed · `color_speed` | 0.3 | 0 to 8 | 0.05 |
| Palette · `palette_type` | Ultra Fractal (0) | Ultra Fractal; Electric; Twilight; Acid; Monochrome; Fire Ice; + [71 shared palettes](Palette-Reference.md) | — |

## Phoenix Fractal

Uses previous iteration memory - creates bird-like and feathered structures

Effect ID: `phoenix`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| C Real · `c_real` | 0.5667 | -1 to 1 | 0.001 |
| C Imag · `c_imag` | 0 | -1 to 1 | 0.001 |
| Phoenix Real · `p_real` | -0.5 | -1 to 1 | 0.01 |
| Phoenix Imag · `p_imag` | 0 | -1 to 1 | 0.01 |
| Iterations · `max_iter` | 200 | 50 to 500 | 10 |
| Zoom · `zoom` | 1.5 | 0.3 to 5 | 0.1 |
| Color Speed · `color_speed` | 0.3 | 0 to 8 | 0.05 |
| Auto Morph · `morph` | 0.3 | 0 to 1 | 0.05 |

## Nova Fractal

Newton's method with relaxation - creates explosive stellar nova patterns

Effect ID: `nova`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Power · `power` | 3 | 2 to 8 | 1 |
| Relaxation Real · `relax_r` | 1 | 0.1 to 3 | 0.05 |
| Relaxation Imag · `relax_i` | 0 | -1 to 1 | 0.05 |
| Seed Real · `seed_r` | 0 | -2 to 2 | 0.05 |
| Seed Imag · `seed_i` | 0 | -2 to 2 | 0.05 |
| Zoom · `zoom` | 1.5 | 0.3 to 5 | 0.1 |
| Iterations · `max_iter` | 80 | 20 to 200 | 5 |
| Color Speed · `color_speed` | 0.3 | 0 to 8 | 0.05 |
| Brightness · `brightness` | 1.25 | 0.5 to 2 | 0.05 |
| Auto Morph · `morph` | 0.2 | 0 to 1 | 0.05 |

## Orbit Trap

Colors fractals by closest approach to geometric shapes - creates stunning detailed structures

Effect ID: `orbit_trap`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Trap Shape · `trap_type` | Cross (0) | Cross; Ring; Point; Line; Square; Rose | — |
| Trap Size · `trap_size` | 0.5 | 0.01 to 2 | 0.01 |
| Fractal · `fractal_type` | Mandelbrot (0) | Mandelbrot; Julia; Burning Ship | — |
| Zoom Speed · `zoom_speed` | 0.5 | 0 to 1.5 | 0.05 |
| Zoom Mode · `zoom_mode` | Infinite Dive (0) | Infinite Dive; Classic One-Way | — |
| Loop Depth · `zoom_depth` | 9 | 6 to 24 | 1 |
| Iterations · `max_iter` | 200 | 50 to 500 | 10 |
| Julia Real · `julia_r` | -0.4 | -1.5 to 1.5 | 0.01 |
| Julia Imag · `julia_i` | 0.6 | -1.5 to 1.5 | 0.01 |
| Color Speed · `color_speed` | 0.3 | 0 to 8 | 0.05 |
| Auto Morph · `morph` | 0.3 | 0 to 1 | 0.05 |
| Palette · `palette_type` | Trap Rainbow (0) | Trap Rainbow; Neon Glass; Amber Lines; Blue Orchid; Green Fire; + [71 shared palettes](Palette-Reference.md) | — |

## Tricorn

The Mandelbar fractal - uses complex conjugate creating 3-pointed crowns

Effect ID: `tricorn`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Zoom Speed · `zoom_speed` | 0.6 | 0 to 1.5 | 0.05 |
| Zoom Mode · `zoom_mode` | Infinite Dive (0) | Infinite Dive; Classic One-Way | — |
| Loop Depth · `zoom_depth` | 9 | 6 to 24 | 1 |
| Iterations · `max_iter` | 200 | 50 to 500 | 10 |
| Target X · `target_x` | -0.4 | -2 to 2 | 0.01 |
| Target Y · `target_y` | 0 | -2 to 2 | 0.01 |
| Color Speed · `color_speed` | 0.4 | 0 to 8 | 0.05 |
| Power · `power` | 2 | 2 to 8 | 0.5 |
| Palette · `palette_type` | Icy Crown (0) | Icy Crown; Ruby Ice; Toxic Violet; Gold Glass; Cyan Ink; + [71 shared palettes](Palette-Reference.md) | — |

## Flame Variation Field

Analytic field preview of classic flame variation functions; use Fractal Flame Lab for density-rendered IFS flames

Effect ID: `fractal_flame`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Speed · `speed` | 0.2 | 0.05 to 1 | 0.05 |
| Variation · `variation` | Swirl (2) | Sinusoidal; Spherical; Swirl; Horseshoe; Polar; Handkerchief; Heart; Disc | — |
| Variation Blend · `blend` | 0.5 | 0 to 1 | 0.05 |
| Symmetry · `symmetry` | 3 | 1 to 8 | 1 |
| Color Speed · `color_speed` | 0.5 | 0 to 8 | 0.05 |
| Glow · `glow` | 1.5 | 0.5 to 3 | 0.1 |
| Zoom · `zoom` | 1.5 | 0.5 to 4 | 0.1 |

## Lyapunov Fractal

Stability map of logistic sequences - creates wild organic boundaries between order and chaos

Effect ID: `lyapunov`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Sequence · `sequence_len` | AABB (1) | AB; AABB; AAB; AAABB; ABBA; AABAB; ABBAAB; AABABB; ABBABA | — |
| Iterations · `max_iter` | 80 | 20 to 200 | 10 |
| Warmup · `warmup` | 30 | 10 to 100 | 5 |
| Zoom · `zoom` | 1 | 0 to 10 | 0.05 |
| Center X · `center_x` | 2.5 | 0 to 4 | 0.05 |
| Center Y · `center_y` | 3 | 0 to 4 | 0.05 |
| Color Speed · `color_speed` | 0.3 | 0 to 8 | 0.05 |
| Animate · `animate` | 0.2 | 0 to 1 | 0.05 |

## Sierpinski

True barycentric Sierpinski gasket, carpet, hexaflake, pentaflake and Vicsek fractals with a seamless infinite zoom and depth-level colouring

Effect ID: `sierpinski`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Mode · `mode` | Gasket Star (1) | Triangle Gasket; Gasket Star; Carpet; Hexaflake; Pentaflake; Vicsek Cross; Vicsek Saltire | — |
| Depth · `depth` | 6 | 3 to 10 | 1 |
| Pattern Zoom Speed · `zoom_speed` | 0.6 | 0 to 3 | 0.05 |
| Rotation · `rotation` | 0.15 | -2 to 2 | 0.05 |
| Style · `style` | Nested Holes (0) | Nested Holes; Solid Glow; Neon Lines; Stained Glass | — |
| Edge Glow · `glow` | 0.9 | 0 to 2 | 0.05 |
| Color Speed · `color_speed` | 0.5 | 0 to 8 | 0.05 |
| Level Hue Shift · `level_shift` | 0.13 | 0 to 0.5 | 0.01 |
| Palette · `palette_type` | Prism Lines (0) | Prism Lines; Ember Carpet; Blue Acid; Violet Gold; Mono Glow; + [71 shared palettes](Palette-Reference.md) | — |

## Mandelbulb Slice

2D cross-sections through the 3D Mandelbulb fractal - otherworldly alien forms

Effect ID: `mandelbulb_slice`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Power · `power` | 8 | 2 to 12 | 0.5 |
| Slice Position · `slice_z` | 0 | -1.5 to 1.5 | 0.01 |
| Iterations · `max_iter` | 30 | 10 to 100 | 5 |
| Zoom · `zoom` | 1.2 | 0.5 to 5 | 0.1 |
| Animate Slice · `animate_slice` | 0.5 | 0 to 1 | 0.05 |
| Color Speed · `color_speed` | 0.4 | 0 to 8 | 0.05 |
| Palette · `palette` | Alien (0) | Alien; Deep Space; Crystal; Organic; Neon Magma; Aqua Rose; Violet Gold; Bone Fire; + [71 shared palettes](Palette-Reference.md) | — |

## 2D Formula Lab

Broad animated escape-time, root-solver, transcendental, and fold formula lab

Effect ID: `escape_time_lab`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Seahorse Lab Dive · Buffalo Wake · Celtic Glass · Magnet Gate · Lambda Bloom · Spider Tendrils · Transcendental Curtain · Root Solver Bloom · Mandelbox 2D Fold.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Formula · `formula` | Mandelbrot (0) | Mandelbrot; Julia; Multibrot; MultiJulia; Tricorn; Burning Ship; Burning Ship Julia; Buffalo; Celtic; Perpendicular Mandelbrot; Perpendicular Burning Ship; Perpendicular Buffalo; Perpendicular Celtic; Phoenix; Magnet I; Magnet II; Lambda; Cosine; Sine; Exponential; Z + Cos; Lyapunov; Nova; Manowar; Spider; Dual Power; Mandelbox 2D; Newton z^3; Newton z^4; Halley; Householder; Secant | — |
| Power · `power` | 2.5 | 2 to 8 | 0.05 |
| Iterations · `iterations` | 120 | 32 to 220 | 1 |
| Bailout · `bailout` | 48 | 4 to 256 | 1 |
| Julia X · `julia_x` | -0.72 | -1.5 to 1.5 | 0.001 |
| Julia Y · `julia_y` | 0.24 | -1.5 to 1.5 | 0.001 |
| Target X · `target_x` | -0.62 | -2.5 to 1.5 | 0.001 |
| Target Y · `target_y` | 0.08 | -1.8 to 1.8 | 0.001 |
| Root Relax · `root_relax` | 0.86 | 0.2 to 1.5 | 0.02 |
| Phoenix Feedback · `phoenix_feedback` | -0.48 | -1.2 to 1.2 | 0.02 |
| Nova Relax · `nova_relaxation` | 0.74 | 0.1 to 1.6 | 0.02 |

### View

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Formula Zoom · `formula_zoom` | 1.18 | 0 to 8 | 0.05 |
| Dive Speed · `zoom_speed` | 0.45 | 0 to 4 | 0.05 |
| Dive Depth · `zoom_depth` | 9 | 2 to 24 | 1 |
| Pan X · `pan_x` | 0 | -2 to 2 | 0.01 |
| Pan Y · `pan_y` | 0 | -2 to 2 | 0.01 |
| View Rotate · `view_rotate` | 0.05 | -3.14 to 3.14 | 0.01 |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Motion Path · `motion_mode` | Lemniscate (1) | Orbit; Lemniscate; Rotozoom; Pulse | — |
| Motion Phase · `motion_phase` | 0.18 | 0 to 1 | 0.01 |
| Formula Motion · `formula_motion` | 0.56 | 0 to 2 | 0.05 |
| Target Drift · `target_drift` | 0.34 | 0 to 1.5 | 0.05 |
| Root Spin · `root_spin` | 0.46 | 0 to 3 | 0.05 |

### Domain

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Domain Warp · `domain_mode` | Wave (2) | None; Swirl; Wave; Kaleido; Moire; Log Spiral; Water | — |
| Warp Amount · `warp_amount` | 0.18 | 0 to 1.5 | 0.02 |
| Warp Speed · `warp_speed` | 0.72 | -4 to 4 | 0.05 |
| Warp Frequency · `warp_frequency` | 3.2 | 0.5 to 12 | 0.1 |
| Kaleido Sides · `kaleido_sides` | 6 | 3 to 14 | 1 |
| Moire Strength · `moire_strength` | 0.16 | 0 to 1 | 0.02 |

### Color

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Mode · `color_mode` | Stripes (1) | Smooth; Stripes; Orbit Trap; Root Phase; Field Glow | — |
| Palette · `palette` | Neon Rainbow (0) | Neon Rainbow; Fire Glass; Ocean Acid; Violet Gold; Candy Root; Cyber Lotus; Infrared Jungle; Glacier Bloom; Sepia Dream; Blacklight Pastel; Solarized Glass; Ghost Mono; + [71 shared palettes](Palette-Reference.md) | — |
| Color Speed · `color_speed` | 0.58 | 0 to 8 | 0.05 |
| Stripe Density · `stripe_density` | 7.5 | 1 to 18 | 0.1 |
| Detail Density · `detail_density` | 1.15 | 0.2 to 3 | 0.05 |
| Trap Shape · `trap_shape` | Cross (1) | Ring; Cross; Grid; Petal | — |
| Trap Size · `trap_size` | 0.22 | 0.03 to 0.8 | 0.01 |
| Trap Rotation · `trap_rotation` | 0.28 | -3 to 3 | 0.02 |
| Brightness · `brightness` | 1.08 | 0.2 to 3 | 0.05 |
| Contrast · `contrast` | 1.18 | 0.4 to 2.4 | 0.05 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Seahorse Lab Dive",
    "values": {
      "formula": 0,
      "target_x": -0.7435,
      "target_y": 0.1314,
      "formula_zoom": 1.18,
      "zoom_speed": 0.62,
      "zoom_depth": 10,
      "domain_mode": 2,
      "warp_amount": 0.18,
      "palette": 0,
      "color_mode": 1,
      "stripe_density": 6.4,
      "brightness": 1.12
    },
    "minChanged": 0.00035
  },
  {
    "name": "Buffalo Wake",
    "values": {
      "formula": 7,
      "power": 2,
      "target_x": -0.34,
      "target_y": -0.22,
      "formula_zoom": 1.34,
      "formula_motion": 0.72,
      "domain_mode": 3,
      "warp_amount": 0.22,
      "color_mode": 2,
      "palette": 2,
      "trap_shape": 2
    },
    "minChanged": 0.00035
  },
  {
    "name": "Celtic Glass",
    "values": {
      "formula": 8,
      "formula_zoom": 1.52,
      "view_rotate": 0.16,
      "domain_mode": 4,
      "kaleido_sides": 7,
      "moire_strength": 0.18,
      "color_mode": 3,
      "palette": 3,
      "contrast": 1.28
    },
    "minChanged": 0.00035
  },
  {
    "name": "Magnet Gate",
    "values": {
      "formula": 14,
      "target_x": -0.12,
      "target_y": 0.08,
      "formula_zoom": 1.68,
      "formula_motion": 0.66,
      "target_drift": 0.34,
      "domain_mode": 1,
      "palette": 1,
      "color_mode": 2,
      "brightness": 1.18
    },
    "minChanged": 0.00035
  },
  {
    "name": "Lambda Bloom",
    "values": {
      "formula": 16,
      "julia_x": 0.72,
      "julia_y": 0.22,
      "formula_zoom": 1.44,
      "formula_motion": 0.88,
      "target_drift": 0.42,
      "color_mode": 4,
      "palette": 4,
      "trap_size": 0.28
    },
    "minChanged": 0.00035
  },
  {
    "name": "Spider Tendrils",
    "values": {
      "formula": 24,
      "target_x": -0.58,
      "target_y": 0.05,
      "formula_zoom": 1.36,
      "formula_motion": 0.72,
      "target_drift": 0.56,
      "domain_mode": 5,
      "warp_amount": 0.18,
      "palette": 0,
      "color_mode": 2
    },
    "minChanged": 0.00035
  },
  {
    "name": "Transcendental Curtain",
    "values": {
      "formula": 20,
      "formula_zoom": 1.28,
      "formula_motion": 0.94,
      "motion_mode": 2,
      "domain_mode": 6,
      "warp_amount": 0.28,
      "warp_frequency": 3.6,
      "color_mode": 4,
      "palette": 3,
      "brightness": 1.24
    },
    "minChanged": 0.00035
  },
  {
    "name": "Root Solver Bloom",
    "values": {
      "formula": 28,
      "formula_zoom": 1.62,
      "root_relax": 0.82,
      "root_spin": 0.78,
      "target_drift": 0.24,
      "color_mode": 3,
      "palette": 1,
      "detail_density": 1.26,
      "trap_rotation": 0.44
    },
    "minChanged": 0.00035
  },
  {
    "name": "Mandelbox 2D Fold",
    "values": {
      "formula": 26,
      "power": 2.2,
      "formula_zoom": 1.52,
      "formula_motion": 0.76,
      "domain_mode": 4,
      "kaleido_sides": 6,
      "warp_amount": 0.16,
      "color_mode": 2,
      "palette": 2,
      "contrast": 1.34
    },
    "minChanged": 0.00035
  }
]
```

</details>

## Analytic Field Lab

Animated complex phase, domain-coloring, quasicrystal, nodal, vortex, and number-field lab

Effect ID: `analytic_field_lab`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Weierstrass Lace · Blaschke Rose Window · Continued Portal · Quasicrystal Loom · Cymatic Gold Plate · Cortical Tunnel Bloom · Gaussian Prime Halo · Quantum Orbital Beat · Vortex Lattice Storm · Modular Farey Gate.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Field Mode · `field_mode` | Quasicrystal Wave (3) | Weierstrass Phase; Blaschke Rosette; Continued-Fraction Portal; Quasicrystal Wave; Cymatic Nodal; Pentagrid Loom; Cortical Tunnel; Gaussian Prime Halo; Quantum Orbital Beat; Vortex Lattice; Arnold Tongue Map; Modular Farey Field | — |
| Scale · `scale` | 2.35 | 0.25 to 8 | 0.05 |
| Detail · `detail` | 1.22 | 0.25 to 3 | 0.05 |
| Count · `count` | 11 | 3 to 24 | 1 |
| Lattice · `lattice` | 2.4 | 0.5 to 8 | 0.05 |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Phase · `phase` | 0.18 | 0 to 1 | 0.01 |
| Phase Speed · `phase_speed` | 0.74 | -3 to 3 | 0.05 |
| Drift · `drift` | 0.32 | 0 to 2 | 0.05 |
| Drift Speed · `drift_speed` | 0.44 | -3 to 3 | 0.05 |
| Symmetry Motion · `symmetry_motion` | 0.42 | 0 to 2 | 0.05 |

### Domain

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Domain Warp · `domain_warp` | 0.16 | 0 to 1.5 | 0.02 |
| Domain Swirl · `domain_swirl` | 0.18 | -1.5 to 1.5 | 0.02 |
| Domain Tunnel · `domain_tunnel` | 0.12 | 0 to 1.5 | 0.02 |
| Domain Kaleido · `domain_kaleido` | 0.08 | 0 to 1 | 0.02 |
| Domain Noise · `domain_noise` | 0.1 | 0 to 1 | 0.02 |

### Color

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Mode · `color_mode` | Hybrid (4) | Phase; Magnitude; Contours; Edges; Hybrid | — |
| Palette · `palette` | Neon Phase (0) | Neon Phase; Amber Circuit; Ocean Rosette; Violet Gold; Aqua Coral; + [71 shared palettes](Palette-Reference.md) | — |
| Color Speed · `color_speed` | 0.56 | 0 to 8 | 0.05 |
| Edge Gain · `edge_gain` | 1.16 | 0.2 to 3 | 0.05 |
| Glow · `glow` | 0.7 | 0 to 2.5 | 0.05 |
| Brightness · `brightness` | 1.08 | 0.2 to 3 | 0.05 |
| Contrast · `contrast` | 1.12 | 0.4 to 2.4 | 0.05 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Weierstrass Lace",
    "values": {
      "field_mode": 0,
      "scale": 2.45,
      "detail": 1.24,
      "count": 12,
      "lattice": 2,
      "phase_speed": 0.72,
      "drift": 0.34,
      "domain_warp": 0.12,
      "color_mode": 0,
      "palette": 0,
      "edge_gain": 1.22,
      "glow": 0.58
    },
    "minChanged": 0.00035
  },
  {
    "name": "Blaschke Rose Window",
    "values": {
      "field_mode": 1,
      "scale": 2.05,
      "detail": 1.38,
      "count": 9,
      "lattice": 1.42,
      "phase_speed": 0.64,
      "symmetry_motion": 0.72,
      "domain_kaleido": 0.3,
      "color_mode": 3,
      "palette": 3,
      "glow": 0.72
    },
    "minChanged": 0.00035
  },
  {
    "name": "Continued Portal",
    "values": {
      "field_mode": 2,
      "scale": 5.85,
      "detail": 1.3,
      "count": 18,
      "lattice": 3.2,
      "phase_speed": 0.86,
      "phase": 0.38,
      "drift": 0.38,
      "domain_tunnel": 0.04,
      "domain_swirl": 0.28,
      "color_mode": 4,
      "palette": 1,
      "edge_gain": 1.72,
      "glow": 1.36,
      "brightness": 1.62,
      "contrast": 0.96
    },
    "minChanged": 0.00035
  },
  {
    "name": "Quasicrystal Loom",
    "values": {
      "field_mode": 3,
      "scale": 2.85,
      "detail": 1.32,
      "count": 11,
      "lattice": 2.8,
      "phase_speed": 0.82,
      "symmetry_motion": 0.55,
      "domain_warp": 0.14,
      "color_mode": 2,
      "palette": 2,
      "edge_gain": 1.34
    },
    "minChanged": 0.00035
  },
  {
    "name": "Cymatic Gold Plate",
    "values": {
      "field_mode": 4,
      "scale": 2.72,
      "detail": 1.42,
      "count": 10,
      "lattice": 3.2,
      "phase_speed": 0.7,
      "drift_speed": 0.38,
      "domain_noise": 0.1,
      "color_mode": 2,
      "palette": 3,
      "glow": 0.68
    },
    "minChanged": 0.00035
  },
  {
    "name": "Cortical Tunnel Bloom",
    "values": {
      "field_mode": 6,
      "scale": 2.38,
      "detail": 1.26,
      "count": 12,
      "lattice": 1.65,
      "phase_speed": 0.92,
      "domain_tunnel": 0.72,
      "domain_swirl": 0.36,
      "color_mode": 4,
      "palette": 4,
      "brightness": 1.14
    },
    "minChanged": 0.00035
  },
  {
    "name": "Gaussian Prime Halo",
    "values": {
      "field_mode": 7,
      "scale": 2.12,
      "detail": 1.5,
      "count": 16,
      "lattice": 5.2,
      "phase_speed": 0.62,
      "drift": 0.3,
      "domain_kaleido": 0.12,
      "color_mode": 3,
      "palette": 1,
      "edge_gain": 1.48
    },
    "minChanged": 0.00035
  },
  {
    "name": "Quantum Orbital Beat",
    "values": {
      "field_mode": 8,
      "scale": 2.05,
      "detail": 1.36,
      "count": 8,
      "lattice": 2.4,
      "phase_speed": 0.82,
      "symmetry_motion": 0.64,
      "domain_warp": 0.18,
      "color_mode": 4,
      "palette": 0,
      "glow": 0.92
    },
    "minChanged": 0.00035
  },
  {
    "name": "Vortex Lattice Storm",
    "values": {
      "field_mode": 9,
      "scale": 2.25,
      "detail": 1.3,
      "count": 13,
      "lattice": 3.2,
      "phase_speed": 0.76,
      "drift": 0.42,
      "domain_swirl": 0.42,
      "domain_noise": 0.18,
      "color_mode": 0,
      "palette": 2
    },
    "minChanged": 0.00035
  },
  {
    "name": "Modular Farey Gate",
    "values": {
      "field_mode": 11,
      "scale": 2.62,
      "detail": 1.44,
      "count": 15,
      "lattice": 2.8,
      "phase_speed": 0.88,
      "drift_speed": 0.52,
      "domain_tunnel": 0.18,
      "domain_kaleido": 0.24,
      "color_mode": 1,
      "palette": 3,
      "contrast": 1.22
    },
    "minChanged": 0.00035
  }
]
```

</details>

## Procedural Field Lab

Animated 2D procedural and form-constant fields with phyllotaxis, Voronoi, moire, phasor, tunnel, and weave modes

Effect ID: `procedural_field_lab`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Sunflower Drift · Phasor Vine Bloom · Voronoi Amber Cells · Quasicrystal Glass · Moire Lattice Push · Spirograph Neon Trails · Tunnel Ring Hymn · Flow fBM Wall · Lissajous Weave · Sine Interference Halo.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Procedural Mode · `proc_mode` | Phyllotaxis Sunflower (0) | Phyllotaxis Sunflower; Phasor Vine; Voronoi Shimmer Plus; Quasicrystal Overlay; Moire Lattice Plus; Spirograph Field Plus; Tunnel Rings Plus; Flow fBM Wall; Lissajous Weave Plus; Sine Interference Plus | — |
| Scale · `proc_scale` | 2.35 | 0.25 to 8 | 0.05 |
| Detail · `proc_detail` | 1.24 | 0.25 to 3 | 0.05 |
| Density · `proc_density` | 5.2 | 1 to 10 | 0.1 |
| Seed · `proc_seed` | 0.27 | 0 to 1 | 0.01 |
| Angle Bias · `proc_angle_bias` | 0.18 | -1 to 1 | 0.02 |
| Metric Mix · `proc_metric` | 0.65 | 0 to 2 | 0.05 |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Phase Speed · `proc_phase_speed` | 0.78 | -4 to 4 | 0.05 |
| Rotation Speed · `proc_rotation_speed` | 0.34 | -4 to 4 | 0.05 |
| Jitter Amount · `proc_jitter` | 0.42 | 0 to 1.5 | 0.02 |
| Jitter Speed · `proc_jitter_speed` | 0.58 | -4 to 4 | 0.05 |
| Flow Speed · `proc_flow_speed` | 0.52 | -4 to 4 | 0.05 |
| Zoom Pulse · `proc_zoom_pulse` | 0.18 | 0 to 2 | 0.05 |

### Domain

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Warp Amount · `proc_warp` | 0.14 | 0 to 1.5 | 0.02 |
| Warp Frequency · `proc_warp_frequency` | 2.4 | 0.4 to 8 | 0.05 |
| Radial Pull · `proc_radial_pull` | 0.12 | -1.5 to 1.5 | 0.02 |
| Spiral Twist · `proc_spiral_twist` | 0.2 | -2 to 2 | 0.02 |

### Color

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Palette · `proc_palette` | Neon Loom (0) | Neon Loom; Amber Cell; Cobalt Rose; Violet Gold; Aqua Coral; + [71 shared palettes](Palette-Reference.md) | — |
| Color Speed · `proc_color_speed` | 0.64 | 0 to 8 | 0.05 |
| Edge Width · `proc_edge_width` | 0.72 | 0.2 to 2.5 | 0.05 |
| Glow · `proc_glow` | 0.78 | 0 to 2.5 | 0.05 |
| Brightness · `proc_brightness` | 1.08 | 0.2 to 3 | 0.05 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Sunflower Drift",
    "values": {
      "proc_mode": 0,
      "proc_scale": 2.1,
      "proc_detail": 1.12,
      "proc_density": 5.8,
      "proc_seed": 0.18,
      "proc_angle_bias": 0.24,
      "proc_phase_speed": 0.74,
      "proc_rotation_speed": 0.42,
      "proc_zoom_pulse": 0.2,
      "proc_warp": 0.08,
      "proc_palette": 3,
      "proc_glow": 0.92
    },
    "minChanged": 0.00035
  },
  {
    "name": "Phasor Vine Bloom",
    "values": {
      "proc_mode": 1,
      "proc_scale": 2.45,
      "proc_detail": 1.34,
      "proc_density": 4.8,
      "proc_seed": 0.42,
      "proc_angle_bias": 0.36,
      "proc_phase_speed": 0.86,
      "proc_rotation_speed": 0.28,
      "proc_flow_speed": 0.62,
      "proc_spiral_twist": 0.18,
      "proc_palette": 0
    },
    "minChanged": 0.00035
  },
  {
    "name": "Voronoi Amber Cells",
    "values": {
      "proc_mode": 2,
      "proc_scale": 2.75,
      "proc_detail": 1.26,
      "proc_density": 6.2,
      "proc_seed": 0.31,
      "proc_metric": 1.15,
      "proc_jitter": 0.72,
      "proc_jitter_speed": 0.8,
      "proc_phase_speed": 0.7,
      "proc_warp": 0.14,
      "proc_palette": 1,
      "proc_edge_width": 0.62
    },
    "minChanged": 0.00035
  },
  {
    "name": "Quasicrystal Glass",
    "values": {
      "proc_mode": 3,
      "proc_scale": 2.95,
      "proc_detail": 1.42,
      "proc_density": 5.4,
      "proc_seed": 0.58,
      "proc_angle_bias": -0.3,
      "proc_phase_speed": 0.82,
      "proc_rotation_speed": 0.34,
      "proc_warp": 0.12,
      "proc_palette": 4,
      "proc_glow": 0.82
    },
    "minChanged": 0.00035
  },
  {
    "name": "Moire Lattice Push",
    "values": {
      "proc_mode": 4,
      "proc_scale": 2.55,
      "proc_detail": 1.3,
      "proc_density": 6.6,
      "proc_seed": 0.64,
      "proc_angle_bias": 0.44,
      "proc_phase_speed": 0.66,
      "proc_rotation_speed": 0.6,
      "proc_radial_pull": 0.24,
      "proc_palette": 2,
      "proc_edge_width": 0.54
    },
    "minChanged": 0.00035
  },
  {
    "name": "Spirograph Neon Trails",
    "values": {
      "proc_mode": 5,
      "proc_scale": 2.15,
      "proc_detail": 1.42,
      "proc_density": 5,
      "proc_seed": 0.22,
      "proc_phase_speed": 0.9,
      "proc_rotation_speed": 0.52,
      "proc_zoom_pulse": 0.18,
      "proc_palette": 0,
      "proc_glow": 1.22
    },
    "minChanged": 0.00035
  },
  {
    "name": "Tunnel Ring Hymn",
    "values": {
      "proc_mode": 6,
      "proc_scale": 2.7,
      "proc_detail": 1.24,
      "proc_density": 6.4,
      "proc_seed": 0.48,
      "proc_phase_speed": 1.04,
      "proc_rotation_speed": 0.44,
      "proc_radial_pull": 0.54,
      "proc_spiral_twist": 0.4,
      "proc_palette": 3,
      "proc_brightness": 1.12
    },
    "minChanged": 0.00035
  },
  {
    "name": "Flow fBM Wall",
    "values": {
      "proc_mode": 7,
      "proc_scale": 2.35,
      "proc_detail": 1.5,
      "proc_density": 5.2,
      "proc_seed": 0.73,
      "proc_phase_speed": 0.72,
      "proc_flow_speed": 0.94,
      "proc_warp": 0.36,
      "proc_warp_frequency": 2.8,
      "proc_palette": 4,
      "proc_glow": 0.78
    },
    "minChanged": 0.00035
  },
  {
    "name": "Lissajous Weave",
    "values": {
      "proc_mode": 8,
      "proc_scale": 2.25,
      "proc_detail": 1.28,
      "proc_density": 4.8,
      "proc_seed": 0.37,
      "proc_angle_bias": -0.22,
      "proc_phase_speed": 0.84,
      "proc_rotation_speed": 0.32,
      "proc_warp": 0.1,
      "proc_palette": 2,
      "proc_edge_width": 0.48
    },
    "minChanged": 0.00035
  },
  {
    "name": "Sine Interference Halo",
    "values": {
      "proc_mode": 9,
      "proc_scale": 2.65,
      "proc_detail": 1.36,
      "proc_density": 5.6,
      "proc_seed": 0.82,
      "proc_phase_speed": 0.96,
      "proc_flow_speed": 0.7,
      "proc_jitter": 0.34,
      "proc_radial_pull": 0.18,
      "proc_palette": 1,
      "proc_brightness": 1.18
    },
    "minChanged": 0.00035
  }
]
```

</details>

## IFS / L-System Lab

IFS, chaos-game and L-system fractals drawn as glowing lines with motion trails, over space, nebula or paper backgrounds

Effect ID: `ifs_lsystem_lab`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Fern Canopy Drift · Sierpinski Rain · Dragon Ink · Levy Fold · Koch Curve Bloom · Koch Snow Bloom · Arrowhead Pulse · Binary Tree Sway · Fern Branch Bloom · Fractal Plant Breeze · Hilbert Neon · Gosper Ink Paper · Maple Leaf Autumn · Golden Spiral Galaxy.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| IFS Mode · `ifs_mode` | Barnsley Fern (0) | Barnsley Fern; Sierpinski Chaos Game; Heighway Dragon; Levy C Curve; Koch Curve; Koch Snowflake; Sierpinski Arrowhead; Binary Tree; Fern Canopy; Fractal Plant; Hilbert Curve; Gosper Flowsnake; Sierpinski Square Curve; Maple Leaf IFS; Golden Spiral IFS; Crystal IFS | — |
| Depth · `ifs_depth` | 8 | 1 to 12 | 1 |
| Growth · `ifs_growth` | 0.86 | 0 to 1 | 0.02 |
| Point Count · `ifs_point_count` | 16000 | 500 to 30000 | 250 |
| Line Width · `ifs_thickness` | 2.6 | 0.4 to 12 | 0.1 |

### Shape

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Angle · `ifs_angle` | 48 | 10 to 88 | 1 |
| Spread · `ifs_spread` | 1 | 0 to 2 | 0.05 |
| Lean · `ifs_lean` | 0 | -1.5 to 1.5 | 0.05 |
| Curl · `ifs_curl` | 0.18 | -2 to 2 | 0.05 |
| Branch Scale · `ifs_branch_scale` | 0.68 | 0.45 to 0.88 | 0.01 |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Motion Rate · `ifs_motion_rate` | 1 | 0 to 12 | 0.05 |
| Growth Speed · `ifs_growth_speed` | 0.62 | -16 to 16 | 0.1 |
| Sway · `ifs_sway` | 0.32 | 0 to 2 | 0.05 |
| Sway Speed · `ifs_sway_speed` | 0.58 | -16 to 16 | 0.1 |
| Roll Speed · `ifs_roll_speed` | 0.22 | -16 to 16 | 0.1 |
| Zoom Speed · `ifs_zoom_speed` | 0.28 | -16 to 16 | 0.1 |
| Trails · `ifs_trails` | 0.6 | 0 to 0.97 | 0.01 |

### View

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Zoom · `ifs_zoom` | 0.92 | 0.1 to 8 | 0.05 |
| Pan X · `ifs_pan_x` | 0 | -2 to 2 | 0.02 |
| Pan Y · `ifs_pan_y` | 0 | -2 to 2 | 0.02 |
| Rotation · `ifs_rotation` | 0 | -3.14159 to 3.14159 | 0.02 |

### Color

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Background · `ifs_background` | Deep Space (0) | Deep Space; Black; Nebula Glow; Palette Haze; Ink on Paper | — |
| Palette · `ifs_palette` | Neon Ink (0) | Neon Ink; Fern Gold; Cobalt Rose; Violet Ice; Aqua Coral; Hot Orchid; Lime Ultraviolet; Deep Cyan; + [71 shared palettes](Palette-Reference.md) | — |
| Color Speed · `ifs_color_speed` | 0.62 | 0 to 32 | 0.1 |
| Glow · `ifs_glow` | 1.35 | 0 to 2.5 | 0.05 |
| Intensity · `ifs_fade` | 1.1 | 0.08 to 1.5 | 0.05 |
| Exposure · `ifs_exposure` | 1.4 | 0.2 to 4 | 0.05 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Fern Canopy Drift",
    "values": {
      "ifs_mode": 0,
      "ifs_depth": 8,
      "ifs_growth": 0.92,
      "ifs_point_count": 16000,
      "ifs_thickness": 2.6,
      "ifs_sway": 0.44,
      "ifs_sway_speed": 0.72,
      "ifs_zoom": 0.92,
      "ifs_palette": 1,
      "ifs_glow": 1.1,
      "ifs_trails": 0.8
    },
    "minChanged": 0.00035
  },
  {
    "name": "Sierpinski Rain",
    "values": {
      "ifs_mode": 1,
      "ifs_depth": 7,
      "ifs_growth": 0.96,
      "ifs_point_count": 16000,
      "ifs_thickness": 2.4,
      "ifs_roll_speed": 0.28,
      "ifs_zoom": 0.96,
      "ifs_palette": 4,
      "ifs_fade": 1.1,
      "ifs_trails": 0.85
    },
    "minChanged": 0.00035
  },
  {
    "name": "Dragon Ink",
    "values": {
      "ifs_mode": 2,
      "ifs_depth": 12,
      "ifs_growth": 0.86,
      "ifs_thickness": 2.1,
      "ifs_angle": 72,
      "ifs_curl": 0.32,
      "ifs_growth_speed": 0.7,
      "ifs_roll_speed": 0.22,
      "ifs_zoom": 0.86,
      "ifs_palette": 0
    },
    "minChanged": 0.00035
  },
  {
    "name": "Levy Fold",
    "values": {
      "ifs_mode": 3,
      "ifs_depth": 12,
      "ifs_growth": 0.82,
      "ifs_thickness": 2,
      "ifs_angle": 45,
      "ifs_curl": -0.2,
      "ifs_growth_speed": 0.78,
      "ifs_sway": 0.2,
      "ifs_zoom": 0.8,
      "ifs_palette": 2
    },
    "minChanged": 0.00035
  },
  {
    "name": "Koch Curve Bloom",
    "values": {
      "ifs_mode": 4,
      "ifs_depth": 6,
      "ifs_growth": 0.88,
      "ifs_thickness": 2.4,
      "ifs_angle": 60,
      "ifs_growth_speed": 0.64,
      "ifs_sway": 0.16,
      "ifs_zoom": 0.84,
      "ifs_palette": 1,
      "ifs_glow": 1.16
    },
    "minChanged": 0.00035
  },
  {
    "name": "Koch Snow Bloom",
    "values": {
      "ifs_mode": 5,
      "ifs_depth": 5,
      "ifs_growth": 0.88,
      "ifs_thickness": 2.4,
      "ifs_angle": 60,
      "ifs_growth_speed": 0.62,
      "ifs_roll_speed": 0.18,
      "ifs_zoom": 0.8,
      "ifs_palette": 3,
      "ifs_glow": 1.22
    },
    "minChanged": 0.00035
  },
  {
    "name": "Arrowhead Pulse",
    "values": {
      "ifs_mode": 6,
      "ifs_depth": 8,
      "ifs_growth": 0.84,
      "ifs_thickness": 2.2,
      "ifs_angle": 60,
      "ifs_growth_speed": 0.86,
      "ifs_sway": 0.26,
      "ifs_zoom": 0.86,
      "ifs_palette": 4
    },
    "minChanged": 0.00035
  },
  {
    "name": "Binary Tree Sway",
    "values": {
      "ifs_mode": 7,
      "ifs_depth": 10,
      "ifs_growth": 0.86,
      "ifs_thickness": 3,
      "ifs_angle": 36,
      "ifs_spread": 1.35,
      "ifs_lean": 0.18,
      "ifs_branch_scale": 0.72,
      "ifs_sway": 0.64,
      "ifs_sway_speed": 0.84,
      "ifs_zoom": 0.96,
      "ifs_palette": 1
    },
    "minChanged": 0.00035
  },
  {
    "name": "Fern Branch Bloom",
    "values": {
      "ifs_mode": 8,
      "ifs_depth": 9,
      "ifs_growth": 0.88,
      "ifs_thickness": 2.6,
      "ifs_angle": 34,
      "ifs_spread": 1.18,
      "ifs_lean": -0.12,
      "ifs_curl": 0.4,
      "ifs_branch_scale": 0.7,
      "ifs_growth_speed": 0.72,
      "ifs_sway": 0.52,
      "ifs_zoom": 0.92,
      "ifs_palette": 0
    },
    "minChanged": 0.00035
  },
  {
    "name": "Fractal Plant Breeze",
    "values": {
      "ifs_mode": 9,
      "ifs_depth": 6,
      "ifs_growth": 0.9,
      "ifs_thickness": 1.8,
      "ifs_angle": 46,
      "ifs_sway": 0.6,
      "ifs_sway_speed": 0.9,
      "ifs_zoom": 0.95,
      "ifs_palette": 1,
      "ifs_background": 2,
      "ifs_trails": 0.5
    },
    "minChanged": 0.00035
  },
  {
    "name": "Hilbert Neon",
    "values": {
      "ifs_mode": 10,
      "ifs_depth": 6,
      "ifs_growth": 0.95,
      "ifs_thickness": 2.4,
      "ifs_growth_speed": 0.5,
      "ifs_roll_speed": 0.15,
      "ifs_zoom": 0.9,
      "ifs_palette": 14,
      "ifs_background": 0
    },
    "minChanged": 0.00035
  },
  {
    "name": "Gosper Ink Paper",
    "values": {
      "ifs_mode": 11,
      "ifs_depth": 4,
      "ifs_growth": 0.95,
      "ifs_thickness": 1.6,
      "ifs_growth_speed": 0.4,
      "ifs_zoom": 0.9,
      "ifs_palette": 3,
      "ifs_background": 4,
      "ifs_trails": 0.2
    },
    "minChanged": 0.00035
  },
  {
    "name": "Maple Leaf Autumn",
    "values": {
      "ifs_mode": 13,
      "ifs_point_count": 22000,
      "ifs_thickness": 2.2,
      "ifs_sway": 0.3,
      "ifs_zoom": 0.95,
      "ifs_palette": 50,
      "ifs_background": 2,
      "ifs_trails": 0.88
    },
    "minChanged": 0.00035
  },
  {
    "name": "Golden Spiral Galaxy",
    "values": {
      "ifs_mode": 14,
      "ifs_point_count": 22000,
      "ifs_thickness": 2,
      "ifs_roll_speed": 0.4,
      "ifs_zoom": 0.9,
      "ifs_palette": 54,
      "ifs_background": 0,
      "ifs_trails": 0.9
    },
    "minChanged": 0.00035
  }
]
```

</details>

## Fractal Flame Lab

Stateless fractal-flame variation lab with swirl, spherical, Julia, PDJ, rings, popcorn, and mandala modes

Effect ID: `fractal_flame_lab`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Swirl Spiral Bloom · Spherical Ember Cloud · Julia Veil Glass · Mandala Bloom Wheel · Lace Arch Lantern · Starburst Ray Choir · PDJ Chaos Silk · Gaussian Mist Flame · Radial Streak Crown · Rings Orbit Flame · Popcorn Texture Bloom.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flame Mode · `flame_mode` | Swirl Spiral (0) | Swirl Spiral; Spherical Cloud; Julia Veil; Mandala Bloom; Lace Arches; Starburst Rays; PDJ Chaos; Gaussian Cloud; Radial Streaks; Rings; Popcorn Texture | — |
| Variation A · `flame_variation_a` | Swirl (3) | Linear; Sinusoidal; Spherical; Swirl; Horseshoe; Polar; Handkerchief; Heart; Disc; Spiral; Julia; Popcorn; Rings; PDJ | — |
| Variation B · `flame_variation_b` | Spherical (2) | Linear; Sinusoidal; Spherical; Swirl; Horseshoe; Polar; Handkerchief; Heart; Disc; Spiral; Julia; Popcorn; Rings; PDJ | — |
| Variation Blend · `flame_variation_blend` | 0.44 | 0 to 1 | 0.02 |
| Symmetry · `flame_symmetry` | 6 | 1 to 16 | 1 |

### Shape

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Plot Scale · `flame_plot_scale` | 1.68 | 0.2 to 6 | 0.05 |
| Plot Rotate · `flame_plot_rotate` | 0 | -3.14159 to 3.14159 | 0.02 |
| Plot Offset X · `flame_plot_offset_x` | 0 | -2 to 2 | 0.02 |
| Plot Offset Y · `flame_plot_offset_y` | 0 | -2 to 2 | 0.02 |
| Structure Scale · `flame_struct_scale` | 1.12 | 0.25 to 4 | 0.03 |
| Structure Shear · `flame_struct_shear` | 0.1 | -1.5 to 1.5 | 0.02 |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Orbit Speed · `flame_orbit_speed` | 0.92 | -8 to 8 | 0.05 |
| Variation Speed · `flame_variation_speed` | 0.74 | -8 to 8 | 0.05 |
| Symmetry Pulse · `flame_symmetry_pulse` | 0.44 | 0 to 3 | 0.05 |
| Final Blend · `flame_final_blend` | 0.48 | 0 to 1 | 0.02 |

### Color

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Palette · `flame_palette` | Neon Flame (0) | Neon Flame; Amber Opal; Cobalt Rose; Violet Gold; Aqua Coral; + [71 shared palettes](Palette-Reference.md) | — |
| Density · `flame_density` | 1.28 | 0.1 to 4 | 0.05 |
| Gamma · `flame_gamma` | 0.95 | 0.45 to 2.5 | 0.03 |
| Exposure · `flame_exposure` | 1.4 | 0.2 to 5 | 0.05 |
| Color Speed · `flame_color_speed` | 0.72 | -8 to 8 | 0.05 |
| Glow · `flame_glow` | 1.16 | 0 to 3 | 0.05 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Swirl Spiral Bloom",
    "values": {
      "flame_mode": 0,
      "flame_variation_a": 3,
      "flame_variation_b": 9,
      "flame_variation_blend": 0.42,
      "flame_symmetry": 5,
      "flame_plot_scale": 1.68,
      "flame_struct_scale": 1.16,
      "flame_struct_shear": 0.18,
      "flame_orbit_speed": 1.1,
      "flame_variation_speed": 0.72,
      "flame_symmetry_pulse": 0.44,
      "flame_final_blend": 0.36,
      "flame_palette": 0,
      "flame_density": 1.26,
      "flame_exposure": 1.36,
      "flame_glow": 1.18
    },
    "minChanged": 0.00035
  },
  {
    "name": "Spherical Ember Cloud",
    "values": {
      "flame_mode": 1,
      "flame_variation_a": 2,
      "flame_variation_b": 1,
      "flame_variation_blend": 0.56,
      "flame_symmetry": 4,
      "flame_plot_scale": 1.92,
      "flame_struct_scale": 0.94,
      "flame_struct_shear": -0.1,
      "flame_orbit_speed": 0.86,
      "flame_variation_speed": 0.62,
      "flame_symmetry_pulse": 0.24,
      "flame_final_blend": 0.48,
      "flame_palette": 1,
      "flame_density": 1.42,
      "flame_gamma": 0.92,
      "flame_exposure": 1.48,
      "flame_glow": 1.24
    },
    "minChanged": 0.00035
  },
  {
    "name": "Julia Veil Glass",
    "values": {
      "flame_mode": 2,
      "flame_variation_a": 10,
      "flame_variation_b": 3,
      "flame_variation_blend": 0.34,
      "flame_symmetry": 6,
      "flame_plot_scale": 1.58,
      "flame_plot_rotate": 0.24,
      "flame_struct_scale": 1.08,
      "flame_orbit_speed": 0.94,
      "flame_variation_speed": 0.88,
      "flame_symmetry_pulse": 0.52,
      "flame_final_blend": 0.62,
      "flame_palette": 4,
      "flame_density": 1.18,
      "flame_exposure": 1.42,
      "flame_color_speed": 0.88,
      "flame_glow": 1.08
    },
    "minChanged": 0.00035
  },
  {
    "name": "Mandala Bloom Wheel",
    "values": {
      "flame_mode": 3,
      "flame_variation_a": 8,
      "flame_variation_b": 7,
      "flame_variation_blend": 0.46,
      "flame_symmetry": 9,
      "flame_plot_scale": 1.74,
      "flame_struct_scale": 1.2,
      "flame_struct_shear": 0.05,
      "flame_orbit_speed": 0.72,
      "flame_variation_speed": 0.78,
      "flame_symmetry_pulse": 0.78,
      "flame_final_blend": 0.42,
      "flame_palette": 3,
      "flame_density": 1.34,
      "flame_exposure": 1.3,
      "flame_glow": 1.2
    },
    "minChanged": 0.00035
  },
  {
    "name": "Lace Arch Lantern",
    "values": {
      "flame_mode": 4,
      "flame_variation_a": 4,
      "flame_variation_b": 5,
      "flame_variation_blend": 0.52,
      "flame_symmetry": 7,
      "flame_plot_scale": 1.86,
      "flame_plot_offset_y": -0.08,
      "flame_struct_scale": 1.1,
      "flame_struct_shear": 0.28,
      "flame_orbit_speed": 0.82,
      "flame_variation_speed": 0.58,
      "flame_symmetry_pulse": 0.36,
      "flame_final_blend": 0.54,
      "flame_palette": 2,
      "flame_density": 1.3,
      "flame_exposure": 1.44,
      "flame_glow": 1.16
    },
    "minChanged": 0.00035
  },
  {
    "name": "Starburst Ray Choir",
    "values": {
      "flame_mode": 5,
      "flame_variation_a": 8,
      "flame_variation_b": 12,
      "flame_variation_blend": 0.38,
      "flame_symmetry": 11,
      "flame_plot_scale": 1.62,
      "flame_struct_scale": 1.26,
      "flame_struct_shear": -0.06,
      "flame_orbit_speed": 1.18,
      "flame_variation_speed": 0.92,
      "flame_symmetry_pulse": 0.62,
      "flame_final_blend": 0.34,
      "flame_palette": 1,
      "flame_density": 1.24,
      "flame_exposure": 1.38,
      "flame_color_speed": 0.76,
      "flame_glow": 1.3
    },
    "minChanged": 0.00035
  },
  {
    "name": "PDJ Chaos Silk",
    "values": {
      "flame_mode": 6,
      "flame_variation_a": 13,
      "flame_variation_b": 3,
      "flame_variation_blend": 0.5,
      "flame_symmetry": 5,
      "flame_plot_scale": 1.46,
      "flame_plot_rotate": -0.16,
      "flame_struct_scale": 1.18,
      "flame_struct_shear": 0.12,
      "flame_orbit_speed": 0.96,
      "flame_variation_speed": 1.04,
      "flame_symmetry_pulse": 0.42,
      "flame_final_blend": 0.58,
      "flame_palette": 4,
      "flame_density": 1.36,
      "flame_exposure": 1.52,
      "flame_color_speed": 0.82,
      "flame_glow": 1.22
    },
    "minChanged": 0.00035
  },
  {
    "name": "Gaussian Mist Flame",
    "values": {
      "flame_mode": 7,
      "flame_variation_a": 1,
      "flame_variation_b": 2,
      "flame_variation_blend": 0.44,
      "flame_symmetry": 6,
      "flame_plot_scale": 1.72,
      "flame_struct_scale": 0.98,
      "flame_struct_shear": 0.16,
      "flame_orbit_speed": 0.68,
      "flame_variation_speed": 0.74,
      "flame_symmetry_pulse": 0.3,
      "flame_final_blend": 0.66,
      "flame_palette": 0,
      "flame_density": 1.54,
      "flame_gamma": 0.86,
      "flame_exposure": 1.58,
      "flame_glow": 1.36
    },
    "minChanged": 0.00035
  },
  {
    "name": "Radial Streak Crown",
    "values": {
      "flame_mode": 8,
      "flame_variation_a": 8,
      "flame_variation_b": 9,
      "flame_variation_blend": 0.48,
      "flame_symmetry": 12,
      "flame_plot_scale": 1.58,
      "flame_struct_scale": 1.22,
      "flame_struct_shear": -0.18,
      "flame_orbit_speed": 1.08,
      "flame_variation_speed": 0.86,
      "flame_symmetry_pulse": 0.74,
      "flame_final_blend": 0.4,
      "flame_palette": 3,
      "flame_density": 1.26,
      "flame_exposure": 1.4,
      "flame_glow": 1.24
    },
    "minChanged": 0.00035
  },
  {
    "name": "Rings Orbit Flame",
    "values": {
      "flame_mode": 9,
      "flame_variation_a": 12,
      "flame_variation_b": 6,
      "flame_variation_blend": 0.54,
      "flame_symmetry": 8,
      "flame_plot_scale": 1.76,
      "flame_struct_scale": 1.12,
      "flame_struct_shear": 0.1,
      "flame_orbit_speed": 0.88,
      "flame_variation_speed": 0.68,
      "flame_symmetry_pulse": 0.54,
      "flame_final_blend": 0.5,
      "flame_palette": 2,
      "flame_density": 1.32,
      "flame_exposure": 1.46,
      "flame_color_speed": 0.7,
      "flame_glow": 1.18
    },
    "minChanged": 0.00035
  },
  {
    "name": "Popcorn Texture Bloom",
    "values": {
      "flame_mode": 10,
      "flame_variation_a": 11,
      "flame_variation_b": 13,
      "flame_variation_blend": 0.46,
      "flame_symmetry": 6,
      "flame_plot_scale": 1.52,
      "flame_struct_scale": 1.1,
      "flame_struct_shear": 0.2,
      "flame_orbit_speed": 0.98,
      "flame_variation_speed": 1.1,
      "flame_symmetry_pulse": 0.48,
      "flame_final_blend": 0.56,
      "flame_palette": 1,
      "flame_density": 1.38,
      "flame_gamma": 0.9,
      "flame_exposure": 1.5,
      "flame_color_speed": 0.88,
      "flame_glow": 1.28
    },
    "minChanged": 0.00035
  }
]
```

</details>

## Buddhabrot Lab

Progressive worker-accumulated Buddhabrot, Anti-Buddhabrot, and Nebulabrot density renderer

Effect ID: `buddhabrot_lab`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Buddha Nebula Gate · Anti-Buddha Interior · Nebulabrot RGB Cloud · Orbit Window Drift · Deep Filament Bloom.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Buddha Mode · `buddha_mode` | Buddhabrot (0) | Buddhabrot; Anti-Buddhabrot; Nebulabrot | — |
| Sample Scale · `buddha_sample_scale` | 1 | 0.35 to 3.5 | 0.05 |
| Min Iter · `buddha_min_iter` | 8 | 1 to 400 | 1 |
| Max Iter · `buddha_max_iter` | 180 | 16 to 800 | 1 |
| Orbit Batch · `buddha_orbit_batch` | 16000 | 500 to 60000 | 500 |

### Render

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Render Scale · `buddha_render_scale` | 0.72 | 0.25 to 1 | 0.02 |
| Sharpness · `buddha_sharpness` | 0.28 | 0 to 1.5 | 0.03 |

### Window

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| X Min · `buddha_x_min` | -2.2 | -4 to 4 | 0.01 |
| X Max · `buddha_x_max` | 1.15 | -4 to 4 | 0.01 |
| Y Min · `buddha_y_min` | -1.35 | -4 to 4 | 0.01 |
| Y Max · `buddha_y_max` | 1.35 | -4 to 4 | 0.01 |
| Window Drift · `buddha_window_drift` | 0.12 | 0 to 1.5 | 0.02 |
| Window Zoom Speed · `buddha_window_zoom_speed` | 0 | -6 to 6 | 0.05 |

### Nebula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Slow Bucket · `buddha_slow_bucket` | 160 | 16 to 800 | 1 |
| Mid Bucket · `buddha_mid_bucket` | 55 | 8 to 700 | 1 |
| Density Curve · `buddha_density_curve` | 0.86 | 0.25 to 3 | 0.03 |
| Channel Gain · `buddha_channel_gain` | 1.15 | 0.1 to 4 | 0.05 |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Sample Motion · `buddha_sample_motion` | 0.7 | 0 to 2 | 0.05 |
| Drift Speed · `buddha_drift_speed` | 0.52 | -6 to 6 | 0.05 |
| Motion Persistence · `buddha_accumulation_decay` | 0.965 | 0.82 to 1 | 0.001 |

### Color

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Palette · `buddha_palette` | Amber Spirit (1) | Neon Orbit; Amber Spirit; Cobalt Rose; Violet Gold; Aqua Nebula | — |
| Color Speed · `buddha_color_speed` | 0.35 | -8 to 8 | 0.05 |
| Exposure · `buddha_exposure` | 2 | 0.1 to 8 | 0.05 |
| Gamma · `buddha_gamma` | 0.82 | 0.25 to 3 | 0.03 |
| Glow · `buddha_glow` | 1.1 | 0 to 4 | 0.05 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Buddha Nebula Gate",
    "values": {
      "buddha_mode": 0,
      "buddha_sample_scale": 1,
      "buddha_min_iter": 8,
      "buddha_max_iter": 180,
      "buddha_orbit_batch": 18000,
      "buddha_x_min": -2.2,
      "buddha_x_max": 1.15,
      "buddha_y_min": -1.35,
      "buddha_y_max": 1.35,
      "buddha_sample_motion": 0.8,
      "buddha_palette": 1,
      "buddha_exposure": 2.1,
      "buddha_gamma": 0.82,
      "buddha_glow": 1.2
    },
    "minChanged": 0.00035
  },
  {
    "name": "Anti-Buddha Interior",
    "values": {
      "buddha_mode": 1,
      "buddha_sample_scale": 0.82,
      "buddha_min_iter": 40,
      "buddha_max_iter": 220,
      "buddha_orbit_batch": 16000,
      "buddha_x_min": -1.55,
      "buddha_x_max": 0.55,
      "buddha_y_min": -1.05,
      "buddha_y_max": 1.05,
      "buddha_window_drift": 0.18,
      "buddha_sample_motion": 0.72,
      "buddha_palette": 3,
      "buddha_exposure": 2.4,
      "buddha_gamma": 0.78,
      "buddha_channel_gain": 1.35,
      "buddha_glow": 1.35
    },
    "minChanged": 0.00035
  },
  {
    "name": "Nebulabrot RGB Cloud",
    "values": {
      "buddha_mode": 2,
      "buddha_sample_scale": 1,
      "buddha_min_iter": 6,
      "buddha_max_iter": 260,
      "buddha_orbit_batch": 18000,
      "buddha_x_min": -2.2,
      "buddha_x_max": 1.1,
      "buddha_y_min": -1.4,
      "buddha_y_max": 1.4,
      "buddha_slow_bucket": 160,
      "buddha_mid_bucket": 55,
      "buddha_density_curve": 0.78,
      "buddha_channel_gain": 1.35,
      "buddha_palette": 4,
      "buddha_exposure": 2,
      "buddha_gamma": 0.84,
      "buddha_color_speed": 0.45,
      "buddha_glow": 1.2
    },
    "minChanged": 0.00035
  },
  {
    "name": "Orbit Window Drift",
    "values": {
      "buddha_mode": 0,
      "buddha_sample_scale": 0.72,
      "buddha_min_iter": 14,
      "buddha_max_iter": 220,
      "buddha_orbit_batch": 15000,
      "buddha_x_min": -1.88,
      "buddha_x_max": -0.18,
      "buddha_y_min": -0.86,
      "buddha_y_max": 0.86,
      "buddha_window_drift": 0.42,
      "buddha_window_zoom_speed": 0.62,
      "buddha_sample_motion": 1,
      "buddha_drift_speed": 0.74,
      "buddha_palette": 2,
      "buddha_exposure": 2.35,
      "buddha_gamma": 0.8,
      "buddha_glow": 1.32
    },
    "minChanged": 0.00035
  },
  {
    "name": "Deep Filament Bloom",
    "values": {
      "buddha_mode": 2,
      "buddha_sample_scale": 0.58,
      "buddha_min_iter": 18,
      "buddha_max_iter": 320,
      "buddha_orbit_batch": 14000,
      "buddha_x_min": -1.18,
      "buddha_x_max": -0.42,
      "buddha_y_min": -0.36,
      "buddha_y_max": 0.36,
      "buddha_slow_bucket": 220,
      "buddha_mid_bucket": 90,
      "buddha_density_curve": 0.7,
      "buddha_channel_gain": 1.55,
      "buddha_sample_motion": 0.84,
      "buddha_palette": 0,
      "buddha_exposure": 2.8,
      "buddha_gamma": 0.76,
      "buddha_glow": 1.45
    },
    "minChanged": 0.00035
  }
]
```

</details>

## Attractor Density Lab

Progressive worker-accumulated strange attractor and chaotic-map density renderer

Effect ID: `attractor_density_lab`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Lorenz Glow · De Jong Bloom · Clifford Lace · Ikeda Spiral · Sprott Ink · Aizawa Flower · Chua Circuit · Standard Map Web.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Attractor Mode · `attractor_mode` | Lorenz (0) | Lorenz; Rossler; Chen; Sprott A; Sprott B; Sprott C; Sprott S; Thomas; Aizawa; Halvorsen; Pickover; De Jong; Clifford; Henon; Ikeda; Standard Map; Duffing; Newton-Leipnik; Rabinovich-Fabrikant; Chua; TSUCS-1 | — |
| Steps · `attractor_steps` | 420 | 80 to 1800 | 20 |
| Step Scale · `attractor_dt` | 1 | 0.05 to 4 | 0.05 |
| Const A Bias · `attractor_constant_a` | 0 | -1.5 to 1.5 | 0.01 |
| Const B Bias · `attractor_constant_b` | 0 | -1.5 to 1.5 | 0.01 |
| Const C Bias · `attractor_constant_c` | 0 | -1.5 to 1.5 | 0.01 |
| Const D Bias · `attractor_constant_d` | 0 | -1.5 to 1.5 | 0.01 |
| Const Motion · `attractor_constant_motion` | 0.38 | 0 to 2.5 | 0.02 |

### Projection

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Projection · `attractor_projection` | Orbit Camera (3) | XY Plane; XZ Plane; YZ Plane; Orbit Camera; Kaleido Fold | — |
| Projection Mix · `attractor_projection_mix` | 0.36 | 0 to 1 | 0.02 |
| Depth Mix · `attractor_depth_mix` | 0.22 | -1 to 1 | 0.02 |
| Scale · `attractor_scale` | 1.12 | 0.25 to 4 | 0.03 |
| Rotation · `attractor_rotation` | 0 | -3.14159 to 3.14159 | 0.02 |
| Zoom · `attractor_zoom` | 1.1 | 0.05 to 8 | 0.03 |

### Render

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Trail Width · `attractor_trail_width` | 0.82 | 0.35 to 3.5 | 0.05 |
| Density Curve · `attractor_density_curve` | 0.72 | 0.35 to 2.8 | 0.03 |
| Batch Size · `attractor_batch_size` | 144 | 16 to 900 | 8 |
| Render Scale · `attractor_render_scale` | 0.7 | 0.25 to 1 | 0.02 |
| Sharpness · `attractor_sharpness` | 0.25 | 0 to 1.5 | 0.03 |
| Motion Persistence · `attractor_fade` | 0.965 | 0.82 to 1 | 0.001 |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Motion Rate · `attractor_motion_rate` | 1 | 0 to 12 | 0.05 |
| Orbit Speed · `attractor_orbit_speed` | 0.84 | -24 to 24 | 0.1 |
| Projection Speed · `attractor_projection_speed` | 0.5 | -24 to 24 | 0.1 |
| Const Drift · `attractor_constant_drift` | 0.52 | -24 to 24 | 0.1 |
| Camera Orbit · `attractor_camera_orbit` | 0.36 | -8 to 8 | 0.05 |

### Color

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Palette · `attractor_palette` | Electric Amber (0) | Electric Amber; Cobalt Bloom; Violet Circuit; Solar Ice; Ruby Mint | — |
| Color Phase · `attractor_color_phase` | 0.12 | 0 to 1 | 0.02 |
| Color Speed · `attractor_color_speed` | 0.64 | -32 to 32 | 0.1 |
| Glow · `attractor_glow` | 1.58 | 0 to 4 | 0.05 |
| Exposure · `attractor_exposure` | 2.65 | 0.1 to 8 | 0.05 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Lorenz Glow",
    "values": {
      "attractor_mode": 0,
      "attractor_steps": 420,
      "attractor_dt": 1,
      "attractor_projection": 3,
      "attractor_projection_mix": 0.42,
      "attractor_depth_mix": 0.24,
      "attractor_scale": 1.1,
      "attractor_zoom": 1.05,
      "attractor_trail_width": 0.9,
      "attractor_batch_size": 110,
      "attractor_orbit_speed": 1.2,
      "attractor_projection_speed": 0.7,
      "attractor_camera_orbit": 0.42,
      "attractor_palette": 0,
      "attractor_color_speed": 0.6,
      "attractor_glow": 1.25,
      "attractor_exposure": 2
    },
    "minChanged": 0.00035
  },
  {
    "name": "De Jong Bloom",
    "values": {
      "attractor_mode": 11,
      "attractor_steps": 620,
      "attractor_projection": 0,
      "attractor_projection_mix": 0.18,
      "attractor_scale": 1.36,
      "attractor_zoom": 1.12,
      "attractor_trail_width": 0.72,
      "attractor_batch_size": 100,
      "attractor_constant_a": 0.2,
      "attractor_constant_b": -0.12,
      "attractor_constant_c": 0.1,
      "attractor_constant_d": 0.08,
      "attractor_constant_motion": 0.45,
      "attractor_constant_drift": 0.6,
      "attractor_palette": 3,
      "attractor_color_phase": 0.18,
      "attractor_color_speed": 0.92,
      "attractor_glow": 1.4,
      "attractor_exposure": 2.35
    },
    "minChanged": 0.00035
  },
  {
    "name": "Clifford Lace",
    "values": {
      "attractor_mode": 12,
      "attractor_steps": 680,
      "attractor_projection": 4,
      "attractor_projection_mix": 0.34,
      "attractor_depth_mix": 0.16,
      "attractor_scale": 1.45,
      "attractor_zoom": 1.18,
      "attractor_trail_width": 0.65,
      "attractor_batch_size": 94,
      "attractor_constant_a": -0.1,
      "attractor_constant_b": 0.14,
      "attractor_constant_c": 0.1,
      "attractor_constant_d": -0.06,
      "attractor_constant_motion": 0.5,
      "attractor_projection_speed": 0.82,
      "attractor_palette": 2,
      "attractor_color_phase": 0.36,
      "attractor_color_speed": 0.72,
      "attractor_glow": 1.48,
      "attractor_exposure": 2.4
    },
    "minChanged": 0.00035
  },
  {
    "name": "Ikeda Spiral",
    "values": {
      "attractor_mode": 14,
      "attractor_steps": 760,
      "attractor_projection": 0,
      "attractor_projection_mix": 0.2,
      "attractor_depth_mix": 0.12,
      "attractor_scale": 1.18,
      "attractor_zoom": 1.2,
      "attractor_trail_width": 0.7,
      "attractor_batch_size": 86,
      "attractor_constant_a": 0.08,
      "attractor_constant_b": 0.12,
      "attractor_constant_c": -0.08,
      "attractor_constant_motion": 0.35,
      "attractor_orbit_speed": 0.84,
      "attractor_palette": 1,
      "attractor_color_phase": 0.22,
      "attractor_color_speed": 0.8,
      "attractor_glow": 1.35,
      "attractor_exposure": 2.15
    },
    "minChanged": 0.00035
  },
  {
    "name": "Sprott Ink",
    "values": {
      "attractor_mode": 3,
      "attractor_steps": 520,
      "attractor_dt": 1.1,
      "attractor_projection": 1,
      "attractor_projection_mix": 0.38,
      "attractor_depth_mix": 0.3,
      "attractor_scale": 1.22,
      "attractor_zoom": 1.16,
      "attractor_trail_width": 0.85,
      "attractor_batch_size": 116,
      "attractor_constant_motion": 0.68,
      "attractor_constant_drift": 0.76,
      "attractor_projection_speed": 0.54,
      "attractor_palette": 4,
      "attractor_color_phase": 0.08,
      "attractor_color_speed": 0.7,
      "attractor_glow": 1.3,
      "attractor_exposure": 2.1
    },
    "minChanged": 0.00035
  },
  {
    "name": "Aizawa Flower",
    "values": {
      "attractor_mode": 8,
      "attractor_steps": 580,
      "attractor_dt": 0.92,
      "attractor_projection": 3,
      "attractor_projection_mix": 0.56,
      "attractor_depth_mix": 0.42,
      "attractor_scale": 1.1,
      "attractor_zoom": 1.28,
      "attractor_trail_width": 0.82,
      "attractor_batch_size": 106,
      "attractor_constant_a": 0.08,
      "attractor_constant_c": -0.1,
      "attractor_constant_motion": 0.42,
      "attractor_camera_orbit": 0.58,
      "attractor_palette": 2,
      "attractor_color_phase": 0.44,
      "attractor_color_speed": 0.74,
      "attractor_glow": 1.55,
      "attractor_exposure": 2.45
    },
    "minChanged": 0.00035
  },
  {
    "name": "Chua Circuit",
    "values": {
      "attractor_mode": 19,
      "attractor_steps": 620,
      "attractor_dt": 0.88,
      "attractor_projection": 3,
      "attractor_projection_mix": 0.46,
      "attractor_depth_mix": 0.35,
      "attractor_scale": 1.04,
      "attractor_zoom": 1.22,
      "attractor_trail_width": 0.82,
      "attractor_batch_size": 96,
      "attractor_constant_a": 0.04,
      "attractor_constant_b": -0.06,
      "attractor_constant_motion": 0.38,
      "attractor_projection_speed": 0.66,
      "attractor_camera_orbit": 0.4,
      "attractor_palette": 0,
      "attractor_color_phase": 0.3,
      "attractor_color_speed": 0.86,
      "attractor_glow": 1.5,
      "attractor_exposure": 2.5
    },
    "minChanged": 0.00035
  },
  {
    "name": "Standard Map Web",
    "values": {
      "attractor_mode": 15,
      "attractor_steps": 760,
      "attractor_projection": 4,
      "attractor_projection_mix": 0.48,
      "attractor_depth_mix": 0.2,
      "attractor_scale": 1.18,
      "attractor_zoom": 1.34,
      "attractor_trail_width": 0.62,
      "attractor_batch_size": 104,
      "attractor_constant_a": 0.35,
      "attractor_constant_motion": 0.36,
      "attractor_constant_drift": 0.52,
      "attractor_projection_speed": 0.74,
      "attractor_palette": 3,
      "attractor_color_phase": 0.58,
      "attractor_color_speed": 0.68,
      "attractor_glow": 1.36,
      "attractor_exposure": 2.25
    },
    "minChanged": 0.00035
  }
]
```

</details>

## FLAM3 Density Lab

Progressive worker-accumulated fractal flame density renderer

Effect ID: `flam3_density_lab`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Sierpinski Ember · Swirl Spiral Bloom · Spherical Cloud Gate · Heart Blossom · Horseshoe Flow · Julia Veil · Disc Bloom Wheel · Spiral Galaxy · Diamond Lattice · Hyperbolic Mandala · PDJ Chaos Silk · Rings Orbit Flame · Gaussian Mist Flame · Radial Streak Crown · Cosine Wave Halo · Bubble Field Glass · Bent Handkerchief Veil · Bubble Spiral Mandala · Concentric Ring Bloom · Blade Veil Silver · Blob Bloom Green · Blur Disc Spiral · Lace Arch Lantern · Popcorn Texture Bloom · Secant Ridge Veins.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flame Mode · `flam3_mode` | Swirl Spiral (1) | Sierpinski Flame; Swirl Spiral; Spherical Cloud; Heart Blossom; Horseshoe Storm; Julia Veil; Disc Bloom; Spiral Galaxy; Diamond Lattice; Hyperbolic Mandala; PDJ Chaos; Concentric Rings; Gaussian Cloud; Radial Streaks; Cosine Wave; Bubble Field; Polar Swirl; Eyefish Kaleido; Exponential Drift; Power Spiral; Cross Fold; Tangent Ridge; Bent Handkerchief; Cylinder Ex; Linear Mosaic; Sinusoidal Grid; Fisheye Swirl; Spherical Cascade; Bubble Spiral; Hyperbolic Bloom; Eyefish Polar; Power Diamond; Angular Fan; Polynomial Curl; Pentagon Rosette; Lace Arches; Starburst Rays; Blade Veil; Wave Ripples; Popcorn Texture; Blob Bloom; Tilted Fans; Rings 2; Perspective Tilt; Noise Haze; JuliaN Twofold; JuliaScope Dihedral; Blur Disc; Pie Wedges; Secant Ridges | — |
| Xforms · `flam3_xform_count` | 4 | 2 to 6 | 1 |
| Variation Mix · `flam3_variation_weights` | 0.48 | 0 to 1 | 0.02 |
| Final Xform · `flam3_final_transform` | 0.34 | 0 to 1 | 0.02 |
| Symmetry · `flam3_symmetry` | 4 | 1 to 12 | 1 |

### Affine

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Scale · `flam3_scale` | 0.94 | 0.45 to 2.2 | 0.03 |
| Rotate · `flam3_rotate` | 0 | -3.14159 to 3.14159 | 0.02 |
| Translate X · `flam3_translate_x` | 0 | -1.5 to 1.5 | 0.02 |
| Translate Y · `flam3_translate_y` | 0.08 | -1.5 to 1.5 | 0.02 |
| Shear X · `flam3_shear_x` | 0 | -0.9 to 0.9 | 0.02 |
| Shear Y · `flam3_shear_y` | 0 | -0.9 to 0.9 | 0.02 |

### Render

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Orbit Batch · `flam3_orbit_batch` | 3000 | 1000 to 70000 | 500 |
| Warmup · `flam3_warmup` | 10 | 4 to 80 | 1 |
| Render Scale · `flam3_render_scale` | 0.52 | 0.25 to 1 | 0.01 |
| Sharpness · `flam3_sharpness` | 0.48 | 0 to 1.5 | 0.03 |
| Point Spread · `flam3_splat_radius` | 0.35 | 0 to 2.5 | 0.05 |
| Density · `flam3_density` | 1.35 | 0.2 to 4 | 0.05 |
| Gamma · `flam3_gamma` | 0.9 | 0.25 to 3 | 0.03 |
| Exposure · `flam3_exposure` | 2.15 | 0.1 to 8 | 0.05 |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Variation Morph · `flam3_variation_morph` | 0.28 | 0 to 1 | 0.02 |
| Affine Drift · `flam3_affine_drift` | 1 | -12 to 12 | 0.02 |
| Sym Pulse · `flam3_symmetry_pulse` | 0.42 | 0 to 1 | 0.02 |
| Plot Orbit · `flam3_plot_orbit` | 3 | 1 to 8 | 1 |
| Flame Motion · `flam3_motion_rate` | 2.4 | 0 to 12 | 0.05 |
| Motion Persistence · `flam3_accumulation_decay` | 0.9 | 0.82 to 1 | 0.001 |

### Color

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Palette · `flam3_palette` | Opal Smoke (4) | Ember Glass; Aqua Violet; Solar Lace; Ruby Circuit; Opal Smoke | — |
| Color Speed · `flam3_color_speed` | 1.8 | -32 to 32 | 0.1 |
| Color Mix · `flam3_color_mix` | 0.62 | 0 to 1 | 0.02 |
| Glow · `flam3_glow` | 1.15 | 0 to 4 | 0.05 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Sierpinski Ember",
    "values": {
      "flam3_mode": 0,
      "flam3_xform_count": 3,
      "flam3_variation_weights": 0.1,
      "flam3_symmetry": 3,
      "flam3_scale": 1.02,
      "flam3_rotate": 0.12,
      "flam3_orbit_batch": 3200,
      "flam3_warmup": 10,
      "flam3_palette": 2,
      "flam3_color_speed": 0.56,
      "flam3_glow": 1.25,
      "flam3_exposure": 2.15
    },
    "minChanged": 0.00008
  },
  {
    "name": "Swirl Spiral Bloom",
    "values": {
      "flam3_mode": 1,
      "flam3_xform_count": 4,
      "flam3_variation_weights": 0.58,
      "flam3_final_transform": 0.46,
      "flam3_symmetry": 5,
      "flam3_scale": 1.12,
      "flam3_rotate": 0.32,
      "flam3_affine_drift": 1.24,
      "flam3_symmetry_pulse": 0.48,
      "flam3_plot_orbit": 4,
      "flam3_orbit_batch": 4000,
      "flam3_palette": 0,
      "flam3_color_speed": 1.85,
      "flam3_glow": 1.62,
      "flam3_exposure": 2.62
    },
    "minChanged": 0.00008
  },
  {
    "name": "Spherical Cloud Gate",
    "values": {
      "flam3_mode": 2,
      "flam3_xform_count": 5,
      "flam3_variation_weights": 0.48,
      "flam3_final_transform": 0.34,
      "flam3_symmetry": 4,
      "flam3_scale": 0.94,
      "flam3_translate_y": 0.08,
      "flam3_orbit_batch": 3600,
      "flam3_palette": 4,
      "flam3_color_mix": 0.62,
      "flam3_glow": 1.55,
      "flam3_exposure": 2.5
    },
    "minChanged": 0.00008
  },
  {
    "name": "Heart Blossom",
    "values": {
      "flam3_mode": 3,
      "flam3_xform_count": 4,
      "flam3_variation_weights": 0.66,
      "flam3_final_transform": 0.22,
      "flam3_symmetry": 6,
      "flam3_scale": 0.98,
      "flam3_rotate": -0.2,
      "flam3_symmetry_pulse": 0.42,
      "flam3_orbit_batch": 3400,
      "flam3_palette": 3,
      "flam3_color_speed": 0.66,
      "flam3_glow": 1.48,
      "flam3_exposure": 2.4
    },
    "minChanged": 0.00008
  },
  {
    "name": "Horseshoe Flow",
    "values": {
      "flam3_mode": 4,
      "flam3_xform_count": 4,
      "flam3_variation_weights": 0.6,
      "flam3_final_transform": 0.28,
      "flam3_symmetry": 5,
      "flam3_scale": 1.08,
      "flam3_shear_x": 0.16,
      "flam3_affine_drift": 0.42,
      "flam3_orbit_batch": 3200,
      "flam3_palette": 1,
      "flam3_color_speed": 0.54,
      "flam3_glow": 1.36,
      "flam3_exposure": 2.24
    },
    "minChanged": 0.00008
  },
  {
    "name": "Julia Veil",
    "values": {
      "flam3_mode": 5,
      "flam3_xform_count": 5,
      "flam3_variation_weights": 0.72,
      "flam3_final_transform": 0.52,
      "flam3_symmetry": 7,
      "flam3_scale": 1,
      "flam3_rotate": 0.4,
      "flam3_variation_morph": 0.36,
      "flam3_orbit_batch": 3800,
      "flam3_palette": 1,
      "flam3_color_speed": 0.82,
      "flam3_glow": 1.55,
      "flam3_exposure": 2.45
    },
    "minChanged": 0.00008
  },
  {
    "name": "Disc Bloom Wheel",
    "values": {
      "flam3_mode": 6,
      "flam3_xform_count": 5,
      "flam3_variation_weights": 0.62,
      "flam3_final_transform": 0.38,
      "flam3_symmetry": 8,
      "flam3_scale": 1.03,
      "flam3_translate_x": -0.04,
      "flam3_orbit_batch": 3600,
      "flam3_palette": 2,
      "flam3_color_mix": 0.74,
      "flam3_glow": 1.5,
      "flam3_exposure": 2.38
    },
    "minChanged": 0.00008
  },
  {
    "name": "Spiral Galaxy",
    "values": {
      "flam3_mode": 7,
      "flam3_xform_count": 5,
      "flam3_variation_weights": 0.7,
      "flam3_final_transform": 0.44,
      "flam3_symmetry": 5,
      "flam3_scale": 1.14,
      "flam3_rotate": 0.64,
      "flam3_affine_drift": 0.62,
      "flam3_orbit_batch": 4000,
      "flam3_palette": 0,
      "flam3_color_speed": 0.92,
      "flam3_glow": 1.62,
      "flam3_exposure": 2.54
    },
    "minChanged": 0.00008
  },
  {
    "name": "Diamond Lattice",
    "values": {
      "flam3_mode": 8,
      "flam3_xform_count": 6,
      "flam3_variation_weights": 0.44,
      "flam3_final_transform": 0.26,
      "flam3_symmetry": 4,
      "flam3_scale": 1.18,
      "flam3_shear_y": -0.12,
      "flam3_orbit_batch": 3400,
      "flam3_palette": 4,
      "flam3_color_speed": 0.48,
      "flam3_glow": 1.28,
      "flam3_exposure": 2.18
    },
    "minChanged": 0.00008
  },
  {
    "name": "Hyperbolic Mandala",
    "values": {
      "flam3_mode": 9,
      "flam3_xform_count": 6,
      "flam3_variation_weights": 0.76,
      "flam3_final_transform": 0.48,
      "flam3_symmetry": 9,
      "flam3_scale": 0.92,
      "flam3_rotate": -0.36,
      "flam3_symmetry_pulse": 0.5,
      "flam3_orbit_batch": 3800,
      "flam3_palette": 2,
      "flam3_color_speed": 0.78,
      "flam3_glow": 1.7,
      "flam3_exposure": 2.62
    },
    "minChanged": 0.00008
  },
  {
    "name": "PDJ Chaos Silk",
    "values": {
      "flam3_mode": 10,
      "flam3_xform_count": 5,
      "flam3_variation_weights": 0.88,
      "flam3_final_transform": 0.36,
      "flam3_symmetry": 5,
      "flam3_scale": 1.04,
      "flam3_variation_morph": 0.88,
      "flam3_affine_drift": 3.2,
      "flam3_symmetry_pulse": 0.72,
      "flam3_plot_orbit": 5,
      "flam3_orbit_batch": 4500,
      "flam3_palette": 3,
      "flam3_color_speed": 4.8,
      "flam3_glow": 1.62,
      "flam3_exposure": 2.56
    },
    "minChanged": 0.00008
  },
  {
    "name": "Rings Orbit Flame",
    "values": {
      "flam3_mode": 11,
      "flam3_xform_count": 4,
      "flam3_variation_weights": 0.68,
      "flam3_final_transform": 0.44,
      "flam3_symmetry": 7,
      "flam3_scale": 1.1,
      "flam3_rotate": 0.18,
      "flam3_orbit_batch": 3400,
      "flam3_palette": 1,
      "flam3_color_speed": 0.64,
      "flam3_glow": 1.44,
      "flam3_exposure": 2.34
    },
    "minChanged": 0.00008
  },
  {
    "name": "Gaussian Mist Flame",
    "values": {
      "flam3_mode": 12,
      "flam3_xform_count": 6,
      "flam3_variation_weights": 0.52,
      "flam3_final_transform": 0.3,
      "flam3_symmetry": 6,
      "flam3_scale": 0.88,
      "flam3_translate_y": -0.06,
      "flam3_orbit_batch": 4000,
      "flam3_palette": 4,
      "flam3_color_mix": 0.8,
      "flam3_glow": 1.72,
      "flam3_exposure": 2.7
    },
    "minChanged": 0.00008
  },
  {
    "name": "Radial Streak Crown",
    "values": {
      "flam3_mode": 13,
      "flam3_xform_count": 5,
      "flam3_variation_weights": 0.82,
      "flam3_final_transform": 0.46,
      "flam3_symmetry": 10,
      "flam3_scale": 1.16,
      "flam3_rotate": 0.52,
      "flam3_symmetry_pulse": 0.36,
      "flam3_plot_orbit": 3,
      "flam3_orbit_batch": 3600,
      "flam3_palette": 0,
      "flam3_color_speed": 0.88,
      "flam3_glow": 1.6,
      "flam3_exposure": 2.55
    },
    "minChanged": 0.00008
  },
  {
    "name": "Cosine Wave Halo",
    "values": {
      "flam3_mode": 14,
      "flam3_xform_count": 4,
      "flam3_variation_weights": 0.44,
      "flam3_final_transform": 0.24,
      "flam3_symmetry": 7,
      "flam3_scale": 0.96,
      "flam3_rotate": 0.1,
      "flam3_affine_drift": 0.52,
      "flam3_plot_orbit": 4,
      "flam3_orbit_batch": 3800,
      "flam3_palette": 2,
      "flam3_color_speed": 0.72,
      "flam3_glow": 1.42,
      "flam3_exposure": 2.35
    },
    "minChanged": 0.00008
  },
  {
    "name": "Bubble Field Glass",
    "values": {
      "flam3_mode": 15,
      "flam3_xform_count": 5,
      "flam3_variation_weights": 0.36,
      "flam3_final_transform": 0.32,
      "flam3_symmetry": 8,
      "flam3_scale": 1.08,
      "flam3_symmetry_pulse": 0.3,
      "flam3_orbit_batch": 4000,
      "flam3_palette": 1,
      "flam3_color_mix": 0.72,
      "flam3_glow": 1.58,
      "flam3_exposure": 2.45
    },
    "minChanged": 0.00008
  },
  {
    "name": "Bent Handkerchief Veil",
    "values": {
      "flam3_mode": 22,
      "flam3_xform_count": 4,
      "flam3_variation_weights": 0.58,
      "flam3_final_transform": 0.36,
      "flam3_symmetry": 5,
      "flam3_scale": 1.06,
      "flam3_rotate": -0.22,
      "flam3_shear_x": 0.18,
      "flam3_affine_drift": 0.64,
      "flam3_orbit_batch": 4000,
      "flam3_palette": 4,
      "flam3_color_speed": 0.82,
      "flam3_glow": 1.48,
      "flam3_exposure": 2.42
    },
    "minChanged": 0.00008
  },
  {
    "name": "Bubble Spiral Mandala",
    "values": {
      "flam3_mode": 28,
      "flam3_xform_count": 5,
      "flam3_variation_weights": 0.52,
      "flam3_final_transform": 0.42,
      "flam3_symmetry": 9,
      "flam3_scale": 1.02,
      "flam3_rotate": 0.3,
      "flam3_symmetry_pulse": 0.46,
      "flam3_plot_orbit": 5,
      "flam3_orbit_batch": 4000,
      "flam3_palette": 2,
      "flam3_color_speed": 0.78,
      "flam3_glow": 1.62,
      "flam3_exposure": 2.5
    },
    "minChanged": 0.00008
  },
  {
    "name": "Concentric Ring Bloom",
    "values": {
      "flam3_mode": 11,
      "flam3_xform_count": 4,
      "flam3_variation_weights": 0.42,
      "flam3_final_transform": 0.28,
      "flam3_symmetry": 10,
      "flam3_scale": 1,
      "flam3_symmetry_pulse": 0.36,
      "flam3_plot_orbit": 4,
      "flam3_orbit_batch": 3800,
      "flam3_palette": 3,
      "flam3_color_speed": 0.62,
      "flam3_color_mix": 0.78,
      "flam3_glow": 1.52,
      "flam3_exposure": 2.36
    },
    "minChanged": 0.00008
  },
  {
    "name": "Blade Veil Silver",
    "values": {
      "flam3_mode": 37,
      "flam3_xform_count": 5,
      "flam3_variation_weights": 0.34,
      "flam3_final_transform": 0.26,
      "flam3_symmetry": 6,
      "flam3_scale": 1.12,
      "flam3_rotate": 0.46,
      "flam3_shear_y": -0.1,
      "flam3_affine_drift": 0.72,
      "flam3_orbit_batch": 4000,
      "flam3_palette": 4,
      "flam3_color_speed": 0.58,
      "flam3_glow": 1.46,
      "flam3_exposure": 2.34
    },
    "minChanged": 0.00008
  },
  {
    "name": "Blob Bloom Green",
    "values": {
      "flam3_mode": 40,
      "flam3_xform_count": 5,
      "flam3_variation_weights": 0.46,
      "flam3_final_transform": 0.3,
      "flam3_symmetry": 7,
      "flam3_scale": 1.06,
      "flam3_rotate": 0.18,
      "flam3_symmetry_pulse": 0.32,
      "flam3_orbit_batch": 3800,
      "flam3_palette": 1,
      "flam3_color_mix": 0.66,
      "flam3_glow": 1.55,
      "flam3_exposure": 2.44
    },
    "minChanged": 0.00008
  },
  {
    "name": "Blur Disc Spiral",
    "values": {
      "flam3_mode": 47,
      "flam3_xform_count": 4,
      "flam3_variation_weights": 0.28,
      "flam3_final_transform": 0.34,
      "flam3_symmetry": 6,
      "flam3_scale": 0.92,
      "flam3_rotate": -0.14,
      "flam3_affine_drift": 0.46,
      "flam3_orbit_batch": 4200,
      "flam3_palette": 4,
      "flam3_color_speed": 0.48,
      "flam3_glow": 1.7,
      "flam3_exposure": 2.7
    },
    "minChanged": 0.00008
  },
  {
    "name": "Lace Arch Lantern",
    "values": {
      "flam3_mode": 35,
      "flam3_xform_count": 5,
      "flam3_variation_weights": 0.4,
      "flam3_final_transform": 0.46,
      "flam3_symmetry": 7,
      "flam3_scale": 1.04,
      "flam3_shear_x": 0.22,
      "flam3_affine_drift": 0.54,
      "flam3_orbit_batch": 3800,
      "flam3_palette": 2,
      "flam3_color_speed": 0.66,
      "flam3_glow": 1.5,
      "flam3_exposure": 2.42
    },
    "minChanged": 0.00008
  },
  {
    "name": "Popcorn Texture Bloom",
    "values": {
      "flam3_mode": 39,
      "flam3_xform_count": 5,
      "flam3_variation_weights": 0.5,
      "flam3_final_transform": 0.32,
      "flam3_symmetry": 6,
      "flam3_scale": 1.08,
      "flam3_variation_morph": 0.4,
      "flam3_affine_drift": 0.86,
      "flam3_orbit_batch": 4000,
      "flam3_palette": 0,
      "flam3_color_speed": 0.9,
      "flam3_glow": 1.54,
      "flam3_exposure": 2.48
    },
    "minChanged": 0.00008
  },
  {
    "name": "Secant Ridge Veins",
    "values": {
      "flam3_mode": 49,
      "flam3_xform_count": 4,
      "flam3_variation_weights": 0.44,
      "flam3_final_transform": 0.24,
      "flam3_symmetry": 5,
      "flam3_scale": 0.94,
      "flam3_rotate": 0.2,
      "flam3_orbit_batch": 3600,
      "flam3_palette": 3,
      "flam3_color_speed": 0.7,
      "flam3_glow": 1.42,
      "flam3_exposure": 2.32
    },
    "minChanged": 0.00008
  }
]
```

</details>

## Mandelbulb Flight

Raymarched 3D Mandelbulb with fold-dive camera motion and animated polar unfolding

Effect ID: `mandelbulb_flight`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Power · `power` | 8 | 2 to 12 | 0.25 |
| Formula Iterations · `max_iter` | 16 | 6 to 28 | 1 |
| Ray Steps · `march_steps` | 92 | 48 to 140 | 4 |
| Bailout · `bailout` | 4 | 2 to 8 | 0.25 |
| Surface Detail · `detail` | 1.15 | 0.5 to 2.5 | 0.05 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `flight_speed` | 0.55 | 0 to 6 | 0.05 |
| Dive Depth · `flight_depth` | 0.75 | 0 to 3 | 0.05 |
| Orbit Radius · `orbit_radius` | 1.35 | 0.2 to 5 | 0.05 |
| Orbit Spin Speed · `orbit_spin` | 0.35 | -4 to 4 | 0.05 |
| Flight Target · `fold_target` | Crown (1) | Cathedral; Crown; Spiral Gate; Root Cavern | — |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Motion Path · `motion_mode` | Orbit Dive (0) | Orbit Dive; Figure Eight; Surface Graze; Spiral Descent | — |
| Motion Phase · `motion_phase` | 0 | 0 to 1 | 0.01 |
| Unfold Motion · `polar_anim` | 0.35 | 0 to 1.5 | 0.05 |
| Structure Pulse · `structure_pulse` | 0.28 | 0 to 1.5 | 0.05 |
| Roll Drift · `roll` | 0.25 | -1.5 to 1.5 | 0.05 |
| Roll Speed · `roll_speed` | 0.45 | 0 to 5 | 0.05 |
| Field of View · `fov` | 1.05 | 0.55 to 1.8 | 0.05 |

### Visual

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Speed · `color_speed` | 0.35 | 0 to 8 | 0.05 |
| Palette · `palette` | Deep Gold (0) | Deep Gold; Ion Orchid; Crystal Cyan; Lava Organics; + [71 shared palettes](Palette-Reference.md) | — |
| Shade Mode · `shade_mode` | Trap Glow (0) | Trap Glow; Normal Fresnel; Iteration Bands; Cavity Pulse | — |
| Depth Fog · `fog` | 0.45 | 0 to 1.5 | 0.05 |
| Edge Glow · `glow` | 0.85 | 0 to 2.5 | 0.05 |

## Triplex Mutation Flight

Raymarched Mandelbulb-family mutations with burning ship, tricorn, generalized bulb, beam, and spud folds

Effect ID: `triplex_mutation_flight`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Abs Crown Orbit · Burning Tunnel Push · DarkBeam Spiral · Spudsville Fold Dive.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Triplex Mode · `family` | Burning Ship 3D (1) | Mandelbulb Abs; Burning Ship 3D; Tricorn 3D; Generalized Bulb; DarkBeam Talis; Spudsville Fold | — |
| Power · `power` | 8 | 2 to 12 | 0.25 |
| Formula Iterations · `iterations` | 17 | 6 to 30 | 1 |
| Ray Steps · `march_steps` | 104 | 52 to 156 | 4 |
| Bailout · `bailout` | 5.5 | 2 to 12 | 0.25 |
| Phase Twist · `phase_twist` | 0.38 | -2 to 2 | 0.02 |
| Abs Mix · `abs_mix` | 0.62 | 0 to 1.5 | 0.02 |
| Surface Detail · `detail` | 1.18 | 0.5 to 2.5 | 0.05 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `flight_speed` | 0.72 | 0 to 8 | 0.05 |
| Dive Depth · `flight_depth` | 0.92 | 0 to 4 | 0.05 |
| Orbit Radius · `orbit_radius` | 1.28 | 0.2 to 5.5 | 0.05 |
| Orbit Spin Speed · `orbit_spin` | 0.52 | -5 to 5 | 0.05 |
| Flight Target · `target_mode` | Burning Crown (1) | Fold Cathedral; Burning Crown; Mirror Needle; Root Tunnel | — |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Motion Path · `motion_mode` | Orbit Dive (0) | Orbit Dive; Figure Eight; Surface Graze; Spiral Descent | — |
| Motion Phase · `motion_phase` | 0 | 0 to 1 | 0.01 |
| Structure Pulse · `structure_pulse` | 0.42 | 0 to 1.8 | 0.05 |
| Formula Morph · `formula_morph` | 0.55 | 0 to 1.8 | 0.05 |
| Roll Drift · `roll` | 0.28 | -1.8 to 1.8 | 0.05 |
| Roll Speed · `roll_speed` | 0.64 | 0 to 6 | 0.05 |
| Field of View · `fov` | 1.02 | 0.55 to 1.9 | 0.05 |

### Visual

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Speed · `color_speed` | 0.48 | 0 to 8 | 0.05 |
| Palette · `palette` | Toxic Orchid (1) | Molten Crown; Toxic Orchid; Ice Electric; Bone Fire; + [71 shared palettes](Palette-Reference.md) | — |
| Shade Mode · `shade_mode` | Trap Glow (0) | Trap Glow; Normal Fresnel; Iteration Bands; Mutation Cavity | — |
| Depth Fog · `fog` | 0.36 | 0 to 1.5 | 0.05 |
| Edge Glow · `glow` | 1.15 | 0 to 2.8 | 0.05 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Abs Crown Orbit",
    "values": {
      "family": 0,
      "power": 7.5,
      "iterations": 18,
      "march_steps": 112,
      "bailout": 5.8,
      "phase_twist": 0.52,
      "abs_mix": 0.82,
      "flight_speed": 1.45,
      "flight_depth": 1.35,
      "orbit_radius": 1.36,
      "orbit_spin": 1.25,
      "target_mode": 0,
      "motion_mode": 0,
      "motion_phase": 0.12,
      "structure_pulse": 0.66,
      "formula_morph": 0.62,
      "roll": 0.24,
      "roll_speed": 1.15,
      "color_speed": 0.68,
      "palette": 1,
      "shade_mode": 2,
      "fog": 0.24,
      "glow": 1.65
    }
  },
  {
    "name": "Burning Tunnel Push",
    "values": {
      "family": 1,
      "power": 8.4,
      "iterations": 18,
      "march_steps": 120,
      "bailout": 5.5,
      "phase_twist": 0.72,
      "abs_mix": 0.96,
      "flight_speed": 2.35,
      "flight_depth": 1.82,
      "orbit_radius": 1.22,
      "orbit_spin": 1.72,
      "target_mode": 1,
      "motion_mode": 3,
      "motion_phase": 0.28,
      "structure_pulse": 0.88,
      "formula_morph": 0.84,
      "roll": 0.36,
      "roll_speed": 1.65,
      "color_speed": 0.86,
      "palette": 2,
      "shade_mode": 3,
      "fog": 0.2,
      "glow": 1.85
    }
  },
  {
    "name": "DarkBeam Spiral",
    "values": {
      "family": 4,
      "power": 6.6,
      "iterations": 20,
      "march_steps": 124,
      "bailout": 6.2,
      "phase_twist": 1.1,
      "abs_mix": 0.54,
      "flight_speed": 2.15,
      "flight_depth": 1.58,
      "orbit_radius": 1.08,
      "orbit_spin": 1.86,
      "target_mode": 2,
      "motion_mode": 2,
      "motion_phase": 0.42,
      "structure_pulse": 0.92,
      "formula_morph": 1.12,
      "roll": 0.42,
      "roll_speed": 1.72,
      "color_speed": 0.88,
      "palette": 3,
      "shade_mode": 2,
      "fog": 0.18,
      "glow": 1.95
    }
  },
  {
    "name": "Spudsville Fold Dive",
    "values": {
      "family": 5,
      "power": 5.8,
      "iterations": 19,
      "march_steps": 116,
      "bailout": 6,
      "phase_twist": 0.86,
      "abs_mix": 0.74,
      "flight_speed": 2.45,
      "flight_depth": 1.74,
      "orbit_radius": 1.18,
      "orbit_spin": 1.76,
      "target_mode": 3,
      "motion_mode": 3,
      "motion_phase": 0.55,
      "structure_pulse": 0.94,
      "formula_morph": 1.04,
      "roll": 0.34,
      "roll_speed": 1.68,
      "color_speed": 0.9,
      "palette": 0,
      "shade_mode": 3,
      "fog": 0.2,
      "glow": 1.9
    }
  }
]
```

</details>

## KIFS Fold Flight

Raymarched kaleidoscopic IFS folds with Menger, tetra, octa, and lattice flight paths

Effect ID: `kifs_flight`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Fold Family · `family` | Tetra Crystal (1) | Menger Vault; Tetra Crystal; Octa Fold; Box Lattice | — |
| Fold Iterations · `iterations` | 7 | 3 to 12 | 1 |
| Fold Scale · `fold_scale` | 2.72 | 1.6 to 4 | 0.05 |
| Fold Offset · `fold_offset` | 0.82 | 0.25 to 1.6 | 0.02 |
| Fold Bias · `fold_bias` | 0.12 | -0.6 to 0.6 | 0.02 |
| Fold Rotation · `fold_rotation` | 0.55 | -1.5 to 1.5 | 0.02 |
| Bailout · `bailout` | 3.2 | 1.2 to 6 | 0.1 |
| Core Thickness · `thickness` | 0.9 | 0.25 to 2 | 0.02 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `flight_speed` | 0.55 | 0 to 6 | 0.05 |
| Tunnel Depth · `tunnel_depth` | 0.45 | 0 to 3.2 | 0.05 |
| Orbit Radius · `orbit_radius` | 0.82 | 0.2 to 4.5 | 0.05 |
| Orbit Spin Speed · `orbit_spin` | 0.4 | -4 to 4 | 0.05 |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Motion Path · `motion_mode` | Vault Orbit (0) | Vault Orbit; Figure Eight; Fold Tunnel; Surface Graze | — |
| Motion Phase · `motion_phase` | 0 | 0 to 1 | 0.01 |
| Structure Pulse · `structure_pulse` | 0.32 | 0 to 1.5 | 0.05 |
| Roll Drift · `roll` | 0.2 | -1.5 to 1.5 | 0.05 |
| Roll Speed · `roll_speed` | 0.5 | 0 to 5 | 0.05 |
| Field of View · `fov` | 1 | 0.55 to 1.8 | 0.05 |

### Visual

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Speed · `color_speed` | 0.4 | 0 to 8 | 0.05 |
| Palette · `palette` | Crystal Violet (1) | Cathedral Gold; Crystal Violet; Aurora Glass; Circuit Lava; + [71 shared palettes](Palette-Reference.md) | — |
| Shade Mode · `shade_mode` | Trap Glow (0) | Trap Glow; Normal Glass; Iteration Bands; Cell Pulse | — |
| Depth Fog · `fog` | 0.28 | 0 to 1.5 | 0.05 |
| Edge Glow · `glow` | 1.65 | 0 to 2.5 | 0.05 |

## DIFS Tunnel Flight

Raymarched distance-IFS tunnel structures with Koch folds, Mandalay boxes, torus tubes, octa shells, and twisted kaleido columns

Effect ID: `difs_tunnel_flight`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Koch Vault Orbit · Mandalay Deep Box · Torus Tube Push · Kaleido Column Graze.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| DIFS Mode · `family` | Torus Tube DIFS (3) | Koch KIFS 3D; Mandalay Folded Box; Jerusalem Cube; Torus Tube DIFS; Octahedral Shell; Twisted Kaleido Column | — |
| Fold Iterations · `iterations` | 9 | 3 to 18 | 1 |
| Fold Scale · `fold_scale` | 2.72 | 1.4 to 4.5 | 0.05 |
| Fold Offset · `fold_offset` | 0.82 | 0.15 to 1.9 | 0.02 |
| Fold Bias · `fold_bias` | 0.08 | -0.9 to 0.9 | 0.02 |
| Symmetry · `symmetry` | 6 | 3 to 12 | 1 |
| Twist · `twist` | 0.48 | -2 to 2 | 0.02 |
| Core Thickness · `thickness` | 0.78 | 0.12 to 2.2 | 0.02 |
| Bailout · `bailout` | 4.2 | 1.4 to 8 | 0.1 |
| Surface Detail · `detail` | 1.18 | 0.5 to 2.5 | 0.05 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `flight_speed` | 0.78 | 0 to 8 | 0.05 |
| Tunnel Depth · `tunnel_depth` | 0.92 | 0 to 4.2 | 0.05 |
| Orbit Radius · `orbit_radius` | 1.05 | 0.2 to 5.8 | 0.05 |
| Orbit Spin Speed · `orbit_spin` | 0.62 | -5 to 5 | 0.05 |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Motion Path · `motion_mode` | Tunnel Push (2) | Vault Orbit; Figure Eight; Tunnel Push; Surface Graze | — |
| Motion Phase · `motion_phase` | 0 | 0 to 1 | 0.01 |
| Structure Pulse · `structure_pulse` | 0.55 | 0 to 1.8 | 0.05 |
| Fold Rotation · `fold_rotation` | 0.64 | -2 to 2 | 0.02 |
| Roll Drift · `roll` | 0.28 | -1.8 to 1.8 | 0.05 |
| Roll Speed · `roll_speed` | 0.72 | 0 to 6 | 0.05 |
| Field of View · `fov` | 0.98 | 0.55 to 1.9 | 0.05 |

### Visual

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Speed · `color_speed` | 0.56 | 0 to 8 | 0.05 |
| Palette · `palette` | Blue Circuit (1) | Cathedral Brass; Blue Circuit; Violet Glass; Lava Matrix; + [71 shared palettes](Palette-Reference.md) | — |
| Shade Mode · `shade_mode` | Trap Glow (0) | Trap Glow; Normal Glass; Iteration Bands; Cell Pulse | — |
| Depth Fog · `fog` | 0.3 | 0 to 1.5 | 0.05 |
| Edge Glow · `glow` | 1.65 | 0 to 3 | 0.05 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Koch Vault Orbit",
    "values": {
      "family": 0,
      "iterations": 9,
      "fold_scale": 2.72,
      "fold_offset": 0.86,
      "fold_bias": 0.12,
      "symmetry": 6,
      "twist": 0.62,
      "thickness": 0.76,
      "bailout": 4.2,
      "detail": 1.2,
      "flight_speed": 1.55,
      "tunnel_depth": 1.25,
      "orbit_radius": 1.18,
      "orbit_spin": 1.28,
      "motion_mode": 0,
      "motion_phase": 0.14,
      "structure_pulse": 0.66,
      "fold_rotation": 0.66,
      "roll": 0.22,
      "roll_speed": 1.2,
      "color_speed": 0.72,
      "palette": 0,
      "shade_mode": 2,
      "fog": 0.24,
      "glow": 1.78
    }
  },
  {
    "name": "Mandalay Deep Box",
    "values": {
      "family": 1,
      "iterations": 10,
      "fold_scale": 2.82,
      "fold_offset": 0.72,
      "fold_bias": 0.2,
      "symmetry": 5,
      "twist": 0.74,
      "thickness": 0.82,
      "bailout": 4.8,
      "detail": 1.24,
      "flight_speed": 2.25,
      "tunnel_depth": 1.74,
      "orbit_radius": 1.12,
      "orbit_spin": 1.62,
      "motion_mode": 2,
      "motion_phase": 0.24,
      "structure_pulse": 0.82,
      "fold_rotation": 0.86,
      "roll": 0.32,
      "roll_speed": 1.52,
      "color_speed": 0.84,
      "palette": 1,
      "shade_mode": 3,
      "fog": 0.2,
      "glow": 1.92
    }
  },
  {
    "name": "Torus Tube Push",
    "values": {
      "family": 3,
      "iterations": 10,
      "fold_scale": 2.85,
      "fold_offset": 0.78,
      "fold_bias": 0.18,
      "symmetry": 7,
      "twist": 0.82,
      "thickness": 0.72,
      "bailout": 4.6,
      "detail": 1.26,
      "flight_speed": 2.5,
      "tunnel_depth": 1.85,
      "orbit_radius": 1.05,
      "orbit_spin": 1.82,
      "motion_mode": 2,
      "motion_phase": 0.29,
      "structure_pulse": 0.88,
      "fold_rotation": 0.92,
      "roll": 0.36,
      "roll_speed": 1.72,
      "color_speed": 0.88,
      "palette": 1,
      "shade_mode": 3,
      "fog": 0.2,
      "glow": 2.05
    }
  },
  {
    "name": "Kaleido Column Graze",
    "values": {
      "family": 5,
      "iterations": 10,
      "fold_scale": 3.04,
      "fold_offset": 0.72,
      "fold_bias": 0.16,
      "symmetry": 9,
      "twist": 1.02,
      "thickness": 0.62,
      "bailout": 4.8,
      "detail": 1.28,
      "flight_speed": 2.38,
      "tunnel_depth": 1.66,
      "orbit_radius": 1.08,
      "orbit_spin": 1.74,
      "motion_mode": 3,
      "motion_phase": 0.46,
      "structure_pulse": 0.86,
      "fold_rotation": 1.02,
      "roll": 0.42,
      "roll_speed": 1.68,
      "color_speed": 0.86,
      "palette": 2,
      "shade_mode": 2,
      "fog": 0.18,
      "glow": 2
    }
  }
]
```

</details>

## Mandelbox Flight

Raymarched Mandelbox folds with box/sphere inversion flight paths and animated fold rotation

Effect ID: `mandelbox_flight`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Fold Scale · `scale` | -1.82 | -3.2 to 3.2 | 0.02 |
| Fold Iterations · `iterations` | 13 | 5 to 22 | 1 |
| Box Fold · `box_fold` | 1 | 0.35 to 1.8 | 0.02 |
| Min Radius · `min_radius` | 0.28 | 0.05 to 0.8 | 0.01 |
| Fixed Radius · `fixed_radius` | 1 | 0.35 to 1.8 | 0.02 |
| Bailout · `bailout` | 8 | 2 to 16 | 0.25 |
| Surface Detail · `detail` | 1.15 | 0.5 to 2.5 | 0.05 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `flight_speed` | 0.65 | 0 to 6 | 0.05 |
| Dive Depth · `flight_depth` | 0.85 | 0 to 3.2 | 0.05 |
| Orbit Radius · `orbit_radius` | 1.15 | 0.2 to 5 | 0.05 |
| Orbit Spin Speed · `orbit_spin` | 0.45 | -4 to 4 | 0.05 |
| Fold Target · `fold_target` | Box Cathedral (0) | Box Cathedral; Negative Scale; Sphere Gate; Circuit Vault | — |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Motion Path · `motion_mode` | Box Orbit (0) | Box Orbit; Figure Eight; Fold Tunnel; Surface Skim | — |
| Motion Phase · `motion_phase` | 0 | 0 to 1 | 0.01 |
| Fold Rotation · `fold_rotation` | 0.42 | -1.5 to 1.5 | 0.02 |
| Structure Pulse · `structure_pulse` | 0.36 | 0 to 1.5 | 0.05 |
| Roll Drift · `roll` | 0.25 | -1.5 to 1.5 | 0.05 |
| Roll Speed · `roll_speed` | 0.55 | 0 to 5 | 0.05 |
| Field of View · `fov` | 1.02 | 0.55 to 1.8 | 0.05 |

### Visual

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Speed · `color_speed` | 0.42 | 0 to 8 | 0.05 |
| Palette · `palette` | Violet Glass (1) | Molten Brass; Violet Glass; Cyan Circuit; Ember Vault; + [71 shared palettes](Palette-Reference.md) | — |
| Shade Mode · `shade_mode` | Trap Glow (0) | Trap Glow; Normal Metal; Iteration Bands; Fold Cavity | — |
| Depth Fog · `fog` | 0.38 | 0 to 1.5 | 0.05 |
| Edge Glow · `glow` | 1.15 | 0 to 2.5 | 0.05 |

## Folded Box Variants Flight

Raymarched Mandelbox-family variants with Amazing Box, surf-like sheet folds, smooth folds, ABox modulation, and box-bulb hybrid motion

Effect ID: `folded_box_variants_flight`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Amazing Box Orbit · Amazing Surf Tunnel · Smooth Mandelbox Drift · ABoxMod Deep Fold · Box-Bulb Hybrid.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Variant Mode · `family` | Amazing Surf (1) | Amazing Box; Amazing Surf; Smooth Mandelbox; ABoxMod; Box-Bulb Hybrid | — |
| Fold Iterations · `iterations` | 12 | 4 to 24 | 1 |
| Fold Scale · `fold_scale` | -1.62 | -3.4 to 4.2 | 0.02 |
| Box Fold · `box_fold` | 1.04 | 0.35 to 2.2 | 0.02 |
| Sphere Min · `sphere_min` | 0.28 | 0.04 to 0.9 | 0.01 |
| Sphere Fixed · `sphere_fixed` | 1.02 | 0.35 to 2 | 0.02 |
| Fold Offset · `fold_offset` | 0.12 | -1.4 to 1.4 | 0.02 |
| Surf Amplitude · `surf_amp` | 0.46 | 0 to 1.8 | 0.02 |
| Bulb Power · `bulb_power` | 5 | 2 to 8 | 0.1 |
| Bailout · `bailout` | 9 | 2 to 18 | 0.25 |
| Surface Detail · `detail` | 1.18 | 0.5 to 2.5 | 0.05 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `flight_speed` | 0.72 | 0 to 8 | 0.05 |
| Dive Depth · `flight_depth` | 0.92 | 0 to 4.4 | 0.05 |
| Orbit Radius · `orbit_radius` | 1.18 | 0.2 to 5.8 | 0.05 |
| Orbit Spin Speed · `orbit_spin` | 0.56 | -5 to 5 | 0.05 |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Motion Path · `motion_mode` | Fold Tunnel (2) | Box Orbit; Figure Eight; Fold Tunnel; Surface Graze | — |
| Motion Phase · `motion_phase` | 0 | 0 to 1 | 0.01 |
| Fold Rotation · `fold_rotation` | 0.58 | -2 to 2 | 0.02 |
| Scale Pulse · `scale_pulse` | 0.52 | 0 to 1.8 | 0.05 |
| Surf Motion · `surf_motion` | 0.62 | 0 to 1.8 | 0.05 |
| Bulb Mix · `bulb_mix` | 0.48 | 0 to 1.5 | 0.05 |
| Roll Drift · `roll` | 0.24 | -1.8 to 1.8 | 0.05 |
| Roll Speed · `roll_speed` | 0.66 | 0 to 6 | 0.05 |
| Field of View · `fov` | 1 | 0.55 to 1.9 | 0.05 |

### Visual

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Speed · `color_speed` | 0.5 | 0 to 8 | 0.05 |
| Palette · `palette` | Surf Azure (1) | Box Brass; Surf Azure; Smooth Violet; ABox Ember; + [71 shared palettes](Palette-Reference.md) | — |
| Shade Mode · `shade_mode` | Trap Glow (0) | Trap Glow; Normal Metal; Iteration Bands; Fold Cavities | — |
| Depth Fog · `fog` | 0.32 | 0 to 1.5 | 0.05 |
| Edge Glow · `glow` | 1.45 | 0 to 3 | 0.05 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Amazing Box Orbit",
    "values": {
      "family": 0,
      "iterations": 13,
      "fold_scale": -1.72,
      "box_fold": 1.06,
      "sphere_min": 0.25,
      "sphere_fixed": 1.04,
      "fold_offset": 0.1,
      "surf_amp": 0.32,
      "bulb_power": 4.6,
      "flight_speed": 2.28,
      "flight_depth": 1.55,
      "orbit_spin": 1.56,
      "motion_mode": 0,
      "motion_phase": 0.14,
      "fold_rotation": 0.76,
      "scale_pulse": 0.72,
      "surf_motion": 0.58,
      "bulb_mix": 0.34,
      "roll_speed": 1.48,
      "color_speed": 0.78,
      "palette": 0,
      "shade_mode": 2,
      "fog": 0.22,
      "glow": 1.74
    }
  },
  {
    "name": "Amazing Surf Tunnel",
    "values": {
      "family": 1,
      "iterations": 14,
      "fold_scale": -1.74,
      "box_fold": 1.02,
      "sphere_min": 0.25,
      "sphere_fixed": 1.08,
      "fold_offset": 0.34,
      "surf_amp": 0.96,
      "bulb_power": 5.2,
      "bailout": 9.5,
      "detail": 1.6,
      "flight_speed": 2.18,
      "flight_depth": 1.72,
      "orbit_radius": 1.34,
      "orbit_spin": 1.62,
      "motion_mode": 2,
      "motion_phase": 0.26,
      "fold_rotation": 1.08,
      "scale_pulse": 0.94,
      "surf_motion": 1.2,
      "bulb_mix": 0.56,
      "roll": 0.38,
      "roll_speed": 1.52,
      "fov": 1,
      "color_speed": 1.1,
      "palette": 1,
      "shade_mode": 3,
      "fog": 0.18,
      "glow": 1.48
    }
  },
  {
    "name": "Smooth Mandelbox Drift",
    "values": {
      "family": 2,
      "iterations": 13,
      "fold_scale": -1.48,
      "box_fold": 1.1,
      "sphere_min": 0.3,
      "sphere_fixed": 1.1,
      "fold_offset": 0.08,
      "surf_amp": 0.42,
      "bulb_power": 5.2,
      "flight_speed": 2.22,
      "flight_depth": 1.58,
      "orbit_spin": 1.52,
      "motion_mode": 1,
      "motion_phase": 0.36,
      "fold_rotation": 0.68,
      "scale_pulse": 0.62,
      "surf_motion": 0.7,
      "bulb_mix": 0.44,
      "roll_speed": 1.46,
      "color_speed": 0.8,
      "palette": 2,
      "shade_mode": 1,
      "fog": 0.24,
      "glow": 1.72
    }
  },
  {
    "name": "ABoxMod Deep Fold",
    "values": {
      "family": 3,
      "iterations": 14,
      "fold_scale": -1.76,
      "box_fold": 0.98,
      "sphere_min": 0.23,
      "sphere_fixed": 1.08,
      "fold_offset": 0.48,
      "surf_amp": 1.04,
      "bulb_power": 5.8,
      "bailout": 9.5,
      "detail": 1.6,
      "flight_speed": 2.34,
      "flight_depth": 1.42,
      "orbit_radius": 1.18,
      "orbit_spin": 1.78,
      "motion_mode": 3,
      "motion_phase": 0.64,
      "fold_rotation": 1.42,
      "scale_pulse": 1.12,
      "surf_motion": 1.16,
      "bulb_mix": 0.74,
      "roll": 0.44,
      "roll_speed": 1.62,
      "fov": 1.02,
      "color_speed": 1.12,
      "palette": 3,
      "shade_mode": 3,
      "fog": 0.16,
      "glow": 1.72
    }
  },
  {
    "name": "Box-Bulb Hybrid",
    "values": {
      "family": 4,
      "iterations": 13,
      "fold_scale": -1.46,
      "box_fold": 1.02,
      "sphere_min": 0.24,
      "sphere_fixed": 1.02,
      "fold_offset": 0.18,
      "surf_amp": 0.62,
      "bulb_power": 5.6,
      "flight_speed": 2.42,
      "flight_depth": 1.72,
      "orbit_spin": 1.78,
      "motion_mode": 2,
      "motion_phase": 0.34,
      "fold_rotation": 0.92,
      "scale_pulse": 0.78,
      "surf_motion": 0.86,
      "bulb_mix": 0.92,
      "roll_speed": 1.66,
      "color_speed": 0.86,
      "palette": 2,
      "shade_mode": 3,
      "fog": 0.22,
      "glow": 1.86
    }
  }
]
```

</details>

## Quaternion Julia Flight

Raymarched quaternion Julia set with morphing constants, slice motion, and close flight paths

Effect ID: `quaternion_julia_flight`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Constant X · `c_x` | -0.18 | -1.2 to 1.2 | 0.01 |
| Constant Y · `c_y` | 0.72 | -1.2 to 1.2 | 0.01 |
| Constant Z · `c_z` | 0.04 | -1.2 to 1.2 | 0.01 |
| Constant W · `c_w` | -0.22 | -1.2 to 1.2 | 0.01 |
| Slice W · `slice_w` | 0.02 | -1.5 to 1.5 | 0.01 |
| Power · `power` | 2 | 2 to 4 | 1 |
| Orbit Iterations · `iterations` | 18 | 6 to 28 | 1 |
| Bailout · `bailout` | 6 | 2 to 12 | 0.25 |
| Surface Detail · `detail` | 1.2 | 0.5 to 2.5 | 0.05 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `flight_speed` | 0.58 | 0 to 6 | 0.05 |
| Dive Depth · `flight_depth` | 0.72 | 0 to 3.2 | 0.05 |
| Orbit Radius · `orbit_radius` | 1.28 | 0.2 to 5 | 0.05 |
| Orbit Spin Speed · `orbit_spin` | 0.38 | -4 to 4 | 0.05 |
| Julia Target · `target_mode` | Dendrite Core (0) | Dendrite Core; Coral Gate; Slice Cavern; Ribbon Knot | — |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Motion Path · `motion_mode` | Orbit Dive (0) | Orbit Dive; Figure Eight; Slice Tunnel; Surface Graze | — |
| Motion Phase · `motion_phase` | 0 | 0 to 1 | 0.01 |
| Constant Morph · `constant_morph` | 0.22 | 0 to 1.5 | 0.05 |
| Slice Motion · `slice_motion` | 0.32 | 0 to 1.5 | 0.05 |
| Roll Drift · `roll` | 0.2 | -1.5 to 1.5 | 0.05 |
| Roll Speed · `roll_speed` | 0.5 | 0 to 5 | 0.05 |
| Field of View · `fov` | 1 | 0.55 to 1.8 | 0.05 |

### Visual

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Speed · `color_speed` | 0.38 | 0 to 8 | 0.05 |
| Palette · `palette` | Alien Coral (0) | Alien Coral; Amber Glass; Blue Plasma; Rose Metal; + [71 shared palettes](Palette-Reference.md) | — |
| Shade Mode · `shade_mode` | Trap Glow (0) | Trap Glow; Normal Pearl; Orbit Bands; Slice Cavity | — |
| Depth Fog · `fog` | 0.34 | 0 to 1.5 | 0.05 |
| Edge Glow · `glow` | 1.25 | 0 to 2.5 | 0.05 |

## Hypercomplex Slice Flight

Raymarched higher-dimensional slice fractals with tetrabrot, tricomplex, octonion-style, and quaternion-bulb motion

Effect ID: `hypercomplex_slice_flight`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Tetrabrot Crown Orbit · Tricomplex Ribbon Gate · Octonion Slice Tunnel · Quaternion Bulb Graze.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Hyper Mode · `family` | Tricomplex Julia (1) | Tetrabrot Slice; Tricomplex Julia; Octonion Slice; Quaternion Mandelbulb | — |
| Constant X · `c_x` | -0.18 | -1.4 to 1.4 | 0.01 |
| Constant Y · `c_y` | 0.64 | -1.4 to 1.4 | 0.01 |
| Constant Z · `c_z` | 0.08 | -1.4 to 1.4 | 0.01 |
| Constant W · `c_w` | -0.28 | -1.4 to 1.4 | 0.01 |
| Slice W · `slice_w` | 0.04 | -1.8 to 1.8 | 0.01 |
| Power · `power` | 2.35 | 2 to 6 | 0.05 |
| Orbit Iterations · `iterations` | 19 | 6 to 32 | 1 |
| Bailout · `bailout` | 7 | 2 to 14 | 0.25 |
| Surface Detail · `detail` | 1.18 | 0.5 to 2.5 | 0.05 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `flight_speed` | 0.68 | 0 to 8 | 0.05 |
| Dive Depth · `flight_depth` | 0.82 | 0 to 4.2 | 0.05 |
| Orbit Radius · `orbit_radius` | 1.22 | 0.2 to 5.8 | 0.05 |
| Orbit Spin Speed · `orbit_spin` | 0.52 | -5 to 5 | 0.05 |
| Slice Target · `target_mode` | Ribbon Gate (1) | Dendrite Core; Ribbon Gate; Slice Cavern; Bulb Crown | — |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Motion Path · `motion_mode` | Orbit Dive (0) | Orbit Dive; Figure Eight; Slice Tunnel; Surface Graze | — |
| Motion Phase · `motion_phase` | 0 | 0 to 1 | 0.01 |
| Constant Morph · `constant_morph` | 0.34 | 0 to 1.8 | 0.05 |
| Slice Motion · `slice_motion` | 0.52 | 0 to 1.8 | 0.05 |
| 4D Rotation · `rotation_4d` | 0.46 | -2 to 2 | 0.02 |
| Roll Drift · `roll` | 0.22 | -1.8 to 1.8 | 0.05 |
| Roll Speed · `roll_speed` | 0.62 | 0 to 6 | 0.05 |
| Field of View · `fov` | 1 | 0.55 to 1.9 | 0.05 |

### Visual

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Speed · `color_speed` | 0.46 | 0 to 8 | 0.05 |
| Palette · `palette` | Blue Plasma (2) | Alien Coral; Amber Glass; Blue Plasma; Rose Metal; + [71 shared palettes](Palette-Reference.md) | — |
| Shade Mode · `shade_mode` | Trap Glow (0) | Trap Glow; Normal Pearl; Orbit Bands; Slice Cavity | — |
| Depth Fog · `fog` | 0.34 | 0 to 1.5 | 0.05 |
| Edge Glow · `glow` | 1.35 | 0 to 3 | 0.05 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Tetrabrot Crown Orbit",
    "values": {
      "family": 0,
      "c_x": -0.12,
      "c_y": 0.42,
      "c_z": 0.08,
      "c_w": -0.16,
      "slice_w": 0.06,
      "power": 2.25,
      "iterations": 19,
      "bailout": 6.5,
      "detail": 1.22,
      "flight_speed": 1.65,
      "flight_depth": 1.28,
      "orbit_radius": 1.28,
      "orbit_spin": 1.32,
      "target_mode": 0,
      "motion_mode": 0,
      "motion_phase": 0.14,
      "constant_morph": 0.62,
      "slice_motion": 0.7,
      "rotation_4d": 0.58,
      "roll": 0.22,
      "roll_speed": 1.18,
      "color_speed": 0.7,
      "palette": 0,
      "shade_mode": 2,
      "fog": 0.24,
      "glow": 1.65
    }
  },
  {
    "name": "Tricomplex Ribbon Gate",
    "values": {
      "family": 1,
      "c_x": -0.24,
      "c_y": 0.74,
      "c_z": 0.16,
      "c_w": -0.34,
      "slice_w": 0.1,
      "power": 2.75,
      "iterations": 22,
      "bailout": 7.5,
      "detail": 1.45,
      "flight_speed": 2.32,
      "flight_depth": 1.58,
      "orbit_radius": 1.1,
      "orbit_spin": 1.74,
      "target_mode": 1,
      "motion_mode": 2,
      "motion_phase": 0.31,
      "constant_morph": 1.02,
      "slice_motion": 1.1,
      "rotation_4d": 0.98,
      "roll": 0.36,
      "roll_speed": 1.64,
      "color_speed": 0.92,
      "palette": 2,
      "shade_mode": 3,
      "fog": 0.12,
      "glow": 2.12
    }
  },
  {
    "name": "Octonion Slice Tunnel",
    "values": {
      "family": 2,
      "c_x": -0.22,
      "c_y": 0.58,
      "c_z": 0.1,
      "c_w": -0.24,
      "slice_w": 0.08,
      "power": 2.85,
      "iterations": 20,
      "bailout": 7,
      "detail": 1.28,
      "flight_speed": 2.35,
      "flight_depth": 1.55,
      "orbit_radius": 1.22,
      "orbit_spin": 1.72,
      "target_mode": 2,
      "motion_mode": 2,
      "motion_phase": 0.26,
      "constant_morph": 0.88,
      "slice_motion": 0.92,
      "rotation_4d": 0.86,
      "roll": 0.34,
      "roll_speed": 1.58,
      "color_speed": 0.82,
      "palette": 2,
      "shade_mode": 3,
      "fog": 0.24,
      "glow": 1.75
    }
  },
  {
    "name": "Quaternion Bulb Graze",
    "values": {
      "family": 3,
      "c_x": -0.14,
      "c_y": 0.58,
      "c_z": 0.1,
      "c_w": -0.24,
      "slice_w": 0.08,
      "power": 3.55,
      "iterations": 24,
      "bailout": 8.5,
      "detail": 1.55,
      "flight_speed": 2.4,
      "flight_depth": 1.58,
      "orbit_radius": 1.18,
      "orbit_spin": 1.76,
      "target_mode": 3,
      "motion_mode": 3,
      "motion_phase": 0.38,
      "constant_morph": 0.92,
      "slice_motion": 1.04,
      "rotation_4d": 1.18,
      "roll": 0.48,
      "roll_speed": 1.78,
      "color_speed": 0.92,
      "palette": 3,
      "shade_mode": 2,
      "fog": 0.14,
      "glow": 2.1
    }
  }
]
```

</details>

## Schottky Inversion Flight

Raymarched Schottky sphere inversions with bubble caves, ring limits, and Apollonian-like shell motion

Effect ID: `schottky_inversion_flight`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Sphere Family · `family` | Tetra Bubbles (0) | Tetra Bubbles; Octa Bubbles; Cube Bubbles; Apollonian Shell; Ring Limit Set | — |
| Inversion Iterations · `iterations` | 9 | 3 to 18 | 1 |
| Sphere Radius · `sphere_radius` | 0.72 | 0.25 to 1.4 | 0.02 |
| Sphere Gap · `sphere_gap` | 0.42 | 0.05 to 1.6 | 0.02 |
| Center Radius · `center_radius` | 1.08 | 0.25 to 2.2 | 0.02 |
| Inversion Factor · `inversion_factor` | 1 | 0.55 to 1.45 | 0.01 |
| Bailout · `bailout` | 9 | 2 to 18 | 0.25 |
| Surface Detail · `detail` | 1.1 | 0.5 to 2.5 | 0.05 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `flight_speed` | 0.62 | 0 to 6 | 0.05 |
| Tunnel Depth · `tunnel_depth` | 0.78 | 0 to 3.2 | 0.05 |
| Orbit Radius · `orbit_radius` | 1.2 | 0.2 to 5 | 0.05 |
| Orbit Spin Speed · `orbit_spin` | 0.42 | -4 to 4 | 0.05 |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Motion Path · `motion_mode` | Bubble Orbit (0) | Bubble Orbit; Figure Eight; Limit Tunnel; Surface Graze | — |
| Motion Phase · `motion_phase` | 0 | 0 to 1 | 0.01 |
| Sphere Pulse · `sphere_pulse` | 0.36 | 0 to 1.5 | 0.05 |
| Limit Twist · `limit_twist` | 0.45 | -1.5 to 1.5 | 0.02 |
| Roll Drift · `roll` | 0.22 | -1.5 to 1.5 | 0.05 |
| Roll Speed · `roll_speed` | 0.52 | 0 to 5 | 0.05 |
| Field of View · `fov` | 1 | 0.55 to 1.8 | 0.05 |

### Visual

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Speed · `color_speed` | 0.42 | 0 to 8 | 0.05 |
| Palette · `palette` | Cyan Glass (2) | Pearl Void; Gold Bubbles; Cyan Glass; Violet Shell; + [71 shared palettes](Palette-Reference.md) | — |
| Shade Mode · `shade_mode` | Trap Glow (0) | Trap Glow; Normal Glass; Inversion Bands; Bubble Cavity | — |
| Depth Fog · `fog` | 0.32 | 0 to 1.5 | 0.05 |
| Edge Glow · `glow` | 1.4 | 0 to 2.5 | 0.05 |

## Apollonian Foam Flight

Raymarched inversion-foam and pseudo-Kleinian fly-through structures with cell, chain, cathedral, and box-hybrid motion

Effect ID: `apollonian_foam_flight`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Knighty Foam Orbit · Apollonian Cell Tunnel · Cathedral Deep Push · Sphere Chain Glide · Kleinian Box Graze.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Foam Mode · `family` | Apollonian Cell (1) | Knighty Foam; Apollonian Cell; Pseudo-Kleinian Cathedral; Sphere Chain; Kleinian Box Hybrid | — |
| Foam Iterations · `iterations` | 10 | 3 to 22 | 1 |
| Inversion Radius · `inversion_radius` | 0.92 | 0.25 to 1.8 | 0.02 |
| Foam Density · `foam_density` | 1.42 | 0.4 to 3.2 | 0.02 |
| Cell Scale · `cell_scale` | 2.35 | 1.35 to 4.2 | 0.05 |
| Sphere Gap · `sphere_gap` | 0.34 | 0.04 to 1.4 | 0.02 |
| Fold Limit · `fold_limit` | 1.05 | 0.25 to 2.2 | 0.02 |
| Bailout · `bailout` | 8.5 | 2 to 18 | 0.25 |
| Surface Detail · `detail` | 1.16 | 0.5 to 2.5 | 0.05 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `flight_speed` | 0.74 | 0 to 8 | 0.05 |
| Tunnel Depth · `tunnel_depth` | 0.98 | 0 to 4.4 | 0.05 |
| Orbit Radius · `orbit_radius` | 1.18 | 0.2 to 5.8 | 0.05 |
| Orbit Spin Speed · `orbit_spin` | 0.58 | -5 to 5 | 0.05 |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Motion Path · `motion_mode` | Cell Tunnel (2) | Foam Orbit; Figure Eight; Cell Tunnel; Surface Graze | — |
| Motion Phase · `motion_phase` | 0 | 0 to 1 | 0.01 |
| Inversion Pulse · `inversion_pulse` | 0.52 | 0 to 1.8 | 0.05 |
| Limit Twist · `limit_twist` | 0.58 | -2 to 2 | 0.02 |
| Cell Breath · `cell_breath` | 0.62 | 0 to 1.8 | 0.05 |
| Roll Drift · `roll` | 0.24 | -1.8 to 1.8 | 0.05 |
| Roll Speed · `roll_speed` | 0.68 | 0 to 6 | 0.05 |
| Field of View · `fov` | 0.98 | 0.55 to 1.9 | 0.05 |

### Visual

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Speed · `color_speed` | 0.52 | 0 to 8 | 0.05 |
| Palette · `palette` | Emerald Glass (1) | Ivory Foam; Emerald Glass; Magenta Plasma; Copper Void; + [71 shared palettes](Palette-Reference.md) | — |
| Shade Mode · `shade_mode` | Trap Glow (0) | Trap Glow; Normal Pearl; Inversion Bands; Cell Cavities | — |
| Depth Fog · `fog` | 0.3 | 0 to 1.5 | 0.05 |
| Edge Glow · `glow` | 1.55 | 0 to 3 | 0.05 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Knighty Foam Orbit",
    "values": {
      "family": 0,
      "iterations": 11,
      "inversion_radius": 0.94,
      "foam_density": 1.28,
      "cell_scale": 2.52,
      "sphere_gap": 0.28,
      "fold_limit": 1.02,
      "flight_speed": 2.2,
      "tunnel_depth": 1.45,
      "orbit_spin": 1.52,
      "motion_mode": 0,
      "motion_phase": 0.12,
      "inversion_pulse": 0.78,
      "limit_twist": 0.82,
      "cell_breath": 0.74,
      "roll_speed": 1.42,
      "color_speed": 0.76,
      "palette": 0,
      "shade_mode": 2,
      "fog": 0.22,
      "glow": 1.8
    }
  },
  {
    "name": "Apollonian Cell Tunnel",
    "values": {
      "family": 1,
      "iterations": 11,
      "inversion_radius": 0.9,
      "foam_density": 1.74,
      "cell_scale": 2.42,
      "sphere_gap": 0.3,
      "fold_limit": 1.08,
      "flight_speed": 2.35,
      "tunnel_depth": 1.7,
      "orbit_spin": 1.64,
      "motion_mode": 2,
      "motion_phase": 0.22,
      "inversion_pulse": 0.84,
      "limit_twist": 0.72,
      "cell_breath": 0.9,
      "roll_speed": 1.56,
      "color_speed": 0.82,
      "palette": 1,
      "shade_mode": 3,
      "fog": 0.2,
      "glow": 1.85
    }
  },
  {
    "name": "Cathedral Deep Push",
    "values": {
      "family": 2,
      "iterations": 12,
      "inversion_radius": 0.96,
      "foam_density": 1.52,
      "cell_scale": 2.5,
      "sphere_gap": 0.26,
      "fold_limit": 1.1,
      "flight_speed": 2.45,
      "tunnel_depth": 1.78,
      "orbit_spin": 1.78,
      "motion_mode": 2,
      "motion_phase": 0.31,
      "inversion_pulse": 0.82,
      "limit_twist": 0.94,
      "cell_breath": 0.86,
      "roll_speed": 1.68,
      "color_speed": 0.88,
      "palette": 2,
      "shade_mode": 3,
      "fog": 0.22,
      "glow": 1.9
    }
  },
  {
    "name": "Sphere Chain Glide",
    "values": {
      "family": 3,
      "iterations": 11,
      "inversion_radius": 0.86,
      "foam_density": 1.92,
      "cell_scale": 2.34,
      "sphere_gap": 0.24,
      "fold_limit": 0.96,
      "flight_speed": 2.3,
      "tunnel_depth": 1.88,
      "orbit_spin": 1.72,
      "motion_mode": 2,
      "motion_phase": 0.41,
      "inversion_pulse": 0.72,
      "limit_twist": 0.88,
      "cell_breath": 0.78,
      "roll_speed": 1.62,
      "color_speed": 0.84,
      "palette": 1,
      "shade_mode": 2,
      "fog": 0.18,
      "glow": 1.95
    }
  },
  {
    "name": "Kleinian Box Graze",
    "values": {
      "family": 4,
      "iterations": 12,
      "inversion_radius": 1,
      "foam_density": 1.34,
      "cell_scale": 2.24,
      "sphere_gap": 0.3,
      "fold_limit": 0.96,
      "bailout": 8.5,
      "detail": 1.16,
      "flight_speed": 2.34,
      "tunnel_depth": 1.28,
      "orbit_radius": 1.4,
      "orbit_spin": 1.72,
      "motion_mode": 2,
      "motion_phase": 0.5,
      "inversion_pulse": 0.82,
      "limit_twist": 0.92,
      "cell_breath": 0.78,
      "roll_speed": 1.62,
      "color_speed": 0.86,
      "palette": 3,
      "shade_mode": 3,
      "fog": 0.18,
      "glow": 2
    }
  }
]
```

</details>

## Polyfold Flight

Raymarched polyhedral KIFS folds with cathedral, tetrahedral, star, sponge, lattice, and hybrid flight paths

Effect ID: `polyfold_flight`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Fold Family · `family` | Menger Cathedral (0) | Menger Cathedral; Sierpinski Tetra; Icosa Dodeca Fold; Cross Sponge; Crystal Lattice; Hybrid Fold Stack | — |
| Fold Iterations · `iterations` | 9 | 3 to 16 | 1 |
| Fold Scale · `fold_scale` | 2.68 | 1.5 to 4.2 | 0.05 |
| Fold Offset · `fold_offset` | 0.78 | 0.15 to 1.8 | 0.02 |
| Fold Bias · `fold_bias` | 0.08 | -0.8 to 0.8 | 0.02 |
| Fold Rotation · `fold_rotation` | 0.42 | -1.5 to 1.5 | 0.02 |
| Poly Twist · `poly_twist` | 0.32 | -1.5 to 1.5 | 0.02 |
| Bailout · `bailout` | 3.6 | 1.4 to 7 | 0.1 |
| Core Thickness · `thickness` | 0.86 | 0.18 to 2 | 0.02 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `flight_speed` | 0.7 | 0 to 7 | 0.05 |
| Tunnel Depth · `tunnel_depth` | 0.76 | 0 to 3.6 | 0.05 |
| Orbit Radius · `orbit_radius` | 1.05 | 0.2 to 5.2 | 0.05 |
| Orbit Spin Speed · `orbit_spin` | 0.55 | -5 to 5 | 0.05 |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Motion Path · `motion_mode` | Fold Tunnel (2) | Cathedral Orbit; Figure Eight; Fold Tunnel; Surface Graze | — |
| Motion Phase · `motion_phase` | 0 | 0 to 1 | 0.01 |
| Structure Pulse · `structure_pulse` | 0.45 | 0 to 1.5 | 0.05 |
| Roll Drift · `roll` | 0.28 | -1.5 to 1.5 | 0.05 |
| Roll Speed · `roll_speed` | 0.72 | 0 to 5.5 | 0.05 |
| Field of View · `fov` | 0.96 | 0.55 to 1.8 | 0.05 |

### Visual

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Speed · `color_speed` | 0.52 | 0 to 8 | 0.05 |
| Palette · `palette` | Ember Geometry (3) | Cathedral Brass; Magenta Crystal; Ice Circuit; Ember Geometry; + [71 shared palettes](Palette-Reference.md) | — |
| Shade Mode · `shade_mode` | Trap Glow (0) | Trap Glow; Normal Glass; Iteration Bands; Cell Pulse | — |
| Depth Fog · `fog` | 0.3 | 0 to 1.5 | 0.05 |
| Edge Glow · `glow` | 1.75 | 0 to 2.8 | 0.05 |

## 3D Fractal Flame Volume Flight

Volumetric IFS/flame-inspired clouds with nonlinear 3D transforms, density tonemapping, and fly-through motion

Effect ID: `fractal_flame_volume_flight`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Swirl Flame Dive · Spherical Bloom Cloud · Curl Lattice Corridor · Bubble Nest Spiral.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flame Mode · `flame_mode` | Swirl Flame (0) | Swirl Flame; Spherical Bloom; Curl Lattice; Bubble Nest | — |
| IFS Iterations · `iterations` | 12 | 5 to 22 | 1 |
| Affine Scale · `affine_scale` | 1.22 | 0.65 to 2.2 | 0.02 |
| Swirl Strength · `swirl_strength` | 0.95 | 0 to 2.4 | 0.02 |
| Spherical Warp · `spherical_warp` | 0.82 | 0 to 2.4 | 0.02 |
| Volume Density · `density` | 1.22 | 0.3 to 3 | 0.02 |
| Volume Detail · `detail` | 1.15 | 0.5 to 2.5 | 0.05 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `flight_speed` | 0.72 | 0 to 8 | 0.05 |
| Dive Depth · `flight_depth` | 0.95 | 0 to 4.6 | 0.05 |
| Orbit Radius · `orbit_radius` | 1.18 | 0.2 to 5.8 | 0.05 |
| Orbit Spin Speed · `orbit_spin` | 0.58 | -5 to 5 | 0.05 |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Motion Path · `motion_mode` | Volume Tunnel (2) | Cloud Orbit; Figure Eight; Volume Tunnel; Surface Graze | — |
| Motion Phase · `motion_phase` | 0 | 0 to 1 | 0.01 |
| Transform Morph · `transform_morph` | 0.58 | 0 to 1.8 | 0.05 |
| Volume Twist · `volume_twist` | 0.72 | -2 to 2 | 0.02 |
| Color Bleed · `color_bleed` | 0.62 | 0 to 1.8 | 0.05 |
| Roll Drift · `roll` | 0.24 | -1.8 to 1.8 | 0.05 |
| Roll Speed · `roll_speed` | 0.68 | 0 to 6 | 0.05 |
| Field of View · `fov` | 1 | 0.55 to 1.9 | 0.05 |

### Visual

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Speed · `color_speed` | 0.52 | 0 to 8 | 0.05 |
| Palette · `palette` | Electric Sheep (0) | Electric Sheep; Jade Smoke; Violet Ember; Solar Glass; + [71 shared palettes](Palette-Reference.md) | — |
| Shade Mode · `shade_mode` | Density Glow (0) | Density Glow; Color Lineage; Hot Core; Soft Film | — |
| Depth Fog · `fog` | 0.28 | 0 to 1.5 | 0.05 |
| Edge Glow · `glow` | 1.45 | 0 to 3 | 0.05 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Swirl Flame Dive",
    "values": {
      "flame_mode": 0,
      "iterations": 17,
      "affine_scale": 1.42,
      "swirl_strength": 1.58,
      "spherical_warp": 0.54,
      "density": 1.28,
      "detail": 2.35,
      "flight_speed": 2.3,
      "flight_depth": 1.36,
      "orbit_radius": 1.42,
      "orbit_spin": 1.72,
      "motion_mode": 2,
      "motion_phase": 0.3,
      "transform_morph": 1.32,
      "volume_twist": 1.58,
      "color_bleed": 0.7,
      "roll": 0.34,
      "roll_speed": 1.58,
      "fov": 1.78,
      "color_speed": 0.92,
      "palette": 0,
      "shade_mode": 2,
      "fog": 0,
      "glow": 1.36
    }
  },
  {
    "name": "Spherical Bloom Cloud",
    "values": {
      "flame_mode": 1,
      "iterations": 14,
      "affine_scale": 1.18,
      "swirl_strength": 0.82,
      "spherical_warp": 1.24,
      "density": 1.48,
      "detail": 1.3,
      "flight_speed": 2.24,
      "flight_depth": 1.58,
      "orbit_radius": 1.28,
      "orbit_spin": 1.58,
      "motion_mode": 0,
      "motion_phase": 0.28,
      "transform_morph": 0.94,
      "volume_twist": 0.74,
      "color_bleed": 0.82,
      "roll": 0.3,
      "roll_speed": 1.48,
      "fov": 1.04,
      "color_speed": 0.84,
      "palette": 1,
      "shade_mode": 3,
      "fog": 0.24,
      "glow": 1.94
    }
  },
  {
    "name": "Curl Lattice Corridor",
    "values": {
      "flame_mode": 2,
      "iterations": 15,
      "affine_scale": 1.34,
      "swirl_strength": 1.22,
      "spherical_warp": 0.88,
      "density": 1.42,
      "detail": 1.35,
      "flight_speed": 2.42,
      "flight_depth": 1.72,
      "orbit_radius": 1.06,
      "orbit_spin": 1.76,
      "motion_mode": 2,
      "motion_phase": 0.38,
      "transform_morph": 1.08,
      "volume_twist": 1.08,
      "color_bleed": 0.92,
      "roll": 0.36,
      "roll_speed": 1.62,
      "fov": 0.94,
      "color_speed": 0.92,
      "palette": 2,
      "shade_mode": 2,
      "fog": 0.18,
      "glow": 2.06
    }
  },
  {
    "name": "Bubble Nest Spiral",
    "values": {
      "flame_mode": 3,
      "iterations": 16,
      "affine_scale": 1.12,
      "swirl_strength": 0.86,
      "spherical_warp": 1.34,
      "density": 1.34,
      "detail": 1.42,
      "flight_speed": 2.34,
      "flight_depth": 1.66,
      "orbit_radius": 1.16,
      "orbit_spin": 1.66,
      "motion_mode": 1,
      "motion_phase": 0.52,
      "transform_morph": 1.18,
      "volume_twist": -0.92,
      "color_bleed": 1.02,
      "roll": -0.32,
      "roll_speed": 1.54,
      "fov": 0.98,
      "color_speed": 0.88,
      "palette": 3,
      "shade_mode": 1,
      "fog": 0.22,
      "glow": 2
    }
  }
]
```

</details>

## Strange Attractor Flight

Volumetric fly-throughs built from integrated Lorenz, Thomas, Aizawa, and Rossler phase-space trajectories

Effect ID: `strange_attractor_flight`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Lorenz Wing Dive · Thomas Knot Orbit · Aizawa Bloom Tunnel · Rossler Spiral Graze.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Attractor Mode · `attractor_mode` | Lorenz Wings (0) | Lorenz Wings; Thomas Knot; Aizawa Bloom; Rossler Spiral | — |
| Orbit Steps · `orbit_steps` | 28 | 8 to 48 | 1 |
| Curve Scale · `curve_scale` | 1.05 | 0.45 to 2.2 | 0.02 |
| Trail Width · `trail_width` | 0.1 | 0.035 to 0.26 | 0.005 |
| Lobe Spread · `lobe_spread` | 0.82 | 0.2 to 1.8 | 0.02 |
| Chaos · `chaos` | 0.78 | 0 to 1.8 | 0.02 |
| Trail Density · `density` | 1.3 | 0.3 to 3 | 0.02 |
| Trail Detail · `detail` | 1.15 | 0.5 to 2.5 | 0.05 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `flight_speed` | 0.72 | 0 to 8 | 0.05 |
| Dive Depth · `flight_depth` | 0.95 | 0 to 4.6 | 0.05 |
| Orbit Radius · `orbit_radius` | 1.18 | 0.2 to 5.8 | 0.05 |
| Orbit Spin Speed · `orbit_spin` | 0.58 | -5 to 5 | 0.05 |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Motion Path · `motion_mode` | Ribbon Tunnel (2) | Attractor Orbit; Figure Eight; Ribbon Tunnel; Surface Graze | — |
| Motion Phase · `motion_phase` | 0 | 0 to 1 | 0.01 |
| Ribbon Twist · `ribbon_twist` | 0.72 | -2 to 2 | 0.02 |
| Phase Drift · `phase_drift` | 0.72 | 0 to 1.8 | 0.05 |
| Roll Drift · `roll` | 0.24 | -1.8 to 1.8 | 0.05 |
| Roll Speed · `roll_speed` | 0.68 | 0 to 6 | 0.05 |
| Field of View · `fov` | 1 | 0.55 to 1.9 | 0.05 |

### Visual

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Speed · `color_speed` | 0.52 | 0 to 8 | 0.05 |
| Palette · `palette` | Phase Neon (0) | Phase Neon; Amber Orbit; Blue Silk; Rose Copper; + [71 shared palettes](Palette-Reference.md) | — |
| Shade Mode · `shade_mode` | Trail Glow (0) | Trail Glow; Phase Bands; Ribbon Core; Point Cloud | — |
| Depth Fog · `fog` | 0.26 | 0 to 1.5 | 0.05 |
| Edge Glow · `glow` | 1.45 | 0 to 3 | 0.05 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Lorenz Wing Dive",
    "values": {
      "attractor_mode": 0,
      "orbit_steps": 28,
      "curve_scale": 1.1,
      "trail_width": 0.105,
      "lobe_spread": 0.86,
      "chaos": 0.76,
      "density": 1.42,
      "detail": 1.18,
      "flight_speed": 2.08,
      "flight_depth": 1.48,
      "orbit_radius": 1.2,
      "orbit_spin": 1.44,
      "motion_mode": 2,
      "motion_phase": 0.18,
      "ribbon_twist": 0.74,
      "phase_drift": 0.82,
      "roll": 0.28,
      "roll_speed": 1.34,
      "fov": 1,
      "color_speed": 0.78,
      "palette": 0,
      "shade_mode": 2,
      "fog": 0.2,
      "glow": 1.8
    }
  },
  {
    "name": "Thomas Knot Orbit",
    "values": {
      "attractor_mode": 1,
      "orbit_steps": 30,
      "curve_scale": 1.18,
      "trail_width": 0.092,
      "lobe_spread": 0.72,
      "chaos": 1.02,
      "density": 1.55,
      "detail": 1.3,
      "flight_speed": 2.24,
      "flight_depth": 1.56,
      "orbit_radius": 1.14,
      "orbit_spin": 1.62,
      "motion_mode": 0,
      "motion_phase": 0.3,
      "ribbon_twist": 1.04,
      "phase_drift": 0.96,
      "roll": 0.34,
      "roll_speed": 1.48,
      "fov": 0.96,
      "color_speed": 0.86,
      "palette": 1,
      "shade_mode": 3,
      "fog": 0.18,
      "glow": 1.92
    }
  },
  {
    "name": "Aizawa Bloom Tunnel",
    "values": {
      "attractor_mode": 2,
      "orbit_steps": 32,
      "curve_scale": 1.08,
      "trail_width": 0.115,
      "lobe_spread": 0.94,
      "chaos": 0.88,
      "density": 1.5,
      "detail": 1.36,
      "flight_speed": 2.42,
      "flight_depth": 1.7,
      "orbit_radius": 1.05,
      "orbit_spin": 1.78,
      "motion_mode": 2,
      "motion_phase": 0.42,
      "ribbon_twist": 1.12,
      "phase_drift": 1.08,
      "roll": 0.4,
      "roll_speed": 1.62,
      "fov": 0.92,
      "color_speed": 0.94,
      "palette": 2,
      "shade_mode": 1,
      "fog": 0.16,
      "glow": 2.04
    }
  },
  {
    "name": "Rossler Spiral Graze",
    "values": {
      "attractor_mode": 3,
      "orbit_steps": 34,
      "curve_scale": 1.22,
      "trail_width": 0.1,
      "lobe_spread": 1.12,
      "chaos": 1.18,
      "density": 1.46,
      "detail": 1.4,
      "flight_speed": 2.3,
      "flight_depth": 1.62,
      "orbit_radius": 1.24,
      "orbit_spin": 1.52,
      "motion_mode": 3,
      "motion_phase": 0.56,
      "ribbon_twist": -0.88,
      "phase_drift": 1.14,
      "roll": -0.36,
      "roll_speed": 1.5,
      "fov": 0.98,
      "color_speed": 0.9,
      "palette": 3,
      "shade_mode": 2,
      "fog": 0.2,
      "glow": 1.96
    }
  }
]
```

</details>

## L-System Tube Flight

Procedural turtle-branch tube fields inspired by 3D L-systems, with fly-through growth and branch sway animation

Effect ID: `lsystem_tube_flight`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Branch Grove Dive · Crystal Fern Cathedral · Coral Fork Drift · Root Cathedral Descent.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| System Mode · `system_mode` | Branch Grove (0) | Branch Grove; Crystal Fern; Coral Fork; Root Cathedral | — |
| Branch Iterations · `iterations` | 9 | 4 to 12 | 1 |
| Branch Angle · `branch_angle` | 0.78 | 0.15 to 1.45 | 0.02 |
| Branch Scale · `branch_scale` | 0.76 | 0.45 to 0.94 | 0.01 |
| Tube Radius · `tube_radius` | 0.066 | 0.025 to 0.16 | 0.005 |
| Fork Density · `fork_density` | 0.92 | 0.2 to 1.8 | 0.02 |
| Branch Curl · `curl` | 0.62 | -1.8 to 1.8 | 0.02 |
| Branch Detail · `detail` | 1.15 | 0.5 to 2.5 | 0.05 |
| Preview Quality · `quality` | 0.75 | 0.35 to 1.5 | 0.05 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `flight_speed` | 0.72 | 0 to 8 | 0.05 |
| Dive Depth · `flight_depth` | 0.95 | 0 to 4.6 | 0.05 |
| Orbit Radius · `orbit_radius` | 1.18 | 0.2 to 5.8 | 0.05 |
| Orbit Spin Speed · `orbit_spin` | 0.58 | -5 to 5 | 0.05 |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Motion Path · `motion_mode` | Branch Tunnel (2) | Canopy Orbit; Figure Eight; Branch Tunnel; Root Graze | — |
| Motion Phase · `motion_phase` | 0 | 0 to 1 | 0.01 |
| Growth Phase · `growth_phase` | 0.7 | 0 to 1.8 | 0.05 |
| Branch Sway · `branch_sway` | 0.7 | 0 to 1.8 | 0.05 |
| Roll Drift · `roll` | 0.24 | -1.8 to 1.8 | 0.05 |
| Roll Speed · `roll_speed` | 0.68 | 0 to 6 | 0.05 |
| Field of View · `fov` | 0.98 | 0.55 to 1.9 | 0.05 |

### Visual

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Speed · `color_speed` | 0.52 | 0 to 8 | 0.05 |
| Palette · `palette` | Viridian Bark (0) | Viridian Bark; Ice Fern; Coral Glow; Root Ember; + [71 shared palettes](Palette-Reference.md) | — |
| Shade Mode · `shade_mode` | Tube Normals (0) | Tube Normals; Growth Rings; Crystal Tips; Filament Glow | — |
| Depth Fog · `fog` | 0.32 | 0 to 1.5 | 0.05 |
| Edge Glow · `glow` | 1.4 | 0 to 3 | 0.05 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Branch Grove Dive",
    "values": {
      "system_mode": 0,
      "iterations": 9,
      "branch_angle": 0.82,
      "branch_scale": 0.76,
      "tube_radius": 0.07,
      "fork_density": 0.88,
      "curl": 0.62,
      "detail": 1.18,
      "flight_speed": 2.06,
      "flight_depth": 1.48,
      "orbit_radius": 1.18,
      "orbit_spin": 1.42,
      "motion_mode": 2,
      "motion_phase": 0.18,
      "growth_phase": 0.74,
      "branch_sway": 0.72,
      "roll": 0.26,
      "roll_speed": 1.34,
      "fov": 0.98,
      "color_speed": 0.76,
      "palette": 0,
      "shade_mode": 1,
      "fog": 0.28,
      "glow": 1.78
    }
  },
  {
    "name": "Crystal Fern Cathedral",
    "values": {
      "system_mode": 1,
      "iterations": 10,
      "branch_angle": 0.68,
      "branch_scale": 0.82,
      "tube_radius": 0.055,
      "fork_density": 1.04,
      "curl": 0.9,
      "detail": 1.32,
      "flight_speed": 2.24,
      "flight_depth": 1.64,
      "orbit_radius": 1.08,
      "orbit_spin": 1.62,
      "motion_mode": 2,
      "motion_phase": 0.32,
      "growth_phase": 0.92,
      "branch_sway": 0.88,
      "roll": 0.34,
      "roll_speed": 1.48,
      "fov": 0.92,
      "color_speed": 0.88,
      "palette": 1,
      "shade_mode": 2,
      "fog": 0.22,
      "glow": 1.96
    }
  },
  {
    "name": "Coral Fork Drift",
    "values": {
      "system_mode": 2,
      "iterations": 11,
      "branch_angle": 1.08,
      "branch_scale": 0.72,
      "tube_radius": 0.078,
      "fork_density": 1.18,
      "curl": 1.06,
      "detail": 1.38,
      "flight_speed": 2.42,
      "flight_depth": 1.76,
      "orbit_radius": 1.22,
      "orbit_spin": 1.78,
      "motion_mode": 0,
      "motion_phase": 0.44,
      "growth_phase": 1.1,
      "branch_sway": 1.02,
      "roll": 0.4,
      "roll_speed": 1.62,
      "fov": 0.96,
      "color_speed": 0.96,
      "palette": 2,
      "shade_mode": 3,
      "fog": 0.2,
      "glow": 2.08
    }
  },
  {
    "name": "Root Cathedral Descent",
    "values": {
      "system_mode": 3,
      "iterations": 12,
      "branch_angle": 0.92,
      "branch_scale": 0.78,
      "tube_radius": 0.086,
      "fork_density": 0.96,
      "curl": -0.88,
      "detail": 1.42,
      "flight_speed": 2.28,
      "flight_depth": 1.7,
      "orbit_radius": 1.12,
      "orbit_spin": 1.56,
      "motion_mode": 3,
      "motion_phase": 0.58,
      "growth_phase": 1.2,
      "branch_sway": 0.86,
      "roll": -0.38,
      "roll_speed": 1.56,
      "fov": 0.94,
      "color_speed": 0.88,
      "palette": 3,
      "shade_mode": 1,
      "fog": 0.24,
      "glow": 2.02
    }
  }
]
```

</details>

## Glass Fractal DE Flight

Distance-estimator scenes with glass, mirror, refraction, and a secondary reflection march

Effect ID: `path_traced_fractal_flight`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Glass Mandelbox Dive · Crystal Bulb Chamber · Mirror Menger Corridor · Void Caustic Shell Orbit.

### Formula

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| DE Scene · `trace_mode` | Glass Mandelbox (0) | Glass Mandelbox; Crystal Bulb; Mirror Menger; Void Caustic Shell | — |
| Formula Iterations · `iterations` | 12 | 5 to 22 | 1 |
| Ray Steps · `march_steps` | 92 | 48 to 140 | 4 |
| Fold Scale · `fold_scale` | 2.15 | 1.1 to 3.2 | 0.02 |
| Surface Mix · `surface_mix` | 0.72 | 0 to 1 | 0.02 |
| Roughness · `roughness` | 0.18 | 0.02 to 0.75 | 0.01 |
| Glass IOR · `ior` | 1.45 | 1.05 to 2.2 | 0.01 |
| Bounce Mix · `bounce_mix` | 0.78 | 0 to 1.4 | 0.02 |
| Trace Detail · `detail` | 1.15 | 0.5 to 2.5 | 0.05 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `flight_speed` | 0.72 | 0 to 8 | 0.05 |
| Dive Depth · `flight_depth` | 0.95 | 0 to 4.6 | 0.05 |
| Orbit Radius · `orbit_radius` | 1.18 | 0.2 to 5.8 | 0.05 |
| Orbit Spin Speed · `orbit_spin` | 0.58 | -5 to 5 | 0.05 |

### Animation

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Motion Path · `motion_mode` | Glass Corridor (2) | Trace Orbit; Figure Eight; Glass Corridor; Surface Graze | — |
| Motion Phase · `motion_phase` | 0 | 0 to 1 | 0.01 |
| Refraction Flow · `refraction_flow` | 0.78 | 0 to 1.8 | 0.05 |
| Caustic Spin · `caustic_spin` | 0.72 | -2 to 2 | 0.02 |
| Roll Drift · `roll` | 0.24 | -1.8 to 1.8 | 0.05 |
| Roll Speed · `roll_speed` | 0.68 | 0 to 6 | 0.05 |
| Field of View · `fov` | 0.98 | 0.55 to 1.9 | 0.05 |

### Visual

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Speed · `color_speed` | 0.52 | 0 to 8 | 0.05 |
| Palette · `palette` | Glass Prism (0) | Glass Prism; Opal Flame; Chrome Cyan; Void Gold; + [71 shared palettes](Palette-Reference.md) | — |
| Shade Mode · `shade_mode` | Fresnel Glass (0) | Fresnel Glass; Mirror Bands; Caustic Core; Milky Crystal | — |
| Depth Fog · `fog` | 0.28 | 0 to 1.5 | 0.05 |
| Edge Glow · `glow` | 1.42 | 0 to 3 | 0.05 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Glass Mandelbox Dive",
    "values": {
      "trace_mode": 0,
      "iterations": 12,
      "march_steps": 92,
      "fold_scale": 2.18,
      "surface_mix": 0.72,
      "roughness": 0.18,
      "ior": 1.46,
      "bounce_mix": 0.78,
      "detail": 1.18,
      "flight_speed": 2.08,
      "flight_depth": 1.5,
      "orbit_radius": 1.18,
      "orbit_spin": 1.42,
      "motion_mode": 2,
      "motion_phase": 0.2,
      "refraction_flow": 0.82,
      "caustic_spin": 0.76,
      "roll": 0.28,
      "roll_speed": 1.34,
      "fov": 0.98,
      "color_speed": 0.78,
      "palette": 0,
      "shade_mode": 2,
      "fog": 0.2,
      "glow": 1.76
    }
  },
  {
    "name": "Crystal Bulb Chamber",
    "values": {
      "trace_mode": 1,
      "iterations": 14,
      "march_steps": 104,
      "fold_scale": 1.86,
      "surface_mix": 0.82,
      "roughness": 0.12,
      "ior": 1.54,
      "bounce_mix": 0.88,
      "detail": 1.3,
      "flight_speed": 2.24,
      "flight_depth": 1.62,
      "orbit_radius": 1.12,
      "orbit_spin": 1.6,
      "motion_mode": 0,
      "motion_phase": 0.34,
      "refraction_flow": 0.96,
      "caustic_spin": 0.92,
      "roll": 0.34,
      "roll_speed": 1.48,
      "fov": 0.94,
      "color_speed": 0.88,
      "palette": 1,
      "shade_mode": 3,
      "fog": 0.18,
      "glow": 1.94
    }
  },
  {
    "name": "Mirror Menger Corridor",
    "values": {
      "trace_mode": 2,
      "iterations": 9,
      "march_steps": 108,
      "fold_scale": 2.42,
      "surface_mix": 0.66,
      "roughness": 0.22,
      "ior": 1.36,
      "bounce_mix": 0.96,
      "detail": 1.36,
      "flight_speed": 2.44,
      "flight_depth": 1.78,
      "orbit_radius": 1.02,
      "orbit_spin": 1.78,
      "motion_mode": 2,
      "motion_phase": 0.46,
      "refraction_flow": 1.04,
      "caustic_spin": 1.1,
      "roll": 0.4,
      "roll_speed": 1.62,
      "fov": 0.9,
      "color_speed": 0.96,
      "palette": 2,
      "shade_mode": 1,
      "fog": 0.16,
      "glow": 2.08
    }
  },
  {
    "name": "Void Caustic Shell Orbit",
    "values": {
      "trace_mode": 3,
      "iterations": 12,
      "march_steps": 112,
      "fold_scale": 2.28,
      "surface_mix": 0.78,
      "roughness": 0.26,
      "ior": 1.62,
      "bounce_mix": 1.08,
      "detail": 1.42,
      "flight_speed": 2.36,
      "flight_depth": 1.7,
      "orbit_radius": 1.16,
      "orbit_spin": 1.58,
      "motion_mode": 1,
      "motion_phase": 0.6,
      "refraction_flow": 1.18,
      "caustic_spin": -1.04,
      "roll": -0.34,
      "roll_speed": 1.54,
      "fov": 0.92,
      "color_speed": 0.92,
      "palette": 3,
      "shade_mode": 2,
      "fog": 0.18,
      "glow": 2.1
    }
  }
]
```

</details>

## Kleinian Group

Limit sets of Kleinian groups - intricate lacework of circles and gaskets

Effect ID: `kleinian`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Iterations · `max_iter` | 100 | 20 to 300 | 10 |
| Zoom · `zoom` | 1 | 0.3 to 5 | 0.1 |
| Parameter A · `param_a` | 1.96 | 1.5 to 2.5 | 0.01 |
| Parameter B · `param_b` | 0.5 | 0 to 2 | 0.01 |
| Color Speed · `color_speed` | 0.3 | 0 to 8 | 0.05 |
| Animate · `animate` | 0.1 | 0 to 1 | 0.05 |
