# Ping Pong Quest · 乒乓闯关王

[中文](README.md) | **English**

Move one racket, meet players across 18 cities, and learn their signature shots. Pull opponents wide with placement and short returns, then smash the high ball into the opening.

A playable browser game built with TypeScript, Canvas 2D and Vite. No account, ads, payments or Douyin integration.

![Game screen](docs/evidence/en-home.png)

## Play without installing anything

Open pingpong-quest.html from the offline release in your browser. Images and code are embedded; no Node.js, server or network connection is needed. Move your mouse or slide one finger. Portrait orientation works best.

Build commands below generate this file. Progress persists when the browser permits local storage. Private browsing or blocked storage may limit it to the session. Offline and hosted versions do not automatically share saves.

## Run from source

Install Node.js 24 LTS (minimum 22.12), then:

```sh
git clone https://github.com/13125846766/pingpong-quest.git
cd pingpong-quest
npm ci
npm run dev
```

Open the printed address, normally http://localhost:5173/. Vite prints another port when that one is occupied. Do not open the source index.html directly.

```sh
npm run check      # Types, tests, content validation and both builds
npm start          # Build if needed, then serve locally
npm run build      # dist/web and dist/offline/pingpong-quest.html
```

On Windows, start-game.cmd opens an existing offline build, or installs dependencies and starts the project.

## Chinese and English

Switch from Home, Settings or a paused match. The first launch follows your browser language; your manual choice takes precedence later. Menus, cities, players, stages, skills, equipment, rewards and match feedback are translated. Switching preserves scores, timing and progress.

## Included

- 18 cities, 108 stages and 54 CPU players.
- Each city: warm-up, style match, special rule, challenger, drill and final.
- Still-racket returns, forward power, diagonal placement and pull-back drops. Fixed table and camera.
- Two skill choices per city, kept on retries. Defeat a champion to learn a permanent shot.
- Four five-level racket families, 23 looks, free practice and daily practice.

The first three cities are the tuning focus. Later cities are playable but share some champion behaviour and need human difficulty testing.

## Deploy and contribute

Serve dist/web on a static host. Relative paths support a GitHub Pages repository subpath. CI and a manual Pages workflow are included; see [Running](docs/RUNNING.en.md).

Run npm run check before contributing. Control reports should include device, browser, stage and steps. Translation JSON files are in src/i18n; keep keys and parameters aligned.

[Design](docs/GAME_DESIGN.en.md) · [Localization](docs/LOCALIZATION.en.md) · [Tests](docs/TEST_REPORT.en.md) · [Roadmap](ROADMAP.en.md)

## License and origins

The existing [MIT License](LICENSE) remains. Development used AI assistance. City illustrations, racket art and the icon were generated with imagegen. Hits and bounces use CC0 recordings; music and other effects are synthesized in code. See [Audio](docs/AUDIO.en.md) and [Third-party notices](THIRD_PARTY_NOTICES.en.md). No reference game's code or art is bundled.
