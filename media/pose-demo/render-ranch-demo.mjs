import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sharp from 'sharp';

// Recorded through the real Pose Studio controls. Raw capture stays outside Git.
const root = path.resolve('.pose-case-run/promo-20260926');
const output = path.resolve('media/pose-demo/ranch-workflow');
const clips = JSON.parse(await readFile(path.join(root, 'recording.json'), 'utf8'));
await mkdir(path.join(root, 'render'), { recursive: true });
const render = path.join(root, 'render');
const esc = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const files = [];
const beats = [];
let elapsed = 0;

async function run(args) {
  await new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
  });
}

async function overlay(name, title, subtitle, stage) {
  const svg = name === '09-result' ? `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
    <rect width="1920" height="68" fill="#090b0d"/><rect y="1012" width="1920" height="68" fill="#090b0d"/>
    <text x="48" y="45" fill="#d8ff73" font-family="Arial" font-weight="700" font-size="25">POSE STUDIO</text>
    <text x="1872" y="45" text-anchor="end" fill="#aab6b1" font-family="Arial" font-size="21">AI VISUALIZATION</text>
    <text x="48" y="1056" fill="#f5f3ed" font-family="Arial" font-weight="700" font-size="30">Pose it. Make it yours.</text>
    <text x="1872" y="1056" text-anchor="end" fill="#d8ff73" font-family="Arial" font-size="23">SEEDANCE</text>
  </svg>` : `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
    <rect width="1920" height="116" fill="#090b0d"/>
    <rect x="48" y="43" width="8" height="34" rx="4" fill="#d8ff73"/>
    <text x="78" y="72" fill="#f5f3ed" font-family="Arial" font-weight="700" font-size="31">POSE STUDIO</text>
    <text x="1858" y="70" text-anchor="end" fill="#d8ff73" font-family="Arial" font-weight="700" font-size="21" letter-spacing="3">${esc(stage)}</text>
    <rect x="48" y="108" width="1824" height="1" fill="#2a3033"/>
    <rect y="887" width="1920" height="193" fill="#090b0d"/>
    <text x="58" y="953" fill="#f5f3ed" font-family="Arial" font-weight="700" font-size="47">${esc(title)}</text>
    <text x="60" y="1004" fill="#adb6b3" font-family="Arial" font-size="26">${esc(subtitle)}</text>
    <text x="1858" y="1004" text-anchor="end" fill="#d8ff73" font-family="Arial" font-size="22">SEEDANCE</text>
    <rect y="1073" width="1920" height="7" fill="#1c2424"/>
  </svg>`;
  const filename = path.join(render, `${name}-overlay.png`);
  await sharp(Buffer.from(svg)).png().toFile(filename);
  return filename;
}

async function encode(name, inputArgs, filter, duration, title, subtitle, stage) {
  const ui = await overlay(name, title, subtitle, stage);
  const target = path.join(render, `${name}.mp4`);
  await run([...inputArgs, '-loop', '1', '-i', ui,
    '-filter_complex', `${filter}[content];[content][1:v]overlay=0:0,drawbox=x=0:y=1073:w=1920:h=7:color=0xd8ff73:t=fill:enable='between(t,0,${duration})',format=yuv420p[v]`,
    '-map', '[v]', '-t', String(duration), '-r', '30', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-movflags', '+faststart', target]);
  files.push(target);
  beats.push({ name, start: elapsed, duration, title, subtitle, stage });
  elapsed += duration;
  console.log(`Rendered ${name} (${duration}s)`);
}

async function footage(name, sourceName, duration, title, subtitle, stage, crop = 'crop=1844:712:24:74', from = 0) {
  const source = clips.find(c => c.name === sourceName);
  if (!source) throw new Error(`Missing recording: ${sourceName}`);
  const shots = source.shots.filter(s => s.time >= from);
  const end = source.duration;
  const start = shots[0].time;
  const lines = ['ffconcat version 1.0'];
  for (let i = 0; i < shots.length; i++) {
    lines.push(`file '${path.join(root, 'frames', shots[i].file).replaceAll('\\', '/')}'`);
    lines.push(`duration ${((shots[i + 1]?.time ?? end) - shots[i].time) * duration / (end - start)}`);
  }
  lines.push(`file '${path.join(root, 'frames', shots.at(-1).file).replaceAll('\\', '/')}'`);
  const list = path.join(render, `${name}.ffconcat`);
  await writeFile(list, lines.join('\n'));
  await encode(name, ['-safe', '0', '-f', 'concat', '-i', list],
    `[0:v]fps=30,${crop},scale=1824:746:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:136:color=0x090b0d,setsar=1`,
    duration, title, subtitle, stage);
}

await encode('00-scene', ['-loop', '1', '-i', path.join(root, 'frames', clips[0].shots[0].file)],
  '[0:v]crop=1844:712:24:74,scale=1824:746:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:136:color=0x090b0d,setsar=1',
  1.4, 'Compose the whole scene.', 'Two people. One horse. A wooden crate and a stool.', '01 / COMPOSE');
await footage('01-preset', '01-presets', 2, 'Start with a pose preset.', 'Select a character. Apply a pose in one click.', '02 / POSE PRESETS');
await footage('02-select', '02-select', .9, 'Direct each character.', 'Keep both people and the horse in the same composition.', '03 / MANUAL CONTROL');
await footage('03-drag', '03-manual-wrist', 2.4, 'Drag a joint. Refine the pose.', 'Move the wrist; the arm follows with ragdoll IK.', '03 / MANUAL CONTROL');
await footage('04-orbit', '04-camera', 1.8, 'Find your camera angle.', 'Orbit the scene while keeping every object in place.', '04 / CAMERA');
await footage('05-camera', '05-camera-finish', 1.3, 'Lock in the composition.', 'People, animal, props and camera — all arranged.', '04 / CAMERA');
await footage('06-reference', '06-reference', 1.4, 'Send the scene to your image workflow.', 'Pose to Image attaches a clean reference automatically.', '05 / POSE TO IMAGE', 'crop=1500:900:370:20', .9);
await footage('07-description', '07-prompt-final', 1.8, 'Describe the world around it.', 'Add clothing, a rustic stable and warm morning light.', '05 / POSE TO IMAGE', 'crop=640:730:398:85');

// The final asset must be a real AI image. Never synthesize a success state in the app.
const result = await sharp(path.join(output, 'result.png')).resize(1824, 928, { fit: 'contain', background: '#090b0d' }).png().toBuffer();
await sharp({ create: { width: 1920, height: 1080, channels: 3, background: '#090b0d' } })
  .composite([{ input: result, left: 48, top: 76 }]).png().toFile(path.join(render, 'result-stage.png'));
const left = await sharp(path.join(output, 'reference.png')).resize(890, 650, { fit: 'contain', background: '#e5e7eb' }).png().toBuffer();
const right = await sharp(path.join(output, 'result.png')).resize(890, 650, { fit: 'contain', background: '#090b0d' }).png().toBuffer();
const labels = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><text x="55" y="848" font-family="Arial" font-size="25" font-weight="700" fill="#d8ff73">3D SCENE</text><text x="977" y="848" font-family="Arial" font-size="25" font-weight="700" fill="#f5f3ed">AI VISUALIZATION</text></svg>');
await sharp({ create: { width: 1920, height: 1080, channels: 3, background: '#090b0d' } })
  .composite([{ input: left, left: 48, top: 140 }, { input: right, left: 978, top: 140 }, { input: labels }])
  .png().toFile(path.join(render, 'comparison.png'));
await encode('08-compare', ['-loop', '1', '-i', path.join(render, 'comparison.png')], '[0:v]setsar=1',
  4, 'One composition. A whole new world.', 'A countryside visualization of the arranged scene.', '06 / AI IMAGE');
await encode('09-result', ['-loop', '1', '-i', path.join(render, 'result-stage.png')], '[0:v]setsar=1',
  5, 'Pose it. Make it yours.', 'Start with the scene. Give your image a clear direction.', 'POSE STUDIO / SEEDANCE');

const playlist = path.join(render, 'complete.ffconcat');
await writeFile(playlist, files.map(file => `file '${file.replaceAll('\\', '/')}'`).join('\n'));
const master = path.join(output, 'pose-ranch-demo.mp4');
await run(['-safe', '0', '-f', 'concat', '-i', playlist, '-c', 'copy', '-movflags', '+faststart', master]);
await copyFile(master, path.resolve('assets/pose-reference-demo.mp4'));
await run(['-i', master, '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-row-mt', '1', '-cpu-used', '4', path.resolve('assets/pose-reference-demo.webm')]);
const poster = await sharp(path.join(render, 'comparison.png')).composite([{ input: await overlay('poster', 'Pose it. Make it yours.', 'Presets, manual control and a finished AI visualization.', 'POSE STUDIO / WORKFLOW') }]).png().toBuffer();
await sharp(poster).resize(1600,900).webp({quality:85}).toFile(path.resolve('assets/pose-reference-demo-poster.webp'));
await writeFile(path.join(output, 'edit.json'), JSON.stringify({ width:1920,height:1080,fps:30,duration:elapsed,beats,source:'Real Pose Studio UI screenshots captured during preset, IK, camera and reference-transfer interactions.' }, null, 2));
console.log(`Done: ${elapsed.toFixed(1)} seconds`);
