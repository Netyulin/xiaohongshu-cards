#!/usr/bin/env bash
# 把本仓库装进某个 skills 目录。
#
#   bash install.sh                    # 默认 ~/.minimax/skills
#   bash install.sh ~/.claude/skills   # 指定目录
#   bash install.sh ~/.codex/skills
#
# 技能目录名固定为 xiaohongshu-cards；目标已存在时先备份成 xiaohongshu-cards.bak-<时间戳>。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ROOT="${1:-$HOME/.minimax/skills}"
SKILL_NAME="xiaohongshu-cards"
DEST="$TARGET_ROOT/$SKILL_NAME"

mkdir -p "$TARGET_ROOT"

if [ -e "$DEST" ]; then
  BAK="$DEST.bak-$(date +%Y%m%d-%H%M%S)"
  mv "$DEST" "$BAK"
  echo "已备份旧版本 → $BAK"
fi

mkdir -p "$DEST"
# 复制除 .git 之外的全部内容
( cd "$ROOT" && tar --exclude='./.git' -cf - . ) | ( cd "$DEST" && tar -xf - )

echo "✓ 装好了：$DEST"
echo "  自检：node \"$DEST/scripts/doctor.mjs\""
echo "  重启一次 AI 宿主后，技能就会出现在技能列表里。"
