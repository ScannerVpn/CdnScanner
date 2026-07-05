#!/usr/bin/env node
/**
 * Capture a sequence of screenshots from the running SNI Scanner app via
 * Chrome DevTools Protocol using Node's native WebSocket — no Puppeteer/CDP
 * dependency needed.
 *
 * Pipeline:
 *   1. Launch chrome with --remote-debugging-port=9222
 *   2. Wait for /json/list endpoint, pick first page target
 *   3. Enable Page + Runtime, navigate to localhost:3000, wait for load
 *   4. Override window.fetch so per-IP probes return with controlled latency
 *      so the scan progress fills smoothly over ~9 seconds
 *   5. Click HTTP Scanner platform card → open IP dialog → paste IPs → submit
 *   6. Click "شروع اسکن" (Start Scan) button
 *   7. Loop: Page.captureScreenshot every ~120 ms for 10 s → frames/f_000.png ...
 *   8. Close chrome cleanly
 */

const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9222;
const TARGET_URL = process.env.SCAN_URL || 'http://localhost:3000';
const FRAMES_DIR = path.resolve(__dirname, '..', 'frames');
const CAPTURE_MS = Number(process.env.CAPTURE_MS || 10000);
const FRAME_INTERVAL_MS = Number(process.env.FRAME_INTERVAL_MS || 120);
const WINDOW_W = Number(process.env.WINDOW_W || 1280);
const WINDOW_H = Number(process.env.WINDOW_H || 800);

// 1. Launch chrome
function launchChrome() {
  console.log('[capture] launching chrome…');
  const child = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      '--disable-dev-shm-usage',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${CDP_PORT}`,
      `--window-size=${WINDOW_W},${WINDOW_H}`,
      '--user-data-dir=' + path.resolve(__dirname, '..', '.chrome-profile'),
      'about:blank',
    ],
    { stdio: 'ignore', detached: true },
  );
  child.unref();
  return child;
}

async function getJsonList(port, attempts = 80) {
  for (let i = 0; i < attempts; i++) {
    try {
      const list = await new Promise((resolve, reject) => {
        const req = http.get({ host: '127.0.0.1', port, path: '/json/list', timeout: 1500 }, (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
          });
        });
        req.on('error', reject);
        req.on('timeout', () => req.destroy(new Error('timeout')));
      });
      if (Array.isArray(list) && list.length) return list;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('chrome /json/list never returned a usable page target');
}

// Minimal CDP client over native WebSocket
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.eventHandlers = new Map();
    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
        return;
      }
      if (msg.method) {
        const handlers = this.eventHandlers.get(msg.method) || [];
        for (const h of handlers) h(msg.params);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }
  on(method, handler) {
    if (!this.eventHandlers.has(method)) this.eventHandlers.set(method, []);
    this.eventHandlers.get(method).push(handler);
  }
  async eval(expression, awaitPromise = false) {
    // expression should be JSON-able; wrap in IIFE if multi-statement
    const r = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true,
    });
    if (r.exceptionDetails) {
      throw new Error('eval threw: ' + JSON.stringify(r.exceptionDetails));
    }
    return r.result?.value;
  }
  async waitForLoad(timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('load timeout')), timeoutMs);
      this.on('Page.loadEventFired', () => { clearTimeout(t); resolve(); });
    });
  }
}

async function killChromeTree() {
  try {
    execFileSync('taskkill', ['/F', '/IM', 'chrome.exe', '/T'], { stdio: 'ignore' });
  } catch (_) {}
  try {
    fs.rmSync(path.resolve(__dirname, '..', '.chrome-profile'), { recursive: true, force: true });
  } catch (_) {}
}

(async () => {
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
  // Clear stale frames
  for (const f of fs.readdirSync(FRAMES_DIR)) {
    if (f.endsWith('.png')) fs.unlinkSync(path.join(FRAMES_DIR, f));
  }

  await killChromeTree();
  const chromeProc = launchChrome();

  let list;
  try {
    list = await getJsonList(CDP_PORT);
  } catch (e) {
    chromeProc.kill();
    await killChromeTree();
    throw e;
  }

  const page = list.find((t) => t.type === 'page') || list[0];
  console.log('[capture] target:', page.url, '=>', page.webSocketDebuggerUrl);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  const cdp = new Cdp(ws);

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: WINDOW_W,
    height: WINDOW_H,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const loadDone = cdp.waitForLoad();
  await cdp.send('Page.navigate', { url: TARGET_URL });
  await loadDone;
  // Wait for SPA hydration + Intl/RTL fonts
  await new Promise((r) => setTimeout(r, 1500));

  // Drive UI + override fetch with controlled mock
  console.log('[capture] driving UI to start scan…');
  const driverScript = `
    (async () => {
      // 1. Patch window.fetch so per-IP HTTP probes return with controlled timing
      const realFetch = window.fetch.bind(window);
      window.__mockProbes = 0;
      window.__mockSuccess = 0;
      window.__scanT0 = Date.now();
      window.fetch = function(input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        // Intercept HTTP HEAD probes to IPv4 or IPv6 hosts (the scanner probes IPs directly)
        const m = String(url).match(/^https?:\\/\\/(?:\\[?([^\\]\/:]+)\\]?)(?::(\\d+))?/i);
        const host = m ? m[1] : '';
        const isIp = /^\\d{1,3}(\\.\\d{1,3}){3}$/.test(host) || /^[0-9a-f:]+$/i.test(host);
        if (isIp) {
          window.__mockProbes++;
          const ok = Math.random() < 0.65;
          const delay = 350 + Math.random() * 1100; // 350–1450 ms
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              if (ok) {
                window.__mockSuccess++;
                // no-cors mode → opaque response; status 0 is fine
                resolve(new Response(null, { status: 200, statusText: 'OK' }));
              } else {
                reject(new TypeError('Failed to fetch (mocked)'));
              }
            }, delay);
          });
        }
        return realFetch(input, init);
      };

      // Helper: synthetic click + wait for any toast/dialog animation
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      const clickByText = (substr) => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes(substr));
        if (btn) { btn.click(); return true; }
        return false;
      };

      // 2. Click the HTTP Scanner platform card (find by label text)
      let cardClicked = clickByText('لیست IP دلخواه');
      // Some renders put "HTTP Scanner" elsewhere — try it
      if (!cardClicked) cardClicked = clickByText('HTTP Scanner');
      await sleep(350);

      // 3. Inside the card, there is a small action button — try to open the IP form
      let formBtn = false;
      // The card expands inline; press the action button by aria or text
      const inlineBtn = Array.from(document.querySelectorAll('button')).find(b =>
        (b.textContent || '').includes('باز کردن فرم') ||
        (b.textContent || '').includes('افزودن لیست') ||
        (b.textContent || '').includes('باز کردن')
      );
      if (inlineBtn) { inlineBtn.click(); formBtn = true; }
      await sleep(600);

      // 4. Find the textarea in the open dialog and set value via React-friendly setter
      const ta = document.querySelector('textarea');
      if (ta) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        // 36 IPs from TEST-NET-2 (RFC 5737) — guaranteed unrouted
        const text = Array.from({ length: 36 }, (_, i) =>
          '198.51.100.' + String(i + 1).padStart(2, '0')
        ).join('\\n');
        setter.call(ta, text);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
      await sleep(350);

      // 5. Click the green submit button in the dialog footer
      const submitted = clickByText('ثبت و آماده اسکن');
      await sleep(500);

      // 6. Click the big "شروع اسکن" button in the status panel
      const started = clickByText('شروع اسکن');

      return {
        cardClicked,
        formBtn,
        submitted,
        started,
        ipCount: (ta && ta.value ? ta.value.split('\\n').length : 0),
      };
    })()
  `;
  const driveResult = await cdp.eval(driverScript, true);
  console.log('[capture] UI drive result:', driveResult);

  // 7. Capture loop
  console.log('[capture] capturing', CAPTURE_MS, 'ms of frames every', FRAME_INTERVAL_MS, 'ms…');
  const t0 = Date.now();
  let frameIdx = 0;
  let lastErr = null;
  while (Date.now() - t0 < CAPTURE_MS) {
    const recallStart = Date.now();
    try {
      const result = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
        fromSurface: true,
      });
      const buf = Buffer.from(result.data, 'base64');
      const fname = 'f_' + String(frameIdx).padStart(4, '0') + '.png';
      fs.writeFileSync(path.join(FRAMES_DIR, fname), buf);
      frameIdx++;
    } catch (e) {
      lastErr = e;
    }
    const elapsed = Date.now() - recallStart;
    const wait = Math.max(0, FRAME_INTERVAL_MS - elapsed);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }

  console.log('[capture] captured', frameIdx, 'frames', lastErr ? `(last err: ${lastErr.message})` : '');
  console.log('[capture] reports:', await cdp.eval(`({ probes: window.__mockProbes, success: window.__mockSuccess })`, false));

  // Cleanup
  try { ws.close(); } catch (_) {}
  await killChromeTree();
  console.log('[capture] done');
})().catch((e) => {
  console.error('[capture] FATAL:', e);
  killChromeTree().finally(() => process.exit(1));
});
