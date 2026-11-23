#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""AI 封面合成：把文字精确叠加到 AI 生成的「无文字底图」上。

为什么要分两步：AI 生图画中文标题必糊字、错字。所以底图只负责画面
（风格与提示词模板见 docs/ai-cover-styles.md），所有文字都由本脚本
用思源字体（Noto Sans/Serif SC）渲染，字字准确。

用法示例：
  python3 scripts/ai_cover.py 底图.png \
    --kicker "电子书制作工具 · 正式发布" \
    --title "乱 TXT，一键" --title "做成电子书" \
    --subtitle "iBook 书籍制作器" \
    --tags "纯本地 · 智能拆章 · EPUB 3 · 免费无广告" \
    --credit "ChrisX" \
    --out cover.png

底图会被居中裁剪/缩放成 1080×1440（3:4）。文字默认排在上半部留白区，
底图生成时就要按模板在上半部留白（见 docs/ai-cover-styles.md）。

依赖：Python 3 + Pillow（pip install Pillow）。
字体：需要 NotoSansSC（黑体）与 NotoSerifSC（宋体）的 Regular/Bold，
按顺序在以下位置查找：--font-dir 指定目录、~/.fonts/、脚本同目录、
/usr/share/fonts、/usr/local/share/fonts、~/Library/Fonts、/Library/Fonts。
找不到会报错并打印获取方式（也可以跑 scripts/fonts.mjs 本地化引擎字体后
用 --font-dir 指过去，或直接从 Google Fonts / GitHub noto-cjk 下载 .otf）。
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("✗ 缺少 Pillow。请先安装：pip install Pillow（或 python3 -m pip install Pillow）")

W, H = 1080, 1440  # 小红书 3:4

# 版式（按 1080×1440 设计，与试验成品 docs/examples/ai-cover-ibook.png 一致）
MARGIN_X = 72
KICKER_Y = 84
TITLE_Y = 158
ACCENT_GAP = 26      # 标题最后一行底边到红条的距离
SUBTITLE_GAP = 30    # 红条到副标题
TAGS_GAP = 16        # 副标题到标签行
CREDIT_Y = H - 108   # 署名左下角

INK = (38, 36, 33)        # 主文字：近黑暖灰
GRAY = (110, 104, 96)     # 次级文字：暖灰
ACCENT = (166, 43, 31)    # 点缀红（印章红）

# 脚本实际用到的三款：黑体常规（kicker/标签/署名）、黑体粗（副标题）、宋体粗（标题）
FONT_FILES = {
    ("sans", True): "NotoSansSC-Bold.otf",
    ("sans", False): "NotoSansSC-Regular.otf",
    ("serif", True): "NotoSerifSC-Bold.otf",
}

FONT_HINT = """✗ 找不到思源字体（Noto Sans/Serif SC）。获取方式任选其一：
  1. 从 GitHub googlefonts/noto-cjk 下载 Sans/OTF/SimplifiedChinese 与
     Serif/OTF/SimplifiedChinese 下的 NotoSansCJKsc-*.otf / NotoSerifCJKsc-*.otf，
     改名（或软链）为 NotoSansSC-Regular.otf / NotoSansSC-Bold.otf /
     NotoSerifSC-Regular.otf / NotoSerifSC-Bold.otf 后放进 ~/.fonts/；
  2. Google Fonts 下载 Noto Sans SC / Noto Serif SC 字体包，解压放进 ~/.fonts/；
  3. 已跑过 scripts/fonts.mjs 本地化字体的话，用 --font-dir 指向那个字体目录。
需要的三个文件：NotoSansSC-Regular.otf、NotoSansSC-Bold.otf、
NotoSerifSC-Bold.otf（.ttf 同名也可）。"""


def find_font(kind, bold, extra_dirs):
    name = FONT_FILES[(kind, bold)]
    stems = [name, name.replace("SC-", "CJKsc-"), name.replace(".otf", ".ttf"),
             name.replace("SC-", "CJKsc-").replace(".otf", ".ttf")]
    dirs = list(extra_dirs) + [
        Path.home() / ".fonts",
        Path(__file__).resolve().parent,
        Path("/usr/share/fonts"),
        Path("/usr/local/share/fonts"),
        Path.home() / "Library" / "Fonts",
        Path("/Library/Fonts"),
    ]
    for d in dirs:
        if not d.is_dir():
            continue
        for stem in stems:
            p = d / stem
            if p.is_file():
                return p
        # 子目录里也找一层（如 fonts/opentype/noto/）
        for stem in stems:
            for p in d.rglob(stem):
                return p
    return None


def load_fonts(extra_dirs):
    fonts = {}
    missing = []
    for (kind, bold), _name in FONT_FILES.items():
        p = find_font(kind, bold, extra_dirs)
        if p is None:
            missing.append(FONT_FILES[(kind, bold)])
        else:
            fonts[(kind, bold)] = p
    if missing:
        print("缺少字体文件：" + "、".join(missing), file=sys.stderr)
        sys.exit(FONT_HINT)
    return fonts


def spaced(text):
    """kicker 用：汉字间加细空格感（用空格隔开，拉开字距）。"""
    return " ".join(list(text.replace(" ", ""))) if text else text


def fit_font(draw, text, font_path, start_size, max_width, min_size=40):
    """从 start_size 起缩小，直到整行放进 max_width。"""
    size = start_size
    while size > min_size:
        f = ImageFont.truetype(str(font_path), size)
        if draw.textlength(text, font=f) <= max_width:
            return f, size
        size -= 4
    return ImageFont.truetype(str(font_path), min_size), min_size


def main():
    ap = argparse.ArgumentParser(description="AI 封面：无文字底图 + 精确叠字")
    ap.add_argument("base", help="AI 生成的无文字底图（png/jpg/webp）")
    ap.add_argument("--out", required=True, help="输出封面路径（png）")
    ap.add_argument("--kicker", default="", help="顶部小字，如「电子书制作工具 · 正式发布」")
    ap.add_argument("--title", action="append", required=True,
                    help="标题行，可重复传多行，如 --title 第一行 --title 第二行")
    ap.add_argument("--subtitle", default="", help="副标题（产品名/一句话定位）")
    ap.add_argument("--tags", default="", help="标签行，如「纯本地 · 智能拆章 · 免费无广告」")
    ap.add_argument("--credit", default="", help="左下角署名，如作者名")
    ap.add_argument("--title-size", type=int, default=118, help="标题字号（默认 118，过宽自动缩小）")
    ap.add_argument("--font-dir", default="", help="字体目录（优先于默认查找路径）")
    ap.add_argument("--no-accent", action="store_true", help="不画标题下的红色短条")
    args = ap.parse_args()

    base_path = Path(args.base)
    if not base_path.is_file():
        sys.exit(f"✗ 底图不存在：{base_path}")

    fonts = load_fonts([Path(args.font_dir)] if args.font_dir else [])

    def font(kind, bold, size):
        return ImageFont.truetype(str(fonts[(kind, bold)]), size)

    # 底图：等比缩放后居中裁成 1080×1440
    src = Image.open(base_path).convert("RGB")
    scale = max(W / src.width, H / src.height)
    img = src.resize((round(src.width * scale), round(src.height * scale)),
                     Image.LANCZOS)
    x = (img.width - W) // 2
    y = (img.height - H) // 2
    img = img.crop((x, y, x + W, y + H))
    d = ImageDraw.Draw(img)
    max_w = W - 2 * MARGIN_X

    y = KICKER_Y
    if args.kicker:
        f = font("sans", False, 30)
        text = spaced(args.kicker)
        # kicker 字距拉开后可能超宽，超了就用原样
        if d.textlength(text, font=f) > max_w:
            text = args.kicker
        d.text((MARGIN_X, y), text, font=f, fill=GRAY)
        y = TITLE_Y

    # 标题（宋体粗体，逐行；行宽超限自动缩字号）
    title_size = args.title_size
    glyph_bottom = y
    for line in args.title:
        f, title_size_used = fit_font(d, line, fonts[("serif", True)],
                                      title_size, max_w)
        d.text((MARGIN_X, y), line, font=f, fill=INK)
        glyph_bottom = d.textbbox((MARGIN_X, y), line, font=f)[3]
        y += int(title_size_used * 1.28)

    if not args.no_accent:
        bar_y = glyph_bottom + ACCENT_GAP
        d.rectangle([MARGIN_X + 2, bar_y, MARGIN_X + 84, bar_y + 9], fill=ACCENT)
        y = bar_y + 9

    if args.subtitle:
        y += SUBTITLE_GAP
        f, _ = fit_font(d, args.subtitle, fonts[("sans", True)], 42, max_w)
        d.text((MARGIN_X, y), args.subtitle, font=f, fill=INK)
        y += 56

    if args.tags:
        y += TAGS_GAP
        f, _ = fit_font(d, args.tags, fonts[("sans", False)], 32, max_w)
        d.text((MARGIN_X, y), args.tags, font=f, fill=GRAY)
        y += 44

    if y > H * 0.55:
        print(f"⚠ 文字区下沿到 {y}px，已超过画面上半部（720px 的 55% 警戒线在 {int(H*0.55)}px）："
              "底图主体可能被压住，建议缩短标题行或减小 --title-size。", file=sys.stderr)

    if args.credit:
        f = font("sans", False, 28)
        d.text((MARGIN_X, CREDIT_Y), args.credit, font=f, fill=GRAY)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)
    print(f"✓ AI 封面已生成：{out}（{W}×{H}）")


if __name__ == "__main__":
    main()
