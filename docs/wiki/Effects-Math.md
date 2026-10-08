# Math: Effect Reference

[All effects](Effect-Catalog.md) · [Using controls](Interface-Guide.md) · [Palettes](Palette-Reference.md)

Generated from the running app by `node tools/build-wiki-reference.mjs`. Values are base defaults, before presets or audio modulation. Select values are zero-based indices in saved data; the UI shows labels. Ranges use the app’s stored units; controls marked as percentages may display a scaled value.

- [Voronoi Cells](#voronoi-cells)
- [Lissajous](#lissajous)
- [Spirograph](#spirograph)
- [Sine Interference](#sine-interference)
- [Polar Spiral](#polar-spiral)
- [Strange Attractors](#strange-attractors)
- [Cymatics](#cymatics)
- [4D Polytopes](#4d-polytopes)
- [Phyllotaxis](#phyllotaxis)
- [Fourier Epicycles](#fourier-epicycles)
- [Complex Domain Colouring](#complex-domain-colouring)
- [Hopf Fibration](#hopf-fibration)
- [Knots & Surfaces](#knots--surfaces)

## Voronoi Cells

Organic cell patterns like soap bubbles or stained glass

Effect ID: `voronoi`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Speed · `speed` | 0.8 | 0.1 to 3 | 0.1 |
| Cell Density · `cell_count` | 5 | 2 to 15 | 1 |
| Border Width · `border_width` | 0.03 | 0 to 0.15 | 0.005 |
| Color Speed · `color_speed` | 0.5 | 0 to 2 | 0.05 |
| Style · `style` | Stained Glass (3) | Flat Cells; Distance Gradient; Edges Only; Stained Glass | — |

## Lissajous

Lissajous figures, damped harmonographs, rose curves, 3D Lissajous knots and the butterfly curve as glowing lines

Effect ID: `lissajous`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Curve Family · `style` | Lissajous (0) | Lissajous; Harmonograph; Rose Curve; 3D Lissajous Knot; Butterfly Curve | — |
| Speed · `speed` | 0.5 | 0.1 to 3 | 0.1 |
| Freq X · `freq_x` | 3 | 1 to 10 | 0.1 |
| Freq Y · `freq_y` | 4 | 1 to 10 | 0.1 |
| Damping / Twist · `damping` | 0.35 | 0 to 1 | 0.01 |
| Line Width · `thickness` | 2.4 | 0.5 to 12 | 0.1 |
| Echo Count · `trails` | 4 | 1 to 8 | 1 |
| Trails · `trail_fade` | 0.5 | 0 to 0.97 | 0.01 |
| Auto Morph · `morph` | 0.3 | 0 to 1 | 0.05 |
| Glow · `glow` | 1.4 | 0 to 3 | 0.1 |
| Palette · `palette` | Rainbow (0) | Rainbow; Neon; Ember; + [71 shared palettes](Palette-Reference.md) | — |
| Background · `background` | Black (1) | Deep Space; Black; Nebula Glow; Ink on Paper | — |

## Spirograph

Hypotrochoids, epitrochoids, cycloid stars, Farris wheels and guilloche rosettes as glowing layered lines

Effect ID: `spirograph`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Roulette · `style` | Hypotrochoid (0) | Hypotrochoid; Epitrochoid; Hypocycloid Star; Epicycloid; Farris Wheel; Guilloche Rosette | — |
| Speed · `speed` | 0.8 | 0.1 to 3 | 0.1 |
| Outer Radius · `R` | 5 | 1 to 10 | 0.5 |
| Inner Radius · `r` | 3 | 0.5 to 8 | 0.5 |
| Pen Distance · `d` | 2.5 | 0.5 to 8 | 0.5 |
| Breathing · `breathe` | 1 | 0 to 2 | 0.05 |
| Spin · `spin` | 0.3 | -2 to 2 | 0.05 |
| Zoom · `zoom` | 1 | 0.3 to 3 | 0.05 |
| Line Width · `thickness` | 1.8 | 0.5 to 12 | 0.1 |
| Layers · `trails` | 3 | 1 to 8 | 1 |
| Trails · `trail_fade` | 0.35 | 0 to 0.97 | 0.01 |
| Glow · `glow` | 1.4 | 0 to 3 | 0.1 |
| Palette · `palette` | Rainbow (0) | Rainbow; Neon; Ember; + [71 shared palettes](Palette-Reference.md) | — |
| Background · `background` | Black (1) | Deep Space; Black; Nebula Glow; Ink on Paper | — |

## Sine Interference

Pulsating concentric rings and beating interference patterns

Effect ID: `sine_interference`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Speed · `speed` | 1.5 | 0.1 to 5 | 0.1 |
| Sources · `sources` | 4 | 2 to 8 | 1 |
| Frequency · `frequency` | 20 | 5 to 50 | 1 |
| Color · `color_mode` | Rainbow (0) | Rainbow; BW; Neon; Thermal | — |

## Polar Spiral

Hypnotic spiraling tunnel patterns in polar coordinates

Effect ID: `polar_spiral`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Speed · `speed` | 1.5 | 0.1 to 5 | 0.1 |
| Arms · `arms` | 5 | 1 to 12 | 1 |
| Twist · `twist` | 8 | 1 to 20 | 0.5 |
| Radial Frequency · `zoom` | 1 | 0 to 3 | 0.1 |
| Style · `style` | Spiral (0) | Spiral; Log Spiral; Double Spiral; Vortex | — |

## Strange Attractors

Lorenz, Rossler, Aizawa, Thomas, Halvorsen, Chen, Dadras, Sprott and Four-Wing attractors traced as glowing 3D ribbons

Effect ID: `lorenz`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Attractor · `attractor` | Lorenz (0) | Lorenz; Rossler; Aizawa; Thomas; Halvorsen; Chen; Dadras; Sprott B; Four-Wing | — |
| Trace Speed · `speed` | 1 | 0 to 4 | 0.05 |
| Ribbon Length · `trail_length` | 6000 | 300 to 14000 | 100 |
| Chaos · `chaos` | 0 | -1 to 1 | 0.02 |
| Camera Spin · `rotation` | 0.3 | -2 to 2 | 0.05 |
| Camera Tilt · `tilt` | 0.3 | -1.5 to 1.5 | 0.05 |
| Zoom · `zoom` | 1 | 0.3 to 3 | 0.05 |
| Line Width · `width` | 2.6 | 0.5 to 10 | 0.1 |
| Glow · `glow` | 1.2 | 0 to 2.5 | 0.05 |
| Trails · `trails` | 0.55 | 0 to 0.97 | 0.01 |
| Color By · `color_by` | Along Trail (0) | Along Trail; Speed; Depth | — |
| Palette · `palette` | Rainbow (0) | Rainbow; Neon; Ember; + [71 shared palettes](Palette-Reference.md) | — |
| Color Speed · `color_speed` | 0.4 | 0 to 4 | 0.05 |
| Background · `background` | Deep Space (0) | Deep Space; Black; Nebula Glow; Ink on Paper | — |

## Cymatics

Chladni plate patterns: sand gathers on the still lines of a vibrating plate, following the music

Effect ID: `cymatics`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Plate · `plate` | Square (0) | Square; Circle; Hexagon | — |
| Pattern From · `mode_control` | Follow Music (1) | Auto Cycle; Follow Music; Manual | — |
| Mode n (manual) · `n` | 3 | 1 to 12 | 1 |
| Mode m (manual) · `m` | 7 | 1 to 14 | 1 |
| Cycle Time (sec) · `cycle_time` | 6 | 1 to 20 | 0.5 |
| Line Width · `sand_width` | 0.11 | 0.02 to 0.4 | 0.005 |
| Sand Grain · `grain` | 0.6 | 0 to 1 | 0.01 |
| Wave Glow · `field_glow` | 0.35 | 0 to 1 | 0.01 |
| Colours · `scheme` | Brass & Sand (0) | Brass & Sand; Neon; Ice; Fire | — |
| Zoom · `zoom` | 1 | 0.5 to 2 | 0.01 |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |

## 4D Polytopes

Tesseract, 24-cell, 600-cell and other four-dimensional solids rotating through 4D, drawn as neon edges

Effect ID: `polytopes`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Polytope · `shape` | Tesseract (0) | Tesseract; 16-Cell; 24-Cell; 600-Cell; 5-Cell (Simplex); Duoprism 6x6 | — |
| Rotation · `rotation_style` | Change Every 4 Bars (4) | Tumble (all planes); Double Rotation; Clifford Spin; Slow Drift; Change Every 4 Bars | — |
| Rotation Speed · `speed` | 0.5 | 0 to 2 | 0.01 |
| 4D Perspective · `perspective` | 0.65 | 0.1 to 1 | 0.01 |
| Size · `size` | 1 | 0.2 to 2.5 | 0.01 |
| Line Width · `thickness` | 2.6 | 0.5 to 10 | 0.1 |
| Glow · `glow` | 1.4 | 0 to 3 | 0.05 |
| Trails · `trails` | 0.55 | 0 to 0.97 | 0.01 |
| Palette · `palette` | Neon (1) | Rainbow; Neon; Ember; + [71 shared palettes](Palette-Reference.md) | — |
| Background · `background` | Deep Space (0) | Deep Space; Black; Nebula Glow; Ink on Paper | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |

## Phyllotaxis

Golden-angle sunflower spirals that grow from the centre; tiny angle changes reshape every spiral

Effect ID: `phyllotaxis`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Seeds · `count` | 900 | 100 to 2000 | 1 |
| Spread · `spread` | 1 | 0.3 to 1.6 | 0.01 |
| Seed Size · `seed_size` | 0.9 | 0.2 to 1.6 | 0.01 |
| Seed Shape · `shape` | Petals (1) | Dots; Petals; Rings; Stars | — |
| Colour By · `color_by` | Spiral Arms (2) | Seed Order; Radius; Spiral Arms; Angle | — |
| Angle Offset (deg) · `angle_offset` | 0 | -2 to 2 | 0.001 |
| Angle Drift · `drift` | 0.2 | 0 to 1 | 0.01 |
| Growth · `growth` | 3 | 0 to 20 | 0.1 |
| Spin · `spin` | 0.08 | -1 to 1 | 0.01 |
| Glow · `glow` | 0.6 | 0 to 2 | 0.01 |
| Palette · `palette` | Sunflower (0) | Sunflower; Neon; Ocean; Rainbow; + [71 shared palettes](Palette-Reference.md) | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |

## Fourier Epicycles

Spinning circles from a Fourier transform draw hearts, stars, butterflies and more, in time with the music

Effect ID: `epicycles`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Drawing · `shape` | Morph Through All (7) | Heart; Star; Infinity; Flower; Butterfly; Trefoil; Square; Morph Through All | — |
| Circles · `terms` | 40 | 1 to 160 | 1 |
| One Drawing Per · `cycle` | 2 Bars (2) | Free (Speed); 1 Bar; 2 Bars; 4 Bars; 8 Bars | — |
| Free Speed · `speed` | 0.6 | 0 to 2 | 0.01 |
| Trace Length · `trace` | 0.9 | 0.05 to 1 | 0.01 |
| Circle Brightness · `circles` | 0.6 | 0 to 1 | 0.01 |
| Arm Brightness · `arms` | 0.7 | 0 to 1 | 0.01 |
| Size · `size` | 1 | 0.2 to 2 | 0.01 |
| Line Width · `thickness` | 2.4 | 0.5 to 8 | 0.1 |
| Glow · `glow` | 1.2 | 0 to 3 | 0.05 |
| Motion Trails · `trails` | 0.3 | 0 to 0.95 | 0.01 |
| Palette · `palette` | Neon (1) | Rainbow; Neon; Ember; + [71 shared palettes](Palette-Reference.md) | — |
| Background · `background` | Deep Space (0) | Deep Space; Black; Nebula Glow; Ink on Paper | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |

## Complex Domain Colouring

Glowing phase portraits of complex functions, with drifting zeros and poles

Effect ID: `domain_colouring`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Function · `func` | Zeros and Poles (0) | Zeros and Poles; Roots of Unity; Complex Sine; Exponential Spiral; Möbius Morph; Blaschke Product | — |
| Order · `order` | 5 | 2 to 9 | 1 |
| Zoom · `zoom` | 1.2 | 0.3 to 4 | 0.01 |
| Morph Speed · `speed` | 0.4 | 0 to 2 | 0.01 |
| Contour Rings · `contours` | 0.6 | 0 to 1 | 0.01 |
| Phase Lines · `phase_lines` | 0.35 | 0 to 1 | 0.01 |
| Saturation · `saturation` | 0.85 | 0 to 1 | 0.01 |
| Style · `style` | Neon Lines (1) | Classic; Neon Lines; Pastel; Dark Glow | — |
| Hue Palette · `palette` | Rainbow (0) | Rainbow; + [71 shared palettes](Palette-Reference.md) | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |

## Hopf Fibration

Interlinked rings of light: the Hopf fibration of the 4D sphere, rotating and projected into space

Effect ID: `hopf`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Base Points · `arrangement` | Latitude Rings (0) | Latitude Rings; Single Ring; Golden Spiral; Scattered; Change Every 4 Bars | — |
| Rings · `rings` | 4 | 1 to 8 | 1 |
| Fibres per Ring · `fibers` | 18 | 4 to 48 | 1 |
| 4D Rotation · `speed` | 0.4 | 0 to 2 | 0.01 |
| 3D Tumble · `tumble` | 0.3 | 0 to 2 | 0.01 |
| Size · `size` | 1 | 0.2 to 3 | 0.01 |
| Perspective · `depth` | 0.4 | 0 to 1 | 0.01 |
| Outer Reach · `reach` | 6 | 2 to 12 | 0.1 |
| Line Width · `thickness` | 1.6 | 0.5 to 8 | 0.1 |
| Glow · `glow` | 1.2 | 0 to 3 | 0.05 |
| Trails · `trails` | 0.35 | 0 to 0.95 | 0.01 |
| Palette · `palette` | Rainbow (0) | Rainbow; Neon; Ember; + [71 shared palettes](Palette-Reference.md) | — |
| Background · `background` | Deep Space (0) | Deep Space; Black; Nebula Glow; Ink on Paper | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |

## Knots & Surfaces

Neon knots (trefoil, figure-eight, torus and Lissajous knots) and wireframe Möbius strips, Klein bottles and tori

Effect ID: `knots`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Shape · `shape` | Trefoil Knot (0) | Trefoil Knot; Figure-Eight Knot; Torus Knot (p, q); Lissajous Knot; Möbius Strip; Klein Bottle; Torus | — |
| Torus Knot p · `p` | 2 | 1 to 9 | 1 |
| Torus Knot q · `q` | 5 | 1 to 9 | 1 |
| Tube Strands · `strands` | 5 | 1 to 8 | 1 |
| Tube Radius · `tube` | 0.08 | 0 to 0.3 | 0.005 |
| Strand Twist · `twist` | 1 | -4 to 4 | 0.05 |
| Surface Grid · `grid` | 24 | 6 to 48 | 1 |
| Spin Speed · `speed` | 0.4 | 0 to 2 | 0.01 |
| Size · `size` | 1 | 0.2 to 3 | 0.01 |
| Line Width · `thickness` | 2 | 0.5 to 8 | 0.1 |
| Glow · `glow` | 1.3 | 0 to 3 | 0.05 |
| Trails · `trails` | 0.3 | 0 to 0.95 | 0.01 |
| Palette · `palette` | Neon (1) | Rainbow; Neon; Ember; + [71 shared palettes](Palette-Reference.md) | — |
| Background · `background` | Deep Space (0) | Deep Space; Black; Nebula Glow; Ink on Paper | — |
| Beat Reaction · `audio_react` | 1 | 0 to 2 | 0.01 |
