# Third-party and asset notices

[中文](THIRD_PARTY_NOTICES.md) | **English**

Original implementation and project-created content use the root MIT license. Recorded impact clips retain CC0; dependencies retain their own licenses.

- TypeScript: Apache-2.0. Vite, Vitest, esbuild and @types/node: MIT. Versions are pinned; license copies are in docs/licenses. node_modules is excluded from source releases.
- Input smoothing independently implements the 1€ Filter approach by Casiez and colleagues. References: dli7319/one-euro-filter-js (BSD-3-Clause) and casiez/OneEuroFilterArduino. Neither is bundled. See docs/OPEN_SOURCE_REVIEW.md.
- City images, racket art and the icon were generated with imagegen. No other game's images are copied. Prompts and files are recorded in docs/ASSET_MANIFEST.md. Illustrations are not photographs or brand endorsements.
- Hits use michorvath's [Ping pong ball hit](https://freesound.org/people/michorvath/sounds/269718/); bounces use el_boss's [Ping Pong - Ball on Table](https://freesound.org/people/el_boss/sounds/628637/). Both recordings are CC0. Edited WAV excerpts retain CC0 and are exceptions to the MIT asset license. Sources and processing are in assets/audio/manifest.json; see assets/audio/LICENSE.md. Web Audio generates the original score, net contact and UI effects.
- The humanizer-chinese writing skill was used (MIT, revision 1d6c08e10fbfe0e1b36ac784834451c6aae0a92c). It is not in the game runtime; its license copy is in docs/licenses.

Development used AI assistance. Copy was edited while retaining origins. Platform SDKs, ad artwork and configuration are removed from this browser edition.
