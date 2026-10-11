import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
const port = Number(process.env.PORT || 5173);
const root = fileURLToPath(new URL("../dist/web/", import.meta.url)).replace(
  /[\\/]$/,
  "",
);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css",
  ".wav": "audio/wav",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
};
const server = createServer(async (req, res) => {
  try {
    const path = resolve(
      root,
      "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
    );
    if (path !== root && !path.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const target = (await stat(path)).isDirectory()
      ? resolve(path, "index.html")
      : path;
    res.setHeader(
      "Content-Type",
      mime[extname(target)] || "application/octet-stream",
    );
    res.end(await readFile(target));
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.on("error", (error) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `Port ${port} is occupied. Set PORT to use another port.`
      : error.message,
  );
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () =>
  console.log("Ping Pong Quest: http://localhost:" + port),
);
