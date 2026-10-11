import { build } from "esbuild";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";

const assets = {};
for (const [folder, mime] of [
  ["cities", "image/jpeg"],
  ["rackets", "image/png"],
  ["audio", "audio/wav"],
]) {
  for (const name of await readdir(`assets/${folder}`)) {
    if (!/\.(jpg|png|wav)$/.test(name)) continue;
    assets[`${folder}/${name}`] =
      `data:${mime};base64,${(await readFile(`assets/${folder}/${name}`)).toString("base64")}`;
  }
}
const bundle = await build({
  entryPoints: ["src/entries/browser.ts"],
  bundle: true,
  write: false,
  format: "iife",
  target: "es2018",
  minify: true,
  define: { "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" },
});
const code = bundle.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = (await readFile("index.html", "utf8")).replace(
  /<script type="module" src="[^"]+"><\/script>/,
  () =>
    `<script>window.PINGPONG_ASSETS=${JSON.stringify(assets)};</script><script>${code}</script>`,
);
await mkdir("dist/offline", { recursive: true });
await writeFile("dist/offline/pingpong-quest.html", html);
console.log(
  "Offline game: dist/offline/pingpong-quest.html (double-click to play)",
);
