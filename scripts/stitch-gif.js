#!/usr/bin/env node
/**
 * Stitch frames/*.png → optimized GIF using ffmpeg palette optimization.
 * Two-pass process:
 *   pass 1: generate palette.png from frames
 *   pass 2: apply palette to all frames → output.gif
 *
 * Outputs are sized down to keep GitHub release notes light (~ <2 MB).
 * Falls back to width 960 if env not set.
 */

const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const FFMPEG_CANDIDATES = [
  'H:\\ffmpeg-7.1.1-essentials_build\\bin\\ffmpeg.exe',
  'H:\\ffmpeg\\bin\\ffmpeg.exe',
  'C:\\ffmpeg\\bin\\ffmpeg.exe',
  'ffmpeg',
];
function findFfmpeg() {
  for (const c of FFMPEG_CANDIDATES) {
    try {
      const r = spawnSync(c, ['-version'], { stdio: 'ignore' });
      if (r.status === 0) return c;
    } catch (_) {}
  }
  throw new Error('ffmpeg not found in any candidate path');
}

const FRAMES_DIR = path.resolve(__dirname, '..', 'frames');
const OUT_DIR = path.resolve(__dirname, '..', 'screenshots');
const PALETTE = path.join(FRAMES_DIR, '_palette.png');
const OUT_GIF = path.join(OUT_DIR, 'scan-demo.gif');

const TARGET_W = Number(process.env.GIF_W || 960);
const FPS = Number(process.env.GIF_FPS || 12);
const LOOPS = Number(process.env.GIF_LOOPS || 0); // 0 = infinite
const VERBOSE = process.env.VERBOSE === '1';

function ensureFrames() {
  const pngs = fs.readdirSync(FRAMES_DIR).filter((f) => /^f_\d+\.png$/.test(f)).sort();
  if (pngs.length < 2) {
    throw new Error(`need at least 2 frames in ${FRAMES_DIR}, found ${pngs.length}`);
  }
  console.log('[stitch] frames:', pngs.length);
}

function runFfmpeg(ffmpeg, args) {
  if (VERBOSE) console.log('[stitch] ffmpeg', args.join(' '));
  const r = spawnSync(ffmpeg, ['-y', ...args], { stdio: VERBOSE ? 'inherit' : ['ignore', 'ignore', 'ignore'] });
  if (r.status !== 0) throw new Error('ffmpeg failed (status ' + r.status + ')');
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (fs.existsSync(PALETTE)) fs.unlinkSync(PALETTE);
  if (fs.existsSync(OUT_GIF)) fs.unlinkSync(OUT_GIF);

  ensureFrames();
  const ffmpeg = findFfmpeg();
  console.log('[stitch] using ffmpeg:', ffmpeg);

  const framerate = `${FPS}/${Math.max(1, Math.round(1000 / (FPS * 1))) /* placeholder */}`;
  // Use plain -framerate input, then output -r to set playback rate.
  // Two-pass palette:
  //   pass 1: palettegen from frames
  //   pass 2: paletteuse → .gif
  const scale = `scale=${TARGET_W}:-2:flags=lanczos`;

  console.log('[stitch] pass 1: generating palette…');
  runFfmpeg(ffmpeg, [
    '-framerate', String(FPS),
    '-i', path.join(FRAMES_DIR, 'f_%04d.png'),
    '-vf', `${scale},palettegen=stats_mode=full`,
    PALETTE,
  ]);

  console.log('[stitch] pass 2: applying palette →', OUT_GIF);
  runFfmpeg(ffmpeg, [
    '-framerate', String(FPS),
    '-i', path.join(FRAMES_DIR, 'f_%04d.png'),
    '-i', PALETTE,
    '-lavfi', `${scale},paletteuse=dither=bayer:bayer_scale=5`,
    '-r', String(FPS),
    '-loop', String(LOOPS),
    '-gifflags', '+transdiff',
    OUT_GIF,
  ]);

  // Clean palette
  fs.unlinkSync(PALETTE);

  const stat = fs.statSync(OUT_GIF);
  console.log('[stitch] gif size: %d bytes (%.1f KB)', stat.size, stat.size / 1024);
  if (stat.size > 4 * 1024 * 1024) {
    console.warn('[stitch] warning: gif > 4 MB; consider lowering GIF_W or GIF_FPS');
  }
  console.log('[stitch] output:', OUT_GIF);
})().catch((e) => { console.error('[stitch] FATAL:', e.message); process.exit(1); });
