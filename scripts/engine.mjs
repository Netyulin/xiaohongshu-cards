// 引擎定位：版式、主题、校验逻辑都在 article2media 的 engine 里。
// 本仓库自带一份副本（engine/），克隆下来即可运行；也可以指向另一份已安装的引擎。
//
// 查找顺序：
//   1. 环境变量 ARTICLE2MEDIA_ENGINE
//   2. 与本技能并列的 ../article2media/engine（同时装了 article2media 技能时）
//   3. 本技能自带的 ./engine（默认路径，克隆即用）
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export function resolveEngine() {
  const candidates = [
    process.env.ARTICLE2MEDIA_ENGINE,
    path.resolve(HERE, '..', '..', 'article2media', 'engine'),
    path.resolve(HERE, '..', 'engine'),
  ].filter(Boolean);

  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'scripts', 'render.mjs'))) return path.resolve(c);
  }
  console.error('✗ 找不到 article2media 引擎（需要 engine/scripts/render.mjs）。');
  console.error('  正常情况本仓库自带 engine/ 目录；若你把它移走了，设环境变量 ARTICLE2MEDIA_ENGINE 指向引擎目录。');
  process.exit(2);
}

export const engineScript = (name) => path.join(resolveEngine(), 'scripts', name);

/** 用 node 直接跑引擎里的脚本，参数原样透传。 */
export function runEngineScript(script, args, label = script) {
  const r = spawnSync(process.execPath, [engineScript(script), ...args], { stdio: 'inherit' });
  if (r.error) {
    console.error(`✗ 运行 ${label} 失败：${r.error.message}`);
    process.exit(2);
  }
  return r.status ?? 1;
}
