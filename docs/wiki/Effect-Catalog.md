# Effect Catalog

Generated from the running app by `node tools/build-wiki-reference.mjs`. Values are base defaults, before presets or audio modulation. Select values are zero-based indices in saved data; the UI shows labels. Ranges use the app’s stored units; controls marked as percentages may display a scaled value.

The app registers **104 effects** across **15 categories**. Every category page includes each effect’s description, parameter defaults/ranges, native palette choices, and available starter presets.

| Category | Effects | Full controls |
| --- | --- | --- |
| Demoscene | 8 | [Reference](Effects-Demoscene.md) |
| Fractals | 38 | [Reference](Effects-Fractals.md) |
| Distortion | 5 | [Reference](Effects-Distortion.md) |
| Math | 13 | [Reference](Effects-Math.md) |
| Noise | 4 | [Reference](Effects-Noise.md) |
| Simulation | 6 | [Reference](Effects-Simulation.md) |
| Color | 1 | [Reference](Effects-Color.md) |
| Psychedelic | 3 | [Reference](Effects-Psychedelic.md) |
| Geometry | 3 | [Reference](Effects-Geometry.md) |
| Patterns | 4 | [Reference](Effects-Patterns.md) |
| Retro | 1 | [Reference](Effects-Retro.md) |
| Cosmic | 4 | [Reference](Effects-Cosmic.md) |
| Nature | 5 | [Reference](Effects-Nature.md) |
| Endless Scenes | 8 | [Reference](Effects-Endless-Scenes.md) |
| Shadertoy | 1 | [Reference](Effects-Shadertoy.md) |

## All effects at a glance

| Effect | Category | Description |
| --- | --- | --- |
| [Plasma](Effects-Demoscene.md#plasma) | Demoscene | Classic lava lamp plasma with flowing, pulsing color blobs |
| [Mandelbrot](Effects-Fractals.md#mandelbrot) | Fractals | Infinite fractal zoom into the Mandelbrot set with smooth coloring |
| [Julia Set](Effects-Fractals.md#julia-set) | Fractals | Morphing Julia set fractals that smoothly transform between organic shapes |
| [Tunnel](Effects-Demoscene.md#tunnel) | Demoscene | Classic demoscene tunnel - flying through an infinite psychedelic tube |
| [Kaleidoscope](Effects-Distortion.md#kaleidoscope) | Distortion | Mirror-chamber kaleidoscope: wedge, three-mirror tube, square, hex, recursive and spiral folds over animated source patterns |
| [Fire](Effects-Demoscene.md#fire) | Demoscene | Realistic procedural flames with customizable palette |
| [Starfield](Effects-Demoscene.md#starfield) | Demoscene | Flying through a 3D starfield at warp speed |
| [Metaballs](Effects-Demoscene.md#metaballs) | Demoscene | Organic blobs that merge and split like living organisms |
| [Rotozoom](Effects-Demoscene.md#rotozoom) | Demoscene | Hypnotic rotating and zooming tiled pattern |
| [Moire Patterns](Effects-Demoscene.md#moire-patterns) | Demoscene | Shimmering interference patterns from overlapping ring structures |
| [Voronoi Cells](Effects-Math.md#voronoi-cells) | Math | Organic cell patterns like soap bubbles or stained glass |
| [Feedback Loop](Effects-Distortion.md#feedback-loop) | Distortion | Video feedback trails: sources stream through zoom, swirl, kaleido, ripple or tunnel transforms with independent flow speed |
| [Flow Field](Effects-Noise.md#flow-field) | Noise | Noise-driven currents: turbulent colour, curl streamlines, marbled paper, topographic contours, aurora curtains and silk threads |
| [Perlin Noise](Effects-Noise.md#perlin-noise) | Noise | Smooth organic evolving cloud and smoke patterns |
| [Domain Warp](Effects-Noise.md#domain-warp) | Noise | Nested noise creates alien landscapes and marbled paint effects |
| [Reaction-Diffusion](Effects-Simulation.md#reaction-diffusion) | Simulation | True Gray-Scott reaction-diffusion with stateful ping-pong chemical buffers |
| [Swirl Vortex](Effects-Distortion.md#swirl-vortex) | Distortion | Hypnotic vortices: classic spiral, op-art rings, spiral galaxy, liquid whirlpool, twin vortex and black-hole lensing |
| [Wave Distortion](Effects-Distortion.md#wave-distortion) | Distortion | Rippling wave distortions creating liquid, flag-like motion |
| [Lissajous](Effects-Math.md#lissajous) | Math | Lissajous figures, damped harmonographs, rose curves, 3D Lissajous knots and the butterfly curve as glowing lines |
| [Spirograph](Effects-Math.md#spirograph) | Math | Hypotrochoids, epitrochoids, cycloid stars, Farris wheels and guilloche rosettes as glowing layered lines |
| [Sine Interference](Effects-Math.md#sine-interference) | Math | Pulsating concentric rings and beating interference patterns |
| [Polar Spiral](Effects-Math.md#polar-spiral) | Math | Hypnotic spiraling tunnel patterns in polar coordinates |
| [Color Cycling](Effects-Color.md#color-cycling) | Color | Classic color palette rotation - static patterns appear to flow and shimmer |
| [Water Ripple](Effects-Demoscene.md#water-ripple) | Demoscene | Expanding water ripples with refraction and caustic effects |
| [Burning Ship](Effects-Fractals.md#burning-ship) | Fractals | The eerie Burning Ship fractal with flame-like tendrils |
| [Newton Fractal](Effects-Fractals.md#newton-fractal) | Fractals | Smooth interlocking basins from Newton's method applied to polynomials |
| [Strange Attractors](Effects-Math.md#strange-attractors) | Math | Lorenz, Rossler, Aizawa, Thomas, Halvorsen, Chen, Dadras, Sprott and Four-Wing attractors traced as glowing 3D ribbons |
| [Game of Life](Effects-Simulation.md#game-of-life) | Simulation | True stateful Conway cellular automata with ping-pong buffer history |
| [Droste Effect](Effects-Distortion.md#droste-effect) | Distortion | Recursive infinite zoom - an image contains itself at every scale |
| [Fractal Brownian Motion](Effects-Noise.md#fractal-brownian-motion) | Noise | Multi-octave noise creating organic cloud and terrain textures |
| [Multibrot](Effects-Fractals.md#multibrot) | Fractals | Mandelbrot with variable power - morphs between alien symmetric forms |
| [Mandelbrot Deep](Effects-Fractals.md#mandelbrot-deep) | Fractals | Ultra-detailed Mandelbrot with distance estimation, orbit coloring, and stripe patterns |
| [Phoenix Fractal](Effects-Fractals.md#phoenix-fractal) | Fractals | Uses previous iteration memory - creates bird-like and feathered structures |
| [Nova Fractal](Effects-Fractals.md#nova-fractal) | Fractals | Newton's method with relaxation - creates explosive stellar nova patterns |
| [Orbit Trap](Effects-Fractals.md#orbit-trap) | Fractals | Colors fractals by closest approach to geometric shapes - creates stunning detailed structures |
| [Tricorn](Effects-Fractals.md#tricorn) | Fractals | The Mandelbar fractal - uses complex conjugate creating 3-pointed crowns |
| [Flame Variation Field](Effects-Fractals.md#flame-variation-field) | Fractals | Analytic field preview of classic flame variation functions; use Fractal Flame Lab for density-rendered IFS flames |
| [Lyapunov Fractal](Effects-Fractals.md#lyapunov-fractal) | Fractals | Stability map of logistic sequences - creates wild organic boundaries between order and chaos |
| [Sierpinski](Effects-Fractals.md#sierpinski) | Fractals | True barycentric Sierpinski gasket, carpet, hexaflake, pentaflake and Vicsek fractals with a seamless infinite zoom and depth-level colouring |
| [Mandelbulb Slice](Effects-Fractals.md#mandelbulb-slice) | Fractals | 2D cross-sections through the 3D Mandelbulb fractal - otherworldly alien forms |
| [2D Formula Lab](Effects-Fractals.md#2d-formula-lab) | Fractals | Broad animated escape-time, root-solver, transcendental, and fold formula lab |
| [Analytic Field Lab](Effects-Fractals.md#analytic-field-lab) | Fractals | Animated complex phase, domain-coloring, quasicrystal, nodal, vortex, and number-field lab |
| [Procedural Field Lab](Effects-Fractals.md#procedural-field-lab) | Fractals | Animated 2D procedural and form-constant fields with phyllotaxis, Voronoi, moire, phasor, tunnel, and weave modes |
| [IFS / L-System Lab](Effects-Fractals.md#ifs--l-system-lab) | Fractals | IFS, chaos-game and L-system fractals drawn as glowing lines with motion trails, over space, nebula or paper backgrounds |
| [Fractal Flame Lab](Effects-Fractals.md#fractal-flame-lab) | Fractals | Stateless fractal-flame variation lab with swirl, spherical, Julia, PDJ, rings, popcorn, and mandala modes |
| [Buddhabrot Lab](Effects-Fractals.md#buddhabrot-lab) | Fractals | Progressive worker-accumulated Buddhabrot, Anti-Buddhabrot, and Nebulabrot density renderer |
| [Attractor Density Lab](Effects-Fractals.md#attractor-density-lab) | Fractals | Progressive worker-accumulated strange attractor and chaotic-map density renderer |
| [FLAM3 Density Lab](Effects-Fractals.md#flam3-density-lab) | Fractals | Progressive worker-accumulated fractal flame density renderer |
| [Mandelbulb Flight](Effects-Fractals.md#mandelbulb-flight) | Fractals | Raymarched 3D Mandelbulb with fold-dive camera motion and animated polar unfolding |
| [Triplex Mutation Flight](Effects-Fractals.md#triplex-mutation-flight) | Fractals | Raymarched Mandelbulb-family mutations with burning ship, tricorn, generalized bulb, beam, and spud folds |
| [KIFS Fold Flight](Effects-Fractals.md#kifs-fold-flight) | Fractals | Raymarched kaleidoscopic IFS folds with Menger, tetra, octa, and lattice flight paths |
| [DIFS Tunnel Flight](Effects-Fractals.md#difs-tunnel-flight) | Fractals | Raymarched distance-IFS tunnel structures with Koch folds, Mandalay boxes, torus tubes, octa shells, and twisted kaleido columns |
| [Mandelbox Flight](Effects-Fractals.md#mandelbox-flight) | Fractals | Raymarched Mandelbox folds with box/sphere inversion flight paths and animated fold rotation |
| [Folded Box Variants Flight](Effects-Fractals.md#folded-box-variants-flight) | Fractals | Raymarched Mandelbox-family variants with Amazing Box, surf-like sheet folds, smooth folds, ABox modulation, and box-bulb hybrid motion |
| [Quaternion Julia Flight](Effects-Fractals.md#quaternion-julia-flight) | Fractals | Raymarched quaternion Julia set with morphing constants, slice motion, and close flight paths |
| [Hypercomplex Slice Flight](Effects-Fractals.md#hypercomplex-slice-flight) | Fractals | Raymarched higher-dimensional slice fractals with tetrabrot, tricomplex, octonion-style, and quaternion-bulb motion |
| [Schottky Inversion Flight](Effects-Fractals.md#schottky-inversion-flight) | Fractals | Raymarched Schottky sphere inversions with bubble caves, ring limits, and Apollonian-like shell motion |
| [Apollonian Foam Flight](Effects-Fractals.md#apollonian-foam-flight) | Fractals | Raymarched inversion-foam and pseudo-Kleinian fly-through structures with cell, chain, cathedral, and box-hybrid motion |
| [Polyfold Flight](Effects-Fractals.md#polyfold-flight) | Fractals | Raymarched polyhedral KIFS folds with cathedral, tetrahedral, star, sponge, lattice, and hybrid flight paths |
| [3D Fractal Flame Volume Flight](Effects-Fractals.md#3d-fractal-flame-volume-flight) | Fractals | Volumetric IFS/flame-inspired clouds with nonlinear 3D transforms, density tonemapping, and fly-through motion |
| [Strange Attractor Flight](Effects-Fractals.md#strange-attractor-flight) | Fractals | Volumetric fly-throughs built from integrated Lorenz, Thomas, Aizawa, and Rossler phase-space trajectories |
| [L-System Tube Flight](Effects-Fractals.md#l-system-tube-flight) | Fractals | Procedural turtle-branch tube fields inspired by 3D L-systems, with fly-through growth and branch sway animation |
| [Glass Fractal DE Flight](Effects-Fractals.md#glass-fractal-de-flight) | Fractals | Distance-estimator scenes with glass, mirror, refraction, and a secondary reflection march |
| [Kleinian Group](Effects-Fractals.md#kleinian-group) | Fractals | Limit sets of Kleinian groups - intricate lacework of circles and gaskets |
| [Liquid Light Show](Effects-Psychedelic.md#liquid-light-show) | Psychedelic | Overhead-projector oil and water light show: merging dye blobs, thin-film rainbow rims and projector bloom |
| [Hyperbolic Tiling](Effects-Geometry.md#hyperbolic-tiling) | Geometry | Escher-style {p,q} hyperbolic tilings in the Poincare disk or band model, drifting through the infinite plane |
| [Truchet Tiles](Effects-Patterns.md#truchet-tiles) | Patterns | Endless Truchet paths: quarter arcs, diagonal maze, woven ribbons and flowing dashed rings with smooth tile flips |
| [Quasicrystal](Effects-Patterns.md#quasicrystal) | Patterns | Quasi-periodic wave interference with N-fold symmetry: smooth waves, interference stripes, polar rosettes and Penrose-like contours |
| [Op Art](Effects-Patterns.md#op-art) | Patterns | Riley waves, Vasarely bulge, moire rings, zebra flow and kinetic squares in stark black and white or neon duotones |
| [Synthwave Grid](Effects-Retro.md#synthwave-grid) | Retro | Outrun horizon with a striped sun, mountains, stars and an endless neon grid |
| [Glow Lab](Effects-Psychedelic.md#glow-lab) | Psychedelic | Neon light accumulated through tiny raymarch loops: vortex, cosmic surf, wormhole, lattice, plasma orb and accretion ring |
| [Black Hole](Effects-Cosmic.md#black-hole) | Cosmic | Gravitationally lensed accretion disk, photon ring and bent starlight around a black hole |
| [Rainy Window](Effects-Nature.md#rainy-window) | Nature | Rain running down a window over blurred city lights; every drop refracts a sharp view |
| [Aurora](Effects-Nature.md#aurora) | Nature | Northern lights over a mirror lake with mountains, stars and reflections |
| [Physarum](Effects-Simulation.md#physarum) | Simulation | Slime-mould simulation: hundreds of thousands of agents weave a living network of glowing veins |
| [Cymatics](Effects-Math.md#cymatics) | Math | Chladni plate patterns: sand gathers on the still lines of a vibrating plate, following the music |
| [Nebula Flythrough](Effects-Cosmic.md#nebula-flythrough) | Cosmic | Fly through glowing volumetric gas clouds and dark dust lanes of a star nursery |
| [Living Sun](Effects-Cosmic.md#living-sun) | Cosmic | A boiling star with granulation, sunspots, a streaky corona and looping prominences |
| [Seascape](Effects-Nature.md#seascape) | Nature | Rolling ocean at sunset with reflections, sun glitter and foam |
| [4D Polytopes](Effects-Math.md#4d-polytopes) | Math | Tesseract, 24-cell, 600-cell and other four-dimensional solids rotating through 4D, drawn as neon edges |
| [Phyllotaxis](Effects-Math.md#phyllotaxis) | Math | Golden-angle sunflower spirals that grow from the centre; tiny angle changes reshape every spiral |
| [Fourier Epicycles](Effects-Math.md#fourier-epicycles) | Math | Spinning circles from a Fourier transform draw hearts, stars, butterflies and more, in time with the music |
| [Spiral Galaxy](Effects-Cosmic.md#spiral-galaxy) | Cosmic | A slowly turning spiral galaxy with dust lanes, star clusters and a glowing core |
| [Underwater](Effects-Nature.md#underwater) | Nature | Sun shafts, dancing caustics on the sand and drifting plankton under the sea |
| [Liquid Chrome](Effects-Geometry.md#liquid-chrome) | Geometry | Mercury blobs melting into each other and mirroring a neon world |
| [Gyroid Tunnels](Effects-Geometry.md#gyroid-tunnels) | Geometry | Flight through an iridescent gyroid lattice, an organic minimal surface |
| [Soap Bubbles](Effects-Psychedelic.md#soap-bubbles) | Psychedelic | Iridescent soap bubbles with swirling thin-film colours and glassy reflections |
| [Complex Domain Colouring](Effects-Math.md#complex-domain-colouring) | Math | Glowing phase portraits of complex functions, with drifting zeros and poles |
| [Endless Terrain](Effects-Nature.md#endless-terrain) | Nature | Fly over endless eroded mountains, lakes and clouds with sun and aerial fog |
| [Menger Citadel](Effects-Endless-Scenes.md#menger-citadel) | Endless Scenes | An endless city of recursive Menger towers: fly along winding avenues between monumental porous spires |
| [Recursive Cathedral](Effects-Endless-Scenes.md#recursive-cathedral) | Endless Scenes | An unending procession of immense elliptical vaults, recursive pillars, illuminated ribs and a mirror-dark nave |
| [Fractal Canyon](Effects-Endless-Scenes.md#fractal-canyon) | Endless Scenes | Follow an endless river between towering ridged fractal cliffs and natural mathematical arches, lit by an alien dawn |
| [Infinite Lattice](Effects-Endless-Scenes.md#infinite-lattice) | Endless Scenes | Drift through colossal connected mathematical membranes: Schwarz P, diamond and Neovius nodal surfaces stretching in every direction |
| [Crystal Geode](Effects-Endless-Scenes.md#crystal-geode) | Endless Scenes | An endless winding cavern of luminous faceted crystals: quartz spires, amethyst clusters, monumental columns and prismatic needles |
| [Golden-Hour Clouds](Effects-Endless-Scenes.md#golden-hour-clouds) | Endless Scenes | Continuous flight between immense volumetric cloud towers, over cloud oceans and through sunlit weather with silver linings |
| [Planet Sunrise](Effects-Endless-Scenes.md#planet-sunrise) | Endless Scenes | A continuous low-orbit journey over curved planetary horizons, glowing atmosphere, cloud continents and enormous tilted rings |
| [Robot Foundry](Effects-Endless-Scenes.md#robot-foundry) | Endless Scenes | Fly through an endless industrial dance procession: six intact robot families, four factory worlds, and jointed choreography that follows the music. |
| [Fluid Ink](Effects-Simulation.md#fluid-ink) | Simulation | A real fluid simulation: swirling coloured ink poured and pushed around in water. Stir it with the mouse. |
| [Lenia](Effects-Simulation.md#lenia) | Simulation | Continuous cellular automata: smooth, organic creatures that glide, pulse and divide |
| [Curl-Noise Silk](Effects-Simulation.md#curl-noise-silk) | Simulation | Hundreds of thousands of particles flowing through swirling curl noise, leaving silky long-exposure trails |
| [Hopf Fibration](Effects-Math.md#hopf-fibration) | Math | Interlinked rings of light: the Hopf fibration of the 4D sphere, rotating and projected into space |
| [Knots & Surfaces](Effects-Math.md#knots--surfaces) | Math | Neon knots (trefoil, figure-eight, torus and Lissajous knots) and wireframe Möbius strips, Klein bottles and tori |
| [Islamic Star Patterns](Effects-Patterns.md#islamic-star-patterns) | Patterns | Breathing geometric star patterns built with Hankin’s method on square and hexagonal tilings |
| [Shadertoy Lab](Effects-Shadertoy.md#shadertoy-lab) | Shadertoy | Paste and run Shadertoy-style mainImage shaders. |
