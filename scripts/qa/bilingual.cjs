const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = path.resolve(__dirname, "../.."),
  out = path.join(root, "docs/evidence");
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "en-US",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.qaText = [];
    const orig = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, max) {
      window.qaText.push({
        text,
        x,
        y,
        width: Math.min(this.measureText(text).width, max ?? Infinity),
        font: this.font,
      });
      if (window.qaText.length > 800) window.qaText.shift();
      return orig.apply(this, arguments);
    };
  });
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:5180/");
  await page.waitForFunction(() => window.__PINGPONG_DEV__);
  await page.waitForTimeout(250);
  const state = () => page.evaluate(() => window.__PINGPONG_DEV__.describe());
  const click = async (label) => {
    const d = await state(),
      b = d.buttons.find((b) => b.label === label || b.label.startsWith(label));
    assert(b, label + " " + d.buttons.map((b) => b.label));
    await page.mouse.click(
      d.transform.x + (b.x + b.w / 2) * d.transform.scale,
      d.transform.y + (b.y + b.h / 2) * d.transform.scale,
    );
    await page.waitForTimeout(80);
  };
  assert.equal((await state()).locale, "en");
  await click("简体中文");
  assert.equal((await state()).locale, "zh-CN");
  await page.reload();
  await page.waitForFunction(() => window.__PINGPONG_DEV__);
  assert.equal((await state()).locale, "zh-CN");
  await click("English");
  await page.evaluate(async () => {
    const content = await import("/src/content/index.ts");
    window.qaContent = content;
    const app = window.__PINGPONG_DEV__;
    app.store.transact((s) => {
      s.tutorialComplete = true;
      s.completedMatches = 5;
      s.coins = 5000;
      s.careerXp = 700;
      s.ownedRackets = content.rackets.map((r) => r.id);
      s.ownedSkins = content.skins.map((s) => s.id);
      s.stageProgress = Object.fromEntries(
        content.stages.map((s) => [s.id, { stars: 2, cleared: true, wins: 1 }]),
      );
      s.learnedTechniques = content.cities.map((c) => "master_" + c.id);
    });
  });
  const checks = [];
  const inspect = async (lang, name) => {
    const result = await page.evaluate(() => {
      window.qaText = [];
      const app = window.__PINGPONG_DEV__;
      app.draw();
      return { texts: window.qaText, state: app.describe() };
    });
    assert.deepEqual(result.state.missingTranslations, [], name);
    if (lang === "en")
      assert.deepEqual(
        result.texts.filter(
          (t) => /\p{Script=Han}/u.test(t.text) && t.text !== "简体中文",
        ),
        [],
        name,
      );
    checks.push({ lang, name, texts: result.texts.length });
    return result;
  };
  for (const lang of ["en", "zh-CN"]) {
    await page.evaluate(
      (lang) => window.__PINGPONG_DEV__.setLocale(lang),
      lang,
    );
    for (const name of [
      "home",
      "map",
      "stages",
      "pre",
      "equipment",
      "skins",
      "passport",
      "settings",
      "training",
      "skillchoice",
      "techniques",
      "privacy",
      "daily",
    ]) {
      await page.evaluate((name) => window.__PINGPONG_DEV__.go(name), name);
      await page.waitForTimeout(60);
      await inspect(lang, name);
      if (["home", "settings", "pre", "daily"].includes(name))
        await page.screenshot({ path: path.join(out, `${lang}-${name}.png`) });
    }
    for (let i = 0; i < 6; i++) {
      await page.evaluate((i) => {
        const app = window.__PINGPONG_DEV__;
        app.go("map");
        app.tourPage = i;
      }, i);
      await inspect(lang, "map-" + i);
      await page.evaluate(() => window.__PINGPONG_DEV__.go("passport"));
      await inspect(lang, "passport-" + i);
    }
    for (let i = 0; i < 4; i++) {
      await page.evaluate((i) => {
        const app = window.__PINGPONG_DEV__;
        app.go("skins");
        app.collectionPage = i;
      }, i);
      await inspect(lang, "skins-" + i);
    }
    for (let i = 0; i < 18; i++) {
      await page.evaluate((i) => {
        const app = window.__PINGPONG_DEV__;
        app.selectedStage = window.qaContent.stages[i * 6 + 5];
        app.cityId = app.selectedStage.cityId;
        app.go("pre");
      }, i);
      await inspect(lang, "final-" + i);
    }
  }
  await page.evaluate(() => {
    const app = window.__PINGPONG_DEV__;
    app.economy.abandon();
    app.store.transact((s) => {
      s.cityRewardsClaimed = ["shanghai"];
    });
    app.selectedStage = window.qaContent.stages[0];
    app.cityId = "shanghai";
    app.start();
    app.match.pause();
  });
  const snapshot = () =>
    page.evaluate(() => {
      const a = window.__PINGPONG_DEV__,
        m = a.match;
      return {
        save: a.exportSave(),
        ball: { ...m.ball },
        score: [m.playerScore, m.aiScore],
        server: m.server,
        phase: m.phase,
        elapsed: m.elapsed,
        skills: a.economy.citySkills(a.cityId),
        stage: m.options.stage.id,
      };
    });
  const before = await snapshot();
  await page.evaluate(() => window.__PINGPONG_DEV__.setLocale("en"));
  await inspect("en", "paused-game");
  assert.deepEqual(await snapshot(), before);
  await page.screenshot({ path: path.join(out, "en-paused-game.png") });
  await click("简体中文");
  assert.deepEqual(await snapshot(), before);
  await inspect("zh-CN", "paused-game");
  await page.evaluate(() => {
    const a = window.__PINGPONG_DEV__;
    a.match.resume();
    a.match.feedback = "你得分 · 回球出界";
    a.match.feedbackTime = 1;
    a.match.phase = "POINT_RESULT";
    a.setLocale("en");
  });
  await inspect("en", "feedback");
  await page.evaluate(() => {
    const a = window.__PINGPONG_DEV__;
    a.economy.abandon();
    a.match = null;
    a.economy.finish({
      id: "qa-result",
      stageId: "SH06",
      won: true,
      stars: 2,
      playerScore: 7,
      aiScore: 5,
      precise: 4,
      hits: 18,
      duration: 65,
      expert: false,
    });
    a.economy.claim("qa-result");
    a.selectedStage = window.qaContent.stages[5];
    a.cityId = "shanghai";
    a.go("result");
  });
  await inspect("en", "result");
  await page.screenshot({ path: path.join(out, "en-result.png") });
  const coins = (await state()).save.coins;
  await page.reload();
  await page.waitForFunction(() => window.__PINGPONG_DEV__);
  assert.equal((await state()).save.coins, coins);
  await inspect("en", "restored-result");
  const sizes = [];
  for (const [width, height] of [
    [360, 800],
    [430, 932],
    [844, 390],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.__PINGPONG_DEV__.go("settings"));
    await page.waitForTimeout(80);
    await inspect("en", `${width}x${height}`);
    sizes.push({ width, height });
  }
  assert.deepEqual(errors, []);
  const report = {
    errors,
    languageDefault: true,
    savedLanguageRestored: true,
    languageSwitchPreservesMatch: true,
    resultReloadNoDuplicate: true,
    checks,
    sizes,
    mockProgressForMenuCoverage: true,
  };
  fs.writeFileSync(
    path.join(out, "browser-bilingual.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      errors,
      checks: checks.length,
      sizes,
      stateInvariant: true,
    }),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
