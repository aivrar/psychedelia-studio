# Third-party notices

Psychedelia Studio builds on work that other people published openly: libraries, shader code, papers, colour maps and tutorials. This file names that work, links to the original source, and records the licence each source states. Thank you to everyone listed here.

## Tone.js

The main app bundles **Tone.js 14.7.77** at `lib/tone.min.js`, as identified by the file's distribution header. Tone.js supplies the synthesis, scheduling, and audio graph used by Studio Music.

- Upstream project: [Tone.js](https://github.com/Tonejs/Tone.js)
- License: MIT; the versioned distribution license is retained in [Tone-LICENSE.txt](lib/licenses/Tone-LICENSE.txt).
- License source: [tone@14.7.77 distribution](https://cdn.jsdelivr.net/npm/tone@14.7.77/LICENSE.md).

`lib/tone.min.js` is Tone's own build and contains code from the packages that Tone depends on. Tone 14.7.77 (published 2021-01-13) declares `standardized-audio-context` `^25.1.8` and `tslib` `^2.0.1`; `standardized-audio-context` 25.1.8 in turn declares `automation-events` `^3.0.2`. The build does not record the exact versions it bundled, so the versions below are the declared ranges and the releases current at the time.

| Package | Author | Licence | Source | Licence text |
| --- | --- | --- | --- | --- |
| `standardized-audio-context` (25.1.8) | Christoph Guttandin | MIT, Copyright (c) 2021 Christoph Guttandin | [GitHub](https://github.com/chrisguttandin/standardized-audio-context) | [standardized-audio-context-LICENSE.txt](lib/licenses/standardized-audio-context-LICENSE.txt), copied from the [25.1.8 npm distribution](https://cdn.jsdelivr.net/npm/standardized-audio-context@25.1.8/LICENSE) |
| `automation-events` (3.0.x; text from 3.0.3) | Christoph Guttandin | MIT, Copyright (c) 2020 Christoph Guttandin | [GitHub](https://github.com/chrisguttandin/automation-events) | [automation-events-LICENSE.txt](lib/licenses/automation-events-LICENSE.txt), copied from the [3.0.3 npm distribution](https://cdn.jsdelivr.net/npm/automation-events@3.0.3/LICENSE) |
| `tslib` (2.x) | Microsoft Corporation | 0BSD | [GitHub](https://github.com/Microsoft/tslib) | The notice is retained inline in `lib/tone.min.js` |

Keep bundled source notices and the license files when redistributing these dependencies. Local experiments and their dependencies are excluded from this repository package.

## Shaders, mathematical references, and imported media

Preserve any author/source notices in effect files. Mathematical family names identify techniques and inspiration, not ownership of third-party implementations.

The sections below list the third-party code, formulas and data found in the shaders and engine by searching the source for credits, well-known constants and recognisable routines, and comparing the matching code with the published originals. No other third-party-derived material was identified in that review, but the list may not be exhaustive; corrections and additions are welcome. The starter examples bundled with the Shadertoy Lab carry no third-party headers and use only the generic techniques credited below, such as the cosine palette.

Shadertoy API imports can carry author, source URL, and license metadata. Keep that information with exported projects and follow the imported shader's terms. Uploaded audio, images, and videos retain their original rights; selecting them in the app does not change those rights.

## Shader techniques and sources

### Code and formulas adapted from published sources

These routines in the shaders and engine follow code or formulas published by the people named. The licence column quotes what each source states.

| Technique | Where used in this repo | Author | Source | Licence stated by the source |
| --- | --- | --- | --- | --- |
| 3D simplex noise (`snoise`, `mod289`, `permute`, `taylorInvSqrt`); base of the shared `fbm` | `src/engine/shader-manager.js`, used by many effects | Ian McEwan, Ashima Arts, with Stefan Gustavson | [webgl-noise, `noise3D.glsl`](https://github.com/ashima/webgl-noise/blob/master/src/noise3D.glsl) | "Copyright (C) 2011 Ashima Arts. All rights reserved. Distributed under the MIT License." Text: [webgl-noise-LICENSE.txt](lib/licenses/webgl-noise-LICENSE.txt) |
| Fluid solver passes: splat, curl, vorticity confinement, divergence with boundary reflection, Jacobi pressure, gradient subtract | `src/effects/fluid-ink.js` | Pavel Dobryakov | [WebGL Fluid Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation) | MIT License, Copyright (c) 2017 Pavel Dobryakov. Text: [WebGL-Fluid-Simulation-LICENSE.txt](lib/licenses/WebGL-Fluid-Simulation-LICENSE.txt) |
| "Hash without Sine" (`fract(p * 0.1031)`, then `p += dot(p, p.zyx + c)`, then `fract((p.x + p.y) * p.z)`), with adjusted constants | `src/effects/curl-silk.js`, `endless-scenes.js`, `endless-sky-crystal.js`, `endless-terrain.js`, `living-sun.js`, `nebula.js` | David Hoskins ("Dave_Hoskins") | [Hash without Sine, Shadertoy](https://www.shadertoy.com/view/4djSRW) | MIT License, Copyright (c)2014 David Hoskins |
| RGB to HSV and HSV to RGB conversion (`rgb2hsv`, `hsv2rgb`, `toHsv`) | `src/engine/shader-manager.js`, `src/engine/post-fx-library.js` | Sam Hocevar | [From RGB to HSV in OpenGL GLSL, answer by Sam Hocevar](https://stackoverflow.com/a/17897228), taken from his [lolengine.net post](http://lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl) | WTFPL, as stated in the answer |
| Cosine palette, `a + b * cos(6.28318 * (c * t + d))`, and several of its example parameter sets | `palette()` in `src/engine/shader-manager.js`, used by most effects | Inigo Quilez | [Palettes](https://iquilezles.org/articles/palettes/) | MIT for code snippets; see the note below the table |
| Distance functions `sdBox`, `sdTorus`, `sdOctahedron` (bound version) and the 2D box | `src/effects/apollonian-foam-flight.js`, `difs-tunnel-flight.js`, `folded-box-variants-flight.js`, `kifs-flight.js`, `mandelbox-flight.js`, `path-traced-fractal-flight.js`, `polyfold-flight.js`, `sierpinski.js` | Inigo Quilez | [3D distance functions](https://iquilezles.org/articles/distfunctions/) | MIT for code snippets; see the note below the table |
| Polynomial smooth minimum, `smin` | `src/effects/liquid-chrome.js` | Inigo Quilez | [Smooth minimum for SDFs](https://iquilezles.org/articles/smin/) | MIT for code snippets; see the note below the table |
| Tetrahedron technique for numerical normals | `calcNormal` in `src/effects/gyroid-tunnels.js` and `liquid-chrome.js`; `estimateNormal` in the 3D flight effects | Inigo Quilez, who credits Paulo Falcao and Paul Malin for the technique | [Numerical normals for SDFs](https://iquilezles.org/articles/normalsSDF/) | MIT for code snippets; see the note below the table |
| Soft shadows from a distance field, `min(res, k * h / t)` | `softShadow` in the 3D flight effects | Inigo Quilez | [Soft shadows in raymarched SDFs](https://iquilezles.org/articles/rmshadows/) | MIT for code snippets; see the note below the table |
| Noise-based domain warping with the offsets 5.2/1.3, 1.7/9.2 and 8.3/2.8 | `src/effects/domain-warp.js` | Inigo Quilez | [Domain warping](https://iquilezles.org/articles/warp/) | MIT for code snippets; see the note below the table |
| Apollonian sphere-packing distance estimator: fold with `fract`, invert, accumulate the scale | Apollonian Cell and Sphere Chain modes of `src/effects/apollonian-foam-flight.js` | Inigo Quilez | Shadertoy shader ["Apollonian"](https://www.shadertoy.com/view/4ds3zn) (2013) | Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported (the Shadertoy default), as stated in the header of a copy of the shader |
| Pseudo-Kleinian fold: box fold, sphere inversion, scale accumulation | Knighty Foam, Pseudo-Kleinian Cathedral and Kleinian Box Hybrid modes of `src/effects/apollonian-foam-flight.js` | Knighty, after Theli-at | ["Pseudo Kleinian" in Fragmentarium's Knighty Collection](https://github.com/Syntopia/Fragmentarium/blob/master/Fragmentarium-Source/Examples/Knighty%20Collection/PseudoKleinian.frag) | None stated in the file ("Made by Knighty"); the Fragmentarium application is offered under LGPL 2.1 or GPL 3 |
| ACES filmic tone-mapping curve fit | `psyTonemap` in `src/engine/shader-manager.js` | Krzysztof Narkowicz | [ACES Filmic Tone Mapping Curve](https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/) | "free to use under public domain CC0 or MIT license" |
| Oklab colour space matrices, used to blend palette stops | `src/engine/palettes.js` | Björn Ottosson | [A perceptual color space for image processing](https://bottosson.github.io/posts/oklab/) | "available in public domain"; also available under an MIT licence |

Inigo Quilez states on [his articles index](https://iquilezles.org/articles/): "all technical code snippets you'll find are under the MIT license so you can easily reuse them, but the mathematical/shader art is protected and requires a license for use."

### Algorithms and ideas

These techniques are implemented in this project's own code. The people who developed them are credited here with a reference for each.

- **Sphere tracing with distance estimators**, used by every raymarched effect: John C. Hart, [Sphere tracing: a geometric method for the antialiased ray tracing of implicit surfaces](https://link.springer.com/article/10.1007/s003710050084), The Visual Computer.
- **Distance-estimated 3D fractals**: Mikael Hvidtfeldt Christensen (Syntopia), the series starting at [Part I](http://blog.hvidtfeldts.net/index.php/2011/06/distance-estimated-3d-fractals-part-i/), including [Folding Space](http://blog.hvidtfeldts.net/index.php/2011/08/distance-estimated-3d-fractals-iii-folding-space/), [the Mandelbulb and different DE approximations](http://blog.hvidtfeldts.net/index.php/2011/09/distance-estimated-3d-fractals-v-the-mandelbulb-different-de-approximations/) and [the Mandelbox](http://blog.hvidtfeldts.net/index.php/2011/11/distance-estimated-3d-fractals-vi-the-mandelbox/). The Mandelbulb distance estimate in `mandelbulb-flight.js` takes the form given there.
- **Mandelbulb**: Daniel White and Paul Nylander, 2009; see [Mandelbulb](https://en.wikipedia.org/wiki/Mandelbulb). Used in `mandelbulb-flight.js`, `mandelbulb-slice.js` and `triplex-mutation-flight.js`.
- **Mandelbox**: Tom Lowe, 2010; see [Mandelbox](https://en.wikipedia.org/wiki/Mandelbox). Used in `mandelbox-flight.js`, `folded-box-variants-flight.js` and `path-traced-fractal-flight.js`.
- **Kaleidoscopic IFS folds and Menger constructions**: Tim McGraw, [Interactive Procedural Building Generation Using Kaleidoscopic Iterated Function Systems](https://link.springer.com/chapter/10.1007/978-3-319-27857-5_10); Paul Bourke, [polyhedral fractals and the Menger sponge](https://paulbourke.net/fractals/polyhedral/index.html). Used in `kifs-flight.js`, `polyfold-flight.js`, `difs-tunnel-flight.js` and `endless-scenes.js`.
- **Fractal Forums formulas** behind several 3D flight modes (pseudo-Kleinian, Amazing Box and Amazing Surf, Kleinian hybrids): the community formulas collected in [Fragmentarium](https://github.com/Syntopia/Fragmentarium) and [Mandelbulber](https://github.com/buddhi1980/mandelbulber2).
- **Quaternion Julia sets on the GPU**: Keenan Crane, [Ray Tracing Quaternion Julia Sets on the GPU](https://www.cs.cmu.edu/~kmcrane/Projects/QuaternionJulia/). Used in `quaternion-julia-flight.js` and `hypercomplex-slice-flight.js`.
- **Fractal flames and their variation functions**: Scott Draves and Erik Reckase, [The Fractal Flame Algorithm](https://flam3.com/flame_draves.pdf). Used in `fractal-flame.js`, `fractal-flame-lab.js`, `flam3-density-lab.js`, `fractal-flame-volume-flight.js` and `progressive-density-worker.js`.
- **Buddhabrot**: Melinda Green, [The Buddhabrot Technique](https://superliminal.com/fractals/bbrot/). Used in `buddhabrot-lab.js`.
- **Burning Ship fractal**: Michael Michelitsch and Otto E. Rössler, 1992; see [Burning Ship fractal](https://en.wikipedia.org/wiki/Burning_Ship_fractal).
- **Lyapunov fractals**: Mario Markus; see [Lyapunov fractal](https://en.wikipedia.org/wiki/Lyapunov_fractal).
- **Strange attractors**: Edward Lorenz (1963), see [Lorenz system](https://en.wikipedia.org/wiki/Lorenz_system); J. C. Sprott, [Some Simple Chaotic Flows](https://sprott.physics.wisc.edu/pubs/paper212.htm), Physical Review E 50, R647 (1994). Used in `lorenz-attractor.js`, `attractor-density-lab.js` and `strange-attractor-flight.js`.
- **L-systems and phyllotaxis**: Przemyslaw Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants](https://algorithmicbotany.org/papers/abop/abop.pdf). Used in `ifs-lsystem-lab.js`, `lsystem-tube-flight.js` and `phyllotaxis.js`.
- **Stable fluids**: Jos Stam, [Stable fluids](https://history.siggraph.org/?p=116411), SIGGRAPH 1999; Mark J. Harris, [Fast Fluid Dynamics Simulation on the GPU](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu), GPU Gems. Used in `fluid-ink.js`.
- **SmoothLife and Lenia**: Stephan Rafler, [Generalization of Conway's "Game of Life" to a continuous domain - SmoothLife](https://arxiv.org/abs/1111.1567); Bert Wang-Chak Chan, [Lenia - Biology of Artificial Life](https://arxiv.org/abs/1812.05433). Used in `lenia.js`.
- **Physarum agent model**: Jeff Jones, [Characteristics of pattern formation and evolution in approximations of Physarum transport networks](https://doi.org/10.1162/artl.2010.16.2.16202), Artificial Life 16(2), 2010. Used in `physarum.js`.
- **Gray-Scott reaction-diffusion**: Karl Sims, [Reaction-Diffusion Tutorial](https://www.karlsims.com/rd.html). Used in `reaction-diffusion.js`.
- **Islamic star patterns by polygons in contact**: E. H. Hankin's method as described by Craig S. Kaplan, [Islamic Star Patterns from Polygons in Contact](https://cs.uwaterloo.ca/~csk/publications/Papers/kaplan_2005.pdf), Graphics Interface 2005. Used in `islamic-stars.js`.
- **Kuwahara filter** (Oil Paint FX): Michiyoshi Kuwahara and colleagues, 1976; see [Kuwahara filter](https://en.wikipedia.org/wiki/Kuwahara_filter).
- **Ordered (Bayer) dithering** (Retro Dither FX): Bryce Bayer, 1973; see [Ordered dithering](https://en.wikipedia.org/wiki/Ordered_dithering).
- **Domain colouring** of complex functions: the term and method are credited to Frank Farris; see [Domain coloring](https://en.wikipedia.org/wiki/Domain_coloring). Used in `domain-colouring.js` and `analytic-field-lab.js`.
- **Atmospheric scattering with Rayleigh and Mie terms**: Sean O'Neil, [Accurate Atmospheric Scattering](https://developer.nvidia.com/gpugems/gpugems2/part-ii-shading-lighting-and-shadows/chapter-16-accurate-atmospheric-scattering), GPU Gems 2. The sky and planet renderer in `endless-sky-crystal.js` is this project's own artist-adjustable version rather than a calibrated physical model.
- **Photon paths around a Schwarzschild black hole**: Otto Seiskari, [Physics of oseiskar.github.io/black-hole](https://oseiskar.github.io/black-hole/docs/physics.html), which derives the photon orbit equation in Schwarzschild space-time. The ray bending in `black-hole.js` applies the acceleration `-1.5 h² r / |r|⁵` for a Schwarzschild radius of 1.

## Colour maps

The Scientific group in `src/engine/palettes.js` holds approximate samples, as hex stops, of published colour maps. The other palettes in that file are not taken from these maps.

| Colour map | Author | Source | Licence stated by the source |
| --- | --- | --- | --- |
| Viridis, Magma, Inferno, Plasma | Nathaniel J. Smith and Stéfan van der Walt; Eric Firing for Viridis | [BIDS colormap](https://github.com/BIDS/colormap), [`colormaps.py`](https://github.com/BIDS/colormap/blob/master/colormaps.py) | "released under the CC0 license / public domain dedication. We would appreciate credit if you use or redistribute these colormaps, but do not impose any legal restrictions." |
| Turbo | Anton Mikhailov, Google | [Turbo, An Improved Rainbow Colormap for Visualization](https://research.google/blog/turbo-an-improved-rainbow-colormap-for-visualization/), [look-up table](https://gist.github.com/mikhailov-work/6a308c20e494d9e0ccc29036b28faa7a) | "Copyright 2019 Google LLC. SPDX-License-Identifier: Apache-2.0" |
| Twilight | Bastian Bechtold | [twilight](https://github.com/bastibe/twilight), which notes that the map "has been merged into Matplotlib"; distributed as `twilight` in Matplotlib's [`_cm_listed.py`](https://github.com/matplotlib/matplotlib/blob/main/lib/matplotlib/_cm_listed.py) | The twilight repository states none. Matplotlib distributes it under the [Matplotlib License](https://github.com/matplotlib/matplotlib/blob/main/LICENSE/LICENSE), a permissive BSD-style licence (notice below). |
| Cubehelix | D. A. Green | [A colour scheme for the display of astronomical intensity images](https://arxiv.org/abs/1108.5083), Bulletin of the Astronomical Society of India 39, 289 (2011); also implemented as `cubehelix` in Matplotlib's [`_cm.py`](https://github.com/matplotlib/matplotlib/blob/main/lib/matplotlib/_cm.py) | The paper states none; it publishes the map as a formula. Matplotlib's implementation is under the [Matplotlib License](https://github.com/matplotlib/matplotlib/blob/main/LICENSE/LICENSE) (notice below). |

The Twilight and Cubehelix stops are approximate hex samples of those maps; this project does not claim which copy they were taken from. To the extent they derive from Matplotlib's distribution of the maps, that part is Copyright (c) 2012- Matplotlib Development Team; All Rights Reserved, used under the Matplotlib License reproduced below, and the change made is that ten approximate colour stops of each map are stored, blended in Oklab.

<details>
<summary>Matplotlib License (versions 1.3.0 and later)</summary>

```
License agreement for matplotlib versions 1.3.0 and later
=========================================================

1. This LICENSE AGREEMENT is between the Matplotlib Development Team
("MDT"), and the Individual or Organization ("Licensee") accessing and
otherwise using matplotlib software in source or binary form and its
associated documentation.

2. Subject to the terms and conditions of this License Agreement, MDT
hereby grants Licensee a nonexclusive, royalty-free, world-wide license
to reproduce, analyze, test, perform and/or display publicly, prepare
derivative works, distribute, and otherwise use matplotlib
alone or in any derivative version, provided, however, that MDT's
License Agreement and MDT's notice of copyright, i.e., "Copyright (c)
2012- Matplotlib Development Team; All Rights Reserved" are retained in
matplotlib  alone or in any derivative version prepared by
Licensee.

3. In the event Licensee prepares a derivative work that is based on or
incorporates matplotlib or any part thereof, and wants to
make the derivative work available to others as provided herein, then
Licensee hereby agrees to include in any such work a brief summary of
the changes made to matplotlib .

4. MDT is making matplotlib available to Licensee on an "AS
IS" basis.  MDT MAKES NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR
IMPLIED.  BY WAY OF EXAMPLE, BUT NOT LIMITATION, MDT MAKES NO AND
DISCLAIMS ANY REPRESENTATION OR WARRANTY OF MERCHANTABILITY OR FITNESS
FOR ANY PARTICULAR PURPOSE OR THAT THE USE OF MATPLOTLIB
WILL NOT INFRINGE ANY THIRD PARTY RIGHTS.

5. MDT SHALL NOT BE LIABLE TO LICENSEE OR ANY OTHER USERS OF MATPLOTLIB
 FOR ANY INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES OR
LOSS AS A RESULT OF MODIFYING, DISTRIBUTING, OR OTHERWISE USING
MATPLOTLIB , OR ANY DERIVATIVE THEREOF, EVEN IF ADVISED OF
THE POSSIBILITY THEREOF.

6. This License Agreement will automatically terminate upon a material
breach of its terms and conditions.

7. Nothing in this License Agreement shall be deemed to create any
relationship of agency, partnership, or joint venture between MDT and
Licensee.  This License Agreement does not grant permission to use MDT
trademarks or trade name in a trademark sense to endorse or promote
products or services of Licensee, or any third party.

8. By copying, installing or otherwise using matplotlib ,
Licensee agrees to be bound by the terms and conditions of this License
Agreement.
```

</details>

Palette stops are blended in Oklab, by Björn Ottosson (see the table above).

## Application and documentation

Psychedelia Studio's own application code and documentation are released under the MIT License (see [LICENSE](LICENSE)).

Two pieces of `src/effects/apollonian-foam-flight.js` are not covered by that MIT grant:

- The **Apollonian Cell and Sphere Chain distance estimator** is adapted from Inigo Quilez's Shadertoy shader "Apollonian" (2013) and is offered under [Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported](https://creativecommons.org/licenses/by-nc-sa/3.0/): keep the credit, do not use it commercially, and share adaptations of it under the same licence.
- The **pseudo-Kleinian fold** follows Knighty's published Fragmentarium example, which states no licence. It is used here with credit and remains under its author's terms. Third-party dependencies, imported shaders, and media keep their own terms as described above. The documentation's showcase images were captured from the app's built-in scenes; their recipes are listed in the [gallery](docs/wiki/Gallery.md).
