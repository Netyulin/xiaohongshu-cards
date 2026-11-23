---
name: xiaohongshu-cards
description: 小红书图文卡片一条龙：从链接、文件或用户粘贴的正文取原文，改写成结构化改写稿（或一字不改的原文稿），按用户指定的张数出一组 3:4 小红书卡片（1080×1440），附总览图和发帖文案。张数由用户指定——脚本会算出这一稿实际出几张、离目标差几张、该调哪一节。Use when the user wants 小红书图文 / 小红书卡片 / 红书 / RED / xhs / 轮播卡片, 说"做成 N 张卡""做成 8 张小红书", 或给一篇文章、一个链接、一段正文要发小红书。
argument-hint: <url|文件|粘贴的正文> [--count N 张] [--raw 原文不改写] [--theme 主题名] [--ratio 3:4] [--out 目录]
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/*)
version: "1.0.0"
---

# 小红书卡片（xiaohongshu-cards）

一条龙链路：**取原文 → （改写 或 原文）→ 按指定张数出卡片 → 交付发帖文案**。

> 路径约定：文中的 `${CLAUDE_SKILL_DIR}` 指本 SKILL.md 所在的目录。宿主没有替换这个变量时（命令里原样出现 `${CLAUDE_SKILL_DIR}`），把它换成本 SKILL.md 所在目录的绝对路径再运行。
> 例：`node /path/to/xiaohongshu-cards/scripts/doctor.mjs`
> 版式、主题、校验逻辑来自 article2media 的共享引擎；本仓库自带一份副本（`engine/`），引擎路径由 `scripts/engine.mjs` 自动定位（可用环境变量 `ARTICLE2MEDIA_ENGINE` 覆盖）。

参数：`$ARGUMENTS`

| 参数 | 含义 | 默认 |
|---|---|---|
| `--count N` | **目标卡片张数**（小红书单篇上限 18 张） | 不限，按内容自然张数 |
| `--raw` | 原文一字不改（不做改写） | 改写 |
| `--theme 名称` | 主题名，如 `editorial` `brutal` `y2k` | 按内容选 |
| `--ratio 3:4` | 比例，小红书用 3:4 | `3:4` |
| `--out 目录` | 输出目录 | 原文/改写稿所在目录 |

用户说"小红书 / 红书 / RED / xhs / 发小红书"就按本技能走；说"抖音图文 / IG / Instagram"先确认要哪个平台，IG 是 4:5。

## 0. 环境检查（每个会话第一次）

```bash
node ${CLAUDE_SKILL_DIR}/scripts/doctor.mjs
```

Node ≥22、Chrome 可用才能出图。`local-fonts` 显示没装本地字体时，若用户网络不稳（出图报"字体没有加载"），建议跑一次 `node <article2media>/scripts/fonts.mjs`（约 65 MB，要用户同意再跑）。

## 1. 取原文

- **链接 / 分享口令 / 本地文件**：
  ```bash
  node ${CLAUDE_SKILL_DIR}/scripts/fetch.mjs <url|口令|文件> --out <工作目录>
  ```
  产出 `<工作目录>/article.md`。
- **用户粘贴的正文**：自己写成 `<工作目录>/article.md`，front matter 用 YAML 风格：
  ```markdown
  ---
  title: 文章标题
  author: 作者
  platform: 公众号
  source: https://...（没有就留空）
  date: 2026-11-22
  ---
  正文第一段……
  ```
- 抓取失败、正文明显不全、或疑似付费墙 → **停下来问用户**（换链接 / 粘贴正文 / 放弃），不要自己编内容。

## 2. 改写 还是 原文

| 情况 | 走哪条 |
|---|---|
| 用户默认、只说"做成小红书" | **改写**：写 `content.json`，卡片有观点有排版 |
| 用户说"一字不改 / 原文 / 全文" | **原文**：直接拿 `article.md` 出卡，不改一个字 |
| 原文是外文且要原文卡片 | 先翻译成中文再出原文卡 |

改写模式：读 `references/xhs-spec.md` 写 `content.json`（结构、卡片字段、小红书文案字段都在这里）。

## 3. 定张数（关键一步）

**卡片张数 = 1（封面）+ 每节贡献 + 1（末张"全文要点"）**：
普通节 1 张；`card.mode = "split"` → 2 张；`card.mode = "skip"` → 0 张；checklist 节按阶段数自动分张。

改写模式必须精确命中用户给的 N：

```bash
node ${CLAUDE_SKILL_DIR}/scripts/count.mjs <工作目录>/content.json --target 8
```

- 命中（退出码 0）→ 进入第 4 步。
- 没命中（退出码 3）→ 脚本会列出每张卡的来源和差几张，**按建议改 content.json 再数一次**：
  - 张数太多 → 合并相邻两节、删掉次要的一节、把 `split` 改回 `single`、把某节设 `skip`。
  - 张数太少 → 加节、把某节改 `split`、把 checklist 阶段写细。

  改的是节的数量和 `card.mode`，**不是**删内容换张数。

原文模式：张数由正文长度和版面容量决定，脚本只能如实报数。
- 实际张数 = 用户要的 N → 照常出。
- 对不上 → **不删原文**。出图后如实告诉用户实际张数，并给两个选择：① 就按实际张数发；② 转改写模式压成 N 张（需要用户点头）。
  用户明确说"少点字、压到 N 张"时，才走改写模式。

## 4. 校验

```bash
node ${CLAUDE_SKILL_DIR}/scripts/check.mjs <工作目录>/content.json --ratio 3:4
```

- ✗ 必须修完。
- ⚠ 逐条处理到 0：标题超 20 字、正文超 1000 字、卡片正文太长、缺备选标题、整页卡偏少等，按脚本给的提示改。
- 校验会比对同目录的 `article.md`（数字来源、人称、配图），所以 `content.json` 必须和 `article.md` 放一起。
- 改 `content.json` 用编辑工具或 node 脚本，不要用 `sed -i`。

## 5. 出图

```bash
node ${CLAUDE_SKILL_DIR}/scripts/cards.mjs <工作目录>/content.json --count 8 --ratio 3:4 --theme editorial
node ${CLAUDE_SKILL_DIR}/scripts/cards.mjs <工作目录>/article.md  --ratio 3:4            # 原文卡
node ${CLAUDE_SKILL_DIR}/scripts/cards.mjs <工作目录>/content.json --covers              # 只出封面的几个版本
```

产出：`card-01.png … card-NN.png` + `overview.jpg` + `caption.md`。
输出目录 = `--out` 指定的目录（不给 `--out` 时是改写稿/原文所在目录下的 `<主题>-3x4/`）。

**出图检查（最多 2 轮）**：先看 `overview.jpg`，有问题再打开单张卡。✗ 必须修（缩短 `card.text`、改 `split`/`skip`）；提示处理不动了就写进交付说明，不要为了归零删面板、删图、删正文。改完只改 `content.json` 再重渲，不手改 HTML。

## 6. 交付

必须给到用户：

1. **卡片目录绝对路径、张数、每张尺寸**（3:4 = 1080×1440）+ `overview.jpg` 路径。
2. **把 `caption.md` 里的标题、正文、标签直接贴在回复里**（方便复制）。原文卡片要补标签、必要时缩短标题。
3. 用了哪个主题、为什么（一句话）；换主题 `--theme 名称`，换比例 `--ratio 4:5`，都不用重写内容。
4. 要用户留意的地方：未核对的数字、抓取不全的段落、可能出错的专有名词、张数与要求的差异。
5. 产物是要发布的 → 最后加一句："发布后把链接和数据告诉我，我记下来。"

## 常见问题

- **张数对不上**：跑 `count.mjs --target N` 看差几张，按提示改 `content.json` 的节数或 `card.mode`，别删内容硬凑。
- **封面不出图 / 图被缩太小**：缩短 `card.text`（≤ 90 字），去掉 `bullets`，或把该节改成 `split`。
- **超过 18 张**：小红书单篇上限，`count.mjs` 会算出来；用 `skip` 去掉次要节或合并节。
- **人称错了**：别人的文章不能写"我"，封面、小红书标题、备选标题都要改成第三人称。
- **数字对不上原文**：改成原文里的数字，或在 note 里注明"未核对"。
