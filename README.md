# Skill-Combo

**版本**: 1.0.0
**类型**: OpenCode 插件
**描述**: 把多个 skill 串成连招来用，像格斗游戏的 combo 一样。支持串行、并行、包裹、条件执行。

---

## 先说人话

我是个普通程序员，不是啥布道师。写这个是因为被 skill 生态搞麻了。

103 个 skill 摆在面前，谁记得住哪个干嘛的？装了一堆文档又烂的 skill，用都不知道怎么用。找着了单个跑起来还行，但单个 skill 能做的事太有限了。

真正有用的，是把几个 skill 串起来打出 combo 效果。但自己手动串太麻烦了，而且不知道串完到底能不能用。

所以我写了这个，至少让自己不用每次都靠运气。

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

## 开发

```bash
npm install
npm run build
npm test
```

---

## License

MIT