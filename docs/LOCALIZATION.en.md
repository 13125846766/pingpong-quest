# Chinese / English localization plan

[中文](LOCALIZATION.md) | **English**

Bilingual documentation and switching links have been prepared. The following game-interface features still await implementation.

## Languages and controls

- Support Simplified Chinese (`zh-CN`) and English (`en`).
- On first launch, use Simplified Chinese for a Chinese system locale and English otherwise.
- Provide a language setting labeled “语言 / Language”, with choices named “简体中文” and “English” for easy recognition.
- A player's explicit selection overrides the system locale and is stored on the current device. Restore that selection on later launches.
- Apply changes immediately without restarting the game.

## Translation scope

Use stable message keys for menus, buttons, instructions, settings, cities, opponents, stages, skills, paddles, the passport, match results, rewards, ad controls, and errors. Insert dynamic numbers through parameters instead of concatenating translated fragments into sentences.

Use standard English city names, including Shanghai, Beijing, Chengdu, and Hong Kong. Character and skill names should match the English game-design document.

If a translation is missing in the selected language, fall back to English and report the missing entry in development logs. Do not show internal message keys in the interface. Avoid embedding text in artwork; use separate localized assets where text is necessary.

## State and layout

Changing language affects display text only. Preserve scores, serving side, ball trajectory, timers, stages, skills, coins, and claimed-reward state. Redraw Canvas text after changing the language.

Check button widths, wrapping, fonts, long names, and number formatting in both languages. Translations must preserve court visibility and key touch-target sizes. Display language and currency names must not change reward quantities or perform currency conversion.

## Validation

- [ ] Correct first-launch defaults for Chinese and English system locales.
- [ ] All visible text updates when switching from Chinese to English and back.
- [ ] Explicit selections persist after restart and are not overwritten by system-locale changes.
- [ ] Language changes during a match preserve simulation and reward records.
- [ ] Long opponent names, tutorials, reward messages, and ad buttons fit in both languages.
- [ ] Message catalogs have matching key sets and parameter placeholders, with testable missing-entry fallback.

## Repository documentation

Chinese documents use ordinary filenames; English versions use the `.en.md` suffix. Links at the top of each document switch to the corresponding version of the same document. Update both languages when changing the design.
