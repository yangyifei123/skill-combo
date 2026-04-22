# Skill-Combo

**版本**: 1.0.0
**类型**: OpenCode 插件（每次会话自动启用）
**描述**: 把多个 skill 串成连招来用，像格斗游戏的 combo 一样。支持串行、并行、包裹、条件执行。

---

## 先说人话

我是个普通程序员，不是啥布道师。写这个是因为被 skill 生态搞麻了。

103 个 skill 摆在面前，谁记得住哪个干嘛的？装了一堆文档又烂的 skill，用都不知道怎么用。找着了单个跑起来还行，但单个 skill 能做的事太有限了。

真正有用的，是把几个 skill 串起来打出 combo 效果。但自己手动串太麻烦了，而且不知道串完到底能不能用。

所以我写了这个，至少让自己不用每次都靠运气。

---

## 有它没它，区别在哪

### 没有 Skill-Combo 的时候

```
你: "帮我做一个安全的 REST API，要有测试和文档"

AI: （加载 api-rest-design skill）
  → 输出了 API 设计方案
  → 停了。你得再问一遍"继续实现"
  
你: "继续，用 Python 实现这个 API"

AI: （加载 python-patterns skill）
  → 输出了 Python 代码
  → 又停了。你得再问"加测试"

你: "加上测试"

AI: （加载 testing-strategies skill）
  → 输出了测试代码
  → 又停了。你得再问"写文档"

你: "写文档"

AI: （加载 code-docs skill）
  → 输出了文档
  → 又停了。

你: ？？？一个任务问了5遍，每次都要手动指定用哪个 skill
```

**问题：**
- 手动指定每个 skill，脑子根本记不住 103 个
- 每次都要重复上下文，浪费 token
- 不知道 skill 之间有依赖关系（比如测试依赖代码）
- 并行能做的事被迫串行等待
- 没有整体规划，做到哪算哪

### 有了 Skill-Combo 之后

```
你: "帮我做一个安全的 REST API，要有测试和文档"

AI: （自动加载 skill-combo）
  → 检测到这是一个多 skill 任务
  → 匹配 combo: api-first + docs-pipeline + security-audit
  → 推荐执行计划：
     Step 1: api-rest-design（API 设计）
     Step 2: python-patterns（实现，接收 Step 1 的输出）
     Step 3: testing-strategies（测试，接收 Step 2 的输出）
     Step 4: code-docs → project-docs（文档，并行）
     Step 5: security-auditor + security-best-practices（安全审计，并行）
  → 一次搞定，上下文自动传递

你: 嗯，执行吧
```

**区别：**

| 对比项 | 没有 Skill-Combo | 有了 Skill-Combo |
|--------|------------------|------------------|
| 记 skill | 自己记 103 个 | 自动扫描，不用记 |
| 组合 skill | 手动一个个指定 | 自动推荐最佳 combo |
| 上下文传递 | 每次重复说一遍 | 上一个输出自动给下一个 |
| 并行执行 | 不可能，只能一个一个等 | 安全审计 + 性能检查同时跑 |
| 验证能不能用 | 跑完才知道会不会炸 | `--dry-run` 先看计划 |
| 依赖处理 | 不知道谁该先跑 | 自动拓扑排序 |
| 失败恢复 | 挂了从头来 | 自动重试临时性错误 |
| 一次任务对话次数 | 5-8 轮 | 1-2 轮 |

---

## 它能干什么

### 自动发现

扫描 `~/.config/opencode/skills/` 和 `~/.agents/skills/`，找到你机器上所有已安装的 skill。不用自己记了。

### 四种组合模式

| 模式 | 干嘛的 | 举个例子 |
|------|--------|----------|
| **串行**（chain） | 一个接一个，上一个的输出给下一个 | 调研 → 写作 → 润色 |
| **并行**（parallel） | 几个同时跑，结果汇总 | 安全审计 + 性能检查 + 测试覆盖 |
| **包裹**（wrap） | 头尾包住中间 | 初始化环境 → 跑技能 → 清理收尾 |
| **条件**（conditional） | 根据条件选分支 | 生产环境走部署，开发环境走测试 |

### 每次会话自动启用

像 caveman 一样，不用手动加载。当它检测到你描述的任务涉及多个 skill 时，自动推荐或执行最佳 combo。

### 技术细节

| 能力 | 说明 |
|------|------|
| 增量扫描 | 只扫新增/修改的 skill，有 fallback 兜底 |
| 依赖排序 | 自动识别 skill 间依赖，拓扑排序执行 |
| 循环检测 | 发现循环依赖立即报错，不死循环 |
| 上下文传递 | 串行时上一个 skill 的输出自动成为下一个的输入 |
| 上下文截断 | 超 100KB 自动截断，防 token 爆炸 |
| 错误恢复 | 可配置重试次数，只重试临时性错误 |
| 超时继承 | combo 级超时自动分配到每个 step |
| 缓存去重 | 带 TTL 的缓存，避免重复执行 |
| 持久化 | `--save` 保存扫描结果，下次直接用 |
| 双模式 | CLI 模拟 + OpenCode 插件真实执行 |

---

## 快速上手

```bash
# 安装
npm install && npm run build

# 扫描当前环境装了哪些 skill（不用自己记了）
node dist/cli.js scan --save

# 看看已知的 combo 组合
node dist/cli.js combos --validate

# 先模拟跑一遍，看看会不会翻车
node dist/cli.js run frontend-dev --dry-run

# 真正开跑
node dist/cli.js run frontend-dev
```

---

## CLI 命令

| 命令 | 干嘛的 |
|------|--------|
| `scan [--save]` | 扫描所有 skill，建立索引 |
| `list` | 列出已发现的 skill |
| `combos [--validate]` | 列出所有 combo，顺便验证能不能跑 |
| `run <name> [--dry-run]` | 执行一个 combo |

带 `--dry-run` 先看看执行计划再决定要不要真跑，这个很重要。

---

## 预设的 10 个 Combo

| 名字 | 类型 | 怎么串的 |
|------|------|---------|
| `frontend-dev` | chain | frontend-design → ts-react-nextjs |
| `frontend-vue` | chain | frontend-design → ts-vue-svelte |
| `api-first` | chain | api-rest-design → python-patterns → testing-strategies |
| `deploy-pipeline` | chain | testing-strategies → docker-patterns → kubernetes-patterns |
| `code-review-partial` | parallel | performance-optimization + testing-strategies |
| `skill-audit` | parallel | skill-creator + skill-judge |
| `docs-pipeline` | chain | code-docs → project-docs |
| `git-workflow` | chain | git-commit → git-release |
| `content-creation` | chain | content-research-writer → humanizer |
| `research-report` | chain | content-research-writer → humanizer |

你 103 个 skill，组合空间远不止这 10 个。上面只是开箱即用的，自己写 YAML 可以组合出任何你想要的工作流。

---

## 基于 103 个 Skill 可以组合的更多例子

| 场景 | 组合 | 类型 |
|------|------|------|
| 全栈开发 | frontend-design → ts-react-nextjs → testing-strategies → docker-patterns → kubernetes-patterns | chain |
| 安全审计 | security-auditor + security-best-practices + clawdefender | parallel |
| 技术写作 | content-research-writer → humanizer → seo-content-writer | chain |
| 项目从零开始 | architecture-designer → api-rest-design → python-patterns → code-docs → project-docs | chain |
| Skill 质量把关 | skill-vetter → skill-creator → skill-judge | chain |
| 代码重构 | refactoring-safely → testing-strategies → performance-optimization | chain |
| A股投研 | a-stock-analysis → backtest-expert → humanizer | chain |
| 飞书自动化 | feishu-chat-history → content-research-writer → feishu-send-file | chain |
| 学术研究 | aminer-data-search → research-paper-writer → humanizer | chain |
| 视频制作 | short-video-production → ffmpeg-video-editor → video-marketing | chain |

---

## 架构

```
┌─────────────────────────────────────────────┐
│              Skill-Combo                     │
├─────────────────────────────────────────────┤
│  Scanner   │  Registry  │  Engine           │
│  - 发现    │  - 存储     │  - 串行执行       │
│  - 索引    │  - 查询     │  - 并行执行       │
│  - 回退    │  - 持久化   │  - 重试           │
├─────────────────────────────────────────────┤
│  Planner   │  CLI        │  Cache/TTL        │
│  - 排序    │  - scan     │  - 去重           │
│  - 优化    │  - run      │  - 过期           │
└─────────────────────────────────────────────┘
```

---

## 安装

```bash
# 复制到 OpenCode skills 目录
cp -r skill-combo ~/.config/opencode/skills/

# 或者做个符号链接
ln -s $(pwd)/skill-combo ~/.config/opencode/skills/skill-combo

# Windows
mklink /D %USERPROFILE%\.config\opencode\skills\skill-combo E:\AI_field\skill-combo
```

---

## 自己做 Combo

写个 YAML 文件扔到 `combos/examples/` 下面：

```yaml
name: my-combo
type: chain
execution: serial
skills:
  - frontend-design
  - ts-react-nextjs
```

支持的类型：

- **chain**: 一个接一个跑，上一个的输出给下一个
- **parallel**: 几个一起跑，结果汇总
- **wrap**: 头尾包住中间（适合做初始化和清理）
- **conditional**: 根据条件选分支

---

## 诚实声明

独立 CLI 模式下是**模拟执行**——会明确告诉你"OpenCode runtime not detected, using mock"。只有在 OpenCode 运行时环境中作为插件加载，才会真正调用 `skill()` 工具执行。

不忽悠人。

---

## 质量指标

| 指标 | 数值 |
|------|------|
| 测试 | 209 个，12 个套件，全部通过 |
| 沙箱验证 | 3 条独立测试线，52 项检查，0 失败 |
| Oracle 架构评审 | 85/100 |
| Subagent 可理解性 | 95/100 |
| 发现的 skill | 103 个 |
| 预设 combo | 10 个（全部验证通过） |
| 自动启用 | 每次会话自动加载 |

---

## 开发

```bash
npm install
npm run build
npm test
```

---

## License

MIT