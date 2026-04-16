# Skill-Combo Round 2 Plan

## 目标
P0优先级优化：执行追踪、调试模式

## Task 1: 执行追踪 (P0)

### 文件
- `src/engine.ts`

### 修改
1. 扩展`ComboResult`添加`steps`数组
2. 在`executeSerial`中记录每个step的start_time/end_time/duration
3. 扩展`StepResult`添加timing字段

### 成功标准
- CLI执行后能获取每个step的duration
- JSON输出包含steps数组

### 验证
```bash
npm test  # 现有测试通过
# 手动验证JSON输出包含timing
```

## Task 2: 调试模式 (P0)

### 文件
- `src/cli.ts`

### 修改
1. 添加`--debug` flag到run命令
2. 添加`DEBUG`环境变量控制
3. 在关键路径添加console.debug日志

### 成功标准
- `combo run --debug` 显示详细执行日志
- 无debug flag时不显示调试信息

### 验证
```bash
combo run research-report --debug  # 显示调试信息
combo run research-report          # 不显示调试信息
```

## Task 3: Token统计 (P1)

### 文件
- `src/engine.ts`
- `src/cli.ts`

### 修改
1. 扩展step结果包含token消耗
2. CLI添加`--verbose`显示统计信息

### 成功标准
- `--verbose`显示每个step的token消耗
- 聚合显示总token消耗

### 验证
```bash
combo run research-report --verbose  # 显示token统计
```

## Task 4: Dry-run模式 (P1)

### 文件
- `src/cli.ts`

### 修改
1. 添加`--dry-run` flag
2. 只调用Planner不调用Engine

### 成功标准
- 不实际执行skill
- 显示执行计划

### 验证
```bash
combo run research-report --dry-run  # 显示计划，不执行
```

## 依赖关系

```
Task 1 (执行追踪)
    ├──→ Task 2 (调试模式) [可并行]
    ├──→ Task 3 (Token统计) [依赖Task 1的steps结构]
    └──→ Task 4 (Dry-run) [可并行]
```

## 执行顺序

1. Task 1 (执行追踪)
2. Task 2, 4 (可并行)
3. Task 3 (依赖Task 1)

## 测试策略

- TDD: 先写测试，再实现
- 现有114测试必须保持通过
- 新增测试覆盖新功能