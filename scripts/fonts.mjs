#!/usr/bin/env node
// 字体本地化：把主题用到的网络字体镜像到本地缓存，之后出图不再依赖网络。
//
//   node fonts.mjs [--theme 名称|a,b] [--mirror 主机] [--list] [--clean]
//
// 引擎会把它写进缓存目录（默认 ~/.cache/article2media/fonts）。
import { runEngineScript } from './engine.mjs';

const args = process.argv.slice(2);
process.exit(runEngineScript('fonts.mjs', args, 'fonts'));
