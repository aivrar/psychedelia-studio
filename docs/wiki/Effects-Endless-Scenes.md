# Endless Scenes: Effect Reference

[All effects](Effect-Catalog.md) · [Using controls](Interface-Guide.md) · [Palettes](Palette-Reference.md)

Generated from the running app by `node tools/build-wiki-reference.mjs`. Values are base defaults, before presets or audio modulation. Select values are zero-based indices in saved data; the UI shows labels. Ranges use the app’s stored units; controls marked as percentages may display a scaled value.

- [Menger Citadel](#menger-citadel)
- [Recursive Cathedral](#recursive-cathedral)
- [Fractal Canyon](#fractal-canyon)
- [Infinite Lattice](#infinite-lattice)
- [Crystal Geode](#crystal-geode)
- [Golden-Hour Clouds](#golden-hour-clouds)
- [Planet Sunrise](#planet-sunrise)
- [Robot Foundry](#robot-foundry)

## Menger Citadel

An endless city of recursive Menger towers: fly along winding avenues between monumental porous spires

Effect ID: `menger_citadel`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Titan Dawn · Glacial Megacity · Pearl Labyrinth · Amethyst Spires.

### Structure

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Menger Depth · `recursion` | 3 | 1 to 4 | 1 |
| Skyline Height · `tower_height` | 16 | 6 to 24 | 0.1 |
| Tower Spacing · `spacing` | 10 | 8 to 14 | 0.1 |
| Avenue Width · `avenue` | 3.2 | 2.2 to 5 | 0.1 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `speed` | 1 | 0 to 3 | 0.01 |
| Flight Height · `altitude` | 1 | 0.3 to 2 | 0.01 |
| Path Sway · `sway` | 0.45 | 0 to 1 | 0.01 |
| Gentle Banking · `bank` | 0.3 | 0 to 1 | 0.01 |
| Wide-Angle View · `fov` | 1.35 | 0.75 to 1.8 | 0.01 |
| View Distance · `view_distance` | 110 | 35 to 160 | 1 |

### Color

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Palette · `palette` | Dawn Gold (0) | Dawn Gold; Glacial Blue; Amethyst; Emerald; Ember; Pearl; + [71 shared palettes](Palette-Reference.md) | — |
| Palette Phase · `color_phase` | 0 | 0 to 1 | 0.01 |
| Hue Shift · `hue_shift` | 0 | 0 to 1 | 0.01 |
| Saturation · `saturation` | 1 | 0 to 2 | 0.01 |
| Color Spread · `color_spread` | 1 | 0 to 2 | 0.01 |
| Color Drift · `color_drift` | 0 | 0 to 1 | 0.01 |

### Light

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Atmospheric Haze · `fog` | 0.65 | 0 to 2.5 | 0.01 |
| Luminous Edges · `glow` | 0.5 | 0 to 2 | 0.01 |
| Exposure · `exposure` | 1 | 0.5 to 2 | 0.01 |
| Beat Light · `audio_react` | 0.65 | 0 to 2 | 0.01 |
| Ray Detail · `detail` | 150 | 80 to 220 | 1 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Titan Dawn",
    "values": {
      "tower_height": 20,
      "recursion": 3,
      "altitude": 1.1,
      "palette": 0,
      "fog": 0.55,
      "speed": 0.8
    }
  },
  {
    "name": "Glacial Megacity",
    "values": {
      "tower_height": 24,
      "spacing": 9,
      "altitude": 0.65,
      "palette": 1,
      "fog": 0.45,
      "glow": 0.7
    }
  },
  {
    "name": "Pearl Labyrinth",
    "values": {
      "recursion": 4,
      "tower_height": 14,
      "spacing": 8,
      "avenue": 2.6,
      "palette": 5,
      "altitude": 0.55,
      "speed": 0.7
    }
  },
  {
    "name": "Amethyst Spires",
    "values": {
      "tower_height": 22,
      "spacing": 12,
      "palette": 2,
      "altitude": 1.6,
      "speed": 1.2,
      "glow": 1.1,
      "fog": 0.75
    }
  }
]
```

</details>

## Recursive Cathedral

An unending procession of immense elliptical vaults, recursive pillars, illuminated ribs and a mirror-dark nave

Effect ID: `recursive_cathedral`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Sanctuary of Light · Golden Infinity · Violet Reliquary · Frozen Basilica.

### Structure

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Vault Height · `vault_height` | 21 | 12 to 28 | 0.1 |
| Nave Width · `span` | 6.8 | 5 to 9 | 0.1 |
| Bay Length · `bay_length` | 9 | 6 to 14 | 0.1 |
| Pillar Recursion · `recursion` | 2 | 1 to 3 | 1 |
| Vault Rib Width · `ribs` | 0.32 | 0.18 to 0.7 | 0.01 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `speed` | 1 | 0 to 3 | 0.01 |
| Flight Height · `altitude` | 1 | 0.3 to 2 | 0.01 |
| Path Sway · `sway` | 0.45 | 0 to 1 | 0.01 |
| Gentle Banking · `bank` | 0.3 | 0 to 1 | 0.01 |
| Wide-Angle View · `fov` | 1.35 | 0.75 to 1.8 | 0.01 |
| View Distance · `view_distance` | 110 | 35 to 160 | 1 |

### Color

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Palette · `palette` | Dawn Gold (0) | Dawn Gold; Glacial Blue; Amethyst; Emerald; Ember; Pearl; + [71 shared palettes](Palette-Reference.md) | — |
| Palette Phase · `color_phase` | 0 | 0 to 1 | 0.01 |
| Hue Shift · `hue_shift` | 0 | 0 to 1 | 0.01 |
| Saturation · `saturation` | 1 | 0 to 2 | 0.01 |
| Color Spread · `color_spread` | 1 | 0 to 2 | 0.01 |
| Color Drift · `color_drift` | 0 | 0 to 1 | 0.01 |

### Light

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Atmospheric Haze · `fog` | 0.65 | 0 to 2.5 | 0.01 |
| Luminous Edges · `glow` | 0.5 | 0 to 2 | 0.01 |
| Exposure · `exposure` | 1 | 0.5 to 2 | 0.01 |
| Beat Light · `audio_react` | 0.65 | 0 to 2 | 0.01 |
| Ray Detail · `detail` | 150 | 80 to 220 | 1 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Sanctuary of Light",
    "values": {
      "palette": 5,
      "vault_height": 24,
      "glow": 1.2,
      "fog": 0.45,
      "speed": 0.7,
      "fov": 1.55
    }
  },
  {
    "name": "Golden Infinity",
    "values": {
      "palette": 0,
      "vault_height": 21,
      "bay_length": 7,
      "glow": 0.8,
      "altitude": 0.75,
      "fog": 0.65
    }
  },
  {
    "name": "Violet Reliquary",
    "values": {
      "palette": 2,
      "recursion": 3,
      "span": 6,
      "vault_height": 18,
      "speed": 0.8,
      "glow": 1.3
    }
  },
  {
    "name": "Frozen Basilica",
    "values": {
      "palette": 1,
      "vault_height": 28,
      "span": 8.5,
      "bay_length": 12,
      "fov": 1.65,
      "glow": 0.65,
      "fog": 0.35
    }
  }
]
```

</details>

## Fractal Canyon

Follow an endless river between towering ridged fractal cliffs and natural mathematical arches, lit by an alien dawn

Effect ID: `fractal_canyon`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Valley of Titans · Emerald River · Ember Chasm · Glacier Gates.

### Structure

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Cliff Height · `cliff_height` | 24 | 10 to 36 | 0.1 |
| River Gorge Width · `width` | 5 | 3.5 to 9 | 0.1 |
| Fractal Roughness · `roughness` | 0.48 | 0.3 to 0.65 | 0.01 |
| Stone Terraces · `terraces` | 0.55 | 0 to 1 | 0.01 |
| Natural Arches · `arches` | 0.65 | 0 to 1 | 0.01 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `speed` | 1 | 0 to 3 | 0.01 |
| Flight Height · `altitude` | 1 | 0.3 to 2 | 0.01 |
| Path Sway · `sway` | 0.45 | 0 to 1 | 0.01 |
| Gentle Banking · `bank` | 0.3 | 0 to 1 | 0.01 |
| Wide-Angle View · `fov` | 1.35 | 0.75 to 1.8 | 0.01 |
| View Distance · `view_distance` | 110 | 35 to 160 | 1 |

### Color

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Palette · `palette` | Dawn Gold (0) | Dawn Gold; Glacial Blue; Amethyst; Emerald; Ember; Pearl; + [71 shared palettes](Palette-Reference.md) | — |
| Palette Phase · `color_phase` | 0 | 0 to 1 | 0.01 |
| Hue Shift · `hue_shift` | 0 | 0 to 1 | 0.01 |
| Saturation · `saturation` | 1 | 0 to 2 | 0.01 |
| Color Spread · `color_spread` | 1 | 0 to 2 | 0.01 |
| Color Drift · `color_drift` | 0 | 0 to 1 | 0.01 |

### Light

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Atmospheric Haze · `fog` | 0.65 | 0 to 2.5 | 0.01 |
| Luminous Edges · `glow` | 0.5 | 0 to 2 | 0.01 |
| Exposure · `exposure` | 1 | 0.5 to 2 | 0.01 |
| Beat Light · `audio_react` | 0.65 | 0 to 2 | 0.01 |
| Ray Detail · `detail` | 150 | 80 to 220 | 1 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Valley of Titans",
    "values": {
      "cliff_height": 32,
      "width": 5,
      "palette": 0,
      "altitude": 0.65,
      "fog": 0.4,
      "speed": 0.9
    }
  },
  {
    "name": "Emerald River",
    "values": {
      "cliff_height": 22,
      "width": 7,
      "palette": 3,
      "terraces": 0.25,
      "arches": 0.4,
      "altitude": 0.5,
      "fog": 0.65
    }
  },
  {
    "name": "Ember Chasm",
    "values": {
      "cliff_height": 30,
      "width": 4,
      "palette": 4,
      "roughness": 0.6,
      "glow": 0.8,
      "fog": 0.8,
      "speed": 1.2
    }
  },
  {
    "name": "Glacier Gates",
    "values": {
      "cliff_height": 28,
      "width": 6,
      "palette": 1,
      "terraces": 0.85,
      "arches": 1,
      "altitude": 1.2,
      "fog": 0.3,
      "fov": 1.6
    }
  }
]
```

</details>

## Infinite Lattice

Drift through colossal connected mathematical membranes: Schwarz P, diamond and Neovius nodal surfaces stretching in every direction

Effect ID: `infinite_lattice`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Pearl Multiverse · Diamond Expanse · Neovius Dream · Emerald Continuum.

### Structure

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Surface Family · `surface` | Schwarz P (0) | Schwarz P; Diamond; Neovius | — |
| Structure Scale · `cell_size` | 10 | 5 to 16 | 0.1 |
| Membrane Thickness · `thickness` | 0.16 | 0.04 to 0.45 | 0.01 |
| Iridescence · `iridescence` | 0.75 | 0 to 1 | 0.01 |
| Open Passage · `passage` | 1.6 | 1.2 to 3 | 0.1 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `speed` | 1 | 0 to 3 | 0.01 |
| Flight Height · `altitude` | 1 | 0.3 to 2 | 0.01 |
| Path Sway · `sway` | 0.45 | 0 to 1 | 0.01 |
| Gentle Banking · `bank` | 0.3 | 0 to 1 | 0.01 |
| Wide-Angle View · `fov` | 1.35 | 0.75 to 1.8 | 0.01 |
| View Distance · `view_distance` | 110 | 35 to 160 | 1 |

### Color

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Palette · `palette` | Dawn Gold (0) | Dawn Gold; Glacial Blue; Amethyst; Emerald; Ember; Pearl; + [71 shared palettes](Palette-Reference.md) | — |
| Palette Phase · `color_phase` | 0 | 0 to 1 | 0.01 |
| Hue Shift · `hue_shift` | 0 | 0 to 1 | 0.01 |
| Saturation · `saturation` | 1 | 0 to 2 | 0.01 |
| Color Spread · `color_spread` | 1 | 0 to 2 | 0.01 |
| Color Drift · `color_drift` | 0 | 0 to 1 | 0.01 |

### Light

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Atmospheric Haze · `fog` | 0.65 | 0 to 2.5 | 0.01 |
| Luminous Edges · `glow` | 0.5 | 0 to 2 | 0.01 |
| Exposure · `exposure` | 1 | 0.5 to 2 | 0.01 |
| Beat Light · `audio_react` | 0.65 | 0 to 2 | 0.01 |
| Ray Detail · `detail` | 150 | 80 to 220 | 1 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Pearl Multiverse",
    "values": {
      "surface": 0,
      "cell_size": 12,
      "palette": 5,
      "thickness": 0.13,
      "glow": 0.7,
      "fog": 0.45,
      "speed": 0.7
    }
  },
  {
    "name": "Diamond Expanse",
    "values": {
      "surface": 1,
      "cell_size": 14,
      "palette": 1,
      "thickness": 0.1,
      "glow": 0.8,
      "fog": 0.35,
      "detail": 190
    }
  },
  {
    "name": "Neovius Dream",
    "values": {
      "surface": 2,
      "cell_size": 10,
      "palette": 2,
      "thickness": 0.25,
      "glow": 1.1,
      "detail": 220,
      "fog": 0.55
    }
  },
  {
    "name": "Emerald Continuum",
    "values": {
      "surface": 0,
      "cell_size": 8,
      "palette": 3,
      "thickness": 0.3,
      "passage": 2,
      "speed": 1.25,
      "iridescence": 1
    }
  }
]
```

</details>

## Crystal Geode

An endless winding cavern of luminous faceted crystals: quartz spires, amethyst clusters, monumental columns and prismatic needles

Effect ID: `crystal_geode`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Amethyst Infinity · Emerald Sanctuary · Sapphire Needles · Rose Quartz Dawn · Citrine Cathedral · Opal Prism Voyage.

### Structure

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Crystal Formation · `formation` | Quartz Spires (0) | Quartz Spires; Amethyst Clusters; Crystal Columns; Prismatic Needles | — |
| Cavern Size · `cave_radius` | 7.5 | 4 to 12 | 0.1 |
| Crystal Length · `crystal_length` | 3.3 | 1 to 7 | 0.1 |
| Crystal Width · `crystal_width` | 0.8 | 0.25 to 2 | 0.01 |
| Crystals Around Wall · `density` | 12 | 8 to 20 | 1 |
| Cluster Spacing · `spacing` | 7 | 4 to 12 | 0.1 |
| Facet Iridescence · `iridescence` | 0.5 | 0 to 1 | 0.01 |
| Crystal Inner Light · `inner_glow` | 0.85 | 0 to 2 | 0.01 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `speed` | 1 | 0 to 3 | 0.01 |
| Flight Height · `altitude` | 1 | 0.3 to 2 | 0.01 |
| Path Sway · `sway` | 0.45 | 0 to 1 | 0.01 |
| Gentle Banking · `bank` | 0.3 | 0 to 1 | 0.01 |
| Wide-Angle View · `fov` | 1.35 | 0.75 to 1.8 | 0.01 |
| View Distance · `view_distance` | 110 | 35 to 160 | 1 |

### Color

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Palette · `palette` | Amethyst (0) | Amethyst; Emerald; Sapphire; Rose Quartz; Citrine; Ice Opal; Lava Crystal; Spectral Prism; + [71 shared palettes](Palette-Reference.md) | — |
| Palette Phase · `color_phase` | 0 | 0 to 1 | 0.01 |
| Hue Shift · `hue_shift` | 0 | 0 to 1 | 0.01 |
| Saturation · `saturation` | 1 | 0 to 2 | 0.01 |
| Color Spread · `color_spread` | 1 | 0 to 2 | 0.01 |
| Color Drift · `color_drift` | 0 | 0 to 1 | 0.01 |

### Light

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Atmospheric Haze · `fog` | 0.38 | 0 to 2.5 | 0.01 |
| Luminous Edges · `glow` | 0.9 | 0 to 2 | 0.01 |
| Exposure · `exposure` | 1 | 0.5 to 2 | 0.01 |
| Beat Light · `audio_react` | 0.65 | 0 to 2 | 0.01 |
| Ray Detail · `detail` | 160 | 80 to 220 | 1 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Amethyst Infinity",
    "values": {
      "formation": 1,
      "palette": 0,
      "crystal_length": 3.5,
      "cave_radius": 8,
      "fog": 0.4,
      "speed": 0.8
    }
  },
  {
    "name": "Emerald Sanctuary",
    "values": {
      "formation": 2,
      "palette": 1,
      "crystal_length": 5.5,
      "crystal_width": 1.15,
      "cave_radius": 10,
      "glow": 0.65,
      "speed": 0.65
    }
  },
  {
    "name": "Sapphire Needles",
    "values": {
      "formation": 3,
      "palette": 2,
      "density": 16,
      "crystal_width": 0.45,
      "crystal_length": 4.8,
      "iridescence": 0.85
    }
  },
  {
    "name": "Rose Quartz Dawn",
    "values": {
      "formation": 0,
      "palette": 3,
      "cave_radius": 9,
      "crystal_length": 3.8,
      "fog": 0.25,
      "saturation": 0.8
    }
  },
  {
    "name": "Citrine Cathedral",
    "values": {
      "formation": 2,
      "palette": 4,
      "cave_radius": 12,
      "crystal_length": 7,
      "crystal_width": 1.5,
      "spacing": 10,
      "fov": 1.6,
      "inner_glow": 0.65
    }
  },
  {
    "name": "Opal Prism Voyage",
    "values": {
      "formation": 1,
      "palette": 5,
      "iridescence": 1,
      "color_spread": 1.4,
      "glow": 1.15,
      "density": 14
    }
  }
]
```

</details>

## Golden-Hour Clouds

Continuous flight between immense volumetric cloud towers, over cloud oceans and through sunlit weather with silver linings

Effect ID: `golden_hour_clouds`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Golden Cloud Kingdom · Peach Cloud Ocean · Lavender Highlands · Stormlight Cathedral · Arctic Pillars · Rose Sky Voyage.

### Structure

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Cloud Landscape · `weather` | Cumulus Towers (0) | Cumulus Towers; Cloud Ocean; Storm Cathedral; Wispy Highlands | — |
| Cloud Coverage · `coverage` | 0.52 | 0.2 to 0.85 | 0.01 |
| Cloud Scale · `cloud_scale` | 1 | 0.5 to 2.5 | 0.01 |
| Cloud Height · `cloud_height` | 36 | 16 to 60 | 0.1 |
| Cloud Density · `density` | 1.1 | 0.35 to 2 | 0.01 |
| Billow Detail · `billow` | 0.6 | 0 to 1 | 0.01 |
| Clear Space Near Camera · `open_sky` | 12 | 0 to 24 | 0.1 |
| Look Toward Cloud Sea · `look_down` | 1.4 | -2 to 4 | 0.1 |
| Wind Flow · `wind` | 0.35 | 0 to 2 | 0.01 |
| Sun Height · `sun_height` | 0.18 | 0.03 to 0.8 | 0.01 |
| Sun Direction · `sun_angle` | -0.25 | -0.8 to 0.8 | 0.01 |
| Silver Lining · `silver_lining` | 0.8 | 0 to 2 | 0.01 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `speed` | 1 | 0 to 3 | 0.01 |
| Flight Height · `altitude` | 1 | 0.3 to 2 | 0.01 |
| Path Sway · `sway` | 0.45 | 0 to 1 | 0.01 |
| Gentle Banking · `bank` | 0.3 | 0 to 1 | 0.01 |
| Wide-Angle View · `fov` | 1.35 | 0.75 to 1.8 | 0.01 |
| View Distance · `view_distance` | 150 | 35 to 160 | 1 |

### Color

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Palette · `palette` | Honey Sunrise (0) | Honey Sunrise; Peach Horizon; Lavender Dusk; Arctic Daylight; Storm Gold; Rose Nebula; Emerald Sky; Blue Hour; + [71 shared palettes](Palette-Reference.md) | — |
| Palette Phase · `color_phase` | 0 | 0 to 1 | 0.01 |
| Hue Shift · `hue_shift` | 0 | 0 to 1 | 0.01 |
| Saturation · `saturation` | 1 | 0 to 2 | 0.01 |
| Color Spread · `color_spread` | 1 | 0 to 2 | 0.01 |
| Color Drift · `color_drift` | 0 | 0 to 1 | 0.01 |

### Light

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Atmospheric Haze · `fog` | 0.3 | 0 to 2.5 | 0.01 |
| Luminous Edges · `glow` | 0.7 | 0 to 2 | 0.01 |
| Exposure · `exposure` | 1 | 0.5 to 2 | 0.01 |
| Beat Light · `audio_react` | 0.65 | 0 to 2 | 0.01 |
| Ray Detail · `detail` | 150 | 80 to 220 | 1 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Golden Cloud Kingdom",
    "values": {
      "weather": 0,
      "palette": 0,
      "cloud_height": 46,
      "cloud_scale": 1.2,
      "sun_height": 0.13,
      "open_sky": 14,
      "altitude": 1.2,
      "look_down": 1,
      "fov": 1.5,
      "speed": 0.8
    }
  },
  {
    "name": "Peach Cloud Ocean",
    "values": {
      "weather": 1,
      "palette": 1,
      "altitude": 1.5,
      "coverage": 0.65,
      "density": 1.2,
      "open_sky": 6,
      "speed": 0.65
    }
  },
  {
    "name": "Lavender Highlands",
    "values": {
      "weather": 3,
      "palette": 2,
      "coverage": 0.45,
      "billow": 0.85,
      "cloud_height": 42,
      "sun_height": 0.25
    }
  },
  {
    "name": "Stormlight Cathedral",
    "values": {
      "weather": 2,
      "palette": 4,
      "coverage": 0.6,
      "density": 1.2,
      "cloud_height": 58,
      "altitude": 1.7,
      "look_down": 0.8,
      "sun_height": 0.16,
      "sun_angle": -0.65,
      "open_sky": 20,
      "silver_lining": 1.4
    }
  },
  {
    "name": "Arctic Pillars",
    "values": {
      "weather": 0,
      "palette": 3,
      "cloud_height": 50,
      "cloud_scale": 0.8,
      "coverage": 0.48,
      "altitude": 1.35,
      "sun_height": 0.4,
      "saturation": 0.7
    }
  },
  {
    "name": "Rose Sky Voyage",
    "values": {
      "weather": 3,
      "palette": 5,
      "cloud_scale": 1.6,
      "coverage": 0.5,
      "altitude": 1.25,
      "glow": 1.1,
      "color_spread": 1.3
    }
  }
]
```

</details>

## Planet Sunrise

A continuous low-orbit journey over curved planetary horizons, glowing atmosphere, cloud continents and enormous tilted rings

Effect ID: `planet_sunrise`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Earth at First Light · Titan Ring Passage · Rose Moonrise · Lava Terminator · Frozen Azure Horizon · Neon Ring Odyssey.

### Structure

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Planet Surface · `world` | Ocean Continents (0) | Ocean Continents; Banded Giant; Cratered Moon; Lava World; Frozen World | — |
| Planet Scale · `planet_radius` | 65 | 35 to 120 | 0.1 |
| Surface Pattern Scale · `terrain_scale` | 1.3 | 0.7 to 3 | 0.01 |
| Surface Detail · `surface_detail` | 0.65 | 0 to 1 | 0.01 |
| Ocean / Ice Coverage · `water_level` | 0.49 | 0.25 to 0.7 | 0.01 |
| Planet Cloud Cover · `cloud_cover` | 0.45 | 0 to 1 | 0.01 |
| Atmosphere Depth · `atmosphere` | 3.5 | 0.5 to 8 | 0.1 |
| Sunrise Height · `sun_height` | 0.06 | -0.08 to 0.5 | 0.01 |
| Orbit Latitude · `latitude` | 0.12 | -0.55 to 0.55 | 0.01 |
| Look Toward Surface · `look_down` | 0.2 | 0 to 0.6 | 0.01 |
| Ring Opacity · `rings` | 0.65 | 0 to 1 | 0.01 |
| Ring Tilt · `ring_tilt` | 0.28 | 0 to 1.2 | 0.01 |
| Ring Direction · `ring_heading` | 0.7 | 0 to 6.28 | 0.01 |
| Ring Width · `ring_width` | 0.8 | 0.2 to 1.4 | 0.01 |
| Ring Inner Gap · `ring_gap` | 0.25 | 0.05 to 0.6 | 0.01 |
| Ring Band Detail · `ring_bands` | 0.65 | 0 to 1 | 0.01 |
| Stars · `stars` | 0.8 | 0 to 2 | 0.01 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `speed` | 1 | 0 to 3 | 0.01 |
| Flight Height · `altitude` | 1 | 0.3 to 2 | 0.01 |
| Path Sway · `sway` | 0.45 | 0 to 1 | 0.01 |
| Gentle Banking · `bank` | 0.3 | 0 to 1 | 0.01 |
| Wide-Angle View · `fov` | 1.35 | 0.75 to 1.8 | 0.01 |
| View Distance · `view_distance` | 150 | 35 to 160 | 1 |

### Color

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Palette · `palette` | Earth Dawn (0) | Earth Dawn; Titan Amber; Azure Ice; Rose Horizon; Aurora World; Lava Planet; Pearl Eclipse; Neon Odyssey; + [71 shared palettes](Palette-Reference.md) | — |
| Palette Phase · `color_phase` | 0 | 0 to 1 | 0.01 |
| Hue Shift · `hue_shift` | 0 | 0 to 1 | 0.01 |
| Saturation · `saturation` | 1 | 0 to 2 | 0.01 |
| Color Spread · `color_spread` | 1 | 0 to 2 | 0.01 |
| Color Drift · `color_drift` | 0 | 0 to 1 | 0.01 |

### Light

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Atmospheric Haze · `fog` | 0.7 | 0 to 2.5 | 0.01 |
| Luminous Edges · `glow` | 0.8 | 0 to 2 | 0.01 |
| Exposure · `exposure` | 1 | 0.5 to 2 | 0.01 |
| Beat Light · `audio_react` | 0.65 | 0 to 2 | 0.01 |
| Ray Detail · `detail` | 140 | 80 to 220 | 1 |

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Earth at First Light",
    "values": {
      "world": 0,
      "palette": 0,
      "rings": 0.35,
      "atmosphere": 4,
      "sun_height": 0.065,
      "speed": 0.7
    }
  },
  {
    "name": "Titan Ring Passage",
    "values": {
      "world": 1,
      "palette": 1,
      "rings": 0.9,
      "ring_width": 1.3,
      "ring_tilt": 0.45,
      "cloud_cover": 0.2,
      "atmosphere": 6,
      "latitude": 0.06
    }
  },
  {
    "name": "Rose Moonrise",
    "values": {
      "world": 2,
      "palette": 3,
      "cloud_cover": 0,
      "atmosphere": 1.3,
      "sun_height": 0.04,
      "rings": 0.7,
      "look_down": 0.35
    }
  },
  {
    "name": "Lava Terminator",
    "values": {
      "world": 3,
      "palette": 5,
      "cloud_cover": 0.15,
      "sun_height": -0.02,
      "glow": 1.3,
      "rings": 0.5,
      "atmosphere": 4.5
    }
  },
  {
    "name": "Frozen Azure Horizon",
    "values": {
      "world": 4,
      "palette": 2,
      "water_level": 0.62,
      "cloud_cover": 0.25,
      "atmosphere": 2.5,
      "rings": 0.85,
      "ring_tilt": 0.15
    }
  },
  {
    "name": "Neon Ring Odyssey",
    "values": {
      "world": 1,
      "palette": 7,
      "saturation": 1.35,
      "ring_bands": 1,
      "ring_width": 1.4,
      "atmosphere": 5,
      "glow": 1.2
    }
  }
]
```

</details>

## Robot Foundry

Fly through an endless industrial dance procession: six intact robot families, four factory worlds, and jointed choreography that follows the music.

Effect ID: `robot_foundry`. CPU fallback declared: **no**. A declared fallback is a reduced compatibility path, not a promise of parity with GPU output.

**Starter presets:** Copper Parade · Neon Night Shift · Retro Disco District · Cosmic Conductors · Mint Machine Carnival · Chrome Giants.

### Structure

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| World Style · `world_style` † | Iron Foundry (0) | Iron Foundry; Neon Assembly; Retro Machine City; Cosmic Refinery | — |
| Robot Cast · `robot_cast` † | Mixed Ensemble (0) | Mixed Ensemble; Boxbots; Cyclops; Striders; Heavy Loaders; Astrobots; Four-Arm Conductors | — |
| Robot Variety · `robot_variety` † | 1 | 0 to 1 | 0.01 |
| Robot Size · `robot_size` † | 1 | 0.8 to 1.3 | 0.01 |
| Procession Spacing · `crowd_spacing` † | 12 | 10 to 18 | 0.1 |
| Factory Skyline · `factory_height` † | 18 | 8 to 28 | 0.1 |

### Dance

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Dance Style · `choreography` † | Factory Groove (0) | Factory Groove; Robot Pop; Disco Signal; Circuit Wave | — |
| Dance Amount · `dance_amount` † | 0.9 | 0 to 1.5 | 0.01 |
| Music Response · `dance_audio` † | 1 | 0 to 2 | 0.01 |
| Idle Groove · `idle_dance` † | 0.28 | 0 to 1 | 0.01 |
| Ensemble Sync · `ensemble_sync` † | 0.75 | 0 to 1 | 0.01 |

### Flight

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Flight Speed · `speed` | 0.8 | 0 to 3 | 0.01 |
| Flight Height · `altitude` | 0.95 | 0.3 to 2 | 0.01 |
| Path Sway · `sway` | 0.18 | 0 to 1 | 0.01 |
| Gentle Banking · `bank` | 0.08 | 0 to 1 | 0.01 |
| Wide-Angle View · `fov` | 1.35 | 0.75 to 1.8 | 0.01 |
| View Distance · `view_distance` | 125 | 35 to 160 | 1 |

### Color

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Color Palette · `palette` | Copper Circuit (0) | Copper Circuit; Toxic Mint; Ultraviolet Steel; Ice Chrome; Magenta Reactor; Solar Rust; Prismatic Oil; + [71 shared palettes](Palette-Reference.md) | — |
| Palette Phase · `color_phase` | 0 | 0 to 1 | 0.01 |
| Hue Shift · `hue_shift` | 0 | 0 to 1 | 0.01 |
| Saturation · `saturation` | 1 | 0 to 2 | 0.01 |
| Color Spread · `color_spread` | 1 | 0 to 2 | 0.01 |
| Color Drift · `color_drift` | 0 | 0 to 1 | 0.01 |

### Light

| Control / ID | Default | Range or choices | Step |
| --- | --- | --- | --- |
| Atmospheric Haze · `fog` | 0.36 | 0 to 2.5 | 0.01 |
| Luminous Edges · `glow` | 0.65 | 0 to 2 | 0.01 |
| Exposure · `exposure` | 1.1 | 0.5 to 2 | 0.01 |
| Beat Light · `audio_react` | 0.5 | 0 to 2 | 0.01 |
| Ray Detail · `detail` | 170 | 80 to 220 | 1 |

† Excluded from automatic effect parameter linking by the definition. Built-in audio controls may still affect this scene.

<details>
<summary>Starter preset values</summary>

Preset values below are overrides on the effect defaults.

```json
[
  {
    "name": "Copper Parade",
    "values": {
      "world_style": 0,
      "palette": 0,
      "choreography": 0
    }
  },
  {
    "name": "Neon Night Shift",
    "values": {
      "world_style": 1,
      "palette": 2,
      "choreography": 1,
      "glow": 0.95,
      "ensemble_sync": 0.95,
      "factory_height": 24
    }
  },
  {
    "name": "Retro Disco District",
    "values": {
      "world_style": 2,
      "palette": 5,
      "choreography": 2,
      "dance_amount": 1.15,
      "idle_dance": 0.4,
      "fog": 0.28
    }
  },
  {
    "name": "Cosmic Conductors",
    "values": {
      "world_style": 3,
      "palette": 6,
      "choreography": 3,
      "robot_cast": 6,
      "ensemble_sync": 0.25,
      "speed": 0.55
    }
  },
  {
    "name": "Mint Machine Carnival",
    "values": {
      "world_style": 1,
      "palette": 1,
      "choreography": 2,
      "crowd_spacing": 10,
      "robot_size": 0.95,
      "dance_amount": 1.2
    }
  },
  {
    "name": "Chrome Giants",
    "values": {
      "world_style": 0,
      "palette": 3,
      "robot_cast": 4,
      "robot_size": 1.25,
      "altitude": 1.2,
      "speed": 0.5,
      "factory_height": 28
    }
  }
]
```

</details>
