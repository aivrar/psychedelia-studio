# Storage and Privacy

The built-in studio runs in the browser without a project account or application backend. Its main code and Tone.js dependency are local files. Audio/image uploads are selected into the page for local use; they are not automatically uploaded to a project server by the built-in setup workflow.

## Where work lives

| Data | Location / lifetime |
| --- | --- |
| Latest setup and named setups | Browser IndexedDB for this origin |
| Attached setup audio/image files | IndexedDB asset storage |
| UI preferences, favorites, collapsed sections | Browser local storage |
| Shadertoy project/library and optional API key | Browser local storage |
| Timeline | In-page state until explicitly saved as JSON |
| Gallery | Video blobs/object URLs in the current page session |
| Downloaded PNG/MP4/WebM/JSON | Browser's chosen download location |

Different profiles and origins do not share these stores. Private browsing, site-data clearing, browser eviction, or quota limits can affect persistence. A named setup is convenient local storage, not a portable backup service. Keep original media and downloaded outputs separately.

## Network and permissions

The core effect/music workflow does not require remote services once the files are available. Optional Shadertoy API imports make network requests, and user-specified external media channels can request remote assets. Hosting the app remotely also means its static files are requested from that host.

Capture Playback opens the browser's display-capture picker and uses the selected stream's audio. Shadertoy webcam/microphone channels request their own permissions when configured. Those permissions and streams do not silently resume from a saved setup.

The optional Shadertoy API key is stored locally in the browser. Anyone with access to that browser profile or its developer tools may be able to read local storage. Keep keys out of screenshots and repository files.

## Deleting work

Delete a named setup with **Delete saved**. Clear an audio file with its **Clear** control and stop capture with **Stop**. Closing/reloading the page discards session Gallery references; it does not delete files already downloaded.

To remove all origin-local app data, use the browser's site-data controls for the exact address. This also removes saved setups, shader libraries, and preferences for that origin. Export anything you need first.
