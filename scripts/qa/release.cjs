const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { installAudioProbe, readAudioProbe } = require("./audio-probe.cjs");
const root = path.resolve(__dirname, "../..");
const output = path.join(root, "docs/evidence");
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const errors = [],
    cases = [];
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const relative =
      pathname.replace(/^\/pingpong-quest\//, "") || "index.html";
    const file = path.resolve(root, "dist/web", relative);
    if (
      !pathname.startsWith("/pingpong-quest/") ||
      !file.startsWith(path.resolve(root, "dist/web") + path.sep)
    ) {
      response.writeHead(404);
      response.end();
      return;
    }
    try {
      response.setHeader(
        "Content-Type",
        file.endsWith(".js")
          ? "text/javascript"
          : file.endsWith(".html")
            ? "text/html"
            : file.endsWith(".jpg")
              ? "image/jpeg"
              : file.endsWith(".wav")
                ? "audio/wav"
                : "image/png",
      );
      response.end(fs.readFileSync(file));
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  for (const kind of ["offline", "subpath", "blocked-storage"]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: kind === "subpath" ? "zh-CN" : "en-US",
      offline: kind === "offline",
    });
    const page = await context.newPage();
    await page.addInitScript(installAudioProbe);
    const failed = [],
      requests = [];
    page.on("pageerror", (e) => errors.push({ kind, message: e.message }));
    page.on("response", (response) => {
      if (response.status() >= 400) failed.push(response.url());
    });
    page.on("request", (request) => requests.push(request.url()));
    await page.addInitScript((blockStorage) => {
      if (blockStorage) {
        Storage.prototype.getItem = () => {
          throw new Error("blocked");
        };
        Storage.prototype.setItem = () => {
          throw new Error("blocked");
        };
      }
      window.qaText = [];
      const original = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, x, y) {
        const transform = this.getTransform(),
          ratio = window.devicePixelRatio || 1;
        window.qaText.push({
          text,
          x: (x * transform.a + transform.e) / ratio,
          y: (y * transform.d + transform.f) / ratio,
        });
        if (window.qaText.length > 500) window.qaText.shift();
        return original.apply(this, arguments);
      };
    }, kind === "blocked-storage");
    await page.goto(
      kind === "offline"
        ? pathToFileURL(path.join(root, "dist/offline/pingpong-quest.html"))
            .href
        : `http://127.0.0.1:${server.address().port}/pingpong-quest/`,
    );
    await page.waitForTimeout(300);
    const initialLanguage = await page.evaluate(
      () => document.documentElement.lang,
    );
    assert.equal(initialLanguage, kind === "subpath" ? "zh-CN" : "en");
    assert.equal(
      await page.evaluate(() => typeof window.__PINGPONG_DEV__),
      "undefined",
    );
    const click = async (label) => {
      const point = await page.evaluate(
        (label) =>
          [...window.qaText]
            .reverse()
            .find((t) => t.text === label || t.text.startsWith(label)),
        label,
      );
      assert(point, label);
      await page.mouse.click(point.x, point.y);
      await page.waitForTimeout(120);
    };
    await click(initialLanguage === "en" ? "简体中文" : "English");
    assert.equal(
      await page.evaluate(() => document.documentElement.lang),
      initialLanguage === "en" ? "zh-CN" : "en",
    );
    if (initialLanguage === "en") await click("English");
    await page.waitForFunction(() => window.qaAudio.decoded.length === 4);
    for (let i = 0; i < 4; i++) {
      await click("简体中文");
      await click("English");
    }
    const continuous = await page.evaluate(readAudioProbe);
    assert.equal(continuous.contexts.length, 1);
    assert.equal(continuous.loops.length, 1);
    assert(continuous.loops[0].duration > 40);
    assert(
      continuous.decoded.every((clip) => clip.peak > 0.7 && clip.peak < 0.9),
    );
    await click("Settings");
    const toggleMusic = async (label) => {
      const point = await page.evaluate((label) => {
        const music = [...window.qaText]
          .reverse()
          .find((t) => t.text === "Music");
        return [...window.qaText]
          .reverse()
          .find((t) => t.text === label && Math.abs(t.y - music.y) < 1);
      }, label);
      assert(point, "Music toggle " + label);
      await page.mouse.click(point.x, point.y);
      await page.waitForTimeout(700);
    };
    await toggleMusic("On");
    assert(
      (await page.evaluate(readAudioProbe)).contexts[0].musicLevel < 0.002,
    );
    await toggleMusic("Off");
    assert((await page.evaluate(readAudioProbe)).contexts[0].musicLevel > 0.15);
    assert.equal((await page.evaluate(readAudioProbe)).loops.length, 1);
    await click("‹");
    await click("Play now");
    await click("Ⅱ");
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await page.waitForFunction(
      () => window.qaAudio.contexts[0].state === "suspended",
    );
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.waitForFunction(
      () => window.qaAudio.contexts[0].state === "running",
    );
    assert.equal((await page.evaluate(readAudioProbe)).loops.length, 1);
    await click("Resume");
    assert(
      await page.evaluate(() => window.qaText.some((t) => t.text === "You")),
    );
    assert.deepEqual(failed, []);
    if (kind === "offline")
      assert.equal(requests.filter((url) => /^https?:/.test(url)).length, 0);
    await page.screenshot({ path: path.join(output, `release-${kind}.png`) });
    cases.push({
      kind,
      boot: true,
      languageSwitch: true,
      matchStarted: true,
      pausedAndResumed: true,
      audio: {
        decodedRecordings: continuous.decoded,
        singleMusicLoop: true,
        musicToggle: true,
        blurMutedAndFocusRestored: true,
      },
      errors: failed,
      remoteRequests: requests.filter(
        (url) => /^https?:/.test(url) && !url.includes("127.0.0.1"),
      ).length,
    });
    await context.close();
  }
  assert.deepEqual(errors, []);
  server.close();
  await browser.close();
  const report = {
    errors,
    cases,
    productionDevApiAbsent: true,
    realPhonesTested: false,
  };
  fs.writeFileSync(
    path.join(output, "release-browser.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
