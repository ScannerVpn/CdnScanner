// scripts/toggle-api.js
//
// Next.js static export (`output: "export"`) is incompatible with API routes that have
// `export const dynamic = "force-dynamic"`. Before building for Tauri, we move
// `src/app/api/` aside, then restore it after.
//
// Usage:
//   node scripts/toggle-api.js move       # mv api/ → .api-temp/
//   node scripts/toggle-api.js restore    # mv .api-temp/ → api/
//   node scripts/toggle-api.js            # default: restore (safe re-entry)
//
// Idempotent and safe to re-run. Writes a state marker so build scripts can detect
// partial-failure.

const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, '..', 'src', 'app', 'api');
const tempPath = path.join(__dirname, '..', 'src', 'app', '.api-temp');
const stateFile = path.join(__dirname, '..', '.toggle-api-state');

function log(msg) {
  console.log('[toggle-api] ' + msg);
}

function move() {
  if (fs.existsSync(apiPath)) {
    log('moving src/app/api → src/app/.api-temp');
    if (fs.existsSync(tempPath)) {
      fs.rmSync(tempPath, { recursive: true, force: true });
    }
    fs.renameSync(apiPath, tempPath);
    fs.writeFileSync(stateFile, 'moved:' + new Date().toISOString());
    return true;
  }
  if (fs.existsSync(tempPath)) {
    log('api already moved (residual from previous run, restoring first)');
    fs.renameSync(tempPath, apiPath);
    log('restored; rerun to move again');
  }
  return false;
}

function restore() {
  if (fs.existsSync(tempPath)) {
    log('restoring src/app/.api-temp → src/app/api');
    if (fs.existsSync(apiPath)) {
      fs.rmSync(apiPath, { recursive: true, force: true });
    }
    fs.renameSync(tempPath, apiPath);
  }
  // Always clean up state marker
  try {
    fs.unlinkSync(stateFile);
  } catch {}
}

const arg = process.argv[2];
try {
  if (arg === 'move') {
    move();
    log('done (api moved aside for static export)');
  } else if (arg === 'restore') {
    restore();
    log('done');
  } else {
    // Default behaviour: restore any leftover (safe re-entry)
    restore();
    if (arg) log('unknown argument "' + arg + '" — ran restore as default');
  }
} catch (e) {
  console.error('[toggle-api] ERROR:', e.message);
  process.exit(1);
}
