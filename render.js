// Render video denah: JSON -> three.js (Chrome headless) -> frame JPG -> ffmpeg -> MP4
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;
const FPS = +env.FPS || 30;
const W = +env.W || 1080;
const H = +env.H || 1920;
const DUR = Math.min(+env.DURATION || 10, 10); // maksimal 10 detik
const PLAN = env.PLAN || 'all';
const MUSIC = env.MUSIC || ''; // nama file di assets/music, '' = acak jika ada, 'none' = tanpa musik

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': mime[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

function pickMusic() {
  if (MUSIC === 'none') return null;
  const dir = path.join(ROOT, 'assets', 'music');
  if (MUSIC) { const f = path.join(dir, MUSIC); return fs.existsSync(f) ? f : null; }
  const list = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.(mp3|m4a|wav|ogg)$/i.test(f)) : [];
  return list.length ? path.join(dir, list[Math.floor(Math.random() * list.length)]) : null;
}

const plans = PLAN === 'all'
  ? fs.readdirSync(path.join(ROOT, 'plans')).filter((f) => f.endsWith('.json')).map((f) => `plans/${f}`)
  : [PLAN];

const browser = await puppeteer.launch({
  headless: true,
  executablePath: env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage'],
});

fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
let failed = false;
for (const plan of plans) {
  const name = path.basename(plan, '.json');
  const frames = path.join(ROOT, 'frames');
  fs.rmSync(frames, { recursive: true, force: true });
  fs.mkdirSync(frames, { recursive: true });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { console.error('PAGE ERROR:', e.message); failed = true; });
  page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(`${base}/web/index.html?plan=/${plan}&w=${W}&h=${H}`, { waitUntil: 'load' });
  await page.waitForFunction('window.ready===true', { timeout: 60000 });
  const total = Math.round(DUR * FPS);
  console.log(`[${name}] render ${total} frame ${W}x${H} @${FPS}fps`);
  const t0 = Date.now();
  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.setTime(t), i / FPS);
    await page.screenshot({ path: path.join(frames, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 94 });
    if (i % 30 === 0) console.log(`  frame ${i}/${total}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  await page.close();
  const out = path.join(ROOT, 'out', name + '.mp4');
  const music = pickMusic();
  const args = ['-y', '-framerate', String(FPS), '-i', path.join(frames, '%05d.jpg')];
  if (music) args.push('-i', music);
  args.push('-t', String(DUR), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart');
  if (music) args.push('-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-af', `afade=t=out:st=${DUR - 1}:d=1`, '-shortest');
  args.push(out);
  const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (r.status !== 0) { failed = true; console.error('ffmpeg gagal'); }
  else console.log(`[${name}] selesai -> out/${name}.mp4 ${music ? '(musik: ' + path.basename(music) + ')' : '(tanpa musik)'}`);
  fs.rmSync(frames, { recursive: true, force: true });
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
