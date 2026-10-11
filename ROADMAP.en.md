# Development roadmap

[中文](ROADMAP.md) | **English**

This document lists planned work, not implemented features. Attach reproducible running or validation results before marking a task complete.

## Step 1: validate a complete match

- [ ] Set up a TypeScript browser project with clear startup instructions.
- [ ] Add Simplified Chinese and English message catalogs, system-language detection, and a saved language setting.
- [ ] Draw a fixed table, net, ball, and both paddles.
- [ ] Implement touch and mouse controls with an offset that reduces finger occlusion.
- [ ] Validate ball flight, table bounces, net contact, out-of-bounds events, and return detection.
- [ ] Implement an opponent with finite movement speed and recovery time.
- [ ] Implement wide and short placement, awkward saves, high returns, and smash opportunities.
- [ ] Complete scoring, service changes, match start, victory, defeat, pause, and retry flows.
- [ ] Validate full matches on mobile and desktop browsers; record control issues.
- [ ] Verify that language changes apply immediately, persist after restart, and preserve match state.

## Step 2: build a recognizable champion

- [ ] Add readable stroke preparation, signature shots, and counterplay.
- [ ] Complete a practice stage built around the champion's shots.
- [ ] Add impact sounds, short ball trails, and spectator reactions.
- [ ] Test whether players understand losses and can apply a new strategy on retry.

## Step 3: complete the initial scope

- [ ] Complete 3 cities and 18 stages.
- [ ] Implement 4 paddle types and approximately 8 skills that strengthen existing strokes.
- [ ] Offer two skill choices per city and retain the current city's selections on retry.
- [ ] Implement training, the passport, 6 initial appearances, and local saves.
- [ ] Validate match exit, settlement recovery, duplicate reward prevention, and save migrations.
- [ ] Document actual support for sound, music, vibration, and receiving assistance settings.
- [ ] Complete bilingual stage, skill, passport, tutorial, and reward text; verify layout in both languages.

## Step 4: validate platform integration and monetization

- [ ] Implement the Douyin Mini Game adapter and test performance on real devices.
- [ ] Prepare platform qualifications, filing, and review for the actual developer and game.
- [ ] Add optional rewarded ads for extra victory rewards and one continuation after a champion loss.
- [ ] Validate ad loading failures, cancellation, completion, reward delivery, and game recovery.
- [ ] Compare match completion, retries, session match count, and return visits before and after adding ads.
- [ ] Evaluate further investment using actual payouts and costs.

## Later content

- [ ] Expand gradually to 18 cities, 108 stages, and 23 appearances.
- [ ] Add daily challenges with fixed equipment and personal best records.
- [ ] Add server-side saves and validated leaderboards if needed.
- [ ] Evaluate direct cosmetic purchases after confirming payment qualifications and platform permissions.
