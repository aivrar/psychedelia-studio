# Performance and Troubleshooting

Start with a short, simple reproduction. Disable automatic shuffle, choose a known starter preset, and test at 720p before investigating a complex 4K composition.

## Preview performance controls

| Control | Tradeoff |
| --- | --- |
| Preview Quality: Auto | Adapts preview detail to performance. |
| Full / High / Medium / Low | Uses 100% / 75% / 50% / 35% preview quality scales. |
| Preview FPS Cap | Display rate, 60, 30, or 24; reduces unnecessary preview work. |
| UI Priority: Full Visual / Responsive / Strong UI | Balances visual work with input responsiveness; Responsive is the default. |
| Effect detail controls | Fewer ray steps, iterations, or distant objects reduce scene cost. |

These controls help while composing. Direct Render MP4 uses full detail and its own frame clock, independent of the preview FPS cap. It still uses the effect-specific detail values you selected.

## Common problems

| Symptom | Check first | Useful next step |
| --- | --- | --- |
| A “60 FPS” recording looks like 30 FPS or stutters | Was Record Mode Live? Was Video FPS actually set to 60? | Use Render MP4; test a two-second file and inspect playback. |
| Direct render is slower than playback | Resolution, ray detail, FX stack, GPU/encoder load | Render a short 720p test; slower wall time is expected for expensive scenes. |
| Every effect zooms in and out | Beat Reactor Zoom Punch and global Zoom Pulse | Set each to zero separately to identify the source. |
| Camera keeps its tilted angle after stopping rotation | Accumulated global rotation | Use Global Motion & View Reset. |
| Shuffle makes a white or obscured image | Strobe intensity/coverage, bright blends, Flash, bloom/glow | Reset that scope, choose Preserve scene, then add one layer at a time. |
| Preserve scene still looks distorted | Existing manual/Wild FX or global motion | Disable those active passes; the profile constrains new shuffle choices. |
| No sound | Source, source-specific Play, browser audio permission, gain/master/mixer | Press the intended Play button; inspect source status and meters. |
| Sound plays but no reaction | Selected analysis source, zero amounts, empty links | Compare Level and hit meters, then enable one small reaction. |
| Reactions continue in silence | Tempo LFOs, Idle Groove, global Zoom Pulse, fallback shader audio | Disable the relevant independent route. |
| Auto timing follows the wrong rhythm | External tempo at half/double speed | Lock BPM or use Tap. |
| Capture reports no audio track | Selected browser surface did not supply audio | Try a browser tab with audio sharing enabled where supported. |
| MP4 unavailable or initialization fails | H.264/AAC encoder support, browser/GPU | Use tested Chrome/Edge; try lower resolution or video-only to isolate AAC. |
| Long render fails or tab closes | Memory pressure and output size | Use shorter segments, lower resolution/quality, or fewer heavy layers. |
| Fractal becomes flat after a long dive | Classic One-Way precision limit | Use Infinite Dive, lower Loop Depth, and a known target/preset. |
| A custom shader is black | Compile diagnostics and channel errors | Try a built-in template; check pass routing and media CORS. |
| Saved setups seem missing | Different browser/profile/hostname/port | Return to the original origin; site data is not cloud-synced. |
| Download is missing | Browser download policy or finalization still running | Wait for saving, inspect browser downloads, use Gallery download. |

## Black canvas or unsupported backend

Check the backend badge and browser console. Enable hardware acceleration if available and reload. The CPU fallback covers only effects that declare a CPU renderer; it is not feature parity with all WebGL scenes. A GPU-heavy shader can also trigger browser context loss under resource pressure.

Try a simple effect such as Plasma with FX/overlays disabled. If it works, reintroduce the failing scene and layers individually. If the basic app does not load, confirm that all `src/` and `lib/` files are present and try the local HTTP quick-start path.

## Assessing an exported file

A player's frame-rate label reports the time grid, not necessarily the number of distinct images. A silent or static scene can validly repeat images. For motion problems, compare an obviously animated interval and check both video duration and soundtrack duration.

Developer audits use FFmpeg/ffprobe to decode actual exports, inspect frame counts and timestamps, and compare images. See [Development](Development.md) for the test commands. Browser and GPU details belong with any performance report; one machine's measurements do not predict every other machine.

## Reporting a reproducible issue

Include browser/OS/GPU if known, effect and starter preset, changed controls, source type, enabled FX/overlays, resolution/FPS/quality, and whether the issue occurred in Live or Render MP4. Add the shortest relevant clip or screenshot and any visible error. Remove private media, file paths, and API keys from shared evidence.
