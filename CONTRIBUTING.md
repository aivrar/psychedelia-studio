# Contributing to Psychedelia Studio

The main app is a static browser project. Run it from a local HTTP server, make a focused change, and validate the affected workflow. No root package installation or production build is required.

Read the [architecture](docs/wiki/Architecture.md) and [development guide](docs/wiki/Development.md) before changing rendering, audio clocks, shader registration, or exporting.

## A useful change

- Describe the concrete problem and resulting behavior.
- Keep an effect's labels, ranges, defaults, palette metadata, and preset values consistent.
- Preserve the distinction between base values and audio-modulated values.
- Test new shader modes visually as well as checking compilation.
- For export changes, inspect a decoded video with actual motion and sound; a successful download alone is insufficient.
- Update the user guide when a workflow changes. Regenerate references after changing effect/FX/overlay definitions.

## Validation

```sh
node --test tools/beat-reactor.test.mjs tools/core-regression.test.mjs tools/shuffle.test.mjs
node tools/smoke-test.mjs --contract-only
node tools/check-wiki.mjs
```

Run the relevant targeted browser audit listed in [Development](docs/wiki/Development.md). Browser captures require an installed Chrome/Edge; set `BROWSER` if autodetection cannot find it. Do not commit generated browser profiles, audit videos, personal media, keys, or scratch logs.

## Documentation

`docs/wiki/` is the source of truth. Edit guides there, retain relative Markdown links, and let `tools/prepare-wiki.mjs` rewrite links when producing a GitHub Wiki export. Do not maintain divergent copies by editing only the published wiki.

Generated references come from `catalog.json`, captured from the live registry. See the documented two-command refresh in Development. Screenshots must represent actual app behavior; include a repeatable scene recipe for showcase renders.

## Issues and pull requests

For a bug, include reproduction steps, browser/OS, effect/preset, audio source, FX/overlays, output settings, expected result, and actual result. Attach a short nonprivate screenshot or sample when it helps. For a PR, state what changed, why, how it was validated, and remaining limits.

The project-wide license is currently undecided. Do not introduce code or media whose redistribution terms are unknown; retain dependency and imported shader attribution.
