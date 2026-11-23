# xiaohongshu-cards

把一篇文章、一个链接或一段正文，做成一组**张数由你指定**的小红书图文卡片（3:4，1080×1440），附总览图和可直接复制的发帖文案。

> 从 [article2media](https://github.com/threerocks/article2media)（MIT）抽出的单用途技能。版式、12 套主题、校验逻辑全部来自它的共享引擎，本仓库自带一份副本，**克隆下来就能跑**，不依赖 article2media 已安装。

```
链接 / 文件 / 粘贴正文 → article.md →（改写 content.json | 原文一字不改）→ 卡片 N 张 + overview.jpg + caption.md
```

---

## 特点

- **张数你说多少就多少**：脚本会算出这一稿实际出几张、每张来自哪一节、离目标差几张、该动哪一节；没命中目标就直接拒绝出图，而不是给你一组 16 张。
- **改写或不改写都支持**：默认改写成结构化改写稿（卡片有观点、有排版）；说"原文/一字不改"就走原文路径，一个字不动。
- **自动验收**：内容校验（标题 ≤20 字、正文 ≤1000 字、卡片正文密度、整页卡节奏、数字是否来自原文）＋ 版面检查，✗ 必须修完。
- **零 npm 依赖**：只要 **Node.js ≥ 22** 和 **Chrome**（无头渲染用）。

---

## 安装

### 一、克隆

```bash
git clone https://github.com/Netyulin/xiaohongshu-cards.git
```

### 二、放进你的 skills 目录

| 宿主 | 目录 |
|---|---|
| MiniMax Code | `~/.minimax/skills/xiaohongshu-cards/` |
| Claude Code | `~/.claude/skills/xiaohongshu-cards/` |
| Codex | `~/.codex/skills/xiaohongshu-cards/` |

仓库根目录就是技能目录（根目录有 `SKILL.md`），所以整个复制进去即可：

```bash
# macOS / Linux
bash install.sh                 # 默认装到 ~/.minimax/skills
bash install.sh ~/.claude/skills
```

```powershell
# Windows (PowerShell)
.\install.ps1                                  # 默认装到 $HOME\.minimax\skills
.\install.ps1 -Target "$HOME\.claude\skills"
```

手动装也行：把仓库里除 `.git/` 外的全部内容复制到目标目录下的 `xiaohongshu-cards/` 子目录里。

装完重启一次宿主（Claude Code / MiniMax Code / Codex），技能就会出现在技能列表里。

### 三、验证

```bash
node xiaohongshu-cards/scripts/doctor.mjs
```

会打印 Node 版本、Chrome 是否可用、字体是否已本地化、AI 插画能力是否可用。

---

## 用法

### 在 AI 宿主里用（推荐）

直接说人话，宿主会加载这个技能：

```
把这篇文章做成 8 张小红书：<链接>
这段正文做成 6 张小红书卡片，原文一字不改
<文章> 做成 10 张小红书，主题用 brutal
```

技能内参数：

| 参数 | 含义 | 默认 |
|---|---|---|
| `--count N` | **目标卡片张数**（小红书单篇上限 18 张） | 不限，按内容自然张数 |
| `--raw` | 原文一字不改 | 改写 |
| `--theme 名称` | 主题名，如 `editorial` `brutal` `midnight` `y2k` | 按内容选 |
| `--ratio 3:4` | 比例；小红书用 3:4，IG 用 4:5 | `3:4` |
| `--out 目录` | 输出目录 | 原文/改写稿所在目录 |

### 直接用命令行

所有脚本都在 `scripts/` 下，参数原样透传：

```bash
# 取原文（链接 / 分享口令 / 本地文件 → article.md）
node scripts/fetch.mjs <url|文件> --out ./work

# 算张数：实际几张、每张来源、离目标差几张、该调哪一节
node scripts/count.mjs ./work/content.json --target 8

# 校验改写稿（卡片规则 + 与原文对照）
node scripts/check.mjs ./work/content.json --ratio 3:4

# 出图 + 张数核对
node scripts/cards.mjs ./work/content.json --count 8 --ratio 3:4 --theme editorial

# 原文卡片（一个字不改）
node scripts/cards.mjs ./work/article.md --ratio 3:4

# 只出封面的几个版本（挑封面用）
node scripts/cards.mjs ./work/content.json --covers

# 字体本地化（约 65 MB，之后出图不联网）
node scripts/fonts.mjs
```

退出码：`0` 成功；`2` 参数或文件不对；`3` **张数没命中目标**（`count.mjs` / `cards.mjs` 在改写模式下）。

---

## 张数是怎么控制的

```
卡片总数 = 1（封面） + Σ每节贡献 + 1（末张「全文要点」）
```

| 每节 | 贡献张数 |
|---|---|
| 普通节（`card.mode` 缺省或 `single`） | 1 |
| `"card": {"mode": "split"}` | 2（第一张是整页卡，第二张是正常的卡） |
| `"card": {"mode": "skip"}` | 0 |
| `kind: "checklist"` | 按阶段数自动分张（1–6 张） |

所以**目标 N 张 → 正文卡需要 N-2 张**。例：目标 8 张 = 封面 1 + 正文 5 + 末张 1 → 写 5 个普通节，或 4 个普通节 + 1 个 `split` 节。

调张数靠**改节数和 `card.mode`**，不是删内容硬凑。

**原文模式的边界**：一字不改时，张数由正文长度和版面容量决定，压不到指定张数而不动一个字。这种情况脚本只如实报数并警告（全文校验照跑），要精确命中就转改写模式。

---

## 产物

```
<输出目录>/
  card-01.png … card-NN.png   1080×1440（3:4）
  overview.jpg                所有卡片的总览，一眼看完
  caption.md                  发帖文案（标题 / 正文 / 标签）
```

`caption.md` 里是可直接复制的标题、正文和话题标签。

---

## 主题（12 套主推）

| 主题 | 气质 | 适合 |
|---|---|---|
| `editorial`（默认） | 商业杂志、暖白纸面、思源宋体 | 商业分析、方法论、行业观察 |
| `swiss` | 瑞士极简、纯白黑体粗线 | 数据报告、严肃议题、财经 |
| `quiet` | 静线、暖纸底、单一暗朱红 | 哲思、单一观念、深度解读 |
| `bento` | 便当格、白卡片撞色 | 产品测评、横评、盘点 |
| `brutal` | 新粗野大字报、高饱和 | 教程攻略、避坑清单、工具推荐 |
| `dopamine` | 多巴胺糖果色 | 好物种草、探店、生活方式 |
| `midnight` | 深色科技、霓虹 | AI、编程、开发者工具 |
| `film` | 电影感、胶片颗粒 | 影视评论、人物传记、访谈 |
| `guochao` | 国潮、宣纸朱红 | 节庆民俗、非遗、国货、文旅 |
| `shanshui` | 新中式、宣纸石青 | 古典历史、诗词国学、东方美学 |
| `notebook` | 格纹手帐、霞鹜文楷 | 学习方法、读书笔记、课程笔记 |
| `y2k` | 液态铬 Y2K/Y3K | 美妆、娱乐、追星、二次元 |

查看全部：`node scripts/cards.mjs --list`

---

## 目录结构

```
xiaohongshu-cards/
├─ SKILL.md              技能定义：触发词、参数、六步流程
├─ README.md             本文件
├─ LICENSE               MIT
├─ CHANGELOG.md
├─ install.sh            macOS / Linux 安装脚本
├─ install.ps1           Windows 安装脚本
├─ scripts/
│  ├─ engine.mjs         引擎定位（自带 engine/ 优先，可用环境变量覆盖）
│  ├─ doctor.mjs         环境自检
│  ├─ fetch.mjs          取原文 → article.md
│  ├─ count.mjs          张数规划器（本技能的核心）
│  ├─ check.mjs          改写稿校验
│  ├─ cards.mjs          出图 + 张数核对
│  └─ fonts.mjs          字体本地化
├─ references/
│  └─ xhs-spec.md        content.json 卡片字段速查 + 张数数学 + 小红书硬限制
└─ engine/               article2media 的共享引擎（MIT，vendored）
   ├─ scripts/           渲染、校验、抓取、统计等 Node 脚本
   ├─ layouts/           各版式 CSS
   ├─ themes/            12 套主推主题 + 9 套经典主题
   └─ assets/            随包音色等资源
```

---

## 排错

| 现象 | 处理 |
|---|---|
| 张数对不上 | 跑 `count.mjs --target N`，按提示改 `content.json` 的节数或 `card.mode` |
| 封面不出图 / 图被缩太小 | 缩短 `card.text`（≤90 字）、去掉 `bullets`，或把该节改成 `split` |
| 超过 18 张 | 小红书单篇上限；用 `skip` 去掉次要节或合并两节 |
| 出图报"字体没有加载" | 跑一次 `node scripts/fonts.mjs`（约 65 MB），之后出图不再依赖网络 |
| 人称错了 | 别人的文章不能写"我"，封面、小红书标题、备选标题都要改第三人称 |
| 数字对不上原文 | 改成原文里的数字，或在 note 里注明"未核对" |
| 找不到引擎 | 本仓库自带 `engine/`；若被移走，设 `ARTICLE2MEDIA_ENGINE` 指向引擎目录 |

---

## 致谢与许可

- 版式、主题、校验逻辑来自 **[threerocks/article2media](https://github.com/threerocks/article2media)**（MIT），`engine/` 目录是它的 vendored 副本，版权归原作者所有。
- 繁简转换字表来自 [BYVoid/OpenCC](https://github.com/BYVoid/OpenCC)（Apache-2.0）。
- 主题字体：思源宋体/黑体、站酷系列、霞鹜文楷、京华老宋体、得意黑等。

本仓库代码以 MIT 许可发布，见 [LICENSE](LICENSE)。
