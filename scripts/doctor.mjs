#!/usr/bin/env node
// 环境自检：Node 版本、Chrome、无头渲染、本地字体、出图能力、视频依赖。
import { runEngineScript } from './engine.mjs';

process.exit(runEngineScript('doctor.mjs', [], 'doctor'));
