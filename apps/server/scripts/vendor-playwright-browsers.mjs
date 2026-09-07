import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, cpSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const usage = `Vendor a Playwright chromium browser pack for offline install.

Usage:
  node vendor-playwright-browsers.mjs --platform <p> [--out <dir>] [--browsers <dir>]

  --platform   playwright host platform: ubuntu24.04-x64 | ubuntu24.04-arm64 | win64 | mac-arm64 | mac13
  --out        directory to write the pack into (default: ./vendor)
  --browsers   reuse an already-downloaded browsers dir instead of downloading

Produces: <out>/pw-browser-pack-<platform>.tar.gz containing
  .claude/mcp/playwright/browsers/{chromium-<rev>,ffmpeg-<rev>}
Drop it at a project root so browsers land in .claude/mcp/playwright/browsers/.`;

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const platform = opt("--platform");
if (!platform || args.includes("--help")) { console.log(usage); process.exit(platform ? 0 : 1); }

const here = dirname(fileURLToPath(import.meta.url));
const mcpDir = resolve(here, "..", "src", "Modules", "Vcc.Api", "data", "bundles");
const core = resolve(here, "node_modules", "playwright-core");
if (!existsSync(core)) {
  console.error("playwright-core not found next to this script. Run: npm i @playwright/mcp");
  process.exit(1);
}
const rev = JSON.parse(readFileSync(join(core, "browsers.json"), "utf8")).browsers.find((b) => b.name === "chromium").revision;
console.log(`chromium revision: ${rev}  platform: ${platform}`);

const outDir = resolve(opt("--out") ?? join(here, "..", "vendor"));
mkdirSync(outDir, { recursive: true });
const browsersDir = opt("--browsers") ? resolve(opt("--browsers")) : join(here, `browsers-${platform}`);

if (opt("--browsers") && existsSync(browsersDir)) {
  console.log(`reusing existing browsers at ${browsersDir}`);
} else {
  mkdirSync(browsersDir, { recursive: true });
  console.log("downloading chromium...");
  const r = spawnSync(process.execPath, [join(core, "cli.js"), "install", "chromium"], {
    stdio: "inherit",
    env: { ...process.env, PLAYWRIGHT_HOST_PLATFORM_OVERRIDE: platform, PLAYWRIGHT_BROWSERS_PATH: browsersDir },
  });
  if (r.status !== 0 && !existsSync(join(browsersDir, `chromium-${rev}`))) {
    console.error("download failed");
    process.exit(1);
  }
}

const stage = join(outDir, `.stage-${platform}`);
rmSync(stage, { recursive: true, force: true });
const dest = join(stage, ".claude", "mcp", "playwright", "browsers");
mkdirSync(dest, { recursive: true });
for (const entry of readdirSync(browsersDir)) {
  if (/^(chromium|ffmpeg)-\d+$/.test(entry)) cpSync(join(browsersDir, entry), join(dest, entry), { recursive: true });
}

const pack = join(outDir, `pw-browser-pack-${platform}.tar.gz`);
const t = spawnSync("tar", ["--force-local", "-czf", pack, "-C", stage, ".claude/mcp/playwright/browsers"], { stdio: "inherit" });
rmSync(stage, { recursive: true, force: true });
if (t.status !== 0) { console.error("tar failed"); process.exit(1); }
console.log(`\nwrote ${pack}`);
console.log(`(chromium rev ${rev} must match the vendored server in ${mcpDir}/mcp-playwright.tar.gz)`);
