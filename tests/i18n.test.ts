import { describe, expect, it } from "vitest";
import {
  catalogs,
  defaultLocale,
  LANGUAGE_KEY,
  Localizer,
  wrapText,
} from "../src/i18n";
import { MemoryStorage } from "../src/platform/mock";
import { cities, opponents, rackets, skins, stages } from "../src/content";
import { masters, techniques } from "../src/content/techniques";

describe("language choice", () => {
  it.each(["zh-CN", "zh-TW", "zh-HK", "zh"])(
    "defaults to Chinese for %s",
    (language) => {
      expect(defaultLocale(language)).toBe("zh-CN");
    },
  );
  it.each(["en-US", "fr-FR", "ja", ""])(
    "defaults to English for %s",
    (language) => {
      expect(defaultLocale(language)).toBe("en");
    },
  );
  it("keeps a saved choice after a change of system language", () => {
    const storage = new MemoryStorage();
    const locale = new Localizer(storage, "zh-CN");
    locale.set("en");
    expect(storage.get(LANGUAGE_KEY)).toBe("en");
    expect(new Localizer(storage, "zh-CN").locale).toBe("en");
    locale.set("zh-CN");
    expect(new Localizer(storage, "en-US").locale).toBe("zh-CN");
  });
  it("invalid preferences and unavailable storage still allow startup", () => {
    const storage = new MemoryStorage();
    storage.set(LANGUAGE_KEY, "invalid");
    expect(new Localizer(storage, "en").locale).toBe("en");
    const denied = {
      get: () => {
        throw new Error("denied");
      },
      set: () => {
        throw new Error("denied");
      },
    };
    const locale = new Localizer(denied, "zh-CN");
    expect(() => locale.set("en")).not.toThrow();
    expect(locale.locale).toBe("en");
  });
});

describe("game text", () => {
  it("has matching nonempty keys and placeholders", () => {
    expect(Object.keys(catalogs.en).sort()).toEqual(
      Object.keys(catalogs["zh-CN"]).sort(),
    );
    for (const key of Object.keys(
      catalogs.en,
    ) as (keyof typeof catalogs.en)[]) {
      expect(catalogs.en[key].trim(), key).not.toBe("");
      const placeholders = (text: string) =>
        [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
      expect(placeholders(catalogs.en[key]), key).toEqual(
        placeholders(catalogs["zh-CN"][key]),
      );
    }
  });
  it("translates every city, opponent, stage, racket, skin and skill", () => {
    const locale = new Localizer(new MemoryStorage(), "en");
    const strings = [
      ...cities.flatMap((c) => [c.name, c.subtitle, c.skinName]),
      ...opponents.flatMap((o) => [o.name, o.weakness]),
      ...stages.flatMap((s) => [s.title, s.hint]),
      ...rackets.flatMap((r) => [r.name, r.description, r.main]),
      ...skins.flatMap((s) => [s.name, s.condition]),
      ...techniques.flatMap((t) => [t.name, t.description]),
      ...masters.flatMap((m) => [m.nickname, m.tell, m.weakness, m.opening]),
    ];
    for (const source of strings)
      expect(locale.content(source), source).not.toMatch(/\p{Script=Han}/u);
    expect([...locale.missing]).toEqual([]);
  });
  it("translates saved rewards and composite match feedback", () => {
    const locale = new Localizer(new MemoryStorage(), "en");
    expect(locale.content("你得分 · 回球出界")).toBe("You score · Return out");
    expect(
      locale.content(
        "金币 +180   积分 +60   碎片 +1\n学会「弄堂抢点」，奖杯和印章已收好",
      ),
    ).toBe(
      "Coins +180   XP +60   Shards +1\nLearned “Alley Rush”. Trophy and stamp collected.",
    );
    expect(locale.content("借力反击、变线高手")).toBe(
      "Counter Return, Switch Hitter",
    );
  });
  it("falls back to English for missing catalog values", () => {
    const locale = new Localizer(new MemoryStorage(), "zh-CN");
    const key = "ui.world_tour";
    const previous = catalogs["zh-CN"][key];
    try {
      catalogs["zh-CN"][key] = "";
      expect(locale.t(key)).toBe("World Tour");
    } finally {
      catalogs["zh-CN"][key] = previous;
    }
  });
  it("wraps English at word boundaries and keeps Chinese punctuation", () => {
    expect(
      wrapText("Meet the local champion", 10, (value) => value.length),
    ).toEqual(["Meet the", "local", "champion"]);
    expect(wrapText("稳稳接住。下一球", 4, (value) => value.length)).toEqual([
      "稳稳接住。",
      "下一球",
    ]);
    expect(
      wrapText("First line\nSecond line", 50, (value) => value.length),
    ).toEqual(["First line", "Second line"]);
  });
});
