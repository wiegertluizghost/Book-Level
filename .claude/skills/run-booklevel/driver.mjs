/**
 * Book Level web driver — starts the Expo web dev server and screenshots via Playwright.
 * Run from the project root: node .claude/skills/run-booklevel/driver.mjs [cmd] [output.png]
 *
 * Commands:
 *   screenshot [out.png]  capture current UI (default: screenshot.png in project root)
 *   check                 verify app renders without console errors (exit 1 on failure)
 *
 * ENV:
 *   PORT=8082   web server port (default)
 *   PW_DIR      Playwright package dir (default: C:\Temp\pw)
 */

import { spawn, spawnSync } from 'child_process';
import { Socket } from 'net';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(join(__dirname, '..', '..', '..'));
const PORT = process.env.PORT ?? '8082';
const PW_DIR = process.env.PW_DIR ?? 'C:\\Temp\\pw';
const [, , cmd = 'screenshot', outFile = 'screenshot.png'] = process.argv;

function probePort(port) {
  return new Promise(resolve => {
    const s = new Socket();
    s.setTimeout(300);
    s.once('connect', () => { s.destroy(); resolve(true); });
    s.once('error', () => resolve(false));
    s.once('timeout', () => { s.destroy(); resolve(false); });
    s.connect(Number(port), '127.0.0.1');
  });
}

async function waitForPort(port, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await probePort(port)) return true;
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

async function ensureServer() {
  if (await probePort(PORT)) {
    console.log(`[driver] Server already up on :${PORT}`);
    return;
  }
  console.log(`[driver] Starting expo web server on :${PORT}...`);
  spawn('cmd.exe', ['/c', `npx expo start --web --port ${PORT} --no-dev`], {
    cwd: PROJECT_ROOT,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  }).unref();

  const ok = await waitForPort(PORT, 90000);
  if (!ok) throw new Error(`Expo web server did not start on :${PORT} within 90s`);
  console.log(`[driver] Port open, waiting 15s for bundle compilation...`);
  await new Promise(r => setTimeout(r, 15000));
  console.log(`[driver] Server ready`);
}

async function getChromium() {
  const pwPath = join(PW_DIR, 'node_modules', 'playwright');
  if (!existsSync(pwPath)) {
    console.log(`[driver] Installing Playwright into ${PW_DIR}...`);
    spawnSync('npm', ['install', '--prefix', PW_DIR, 'playwright'], { shell: true, stdio: 'inherit' });
    spawnSync(
      'node',
      [join(PW_DIR, 'node_modules', 'playwright', 'cli.js'), 'install', 'chromium'],
      { shell: true, stdio: 'inherit', cwd: PW_DIR }
    );
  }
  const { chromium } = require(join(PW_DIR, 'node_modules', 'playwright'));
  return chromium;
}

async function withPage(fn) {
  const chromium = await getChromium();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(3000);
  try { return await fn(page, errors); } finally { await browser.close(); }
}

async function screenshot(outputPath) {
  await ensureServer();
  const absOut = outputPath.match(/^[A-Za-z]:/) ? outputPath : join(PROJECT_ROOT, outputPath);
  await withPage(async (page, errors) => {
    await page.screenshot({ path: absOut });
    console.log(`[driver] Screenshot saved: ${absOut}`);
    if (errors.length) console.warn('[driver] Console errors:', errors.slice(0, 5));
  });
}

async function check() {
  await ensureServer();
  await withPage(async (page, errors) => {
    const rootLen = await page.evaluate(
      () => document.getElementById('root')?.innerHTML?.length ?? 0
    );
    if (rootLen === 0) throw new Error('App did not render — #root is empty');
    if (errors.length) {
      console.error('[driver] FAIL — console errors:', errors);
      process.exit(1);
    }
    console.log(`[driver] OK — app rendered ${rootLen} chars, no errors`);
  });
}

if (cmd === 'screenshot') await screenshot(outFile);
else if (cmd === 'check') await check();
else { console.error(`Unknown command: ${cmd}`); process.exit(1); }
