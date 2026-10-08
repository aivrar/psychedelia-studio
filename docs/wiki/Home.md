# Psychedelia Studio

![Glow Lab wormhole — an actual Psychedelia Studio render](images/hero.png)

Psychedelia Studio is a browser-based workspace for procedural visuals and music. Explore an effect, shape its palette and motion, connect it to sound, and record or render a finished video.

[**Launch Psychedelia Studio →**](https://aivrar.github.io/psychedelia-studio/) · [GitHub repository](https://github.com/aivrar/psychedelia-studio)

This wiki documents the app as inspected on **October 7, 2026**: **104 effects, 39 Post FX, 22 overlays, and 71 shared palettes**, in addition to effect-native palettes. Screenshots show actual app output. The effect tables are generated from the registered definitions, not a separate feature wish list.

## Start with a result

| I want to… | Read |
| --- | --- |
| Make my first visual and video | [Quick Start](Quick-Start.md) |
| Find a control or understand the workspace | [Interface Guide](Interface-Guide.md) |
| Browse every effect and its parameters | [Effect Catalog](Effect-Catalog.md) |
| Fly through an endless world | [Endless Scenes](Endless-Scenes.md) |
| Make the robots dance | [Robot Foundry](Robot-Foundry.md) |
| Explore fractals, depth, and mathematical labs | [Fractals and Math](Fractals-and-Math.md) |
| Pick colors and shape the camera movement | [Colors and Motion](Colors-and-Motion.md) |
| Add sound or use an uploaded track | [Audio and Studio Music](Audio-and-Studio-Music.md) |
| Tune beat reactions and stop unwanted zoom | [Beat Reactor](Beat-Reactor.md) |
| Add treatments and graphical layers | [FX and Overlays](FX-and-Overlays.md) |
| Automate changes without losing the scene | [Smart Shuffle](Smart-Shuffle.md) |
| Save a setup or undo an edit | [Setups and Undo](Setups-and-Undo.md) |
| Export a smooth 60 FPS MP4 | [Rendering and Recording](Rendering-and-Recording.md) |
| Sequence multiple effects | [Timeline](Timeline.md) |
| Write or import a shader | [Shadertoy Lab](Shadertoy-Lab.md) |
| Solve stutter, missing sound, or blank visuals | [Performance and Troubleshooting](Performance-and-Troubleshooting.md) |

## Reference and maintenance

- [Keyboard Shortcuts](Keyboard-Shortcuts.md)
- [Palette Reference](Palette-Reference.md)
- [Post FX Reference](Post-FX-Reference.md)
- [Overlay Reference](Overlay-Reference.md)
- [Screenshot Gallery and capture recipes](Gallery.md)
- [Storage and Privacy](Storage-and-Privacy.md)
- [Architecture](Architecture.md)
- [Development and validation](Development.md)
- [Publishing the repository and wiki](Publishing.md)

## Three useful distinctions

**Preview speed and output frame rate are separate.** A low preview FPS does not prevent a smooth offline render. Select 60 FPS and use Render MP4 when frame completeness matters.

**Global reactions and effect reactions are separate.** Switching off Global Style does not remove a scene's own Music Response or its parameter, FX, and overlay links.

**A setup and a finished video are separate.** Setups live in this browser's local storage. Videos download as files; Gallery keeps session references. Save downloaded media somewhere permanent.
