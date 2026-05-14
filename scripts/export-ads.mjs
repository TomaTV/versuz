#!/usr/bin/env node

/**
 * Versuz ads MP4 exporter — uses Playwright to record each scene from
 * .ads/Versuz Ads.html as a WebM video, then converts to MP4 via ffmpeg.
 *
 * Setup (one-time) :
 *   npm install -D playwright
 *   npx playwright install chromium
 *   # ffmpeg needs to be installed system-wide :
 *   # Windows : `winget install ffmpeg` or `choco install ffmpeg`
 *   # macOS   : `brew install ffmpeg`
 *   # Linux   : `apt install ffmpeg`
 *
 * Usage :
 *   node scripts/export-ads.mjs                       # all scenes
 *   node scripts/export-ads.mjs --scene=logoReveal    # single scene
 *   node scripts/export-ads.mjs --out=./exports       # output folder (default ./.ads/exports)
 *   node scripts/export-ads.mjs --no-mp4              # keep webm only (skip ffmpeg)
 *   node scripts/export-ads.mjs --list                # print scene catalog and exit
 *
 * How it works :
 *   1. Open .ads/Versuz Ads.html in headless Chromium
 *   2. Set viewport = scene dimensions
 *   3. localStorage.setItem('versuz-ads-scene', sceneKey) so it loads that scene
 *   4. Reload, wait for the scene Stage to mount + start
 *   5. Record for scene.duration + 1s buffer
 *   6. Save .webm, optionally convert to .mp4 via ffmpeg
 *
 * The Stage component auto-plays from t=0 with `key={active}` so the scene
 * restarts cleanly on each navigation. Recording captures the full animation.
 */

import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import http from "node:http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/**
 * Spin up a tiny static HTTP server rooted at `.ads/`. Babel standalone
 * fetches the `.jsx` files via XHR which doesn't work over file:// (CORS).
 * Returns the base URL + a `close()` function to shut it down at the end.
 */
async function startStaticServer(rootDir) {
  const types = {
    ".html": "text/html; charset=utf-8",
    ".jsx": "text/babel; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json",
  };
  const server = http.createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(req.url.split("?")[0]);
      if (p === "/" || p === "") p = "/Versuz Ads.html";
      const file = path.join(rootDir, p);
      // Path traversal guard
      if (!file.startsWith(rootDir)) {
        res.statusCode = 403;
        return res.end("forbidden");
      }
      const stat = await fs.stat(file).catch(() => null);
      if (!stat || !stat.isFile()) {
        res.statusCode = 404;
        return res.end("not found");
      }
      const ext = path.extname(file).toLowerCase();
      res.setHeader("content-type", types[ext] || "application/octet-stream");
      res.setHeader("cache-control", "no-store");
      createReadStream(file).pipe(res);
    } catch (err) {
      res.statusCode = 500;
      res.end(err.message);
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  return {
    base,
    close: () => new Promise((r) => server.close(r)),
  };
}

function parseArgs() {
  const out = {
    scene: null,
    out: path.join(ROOT, ".ads", "exports"),
    mp4: true,
    list: false,
  };
  for (const arg of process.argv.slice(2)) {
    if (arg === "--list") out.list = true;
    else if (arg === "--no-mp4") out.mp4 = false;
    else if (arg.startsWith("--scene=")) out.scene = arg.slice(8);
    else if (arg.startsWith("--out=")) out.out = path.resolve(arg.slice(6));
  }
  return out;
}

async function ensurePlaywright() {
  try {
    return await import("playwright");
  } catch {
    console.error(
      `\n❌ Playwright not installed. Run :\n   npm install -D playwright\n   npx playwright install chromium\n`
    );
    process.exit(1);
  }
}

function execFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    ff.stderr.on("data", (d) => (stderr += d.toString()));
    ff.on("error", (err) =>
      reject(new Error(`ffmpeg failed to start: ${err.message}. Is ffmpeg installed in your PATH?`))
    );
    ff.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}\n${stderr.slice(-500)}`));
    });
  });
}

async function getSceneCatalog(page) {
  // Wait for VERSUZ_SCENES to be populated by the inline scripts.
  // Babel standalone can take several seconds to transform ~150 KB of JSX.
  await page.waitForFunction(
    () => window.VERSUZ_SCENES && Object.keys(window.VERSUZ_SCENES).length > 0,
    null,
    { timeout: 30000 }
  );
  return page.evaluate(() => {
    const result = {};
    for (const [key, s] of Object.entries(window.VERSUZ_SCENES)) {
      result[key] = {
        title: s.title,
        subtitle: s.subtitle,
        format: s.format,
        group: s.group,
        width: s.width,
        height: s.height,
        duration: s.duration,
      };
    }
    return result;
  });
}

// Height of the PlaybackBar in the Stage component (from animations.jsx).
// We grow the viewport by this amount so the scale calc (which subtracts barH)
// produces 1.0 → canvas renders pixel-perfect. ffmpeg crops it back to scene
// dimensions during MP4 conversion.
const PLAYBACK_BAR_H = 44;

// CSS injected via addInitScript (runs BEFORE the page scripts), so the
// export styles are in place from the first frame Playwright records.
const EXPORT_CSS = `
  body { background: #F2EEE6 !important; }
  .topbar { display: none !important; }
  .stage-host { top: 0 !important; bottom: 0 !important; }
  /* Stage outer container : no dark background, top-aligned */
  .stage-host > div {
    background: transparent !important;
    align-items: flex-start !important;
    justify-content: flex-start !important;
  }
  /* PlaybackBar = last child of the Stage container */
  .stage-host > div > *:last-child { display: none !important; }
  /* Canvas centerer : top-left aligned, no padding */
  .stage-host > div > div:first-child {
    align-items: flex-start !important;
    justify-content: flex-start !important;
    overflow: visible !important;
  }
  /* Canvas itself : no shadow. Stage keeps its transform: scale(N), but we
     override transform-origin to top-left so the scaled visual aligns at
     (0,0) of the recording frame (default 'center' would push it off-screen
     when scale > 1). */
  .stage-host > div > div:first-child > div {
    box-shadow: none !important;
    transform-origin: top left !important;
  }
`;

// Supersampling factor. Instead of bumping deviceScaleFactor (which Playwright
// videos don't honor — they letterbox the viewport into the recordVideo frame),
// we make the viewport itself 2× the scene size. Stage's own scale calc reads
// the container and scales the canvas → 2× canvas with re-rasterized fonts.
// Final MP4 is 2× the declared scene dims (e.g. 2400×1254 for LinkedIn 1200×627)
// — crisp on retina displays, downsamples cleanly when LinkedIn/Insta/TikTok
// re-encode for their feed.
const SCALE = 2;

async function recordScene(playwright, htmlUrl, key, scene, opts) {
  const sceneOut = path.join(opts.out, key);
  await fs.mkdir(sceneOut, { recursive: true });

  // Viewport = scene dims × SCALE, plus PlaybackBar reservation on height.
  // Stage's auto-scale picks min((H - barH) / sceneH, W / sceneW) → SCALE
  // when (H - barH)/sceneH = W/sceneW = SCALE.
  const vw = scene.width * SCALE;
  const vh = scene.height * SCALE + PLAYBACK_BAR_H;

  const browser = await playwright.chromium.launch({
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: vw, height: vh },
    recordVideo: {
      dir: sceneOut,
      size: { width: vw, height: vh },
    },
  });
  const page = await context.newPage();
  // Captured AFTER newPage resolves so it's as close as possible to the
  // actual recordVideo t=0 (Chromium starts recording when the page becomes
  // active in the context, which is right around when newPage resolves).
  // Capturing BEFORE the await would make this 50-150ms too early on slow
  // machines → sceneStartOffsetMs would be overestimated → trim_start would
  // land past scene t=0 → MP4 starts mid-scene.
  const recordVideoStart = Date.now();
  page.on("pageerror", (err) => console.error(`  [page error] ${err.message}`));

  // Inject the export CSS BEFORE any page script so the first frames are clean
  await page.addInitScript((css) => {
    const apply = () => {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);
    };
    if (document.head) apply();
    else document.addEventListener("DOMContentLoaded", apply, { once: true });
  }, EXPORT_CSS);

  // Pre-set the scene key in localStorage before navigation, AND clear any
  // persisted playhead (Stage reads localStorage at mount — without this,
  // re-runs would resume where the previous export ended).
  await page.addInitScript((sceneKey) => {
    try {
      localStorage.setItem("versuz-ads-scene", sceneKey);
      localStorage.removeItem(`versuz-ads-${sceneKey}:t`);
    } catch {}
  }, key);

  // Force loop=false on every Stage instance. Default is loop=true, which
  // wraps `time` back to 0 at t ≥ duration — visible as the animation
  // restarting on the final recording frames. We use Object.defineProperty
  // to intercept the exact moment animations.jsx does
  // `Object.assign(window, { ..., Stage, ... })` and wrap Stage with a
  // component that defaults loop=false. (A previous attempt patched
  // React.createElement, but Babel's classic JSX runtime resolved the
  // reference lazily in a way that escaped the patch on some setups.)
  await page.addInitScript(() => {
    let storedStage;
    Object.defineProperty(window, "Stage", {
      configurable: true,
      get() {
        return storedStage;
      },
      set(originalStage) {
        if (typeof originalStage !== "function") {
          storedStage = originalStage;
          return;
        }
        const wrapped = function WrappedStage(props) {
          return window.React.createElement(
            originalStage,
            Object.assign({ loop: false }, props)
          );
        };
        try {
          Object.defineProperty(wrapped, "name", {
            value: "Stage",
            configurable: true,
          });
        } catch {}
        storedStage = wrapped;
      },
    });
  });

  await page.goto(htmlUrl, { waitUntil: "domcontentloaded" });
  // Wait for the Stage to be in the DOM (Babel transform can take a few seconds)
  await page.waitForSelector(".stage-host", { timeout: 30000 });
  // Wait a tick for the scene Component to mount + animations to start
  await page.waitForTimeout(300);

  // Poll Stage's persisted time (via localStorage) — Stage writes its
  // playhead on every RAF tick. This gives us a reliable signal for both
  // the moment Stage starts animating (so we can trim the Babel-transform
  // preamble) and the moment it reaches duration (so we know the scene
  // has fully played out before we stop recording).
  const persistKey = `versuz-ads-${key}:t`;
  const readT = () =>
    page.evaluate((k) => {
      const v = localStorage.getItem(k);
      return v ? parseFloat(v) : 0;
    }, persistKey);

  // Step 1 — detect the moment Stage's localStorage entry first appears.
  // Stage's `useEffect([time])` fires right after the first React commit
  // with time=0, writing `"0"` to localStorage. That commit IS the first
  // visible frame of the scene. We use page.waitForFunction with a tight
  // 20ms polling interval — much faster than my manual 30ms loop with
  // per-iteration page.evaluate roundtrips.
  await page.waitForFunction(
    (k) => localStorage.getItem(k) !== null,
    persistKey,
    { polling: 20, timeout: 30_000 }
  );
  const sceneStartOffsetMs = Date.now() - recordVideoStart;

  // Step 2 — wait for Stage's time to reach near-end, then HARD-FREEZE the
  // page by overriding requestAnimationFrame. This is belt-and-suspenders:
  // the addInitScript `loop=false` patch SHOULD make Stage pause at duration
  // on its own, but if it ever doesn't fire (Babel runtime quirks, async
  // ordering issues), Stage loops back to t=0 and the recording captures
  // the beginning of the scene playing again at the end of the MP4. By
  // freezing RAF, we guarantee no further time advance regardless of Stage's
  // loop setting.
  //
  // Target is duration - 0.15 (not duration) so we catch Stage BEFORE any
  // potential wrap (next = next % duration would set t back to 0). The
  // FinalLogoOverlay fade is short enough (0.2s) to be at full opacity well
  // before target — see scenes-3.jsx.
  const target = scene.duration - 0.15;
  const finishDeadline = Date.now() + scene.duration * 1000 + 20_000;
  while (Date.now() < finishDeadline) {
    const t = await readT();
    if (t >= target) {
      // Freeze immediately — any RAF callbacks registered after this point
      // never fire, so Stage's setTime loop stops advancing time.
      await page.evaluate(() => {
        window.requestAnimationFrame = () => 0;
      });
      break;
    }
    await page.waitForTimeout(50);
  }

  // Step 3 — tail buffer for ~800ms of static final frame at full opacity,
  // and for Chromium's WebM encoder to finalize its trailing keyframes.
  await page.waitForTimeout(800);

  await page.close();
  await context.close();
  await browser.close();

  // Playwright writes a *.webm in the dir — find it and rename
  const files = await fs.readdir(sceneOut);
  const webm = files.find((f) => f.endsWith(".webm"));
  if (!webm) throw new Error(`No .webm produced for ${key}`);
  const targetWebm = path.join(sceneOut, `${key}.webm`);
  if (path.join(sceneOut, webm) !== targetWebm) {
    await fs.rename(path.join(sceneOut, webm), targetWebm);
  }
  console.log(`  ✓ webm → ${path.relative(ROOT, targetWebm)}`);

  if (opts.mp4) {
    const targetMp4 = path.join(sceneOut, `${key}.mp4`);
    // Very-high-quality H264 export. Trim params chosen to drop the
    // Babel-transform preamble (which lives in the front of the WebM)
    // and end just after the FinalLogoOverlay's static hold:
    //   -ss          seek to scene start (input seek, fast)
    //   -t           output duration = scene.duration + 1s tail
    //   -crf 12      visually lossless headroom for the H264 pass
    //   -preset slow good compression / quality tradeoff
    //   -pix_fmt yuv420p   Twitter / Insta / LinkedIn compat
    //   -r 30        force 30fps output (Playwright webm fps is variable)
    //   -vf chain :
    //     crop  trim PlaybackBar reservation at bottom (44px × SCALE)
    //     pad   libx264 + yuv420p requires EVEN dimensions
    //   +faststart   metadata at start so the video can play while downloading
    const cropW = scene.width * SCALE;
    const cropH = scene.height * SCALE;
    const vfChain = [
      `crop=${cropW}:${cropH}:0:0`,
      `pad=ceil(iw/2)*2:ceil(ih/2)*2:0:0:color=0xF2EEE6`,
    ].join(",");
    // Trim. Note `-ss` is placed AFTER `-i` (output seek): ffmpeg decodes
    // from t=0, drops frames until the seek point, then emits — that's
    // FRAME-ACCURATE. Input seek (`-ss` before `-i`) is faster but
    // keyframe-quantized: WebM VP8 keyframes can be 2-10s apart, so input
    // seek would pull in extra blank/loading content before the scene.
    //
    // Pre-roll buffer of 500ms absorbs all timing slop : Playwright's
    // recordVideo doesn't start at the exact wallclock moment newPage()
    // resolves (Chromium has a variable startup delay before the first
    // captured frame), and there's also React-effect microtask lag between
    // Stage's first commit and its localStorage write. Without enough
    // pre-roll, trim_start lands PAST scene t=0 and the MP4 begins
    // mid-scene. 500ms is overkill on a perfect measurement but absorbs
    // the worst case, and the pre-roll content is just bone-cream BG —
    // identical color to the scene's BG, so visually it just looks like
    // a brief "scene about to begin" frame.
    const trimStartSec = Math.max(0, (sceneStartOffsetMs - 500) / 1000);
    const trimDurationSec = scene.duration + 1;
    await execFfmpeg([
      "-y",
      "-i",
      targetWebm,
      "-ss",
      trimStartSec.toFixed(3),
      "-t",
      trimDurationSec.toFixed(3),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "12",
      "-preset",
      "slow",
      "-r",
      "30",
      "-vf",
      vfChain,
      "-movflags",
      "+faststart",
      targetMp4,
    ]);
    console.log(
      `  ✓ mp4  → ${path.relative(ROOT, targetMp4)} (trim ${trimStartSec.toFixed(2)}s, dur ${trimDurationSec}s)`
    );
  }
}

async function main() {
  const opts = parseArgs();
  const playwright = await ensurePlaywright();
  const adsDir = path.join(ROOT, ".ads");
  await fs.access(path.join(adsDir, "Versuz Ads.html"));

  // Babel standalone XHRs the `.jsx` files — needs a real HTTP server,
  // file:// origin blocks the requests.
  const server = await startStaticServer(adsDir);
  const htmlUrl = `${server.base}/Versuz%20Ads.html`;

  try {
    // Bootstrap : open the page to fetch the scene catalog
    console.log("📦 Loading scene catalog…");
    const bootBrowser = await playwright.chromium.launch({ headless: true });
    const bootCtx = await bootBrowser.newContext({ viewport: { width: 1920, height: 1080 } });
    const bootPage = await bootCtx.newPage();
    bootPage.on("pageerror", (err) => console.error(`  [page error] ${err.message}`));
    bootPage.on("console", (msg) => {
      if (msg.type() === "error") console.error(`  [console] ${msg.text()}`);
    });
    await bootPage.goto(htmlUrl, { waitUntil: "domcontentloaded" });
    const catalog = await getSceneCatalog(bootPage);
    await bootBrowser.close();

    const keys = Object.keys(catalog);
    console.log(`  → ${keys.length} scenes loaded\n`);

    if (opts.list) {
      for (const k of keys) {
        const s = catalog[k];
        console.log(
          `  ${k.padEnd(20)} ${s.group.padEnd(18)} ${s.format.padEnd(14)} ${s.title}`
        );
      }
      return;
    }

    const toExport = opts.scene ? [opts.scene] : keys;
    for (const key of toExport) {
      if (!catalog[key]) {
        console.warn(`⚠ Unknown scene "${key}" — skip`);
        continue;
      }
      const s = catalog[key];
      console.log(`🎬 ${key} (${s.format}, ${s.duration}s)`);
      try {
        await recordScene(playwright, htmlUrl, key, s, opts);
      } catch (err) {
        console.error(`  ❌ ${err.message}`);
      }
      console.log("");
    }

    console.log(`\n✅ Done. Output → ${path.relative(ROOT, opts.out)}/`);
  } finally {
    await server.close();
  }
}

main().catch((err) => {
  console.error(`fatal: ${err.stack || err.message}`);
  process.exit(1);
});
