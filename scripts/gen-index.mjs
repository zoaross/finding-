// Generates dist/client/index.html after the build.
// The project uses TanStack Start (Cloudflare SSR) which does not produce
// a static index.html. This script creates one so Vercel can serve the SPA.
import { readdirSync, statSync, writeFileSync } from "fs";

const dir = "dist/client/assets";
const files = readdirSync(dir);

// CSS bundle
const css = files.find((f) => f.endsWith(".css"));

// Main JS entry = the largest index-*.js (contains hydrateRoot(document,...))
const mainJs = files
  .filter((f) => f.startsWith("index-") && f.endsWith(".js"))
  .map((f) => ({ name: f, size: statSync(`${dir}/${f}`).size }))
  .sort((a, b) => b.size - a.size)[0]?.name;

if (!mainJs) {
  console.error("gen-index: could not find main JS entry in dist/client/assets");
  process.exit(1);
}

const html = `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Finding.</title>
  ${css ? `<link rel="stylesheet" crossorigin href="/assets/${css}" />` : ""}
</head>
<body>
  <script type="module" crossorigin src="/assets/${mainJs}"></script>
</body>
</html>`;

writeFileSync("dist/client/index.html", html);
console.log("✓ gen-index: dist/client/index.html created");
console.log(`  JS  → /assets/${mainJs}`);
console.log(`  CSS → /assets/${css}`);
