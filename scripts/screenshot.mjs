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
import { mkdirSync } from "fs";
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
const DEMO_PORT = 11199; // ephemeral port for demo server

// Lobster theme injected via localStorage before any React code runs
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
  // Start ephemeral Next.js dev server with DEMO_MODE=1
  BASE_URL = `http://localhost:${DEMO_PORT}`;
  console.log(`📸  Starting demo server on port ${DEMO_PORT}…`);

  serverProcess = spawn("npx", ["next", "dev", "-p", String(DEMO_PORT)], {
    cwd: ROOT,
    env: { ...process.env, DEMO_MODE: "1", NODE_ENV: "development" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  // Wait for the server to be ready
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Demo server startup timeout (30s)")), 30_000);
    let output = "";

    const onData = (chunk) => {
      output += chunk.toString();
      if (output.includes("Ready") || output.includes("ready") || output.includes(`localhost:${DEMO_PORT}`)) {
        clearTimeout(timeout);
        resolve();
      }
    };

    serverProcess.stdout.on("data", onData);
    serverProcess.stderr.on("data", onData);
    serverProcess.on("error", (err) => { clearTimeout(timeout); reject(err); });
    serverProcess.on("exit", (code) => {
      if (code) { clearTimeout(timeout); reject(new Error(`Server exited with code ${code}`)); }
    });
  });

  console.log(`✓   Demo server ready`);
}

try {
  console.log(`📸  Connecting to ${BASE_URL} …`);

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

  await ctx.addInitScript((settings) => {
    try { localStorage.setItem("mc_settings", settings); } catch {}
  }, LOBSTER_SETTINGS);

  const page = await ctx.newPage();

  await page.addStyleTag({ content: `
    #__next-build-watcher,
    [data-nextjs-dialog-overlay],
    [data-nextjs-dialog],
    [data-nextjs-toast],
    .__next-error-overlay,
    [data-next-badge],
    #__next-route-announcer__ { display: none !important; }
    ::-webkit-scrollbar { display: none !important; }
  ` });

  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30_000 });

  await page.evaluate(() => {
    const hide = () =>
      document.querySelectorAll("nextjs-portal, next-route-announcer").forEach(el => {
        el.style.cssText = "display:none!important;visibility:hidden!important;";
      });
    hide();
    new MutationObserver(hide).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  });

  // Let the page settle (fonts, theme color CSS vars, skeleton → content)
  await page.waitForTimeout(2000);

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
