// scripts/build-static.js
//
// Orchestrator for Next.js static export used by the Tauri build.
//
// 1. Moves src/app/api aside (force-dynamic is incompatible with output:'export').
//    The temp location MUST be outside src/app/ — otherwise Next.js scans it during
//    route collection and recurses into our temp folder.
// 2. Runs `next build` directly via node (avoids npx shim issues on Windows).
// 3. Always restores api/, even on Ctrl+C / crash / build failure.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const apiPath = path.join(projectRoot, 'src', 'app', 'api');
// IMPORTANT: keep temp OUTSIDE src/app/ so Next.js doesn't scan it as a route.
const tempPath = path.join(projectRoot, '.api-temp');

const log = (m) => console.log('[build-static] ' + m);

function move() {
  if (!fs.existsSync(apiPath)) {
    log('api/ not present, nothing to move');
    return;
  }
  if (fs.existsSync(tempPath)) fs.rmSync(tempPath, { recursive: true, force: true });
  fs.renameSync(apiPath, tempPath);
  log('moved src/app/api → .api-temp');
}

function restore() {
  if (!fs.existsSync(tempPath)) return;
  if (fs.existsSync(apiPath)) fs.rmSync(apiPath, { recursive: true, force: true });
  fs.renameSync(tempPath, apiPath);
  log('restored .api-temp → src/app/api');
}

// Pre-emptively restore any leftover from previous failed runs.
restore();

// Track if we've already restored to avoid double-rename on rapid signals.
let restored = false;
const safeRestore = () => {
  if (restored) return;
  restored = true;
  try { restore(); } catch (e) { console.error('[build-static] restore failed:', e?.message || e); }
};
process.on('SIGINT', () => { safeRestore(); process.exit(130); });
process.on('SIGTERM', () => { safeRestore(); process.exit(143); });
process.on('uncaughtException', (e) => {
  console.error('[build-static] uncaught:', e);
  safeRestore();
  process.exit(1);
});
process.on('exit', safeRestore);

move();
log('running next build (TAURI_BUILD=true)...');

// Run Next.js directly via node (no npx shim needed). This works on every platform
// because we bypass shell PATH resolution entirely.
const nextBin = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
const result = spawnSync(process.execPath, [nextBin, 'build'], {
  stdio: 'inherit',
  env: { ...process.env, TAURI_BUILD: 'true' },
  cwd: projectRoot,
});

safeRestore();

// Preserve signal-based exit codes (POSIX: 128 + signal number)
let exitCode = result.status;
if (exitCode === null) {
  if (result.signal) {
    const sigNum = { SIGTERM: 15, SIGINT: 2, SIGKILL: 9 }[result.signal] ?? 15;
    exitCode = 128 + sigNum;
  } else if (result.error) {
    console.error('[build-static] spawn error:', result.error.message);
    exitCode = 1;
  } else {
    exitCode = 0;
  }
}
process.exit(exitCode);
