#!/usr/bin/env node
// 改写稿校验：跑引擎的内容检查（卡片规则 + 与原文对照），不改 content.json。
//
//   node check.mjs <content.json> [--ratio 3:4]
//
// 退出码非 0 表示有 ✗ 必须修完；⚠ 提示要逐条处理到 0。
import path from 'node:path';
import { runEngineScript } from './engine.mjs';

const args = process.argv.slice(2);
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) { i++; continue; }
  positional.push(args[i]);
}
const input = positional[0];
if (!input) {
  console.error('用法：node check.mjs <content.json> [--ratio 3:4]');
  process.exit(2);
}
const flag = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const pass = [path.resolve(input), '--layout', 'card', '--ratio', flag('--ratio', '3:4'), '--check'];
process.exit(runEngineScript('render.mjs', pass, 'check'));
