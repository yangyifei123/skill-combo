# Skill-Combo

**版本**: 3.0.0
**类型**: OpenCode 插件（每次会话自动启用）
**描述**: 把多个 skill 串成连招来用，像格斗游戏的 combo 一样。支持串行、并行、包裹、条件执行、Subagent 组合、会话知识提取、ClawHub 远程发现。

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
| `scan [--save] [--remote]` | 扫描本地 skill，`--remote` 从 ClawHub 发现远程 skill |
| `list [--source=all|local|remote]` | 列出已发现的 skill，支持按来源筛选 |
| `search <query>` | 在本地和远程 skill 中搜索匹配项 |
| `combos [--validate]` | 列出所有 combo，顺便验证能不能跑 |
| `run <name> [--dry-run]` | 执行一个 combo |
| `extract [options]` | 从历史会话中提取模式，自动生成 SKILL.md |

带 `--dry-run` 先看看执行计划再决定要不要真跑，这个很重要。

### extract 命令详解

从 OpenCode 历史会话中挖掘重复模式，自动生成可复用的 SKILL.md 文件。

```bash
# 基本用法：提取最近的会话模式
node dist/cli.js extract

# 只提取高分模式（worthiness >= 70）
node dist/cli.js extract --min-score 70

# 最多生成 5 个 skill
node dist/cli.js extract --max 5

# 指定输出目录
node dist/cli.js extract --output-dir ./my-skills

# JSON 格式输出
node dist/cli.js extract --json
```

**工作原理：**
1. 从 OpenCode 获取最近 20 个会话
2. 用 n-gram 算法（n=2~4）提取行为序列
3. 按频率打分，评估模式的通用性、复杂度、可靠性
4. 生成标准格式的 SKILL.md 文件（含 YAML frontmatter）

---

## 预设的 12 个 Combo

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
| `subagent-fullstack` | subagent | research → design → implement → test → docs |
| `subagent-security-audit` | subagent | vuln-scan ‖ auth-check ‖ dependency-audit → report |

你 103 个 skill，组合空间远不止这 12 个。上面只是开箱即用的，自己写 YAML 可以组合出任何你想要的工作流。

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

## Subagent 组合

Subagent 组合是 Skill-Combo 的进阶功能，让你用单个 AI agent 实现团队效果。

### 是什么

每个 step 启动一个 subagent，通过 `task()` 加载 1 个或多个 skill 执行任务。多个 step 按依赖关系组成执行波次（waves），同波次内的 step 并行执行。

### 解决了什么问题

| 问题 | 传统方式 | Subagent 方式 |
|------|---------|--------------|
| 多人协作场景 | 需要协调多个 AI agent | 单 agent 分工，自动协作 |
| 技能组合 | 一个 task 只能用一种 skill | 一个 step 加载多个 skill |
| 依赖管理 | 手动控制执行顺序 | 自动拓扑排序 + wave 执行 |
| 上下文传递 | 手动拼接 prompt | `context_from` 自动注入 |
| 错误处理 | 失败即终止 | `fail-fast` / `continue` / `partial` 三种策略 |

### 核心概念

#### WaveScheduler（波次调度器）

```
Wave 0: 无依赖的 step（如 research）→ 并行执行
Wave 1: 依赖 Wave 0 完成的 step（如 design）→ 并行执行
Wave 2: 依赖 Wave 1 完成的 step（如 implement）→ 并行执行
...
```

#### TaskInvoker（任务调用器）

Subagent 通过 OpenCode 的 `task()` 函数启动，加载指定 skill：

```typescript
interface TaskInvoker {
  // 启动 subagent，加载 skills，执行 prompt
  spawn(
    load_skills: string[],  // 要加载的 skill 列表
    prompt: string,          // 任务描述
    context: SkillContext,   // 上下文（来自依赖 step 的输出）
    options?: TaskSpawnOptions
  ): Promise<SubagentOutput>;
  
  // 检查 task() 运行时是否可用
  isAvailable(): Promise<boolean>;
}
```

#### YAML 定义结构

```yaml
combos:
  - name: subagent-fullstack
    type: subagent           # 必须是 subagent 类型
    execution: serial        # wave 间串行，wave 内并行
    subagent_steps:
      - name: research       # step 名称，唯一标识
        skills:              # 加载哪些 skill
          - context7
        prompt: "Research best practices..."
        depends_on: []       # 依赖哪些 step（空=无依赖，Wave 0）

      - name: design
        skills:
          - architecture-designer
          - api-rest-design
        prompt: "Design the system..."
        depends_on:
          - research         # 依赖 research，必须等其完成后执行
        context_from:
          - research         # 将 research 的输出注入 context

    subagent_aggregation: structured  # 结果聚合方式
    subagent_error_strategy: continue # 错误处理策略
    timeout: 600000           # combo 级超时（ms）
```

### 执行流程

```
1. SubagentOrchestrator.execute(combo, invoker)
   ↓
2. WaveScheduler.schedule(combo) → 生成执行计划
   ├── Wave 0: [research]                    # 无依赖，并行
   ├── Wave 1: [design]                      # 依赖 research
   ├── Wave 2: [implement]                  # 依赖 design
   ├── Wave 3: [test]                        # 依赖 implement
   └── Wave 4: [docs]                        # 依赖 test
   ↓
3. 遍历每个 Wave：
   ├── 收集依赖 step 的输出 → 构建 context
   ├── Promise.all(wave.steps.map(spawnStep))  # 波次内并行
   └── 聚合结果 → 下一个 Wave
   ↓
4. 返回 ComboResult { outputs, errors, tokens_used, duration_ms }
```

### 完整示例

`combos/examples/subagent-fullstack.yaml`:

```yaml
combos:
  - name: subagent-fullstack
    description: "Full-stack dev: research → design → implement → test → docs"
    type: subagent
    execution: serial
    skills: []  # subagent combos use subagent_steps, not skills
    subagent_steps:
      - name: research
        skills:
          - context7
        prompt: "Research best practices and patterns for the requested feature"
        depends_on: []

      - name: design
        skills:
          - architecture-designer
          - api-rest-design
        prompt: "Design the system architecture and API based on research findings"
        depends_on:
          - research
        context_from:
          - research

      - name: implement
        skills:
          - python-patterns
          - ts-react-nextjs
        prompt: "Implement the feature based on the design output"
        depends_on:
          - design
        context_from:
          - design

      - name: test
        skills:
          - testing-strategies
          - security-auditor
        prompt: "Write tests and run security audit on the implementation"
        depends_on:
          - implement
        context_from:
          - implement

      - name: docs
        skills:
          - code-docs
          - project-docs
        prompt: "Generate code documentation and project documentation"
        depends_on:
          - test
        context_from:
          - test

    subagent_aggregation: structured
    subagent_error_strategy: continue
    timeout: 600000
```

### CLI 命令

```bash
# 扫描并保存 skill 列表
node dist/cli.js scan --save

# 查看所有 combo（包括 subagent combos）
node dist/cli.js combos

# 验证 combo 能否执行
node dist/cli.js combos --validate

# 干跑看计划（不实际执行）
node dist/cli.js run subagent-fullstack --dry-run

# 真正执行 subagent combo
node dist/cli.js run subagent-fullstack

# 带详细输出
node dist/cli.js run subagent-fullstack --verbose
```

### 预设的 Subagent Combo

| 名字 | 干嘛的 |
|------|--------|
| `subagent-fullstack` | 完整开发流程：调研 → 设计 → 实现 → 测试 → 文档 |
| `subagent-security-audit` | 并行安全审计：漏洞扫描 + 认证检查 + 依赖审计 → 汇总报告 |

---

## 架构

```
┌─────────────────────────────────────────────┐
│              Skill-Combo v3.0                │
├─────────────────────────────────────────────┤
│  Scanner   │  Registry  │  Engine           │
│  - 发现    │  - 存储     │  - 串行执行       │
│  - 索引    │  - 查询     │  - 并行执行       │
│  - 回退    │  - 持久化   │  - 重试           │
├─────────────────────────────────────────────┤
│  Planner   │  CLI        │  Cache/TTL        │
│  - 排序    │  - scan     │  - 去重           │
│  - 优化    │  - run      │  - 过期           │
├─────────────────────────────────────────────┤
│  SubagentOrchestrator │  WaveScheduler      │
│  - task() 调用        │  - 波次生成         │
│  - skill 组合        │  - 依赖解析         │
│  - 错误处理          │  - 并行调度         │
├─────────────────────────────────────────────┤
│  SessionProvider  │  PatternMiner          │
│  - 会话列表        │  - n-gram 挖掘        │
│  - 会话读取        │  - 频率统计           │
│  - JSONL 回退      │  - worthiness 打分    │
├─────────────────────────────────────────────┤
│  SkillGenerator                            │
│  - SKILL.md 生成     │  - YAML frontmatter  │
├─────────────────────────────────────────────┤
│  ClawHubClient       │  RemoteScanner       │
│  - API 调用          │  - 远程 skill 发现   │
│  - 搜索/列表         │  - 结果合并          │
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
- **subagent**: Subagent 组合，用 task() 启动 subagent

---

## 诚实声明

独立 CLI 模式下是**模拟执行**——会明确告诉你"OpenCode runtime not detected, using mock"。只有在 OpenCode 运行时环境中作为插件加载，才会真正调用 `skill()` 工具执行。

不忽悠人。

---

## 质量指标

| 指标 | 数值 |
|------|------|
| 测试 | 310 个，全部通过 |
| Oracle 架构评审 | 95/100（subagent）, 72/100（session） |
| Subagent 可理解性 | 95/100 |
| 发现的 skill | 103 个（本地） + ClawHub 远程发现 |
| 预设 combo | 12 个（10 基础 + 2 subagent） |
| 自动启用 | 每次会话自动加载 |
| 版本 | 3.0.0 |

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