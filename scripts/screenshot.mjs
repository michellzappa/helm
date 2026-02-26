#!/usr/bin/env node
/**
 * Screenshot script for Helm dashboard.
 * Starts an ephemeral Next.js server with DEMO_MODE=1 (no PII) by default,
 * takes a screenshot, then shuts down the server.
 *
 * Usage:
 *   npm run screenshot                         # demo mode (safe for public)
 *   npm run screenshot -- --live               # use running dev server (real data)
 *   npm run screenshot -- --url http://...     # custom URL
 *   npm run screenshot -- --out path.png       # custom output path
 */

import { chromium } from "playwright";
import { mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, "..");

const args = process.argv.slice(2);
const has  = (flag) => args.includes(flag);
const get  = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

const LIVE_MODE = has("--live");
const CUSTOM_URL = get("--url");
const OUT_PATH = get("--out") ?? join(ROOT, "public", "screenshot.png");
const VIEWPORT = { width: 1440, height: 900 };
const DEMO_PORT = 11199;

const LOBSTER_SETTINGS = JSON.stringify({
  themeColor: "lobster",
  showSidebarCounts: true,
  refreshInterval: 30_000,
});

let serverProcess = null;
let BASE_URL;

if (CUSTOM_URL) {
  BASE_URL = CUSTOM_URL;
  console.log(`📸  Using custom URL: ${BASE_URL}`);
} else if (LIVE_MODE) {
  BASE_URL = "http://localhost:1111";
  console.log(`📸  Live mode — connecting to ${BASE_URL}`);
} else {
  BASE_URL = `http://localhost:${DEMO_PORT}`;
  console.log(`📸  Starting demo server on port ${DEMO_PORT}…`);

  try { rmSync(join(ROOT, ".next", "dev", "lock"), { force: true }); } catch {}

  const nextBin = join(ROOT, "node_modules", ".bin", "next");
  serverProcess = spawn(nextBin, ["dev", "-p", String(DEMO_PORT)], {
    cwd: ROOT,
    env: {
      ...process.env,
      DEMO_MODE: "1",
      NODE_ENV: "development",
      // Sanitize public env vars that get baked into the client bundle
      NEXT_PUBLIC_AGENT_NAME: "Helm",
      NEXT_PUBLIC_CONVEX_URL: "http://localhost:3210",
      TZ: "UTC",
      WEATHER_LOCATION: "Demo City",
      WEATHER_LAT: "0",
      WEATHER_LON: "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  // Wait for the server to respond to an API call (proves compilation + routing works)
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Demo server startup timeout (60s)")), 60_000);
    let serverOutput = "";
    serverProcess.stdout.on("data", (c) => { serverOutput += c; });
    serverProcess.stderr.on("data", (c) => { serverOutput += c; });
    serverProcess.on("error", (err) => { clearTimeout(timeout); reject(err); });
    serverProcess.on("exit", (code) => {
      if (code) { clearTimeout(timeout); reject(new Error(`Server exited with code ${code}:\n${serverOutput}`)); }
    });

    const poll = async () => {
      try {
        const res = await fetch(`http://localhost:${DEMO_PORT}/api/system`);
        if (res.ok) { clearTimeout(timeout); resolve(); return; }
      } catch {}
      setTimeout(poll, 1000);
    };
    setTimeout(poll, 3000);
  });

  // Now warm up the page compilation by fetching the HTML
  console.log(`✓   API ready, warming up page…`);
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch(`http://localhost:${DEMO_PORT}/`);
      if (res.ok) { console.log(`✓   Page compiled`); break; }
    } catch {}
    await new Promise(r => setTimeout(r, 2000));
  }
}

try {
  console.log(`📸  Launching browser…`);

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  }).catch(() =>
    chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-gpu"] })
  );

  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: "light",
    deviceScaleFactor: 2,
  });

  // Inject Lobster theme into localStorage before page loads
  await ctx.addInitScript((settings) => {
    try { localStorage.setItem("mc_settings", settings); } catch {}
  }, LOBSTER_SETTINGS);

  const page = await ctx.newPage();

  // Navigate
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 60_000 });

  // Wait for actual rendered content
  await page.waitForFunction(() => {
    const h1 = document.querySelector("h1");
    return h1 && h1.textContent && h1.textContent.includes("Dashboard");
  }, { timeout: 30_000 }).catch(() => console.warn("⚠️  Dashboard h1 not found, continuing…"));

  // Extra settle time for all widgets to populate
  await page.waitForTimeout(5000);

  // Suppress Next.js dev chrome
  await page.addStyleTag({ content: `
    #__next-build-watcher,
    [data-nextjs-dialog-overlay],
    [data-nextjs-dialog],
    [data-nextjs-toast],
    .__next-error-overlay,
    [data-next-badge],
    #__next-route-announcer__,
    nextjs-portal { display: none !important; }
    ::-webkit-scrollbar { display: none !important; }
  ` });
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal, next-route-announcer").forEach(el => {
      el.style.cssText = "display:none!important;visibility:hidden!important;";
    });
  });

  await page.waitForTimeout(500);

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  await page.screenshot({ path: OUT_PATH, fullPage: false });

  await browser.close();
  console.log(`✓   Saved → ${OUT_PATH}`);
} finally {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
    console.log(`✓   Demo server stopped`);
  }
}
