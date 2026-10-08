# Publishing

The intended repository is **`aivrar/psychedelia-studio`**, with the display name **Psychedelia Studio**. This package prepares files locally; it does not create a repository or publish anything by itself.

## Repository contents

The app needs **four runtime entries**: `index.html`, `style.css`, `src/`, and `lib/`. The HTML is an entry point that loads separate scripts and styles; it is not a self-contained single-file build. Keep all four together when running or hosting it.

The repository additionally includes the README, contributor/third-party notes, maintained wiki, and relevant audit/documentation tools. A static deployment needs only the four runtime entries; the wiki screenshots are documentation assets, not required by the app.

The supplied `.gitignore` uses a root allowlist. Experiments, planning files, backups, terminal scratch files, historical internal notes, installed dependencies, generated audit logs/media, and wiki staging output stay out of normal Git additions. It does not delete those files. Curated wiki screenshots, metadata, and the vendored Tone.js license are included.

Before the first public commit, review the staged file list and diff. The project-wide license remains to be chosen by the owner. The supplied Tone.js MIT notice covers that dependency only. Existing shader provenance and imported media terms should be retained; this documentation pass is not a complete license/provenance audit.

## Validate the prepared files

From the project root:

```sh
node tools/check-wiki.mjs
node --test tools/beat-reactor.test.mjs tools/core-regression.test.mjs tools/shuffle.test.mjs
```

Create the main repository with the intended name when ready. Review Git identity and authentication in your normal Git client; no login identifier or credential belongs in the README or wiki. The public project attribution is **aivrar**.

The repository README uses relative documentation and image links, so it works before the separate Wiki is populated. No hosted demo URL is advertised until a deployment actually exists.

## Prepare the GitHub Wiki

GitHub stores a wiki as a separate Git repository. Create an initial wiki page on GitHub before cloning its `.wiki.git` repository. Only changes pushed to that wiki's default branch appear as the live wiki. See [GitHub's wiki editing instructions](https://docs.github.com/en/communities/documenting-your-project-with-wikis/adding-or-editing-wiki-pages).

Create a publishable local export:

```sh
node tools/prepare-wiki.mjs
```

This writes `.wiki-export/` with pages, `_Sidebar.md`, `_Footer.md`, images, and capture metadata. It rewrites repository-relative page links to full wiki URLs and image links to that wiki's raw image URLs. The original `docs/wiki/` remains easy to browse inside the main repository. GitHub documents Markdown wiki links and image embedding in [Editing wiki content](https://docs.github.com/en/communities/documenting-your-project-with-wikis/editing-wiki-content).

After the main repository and initial wiki page exist, clone the wiki to a sibling directory and export into it:

```sh
git clone https://github.com/aivrar/psychedelia-studio.wiki.git ../psychedelia-studio.wiki
node tools/prepare-wiki.mjs ../psychedelia-studio.wiki
git -C ../psychedelia-studio.wiki status --short
git -C ../psychedelia-studio.wiki diff
```

The export overwrites same-named generated pages/images in its destination but does not delete unrelated pages. Review the diff before committing. Then commit and push the wiki through the usual Git workflow when publication is intended. The script performs no network, commit, or push action.

For a different repository, supply its name explicitly:

```sh
node tools/prepare-wiki.mjs .wiki-export owner/repository
```

## Verify after publication

Open Wiki Home, Quick Start, the catalog, one category page, and the palette/gallery pages. Confirm sidebar navigation, intra-page links, image loading, and download-sized images. Check the README from the repository homepage as well. Local validation checks targets and metadata; it does not substitute for a final check of the hosted GitHub renderer.

## Maintain one source

Edit guides under `docs/wiki/`, refresh generated references when definitions change, and regenerate the wiki export. For images, run the capture helpers and inspect the results before publishing. Use the [Development guide](Development.md) for commands and [Gallery](Gallery.md) for shot recipes.
