#!/usr/bin/env node
// 卡片张数规划器：读 content.json，算出这一稿会出几张卡、每张来自哪里，
// 以及离用户要的 N 张还差多少、该动哪里。
//
//   node count.mjs <content.json> [--target N] [--ratio 3:4]
//
// 卡片张数 = 1（封面） + Σ每节贡献 + 1（末张"全文要点"）
//   普通节 1 张；card.mode=split → 2 张；card.mode=skip → 0 张；
//   checklist 节按阶段数自动分张（1–6 张不等）。
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveEngine } from './engine.mjs';

const args = process.argv.slice(2);
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) { i++; continue; }
  positional.push(args[i]);
}
const file = positional[0];
const flag = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const target = args.includes('--target') ? Number(flag('--target')) : null;
const ratio = flag('--ratio', '3:4');

if (!file) {
  console.error('用法：node count.mjs <content.json> [--target N] [--ratio 3:4]');
  process.exit(2);
}
if (!fs.existsSync(file)) {
  console.error(`✗ 找不到 ${file}`);
  process.exit(2);
}

const engine = resolveEngine();
const { planCards } = await import(pathToFileURL(path.join(engine, 'scripts', 'lib', 'layout-card.mjs')).href);

let content;
try {
  content = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`✗ content.json 解析失败：${e.message}`);
  process.exit(2);
}

const plan = planCards(content, ratio, 0, '');

const label = (it) => {
  if (it.kind === 'cover') return '封面';
  if (it.kind === 'end') return '全文要点';
  if (it.kind === 'sec') {
    const h = String(it.s?.heading ?? '').replace(/\n/g, ' ').trim();
    const tag = it.split ? '（split 第 2 张）' : '';
    return `节「${h || '未命名'}」${tag}`;
  }
  if (it.kind === 'stages' || it.kind === 'guard') {
    const h = String(it.s?.heading ?? '').replace(/\n/g, ' ').trim();
    return `清单「${h || '未命名'}」的${it.kind === 'guard' ? '护栏' : '阶段'}卡`;
  }
  return it.kind;
};

console.log(`比例：${ratio}`);
console.log(`计划卡片数：${plan.length}`);
plan.forEach((it, i) => console.log(`  ${String(i + 1).padStart(2, '0')}  ${label(it)}`));

// 各节贡献：按实际计划数（checklist 会被引擎按排版重新分张，这里不用阶段数估算）
const actual = new Map(); // section 对象 → 张数
for (const it of plan) {
  if (it.s) actual.set(it.s, (actual.get(it.s) || 0) + 1);
}
const sections = [];
for (const pg of content.pages || []) {
  for (const s of pg.sections || []) {
    const mode = s.card?.mode || 'single';
    const h = String(s.heading ?? '').replace(/\n/g, ' ').trim() || '未命名';
    const n = actual.get(s) ?? 0;
    let note = '';
    if (s.kind === 'checklist') note = `（${(s.stages || []).length} 个阶段，引擎按排版分 ${n} 张）`;
    sections.push({ h, mode, n, note });
  }
}
console.log('\n各节贡献：');
for (const s of sections) console.log(`  ${s.n} 张  ${s.h}  [mode=${s.mode}]${s.note}`);

if (target && Number.isFinite(target)) {
  const diff = target - plan.length;
  const body = plan.length - 2; // 封面 + 末张是固定的
  console.log(`\n目标 ${target} 张：${diff === 0 ? '✓ 已命中' : diff > 0 ? `还差 ${diff} 张` : `多了 ${-diff} 张`}`);
  console.log(`（固定 2 张：封面 + 末张全文要点；正文卡 ${body} 张，目标正文卡 ${target - 2} 张）`);
  if (diff !== 0) {
    const tips = [];
    if (diff > 0) {
      tips.push('加节：把一节拆成两节，或新增一节');
      tips.push('把某节改成 "card": {"mode": "split"}（+1 张）');
      tips.push('把 checklist 的阶段写细一些，阶段多会多分几张');
    } else {
      tips.push('减节：合并相邻两节，或删掉次要的一节');
      tips.push('把某节改成 "card": {"mode": "skip"}（-1 张）');
      tips.push('把 "mode": "split" 改回 "single"（-1 张）');
    }
    console.log('调整建议：');
    for (const t of tips) console.log(`  - ${t}`);
  }
  process.exit(diff === 0 ? 0 : 3);
}
