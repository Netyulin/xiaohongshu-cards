#!/usr/bin/env node
// 出小红书卡片：包 article2media 引擎的 render.mjs（--layout card）。
//
//   node cards.mjs <content.json | article.md> [--count N] [--ratio 3:4] [--theme 名称]
//                  [--out 目录] [--check] [--covers] [--form quotes|onepage|qa]
//
// --count N 的行为：
//   改写稿（.json）：出图后核对张数，不等于 N 就以退出码 3 报错，提示去调 content.json。
//   原文稿（.md）：一字不改，张数由正文长度决定；对不上只警告，不删原文。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runEngineScript, resolveEngine } from './engine.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) { i++; continue; }
  positional.push(args[i]);
}
const input = positional[0];
const flag = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

if (!input) {
  console.error('用法：node cards.mjs <content.json | article.md> [--count N] [--ratio 3:4] [--theme 名称] [--out 目录]');
  process.exit(2);
}
if (!fs.existsSync(input)) {
  console.error(`✗ 找不到 ${input}`);
  process.exit(2);
}

const target = args.includes('--count') ? Number(flag('--count')) : null;
const ratio = flag('--ratio', '3:4');
const isRewrite = path.extname(input).toLowerCase() === '.json';

// --count 转发给引擎前先做一次预检（改写稿），避免白渲染一遍
if (isRewrite && target) {
  const { spawnSync } = await import('node:child_process');
  const pre = spawnSync(process.execPath, [path.join(HERE, 'count.mjs'), input, '--target', String(target), '--ratio', ratio], { stdio: 'inherit' });
  if (pre.status === 3) {
    console.error('\n✗ 张数没对上，按上面的建议改 content.json 后再出图。');
    process.exit(3);
  }
}

const out = flag('--out', path.dirname(path.resolve(input)));
const pass = [];
pass.push(input, '--layout', 'card', '--ratio', ratio, '--out', out);
for (const name of ['theme', 'form']) {
  if (args.includes(`--${name}`)) pass.push(`--${name}`, flag(`--${name}`));
}
if (args.includes('--covers')) pass.push('--covers');
if (args.includes('--check')) pass.push('--check');

const status = runEngineScript('render.mjs', pass, 'cards');

// 核对实际张数：引擎在传了 --out 时直接写进 out 目录，没传则写进 <目录>/<主题>-3x4/，两处都找
if (status === 0 && target) {
  const dirs = [out, ...fs.readdirSync(out).map((s) => path.join(out, s)).filter((p) => fs.existsSync(p) && fs.statSync(p).isDirectory())];
  for (const dir of dirs) {
    const cards = fs.readdirSync(dir).filter((f) => /^card-\d+.*\.png$/.test(f));
    if (!cards.length) continue;
    const n = cards.length;
    const ok = n === target;
    console.log(`\n张数核对：${n} 张（目标 ${target} 张）${ok ? '✓' : '✗'}`);
    if (!ok) {
      if (isRewrite) {
        console.error('✗ 改写稿没命中目标张数：调 content.json 的节数后重出（用 count.mjs 看差多少）。');
        process.exit(3);
      } else {
        console.error('⚠ 原文卡片张数由正文长度决定，与目标不一致；原文一字未改，没有删内容。');
        console.error('  要精确命中目标张数，请改用改写模式（把内容压成 content.json）。');
      }
    }
    console.log(`  目录：${dir}`);
    break;
  }
}
process.exit(status);
