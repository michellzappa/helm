#!/usr/bin/env node
/**
 * Screenshot script for Helm dashboard.
 * Uses system Chrome — no browser download needed.
 *
 * Usage:
 *   npm run screenshot
 *   node scripts/screenshot.mjs [--url http://localhost:1111] [--out docs/screenshot.png]
 */

import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, "..");

// CLI args: --url and --out
const args = process.argv.slice(2);
const get  = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

const BASE_URL = get("--url") ?? "http://localhost:1111";
const OUT_PATH = get("--out") ?? join(ROOT, "public", "screenshot.png");
const VIEWPORT = { width: 1440, height: 900 };

// Lobster theme injected via localStorage before any React code runs
const LOBSTER_SETTINGS = JSON.stringify({
  themeColor: "lobster",
  showSidebarCounts: true,
  refreshInterval: 30_000,
});

console.log(`📸  Connecting to ${BASE_URL} …`);

const browser = await chromium.launch({
  channel: "chrome",          // use installed system Chrome, no binary download
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
}).catch(() =>
  // fall back to Playwright's own Chromium if Chrome isn't found
  chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-gpu"] })
);

const ctx = await browser.newContext({
  viewport: VIEWPORT,
  colorScheme: "light",
  deviceScaleFactor: 2,        // retina — crisp on HiDPI displays
});

// Inject Lobster theme + suppress Next.js dev overlays before page load
await ctx.addInitScript((settings) => {
  try { localStorage.setItem("mc_settings", settings); } catch {}
}, LOBSTER_SETTINGS);

const page = await ctx.newPage();

// Suppress any Next.js chrome (dev indicator, error overlay)
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

await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 15_000 });

// Hide Next.js dev tooling — the indicator lives in a shadow DOM (<nextjs-portal>)
// and gets re-mounted by React, so we use a MutationObserver to keep hiding it.
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
await page.waitForTimeout(1200);

mkdirSync(dirname(OUT_PATH), { recursive: true });
await page.screenshot({ path: OUT_PATH, fullPage: false });

await browser.close();
console.log(`✓   Saved → ${OUT_PATH}`);
