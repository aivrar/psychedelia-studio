# Colors and Motion

## Choose a palette

Many effects offer **Color Palette** or **Palette**. The menu starts with **Effect Originals**, followed by shared groups: psychedelic, neon, emotional, natural, fractal, scientific, and material-like color ramps as provided by the library. The [Palette Reference](Palette-Reference.md) lists all 71 shared entries with swatches.

Effect-native palettes are specific to that scene. Their counts and names differ. Older effects may have a smaller dedicated color system rather than the shared selector.

After picking a palette, use the available controls deliberately:

| Control type | Typical purpose |
| --- | --- |
| Palette Phase | Move the sampled position along the color ramp. |
| Hue Shift | Rotate resulting hues. |
| Saturation | Adjust color intensity. |
| Color Spread | Increase or reduce variation across the scene. |
| Color Drift / Speed | Animate the color position over time. |
| Fog | Blend distant structures toward atmospheric color, emphasizing depth. |
| Glow / Light | Strengthen illumination; high values can wash out detail when combined with FX. |

These are common names, not a promise that every effect exposes all controls. See the effect's generated reference for exact ranges.

## Global Motion & View

These controls apply across effect changes:

| Control | Range | Default | Meaning |
| --- | --- | --- | --- |
| Animation Speed | 0–12 | 1× | Multiplies the visual animation clock. |
| Rotation | −3 to +3 | 0 | Continuous full-view rotation speed. |
| View Zoom | 0.25–8 | 1× | Global framing/scale. |
| Zoom Pulse | 0–1.5 internally, displayed as a percentage | 0 | Continuous breathing zoom depth. |
| Zoom Pulse Speed | 0–8 | 0.7 | Rate of the continuous zoom pulse. |

**Reset** returns the global motion controls to defaults and brings the current rotation upright. Setting Rotation to zero stops further turning but does not necessarily erase an angle already accumulated; use Reset for that.

Animation Speed zero freezes the visual clock; it is not the same as setting a scene's Flight Speed to zero. The latter can leave robots, lights, clouds, or formula morphs moving while the camera holds still.

## Two kinds of zoom pulse

**Zoom Pulse** under Global Motion is a continuous animation. **Zoom Punch** under Audio → Beat Reactor → Fine Tune responds to music. Both can operate at once, and both are global. Changing the effect does not reset them.

For a stable camera, set both to zero. For beat-driven movement, leave Zoom Pulse at zero and use a small Zoom Punch. For a slow visual breathing motion without audio, use Zoom Pulse and keep beat Zoom Punch off.

## A restrained color recipe

Choose one palette, keep saturation near its default, and use fog to create depth before increasing glow. Add one small color or lighting link. If the image becomes pale or white, temporarily disable Flash, additive overlays, bloom-like FX, and high-intensity glow one at a time. This reveals which layer is consuming the contrast.

See [Beat Reactor](Beat-Reactor.md) and [FX and Overlays](FX-and-Overlays.md).
