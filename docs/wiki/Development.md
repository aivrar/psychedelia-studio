# Development

## Run and inspect

The main runtime requires only a browser and the static files. Use the [Quick Start](Quick-Start.md) local server. Node is used for audits and documentation tooling, not production bundling. **Node 22+** provides the built-in WebSocket used by the capture helpers; this documentation pass ran on the installed Node runtime.

Browser tools find standard Windows Edge/Chrome locations. On another installation or OS, set `BROWSER` to the Chromium executable:

```powershell
$env:BROWSER = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
node tools/smoke-test.mjs --contract-only
```

The tools create isolated temporary browser profiles and local HTTP servers. They do not need a personal browser login. `--file` selects direct-file loading for smoke paths that support it. Encoder/media audits may also need FFmpeg and ffprobe; inspect the audit's requirements before running it.

## Validation by scope

```sh
node --test tools/beat-reactor.test.mjs tools/core-regression.test.mjs tools/shuffle.test.mjs
node tools/smoke-test.mjs --contract-only
```

Targeted browser checks:

| Change | Command |
| --- | --- |
| Beat analysis, timing, fine tuning | `node tools/smoke-test.mjs --beat-reactor-only` |
| Saved setups / media restore | `node tools/smoke-test.mjs --setups-only` |
| Direct render workflow | `node tools/smoke-test.mjs --render-only` |
| Live/smooth recording | `node tools/smoke-test.mjs --recording-only` |
| Record-button behavior | `node tools/smoke-test.mjs --recording-ui-only` |
| Shuffle profiles/scheduling | `node tools/smoke-test.mjs --shuffle-only` |
| Edit history / suggested links | `node tools/smoke-test.mjs --history-only` |
| Robot Foundry | `node tools/smoke-test.mjs --robot-only` |

Long shader/media suites can need a larger `PSYCHEDELIA_SMOKE_TIMEOUT`. A failure should be investigated with the audit's JSON and screenshots, not hidden by merely increasing timeouts. Generated artifacts stay under `tools/` and are ignored by Git.

The October 7 recent-code audit reported 66 unit tests, 563 targeted browser checks, and eight syntax checks. That is a historical scoped result. Run the relevant checks for your changes; it is not a certification for every future browser or GPU.

## Add or change an effect

1. Read a nearby effect in the same family and its common helper.
2. Register a unique `name`, label, category, description, parameter definitions, and rendering implementation.
3. Make defaults visibly useful and keep selects/options and numeric bounds internally consistent.
4. Mark palette selectors for shared-library expansion where supported.
5. Mark unsuitable structural/discrete settings as excluded from generic audio linking.
6. Supply coherent starter presets through the family metadata when relevant.
7. Load the script in `index.html` after required helpers and before `app.js`.
8. Run contracts and inspect real frames for all modes/presets. Test time progression, silence, extreme settings, and short exports where appropriate.

Avoid saving effective audio-modulated values into project state. Camera travel should preserve world identity for approaching objects. Compiling successfully is only one check; an all-white image can still be an unusable valid result.

## Refresh the wiki reference

Capture current runtime definitions, then generate Markdown tables:

```sh
node tools/build-wiki-assets.mjs inventory
node tools/build-wiki-reference.mjs
node tools/check-wiki.mjs
```

`catalog.json` includes definitions rather than shader source. Category pages, Post FX/Overlay references, Music Reference, and palette swatches are generated; edit the source definitions or generator rather than hand-fixing those tables.

## Recreate screenshots

```sh
node tools/build-wiki-assets.mjs scenes
node tools/build-wiki-assets.mjs panels
node tools/build-wiki-assets.mjs hero
```

`all` captures scenes and panels together; hero remains an explicit high-resolution job. The capture helper waits for startup restoration, uses a fresh profile, resets unrelated effects, fixes scene time/seed, and captures real canvas pixels or the app viewport. See [Gallery](Gallery.md) for recipes and limitations.

Inspect resulting images visually. A successful file write does not establish good framing, legible controls, or a representative scene. Keep generated `capture-scenes.json`, `capture-panels.json`, and `capture-hero.json` beside the images as provenance.

## Repository boundaries

The public runtime is `index.html`, `style.css`, `src/`, and `lib/`. Experiments, planning notes, backups, and generated audit output are excluded by the root allowlist. They are not needed for the app or its MP4 renderer. Documentation and executable development tools are included separately.

For an optional local Markdown layout review, `python tools/preview-wiki.py` writes `.wiki-preview/`. It requires the Python Markdown package and is not an app dependency. `node tools/build-wiki-assets.mjs review` checks representative rendered pages for broken images and page overflow.
