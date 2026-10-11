# Ping Pong Quest gameplay proposal

[中文](GAME_DESIGN.md) | **English**

This is a design proposal awaiting implementation and testing. All character, skill, and stage examples describe planned content.

## Concept and campaign

A portrait-mode, single-player table tennis game. Start in Shanghai and challenge fictional local champions. Create opportunities through placement and variations in your strokes, then learn opponents' signature skills after winning.

The full campaign is planned to contain 18 cities with 6 stages each, for 108 stages. Each city has 3 computer opponents with distinct names, styles, and shots. Backgrounds use local architecture, streets, and plants as visual references. The initial validation scope is 3 cities and 18 stages.

## Controls and matches

Slide a finger across the court to move the paddle. Move sideways to reach the ball, forward to meet it, and backward to soften the return. Holding the paddle in a suitable position can also return the ball. A fast forward swipe adds power; a diagonal swipe changes placement. Desktop controls follow the pointer without requiring a held mouse button.

Display the paddle above the finger to reduce occlusion. Keep the table and camera fixed. Ordinary returns provide beginner-friendly tolerance; precise contact improves placement. Skills strengthen existing actions without adding extra ability buttons.

Warm-ups are first to 3 points, ordinary matches first to 5, and city finals first to 7. Service changes every two points. At 4:4 in ordinary matches and 6:6 in finals, the next point wins; 3-point warm-ups likewise use a deciding point at 2:2. Table bounces, net contacts, out-of-bounds events, and legal returns need consistent scoring rules validated in the prototype.

## Placement and attacking opportunities

Computer opponents have finite movement speed and recovery time. Repeated placement toward one side draws an opponent away from the center. A sudden change of direction or a switch from a long to a short ball can force an awkward save. When a high return appears, swipe forward to smash.

Example rally: play two long balls to the right, then a short ball to the left. The opponent lunges and returns a high ball; smash into the open space.

Imbalance must come from deliberate wide or short placement, rather than charging an ability simply by counting successful returns. Smashes still require suitable angles and contact, and may hit the net or go out.

## City champions

Each city should have at least one champion with a readable signature motion, a weakness, and a brief personality cue. Special shots have preparation movements or short visual indicators before release, allowing players to anticipate them.

| City and fictional character | Signature style | Counterplay |
| --- | --- | --- |
| Shanghai: Alley Quick Attacker | Takes the ball early and repeatedly pressures the backhand | Survive the opening attack, then vary depth to disrupt the rhythm |
| Beijing: Hutong Chopping Master | Low, slow backspin encourages impatient smashes into the net | Adjust power, move the opponent, and wait for a high return |
| Chengdu: Teahouse Tempo Player | Slow balls interrupted by a sudden fast shot at the body | Read stroke preparation and leave space to receive |
| Hong Kong: Harbor Sidespin Player | Ball moves sideways after bouncing | Anticipate the spin and adjust paddle position |

Playful paddle appearances, chasing animations, and spectator reactions can make opponents recognizable. Decorations must preserve visibility of the ball, table edges, and landing hints. Difficulty should come from combinations of shots and counterplay, not only increasing speed.

## Learning skills and city builds

Defeating a champion grants coins, experience, appearance rewards, a passport stamp, and a signature skill unlock. Unlocked skills join a permanent skill library.

Offer a choice of one out of three skills after stages two and four of each city. Choices last for the current city and remain on retries; entering the next city starts new selections. Include at least one option suited to the current paddle.

| Example skill | Intended effect |
| --- | --- |
| Borrowed Momentum | A stable block of a fast ball retains more speed in the return |
| Soft Touch | Drawing the paddle backward while receiving makes short returns easier |
| Placement Switch | After repeated placement to one side, the next diagonal change is more accurate |
| High-Ball Hammer | A forward swipe against a high ball produces a stronger smash |

Values, activation conditions, and durations must be determined through testing. Validate basic rallies before adding skill builds.

## Six stages per city

1. Three-point warm-up: learn the city's speed and controls.
2. Style match: encounter the main style; make the first skill choice afterward.
3. Special-rules match: add one clearly explained change, such as starting behind or a restricted valid scoring area.
4. Tough opponent: combine previously introduced shots; make the second skill choice afterward.
5. Thirty-second practice: train against the champion's shots. Completing an attempt allows progression, with extra rewards for meeting the target.
6. Seven-point final: defeat the city champion to unlock the next city and signature skill.

Aim for roughly a minute per ordinary stage, with longer finals if needed; tune duration through real-device testing. Main stages unlock sequentially, and star ratings do not block later cities.

## Progression and replay

Plan 4 paddle types with 5 levels each, representing balanced, attacking, spin, and defensive styles. Upgrades provide moderate control and tolerance improvements while player actions continue to determine outcomes. Plan 23 appearances for the full game, with 6 for initial validation.

The passport collects trophies, stamps, and personal records such as a first comeback or longest memorable rally. Training offers free trials of paddles and available skills without recording campaign results.

Later daily challenges use fixed paddles and skills and allow free repeated attempts at personal bests. Leaderboards require standardized configurations and score validation. Continued matches do not count toward the standardized challenge leaderboard.

## Chinese / English switching

Plan support for Simplified Chinese (`zh-CN`) and English (`en`). On first launch, use Simplified Chinese when the system language is Chinese, and English otherwise. Players can change the language in settings; changes apply immediately and are saved on the current device.

Menus, controls, city and opponent descriptions, skills, passports, rewards, ad controls, and errors use translation keys. Switching language must preserve the match, score, and selected skills and must not grant rewards again. Canvas text must redraw, and assets should avoid embedded text.

Repository documentation uses separate Chinese and English Markdown files with links at the top. See the [localization plan](LOCALIZATION.en.md) for implementation and validation requirements. These requirements have not yet been implemented as game features.

## Ads and platform integration

Initially evaluate only two optional rewarded-ad placements: extra coins after victory, and one continuation per city final loss that removes the last lost point and resumes from the previous score.

Players who decline ads receive the base reward and may continue the campaign or retry freely. No commercial popup appears before the first complete match, and no ad interrupts active rallies. Ad labels and ordinary claim and retry controls remain clear. Validate recovery after failed, cancelled, and completed ads and after reward delivery.

Rewarded ads cannot be a prerequisite for ordinary campaign unlocking, and rewards must not induce sharing. Recheck platform requirements during integration and release: [Douyin ad mini-game operating rules](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/operation1/norms/norms) and [Douyin Mini Game integration guide](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/overview).

Evaluate direct cosmetic purchases only after confirming qualifications, payment access, and account permissions.

## Architecture, assets, and saves

Plan to use TypeScript and Canvas 2D, with separate simulation, input, rendering, rewards, saves, and platform adapters. Browser and mini-game versions share simulation logic.

Keep simulation state independent of rendering objects. Save unlocked stages, current-city skills, continuation usage, and reward state, and handle match exit, settlement recovery, and duplicate rewards. Paid entitlements and trustworthy leaderboards require server-side support.

Load city assets on demand. Preserve generation prompts and attribution for future generated art; check permissions and record licenses for third-party assets. There are no generated game art assets in this repository yet.

## Validation order

Validate a complete champion match that players want to retry before expanding cities. Observe first-match completion, voluntary retry rates, matches per session, next-day return visits, and changes after introducing ads. Assess monetization using actual payouts and acquisition and maintenance costs without assuming guaranteed revenue.
