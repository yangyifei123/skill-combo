# Skill-Combo Round 3 Plan

## 目标
基于用户优化要求，实现4个P0优化：
- 用户体验(帮助系统)、安全性(超时细化)、性能优化(结果去重、增量扫描)

## Task 1: 帮助系统增强 (P0)

### 文件
- `src/cli.ts`

### 修改
1. 添加子命令帮助支持
2. `skill-combo help scan` 显示scan详细帮助
3. `skill-combo help run` 显示run详细帮助
4. `skill-combo help list` 显示list详细帮助
5. `skill-combo help combos` 显示combos详细帮助

### 成功标准
- `skill-combo help scan` 显示详细帮助
- `skill-combo help run` 显示详细帮助
- 无参数help显示所有命令列表

### 验证
```bash
skill-combo help scan
skill-combo help run
skill-combo help
```

## Task 2: 超时细化 (P0)

### 文件
- `src/types.ts` - 扩展Combo/ExecutionStep
- `src/engine.ts` - 实现per-skill超时

### 修改
1. Combo类型添加timeout字段
2. ExecutionStep添加timeout字段
3. executeSerial读取per-step timeout
4. 使用Promise.race实现超时中断

### 成功标准
- per-skill timeout生效
- 超时skill被中断并报错
- 全局timeout仍然有效

### 验证
```bash
# 测试超时skill
skill-combo run slow-combo
```

## Task 3: 结果去重 (P0)

### 文件
- `src/cache.ts` - 新增Cache接口
- `src/engine.ts` - 集成去重逻辑

### 修改
1. 添加Cache接口
2. MemoryCache实现
3. FileCache实现(可选)
4. Engine.executeSerial集成去重检查
5. 基于 skill_id + inputs 的hash去重

### 成功标准
- 相同skill+inputs不重复执行
- 缓存命中返回缓存结果
- 缓存未命中执行并存储结果

### 验证
```bash
# 相同combo执行两次，第二次应跳过
skill-combo run my-combo
skill-combo run my-combo  # 应显示cache hit
```

## Task 4: 增量扫描 (P0)

### 文件
- `src/scanner.ts` - 添加增量扫描
- `src/cache.ts` - 共享TimestampStore

### 修改
1. 添加lastScanTimestamp跟踪
2. 持久化timestamp到文件
3. 只扫描mtime > lastScanTimestamp的文件
4. 首次扫描全量，后续增量

### 成功标准
- 首次扫描全量
- 后续扫描只处理新/修改文件
- timestamp正确持久化

### 验证
```bash
# 第一次全量扫描
skill-combo scan
# 添加新skill后第二次扫描
skill-combo scan  # 只扫描新文件
```

## 依赖关系
All 4 tasks are independent and can be parallelized.

## 执行顺序
并行实施，4个deep agents同时工作

## 测试策略
- TDD: 先写测试再实现
- 现有120测试必须保持通过
- 新增测试覆盖新功能