# Ping Pong Quest · 乒乓闯关王

[中文](README.md) | **English**

A portrait-mode, single-player table tennis game planned for TypeScript and Canvas 2D. Challenge fictional local champions, create attacking opportunities with placement and changes of pace, and learn their signature shots after winning.

> **Status: design phase.** This repository contains a gameplay proposal and development roadmap. The game has not been implemented. There is no playable demo, build, or installer. The 18-city, 108-stage campaign is planned content.

## Gameplay direction

- Move the paddle with one finger. Hold position to return, swipe forward for power, and swipe diagonally to change placement. On desktop, the paddle follows the mouse pointer.
- Move opponents across the table with wide and short shots to force awkward returns, high balls, and open space.
- Read and counter each city champion's signature shots. Defeating a champion unlocks a new skill.
- Choose one of three skills twice during each city. Skills strengthen existing strokes and support different play styles.
- Plan for 18 cities with 6 stages each. Validate a smaller initial scope of 3 cities and 18 stages first.
- Collect city stamps, trophies, and paddle appearances in a passport. Try paddles freely in training.
- Plan for Simplified Chinese and English, with an initial system-language default and a saved language setting.

See the [game design](docs/GAME_DESIGN.en.md), [roadmap](ROADMAP.en.md), and [localization plan](docs/LOCALIZATION.en.md). Each document has Chinese / English links at the top.

## Running the project

There is no runtime entry point yet. The repository does not contain a `package.json`, game source, or development server configuration. It cannot currently be started with `npm install` or `npm run dev`. Verified environment requirements and startup commands will be added when the first playable version is available.

## Planned architecture

Keep simulation, input mapping, rendering, rewards, and saves in separate modules. Browser and Douyin Mini Game versions are planned to share match logic, with platform adapters for input, storage, audio, and advertising.

Simulation state should remain independent of rendering objects. Advertising, leaving a match, and restoring settlement require explicit state transitions. Start with a playable browser prototype before validating the mini-game adapter.

## Contributing

Use Issues to discuss controls, stage rules, and champion design, or submit documentation fixes. Code contributions should include working startup instructions and validation appropriate to the change.

Do not commit credentials, platform keys, private data, or images, music, and code without permission to use them.

## License and attribution

Original repository content is licensed under the [MIT License](LICENSE). Third-party dependencies and assets added later must retain their own licenses and attribution, recorded in [THIRD_PARTY_NOTICES.en.md](THIRD_PARTY_NOTICES.en.md).

The design documents were developed collaboratively by the project proposer and an AI assistant. No game art has been generated or imported yet. The project does not claim exclusively human-drawn art or exclusively human-written content.
