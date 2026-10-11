import { build } from "esbuild";
const result = await build({
  stdin: {
    contents:
      "import {validateContent} from './src/content/index.ts'; console.log(JSON.stringify(validateContent())); if(validateContent().length)process.exit(1);",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
await import(
  "data:text/javascript;base64," +
    Buffer.from(result.outputFiles[0].text).toString("base64")
);
console.log(
  "18 城 / 108 关可达；首通含初始金币 24680 / 积分 5940 / 碎片 162。",
);
