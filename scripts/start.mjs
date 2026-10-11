import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
if (!existsSync("dist/web/index.html")) {
  console.log("Building Ping Pong Quest…");
  const { build } = await import("vite");
  await build();
}
await import("./serve.mjs");
