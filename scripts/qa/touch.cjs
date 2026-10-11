const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { installAudioProbe, readAudioProbe } = require("./audio-probe.cjs");
const dir = path.resolve(__dirname, "../../docs/evidence");
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const errors = [];
  await page.addInitScript(installAudioProbe);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5180");
  await page.waitForTimeout(250);
  const state = () => page.evaluate(() => window.__PINGPONG_DEV__.describe());
  const click = async (text) => {
    const d = await state(),
      b = d.buttons.find((v) => v.label === text || v.label.startsWith(text));
    assert(b, "Button " + text);
    await page.touchscreen.tap(
      d.transform.x + (b.x + b.w / 2) * d.transform.scale,
      d.transform.y + (b.y + b.h / 2) * d.transform.scale,
    );
  };
  await page.evaluate(() => {
    const app = window.__PINGPONG_DEV__,
      s = JSON.parse(app.exportSave());
    s.tutorialComplete = true;
    app.setLocale("en");
    app.importSave(JSON.stringify(s));
  });
  await page.waitForTimeout(100);
  await click("Play now");
  const cdp = await page.context().newCDPSession(page);
  const touch = async (type, x, y) => {
    const d = await state();
    await cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints:
        type === "touchEnd"
          ? []
          : [
              {
                id: 1,
                x: d.transform.x + x * d.transform.scale,
                y: d.transform.y + y * d.transform.scale,
              },
            ],
    });
  };
  let before = (await state()).match.paddle;
  await touch("touchStart", 195, 610);
  await page.waitForTimeout(60);
  const down = (await state()).match.paddle;
  assert(
    Math.abs(before.x - down.x) < 1 && Math.abs(before.y - down.y) < 1,
    "touchdown must not jump",
  );
  await touch("touchMove", 275, 340);
  await page.waitForTimeout(100);
  const fore = (await state()).match.paddle;
  assert(fore.x > 260 && fore.y < 325, "two-axis reach");
  await touch("touchMove", 125, 780);
  await page.waitForTimeout(120);
  const back = (await state()).match.paddle;
  assert(back.x < 150 && back.y > 700, "retreat reach " + JSON.stringify(back));
  await touch("touchEnd", 0, 0);
  await click("Ⅱ");
  const paused = await state();
  await page.waitForTimeout(230);
  const frozen = await state();
  assert.equal(paused.match.phase, "PAUSED");
  assert.deepEqual(frozen.match.ball, paused.match.ball);
  await click("Resume");
  const resumed = await state();
  // Single continuous finger; its offset preserves the last paddle position.
  const origin = resumed.match.paddle;
  let finger = { x: origin.x, y: origin.y };
  await touch("touchStart", finger.x, finger.y);
  let hits = 0,
    contacts = 0,
    recovered = 0;
  for (let i = 0; i < 1200; i++) {
    const d = await state();
    if (d.page === "result") break;
    const m = d.match,
      b = m.ball;
    hits = m.hits;
    contacts = Math.max(contacts, m.rallyContacts);
    if (b.active && b.vy < 0) {
      const dt = 0.07,
        denom = Math.max(0.42, b.y + b.vy * dt + 2.05),
        z = Math.max(0.02, b.z + b.vz * dt - 4.905 * dt * dt);
      finger = {
        x: Math.max(24, Math.min(366, 195 + ((b.x + b.vx * dt) * 520) / denom)),
        y: Math.max(252, Math.min(746, 70 + (672 - z * 360) / denom)),
      };
      await touch("touchMove", finger.x, finger.y);
    }
    if (i === 100)
      await page.screenshot({
        path: path.join(dir, "touch-rally-browser.png"),
      });
    await page.waitForTimeout(60);
  }
  await touch("touchEnd", 0, 0);
  const end = await state();
  assert.equal(end.page, "result", JSON.stringify(end.match));
  assert(end.match.hits >= 5);
  const audio = await page.evaluate(readAudioProbe);
  assert.equal(audio.decoded.length, 4);
  assert.equal(audio.loops.length, 1);
  assert(audio.recordedHits.length >= end.match.hits);
  assert(audio.recordedBounces.length >= end.match.hits);
  const coins = end.save.coins;
  await page.reload();
  await page.waitForTimeout(200);
  assert.equal((await state()).save.coins, coins);
  recovered++;
  const viewports = [];
  for (const [width, height] of [
    [360, 800],
    [430, 932],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    await page.screenshot({
      path: path.join(dir, `browser-${width}x${height}.png`),
    });
    viewports.push({ width, height, transform: (await state()).transform });
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(dir, "touch-browser.json"),
    JSON.stringify(
      {
        errors,
        before,
        down,
        fore,
        back,
        pauseFrozen: true,
        hits: end.match.hits,
        maxContacts: contacts,
        audio,
        score: end.match.score,
        settlementReloadNoDuplicate: recovered,
        viewports,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      errors,
      hits: end.match.hits,
      contacts,
      score: end.match.score,
      before,
      down,
      fore,
      back,
    }),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
