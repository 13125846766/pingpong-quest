# Audio

[中文](AUDIO.md)

Racket hits and table bounces use real table-tennis recordings by michorvath and el_boss on Freesound, both released under CC0. [The manifest](../assets/audio/manifest.json) records sources, trims, processing and hashes; [the license notice](../assets/audio/LICENSE.md) credits the recordists. Clips ship with the game, with no requests to Freesound during play.

Three separate table impacts rotate to avoid repeating an identical click. Collision events capture speed and position before the simulation moves on. Stronger hits are louder, distant hits quieter, with restrained pitch variation and stereo placement. Net contact uses a short, soft noise sound. A practice target success no longer plays an extra racket sound.

The original background score is a sixteen-bar, 78 BPM instrumental phrase of about 49 seconds. `src/audio/music.ts` renders warm keys, plucked notes and bass, carrying release tails across the loop boundary. It is prepared once as Home opens; touches and buttons do not restart it. The music bus fades lower during rallies and returns between points or while paused. Music and sound effects have separate switches.

Audio starts after the first browser interaction. Window blur or backgrounding suspends all audio; returning attempts to continue the same loop. If the browser requires another gesture, the next touch restores it. Missing recordings fall back to short synthesized impacts; unsupported audio does not stop the game. The offline HTML embeds all four WAV files.

Unit tests cover lifecycle, mixing, physical collision snapshots and the loop seam. Browser tests observe actual Web Audio decoding and playback. They do not assess perceived sound quality; headphone and phone-speaker listening remains a human check.
