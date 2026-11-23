#!/usr/bin/env node
// 取原文：包引擎的 fetch.mjs。链接 / 分享口令 / 本地文件 → article.md。
//
//   node fetch.mjs <url|分享口令|文件> [--out 目录] [--no-proxy] [--kind article|video]
//
// 用户直接粘贴的正文不用跑这个：直接把正文写成 article.md（front matter + 正文）。
import { runEngineScript } from './engine.mjs';

const args = process.argv.slice(2);
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) { i++; continue; }
  positional.push(args[i]);
}
const input = positional[0];
if (!input) {
  console.error('用法：node fetch.mjs <url|分享口令|文件> [--out 目录] [--no-proxy]');
  process.exit(2);
}
const flag = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const pass = [input];
if (args.includes('--out')) pass.push('--out', flag('--out'));
if (args.includes('--no-proxy')) pass.push('--no-proxy');
if (args.includes('--kind')) pass.push('--kind', flag('--kind'));

process.exit(runEngineScript('fetch.mjs', pass, 'fetch'));
