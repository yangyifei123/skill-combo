"use strict";
// Combo Engine - Skill orchestration execution
// MVP: Serial execution only, other modes stubbed
Object.defineProperty(exports, "__esModule", { value: true });
exports.Engine = void 0;
const types_1 = require("./types");
const cache_1 = require("./cache");
/**
 * Engine implements IEngine for skill combo orchestration
 * MVP supports serial execution only
 */
class Engine {
    constructor(config = {}) {
        this.config = {
            maxContextSize: config.maxContextSize ?? 100 * 1024, // 100KB default
            maxSteps: config.maxSteps ?? 100,
            skillTimeout: config.skillTimeout ?? 300000, // 5 min default
            maxRetries: config.maxRetries ?? 0, // no retry by default
            retryDelayMs: config.retryDelayMs ?? 1000, // 1s default delay
        };
        this.cache = config.cache;
        // Validate config early
        if (config.maxContextSize !== undefined && config.maxContextSize <= 0) {
            throw new Error('maxContextSize must be positive');
        }
        if (config.maxSteps !== undefined && config.maxSteps <= 0) {
            throw new Error('maxSteps must be positive');
        }
        if (config.maxRetries !== undefined && config.maxRetries < 0) {
            throw new Error('maxRetries must be non-negative');
        }
        if (config.retryDelayMs !== undefined && config.retryDelayMs <= 0) {
            throw new Error('retryDelayMs must be positive');
        }
    }
    /**
     * Main entry point - dispatch to appropriate execution method
     */
    async execute(combo, plan, invoker) {
        // Handle combo types that have special execution semantics
        switch (combo.type) {
            case 'wrap': {
                // Wrap combo: wrapper → [sub-steps] → wrapper
                const wrapperSkillId = combo.skills[0];
                const subSteps = plan.steps.filter(s => s.skill_id !== wrapperSkillId);
                return this.executeWrap(wrapperSkillId, subSteps, invoker);
            }
            case 'conditional': {
                // Conditional combo: evaluate condition and select branch
                if (!combo.condition || !combo.branches) {
                    throw new Error('Conditional combo requires condition and branches');
                }
                const trueBranch = plan.steps.filter(s => combo.branches.true.includes(s.skill_id));
                const falseBranch = plan.steps.filter(s => combo.branches.false.includes(s.skill_id));
                return this.executeConditional(combo.condition, trueBranch, falseBranch, invoker);
            }
            case 'chain':
            case 'parallel': {
                // Standard execution modes
                switch (combo.execution) {
                    case 'serial':
                        return this.executeSerial(combo, plan.steps, invoker, {});
                    case 'parallel':
                        return this.executeParallel(plan.steps, invoker, plan.aggregation);
                    case 'interleaved':
                        // Deferred - requires yield protocol
                        return this.executeInterleaved(plan.steps, invoker);
                    default:
                        throw new Error(`Unknown execution mode: ${combo.execution}`);
                }
            }
            default:
                throw new Error(`Unknown combo type: ${combo.type}`);
        }
    }
    /**
     * Execute skills serially - each step waits for previous to complete
     * This is the MVP implementation for chain combos
     */
    async executeSerial(combo, steps, invoker, initialContext = {}) {
        const outputs = { ...initialContext };
        const errors = [];
        let totalTokens = 0;
        let totalDuration = 0;
        const stepResults = [];
        // Check max steps limit
        if (steps.length > this.config.maxSteps) {
            return {
                success: false,
                outputs,
                errors: [`Exceeds max steps limit (${steps.length} > ${this.config.maxSteps})`],
                tokens_used: 0,
                duration_ms: 0,
                aggregation: 'merge',
                steps: [],
            };
        }
        // Sort steps by execution order (they should already be ordered)
        const sortedSteps = [...steps].sort((a, b) => a.step - b.step);
        for (const step of sortedSteps) {
            // Check if skill is available
            const isAvailable = await invoker.isAvailable(step.skill_id);
            if (!isAvailable) {
                errors.push(`Skill not available: ${step.skill_id}`);
                return {
                    success: false,
                    outputs,
                    errors,
                    tokens_used: totalTokens,
                    duration_ms: totalDuration,
                    aggregation: 'merge',
                    steps: stepResults,
                };
            }
            // Build context for this step from previous outputs
            const context = this.buildContext(step, outputs);
            // Compute cache key for deduplication (based on skill_id + step inputs)
            const cacheKey = (0, cache_1.computeCacheKey)(step.skill_id, step.inputs || {});
            // Check cache for existing result
            let output;
            if (this.cache) {
                const cached = await this.cache.get(cacheKey);
                if (cached !== undefined) {
                    output = cached;
                }
            }
            // Record step start time
            const stepStartTime = Date.now();
            let stepOutput = undefined;
            let stepError = undefined;
            let stepTokensUsed = 0;
            let retryCount = 0; // Track retries for step result
            // Execute the skill if not cached
            if (!output) {
                // Determine timeout: step-level override > combo-level default > engine config
                const timeout = step.timeout ?? combo.timeout ?? this.config.skillTimeout;
                let lastError;
                // Retry loop for transient failures
                while (retryCount <= this.config.maxRetries) {
                    try {
                        // Fix: Cleanup timeout timer to prevent timer leaks
                        let timeoutId;
                        const timeoutPromise = new Promise((_, reject) => {
                            timeoutId = setTimeout(() => reject(new Error(`Skill ${step.skill_id} timed out after ${timeout}ms`)), timeout);
                        });
                        try {
                            output = await Promise.race([
                                invoker.invoke(step.skill_id, context),
                                timeoutPromise
                            ]);
                        }
                        finally {
                            if (timeoutId !== undefined) {
                                clearTimeout(timeoutId);
                            }
                        }
                        // Store result in cache for future deduplication
                        if (this.cache && output) {
                            await this.cache.set(cacheKey, output);
                        }
                        // Success - exit retry loop
                        break;
                    }
                    catch (err) {
                        const errorMsg = err instanceof Error ? err.message : String(err);
                        lastError = `Execution error for ${step.skill_id}: ${errorMsg}`;
                        // Check if we should retry
                        if (retryCount < this.config.maxRetries && this.isRetryableError(lastError)) {
                            retryCount++;
                            // Wait before retry (except on last attempt)
                            if (retryCount <= this.config.maxRetries) {
                                await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
                                continue;
                            }
                        }
                        // No more retries or non-retryable error - record failure
                        stepError = lastError;
                        errors.push(stepError);
                        const stepEndTime = Date.now();
                        stepResults.push({
                            step_id: step.skill_id,
                            skill_id: step.skill_id,
                            success: false,
                            timing: {
                                start_time: stepStartTime,
                                end_time: stepEndTime,
                                duration_ms: stepEndTime - stepStartTime,
                            },
                            tokens_used: stepTokensUsed,
                            output: undefined,
                            error: stepError,
                            retry_count: retryCount,
                        });
                        return {
                            success: false,
                            outputs,
                            errors,
                            tokens_used: totalTokens,
                            duration_ms: totalDuration,
                            aggregation: 'merge',
                            steps: stepResults,
                        };
                    }
                }
            }
            // Process output (both cached and fresh)
            if (output) {
                totalTokens += output.tokens_used;
                totalDuration += output.duration_ms;
                stepTokensUsed = output.tokens_used;
                if (output.success) {
                    outputs[step.skill_id] = output.result;
                    stepOutput = output.result;
                }
                else {
                    stepError = output.error || `Skill failed: ${step.skill_id}`;
                    errors.push(stepError);
                    // In serial mode, stop on first error
                    const stepEndTime = Date.now();
                    stepResults.push({
                        step_id: step.skill_id,
                        skill_id: step.skill_id,
                        success: false,
                        timing: {
                            start_time: stepStartTime,
                            end_time: stepEndTime,
                            duration_ms: stepEndTime - stepStartTime,
                        },
                        tokens_used: stepTokensUsed,
                        output: undefined,
                        error: stepError,
                        retry_count: retryCount,
                    });
                    return {
                        success: false,
                        outputs,
                        errors,
                        tokens_used: totalTokens,
                        duration_ms: totalDuration,
                        aggregation: 'merge',
                        steps: stepResults,
                    };
                }
            }
            // Record successful step result
            const stepEndTime = Date.now();
            stepResults.push({
                step_id: step.skill_id,
                skill_id: step.skill_id,
                success: true,
                timing: {
                    start_time: stepStartTime,
                    end_time: stepEndTime,
                    duration_ms: stepEndTime - stepStartTime,
                },
                tokens_used: stepTokensUsed,
                output: stepOutput,
                error: undefined,
                retry_count: 0,
            });
        }
        return {
            success: true,
            outputs,
            errors,
            tokens_used: totalTokens,
            duration_ms: totalDuration,
            aggregation: 'merge',
            steps: stepResults,
        };
    }
    /**
     * Execute skills in parallel - all steps start simultaneously
     * Results aggregated at end according to aggregation strategy
     */
    async executeParallel(steps, invoker, aggregation) {
        const errors = [];
        let totalTokens = 0;
        let totalDuration = 0;
        const outputs = {};
        const stepResults = [];
        // Check max steps limit
        if (steps.length > this.config.maxSteps) {
            return {
                success: false,
                outputs,
                errors: [`Exceeds max steps limit (${steps.length} > ${this.config.maxSteps})`],
                tokens_used: 0,
                duration_ms: 0,
                aggregation,
            };
        }
        // Check availability for all skills first
        const availabilityChecks = await Promise.all(steps.map(step => invoker.isAvailable(step.skill_id)));
        const unavailableSkills = steps.filter((_, i) => !availabilityChecks[i]).map(s => s.skill_id);
        if (unavailableSkills.length > 0) {
            return {
                success: false,
                outputs,
                errors: [`Skills not available: ${unavailableSkills.join(', ')}`],
                tokens_used: 0,
                duration_ms: 0,
                aggregation,
            };
        }
        // Execute all skills in parallel with per-step timing
        const parallelStartTime = Date.now();
        // For parallel, each skill gets its own context (from step inputs)
        // In a true parallel execution, skills don't share context until aggregation
        const results = await Promise.all(steps.map(step => this.invokeWithRetry(step.skill_id, step.inputs || {}, invoker, step.timeout ?? this.config.skillTimeout)));
        const parallelEndTime = Date.now();
        // Collect results and build step results with timing
        const skillOutputs = [];
        for (let i = 0; i < results.length; i++) {
            const { output, retryCount } = results[i];
            const step = steps[i];
            totalTokens += output.tokens_used;
            // Calculate per-step timing (parallelStartTime is shared, duration from output)
            const stepStartTime = parallelStartTime;
            const stepEndTime = parallelStartTime + output.duration_ms;
            if (output.success) {
                skillOutputs.push(output);
                stepResults.push({
                    step_id: step.skill_id,
                    skill_id: step.skill_id,
                    success: true,
                    timing: {
                        start_time: stepStartTime,
                        end_time: stepEndTime,
                        duration_ms: output.duration_ms,
                    },
                    tokens_used: output.tokens_used,
                    output: output.result,
                    error: undefined,
                    retry_count: retryCount,
                });
            }
            else {
                errors.push(output.error || `Skill ${output.skill_id} failed`);
                stepResults.push({
                    step_id: step.skill_id,
                    skill_id: step.skill_id,
                    success: false,
                    timing: {
                        start_time: stepStartTime,
                        end_time: stepEndTime,
                        duration_ms: output.duration_ms,
                    },
                    tokens_used: output.tokens_used,
                    output: undefined,
                    error: output.error || `Skill ${step.skill_id} failed`,
                    retry_count: retryCount,
                });
            }
        }
        // Aggregate outputs
        const { result: aggregatedResult, errors: aggErrors } = this.aggregateOutputs(skillOutputs, aggregation);
        errors.push(...aggErrors);
        totalDuration = parallelEndTime - parallelStartTime;
        return {
            success: errors.length === 0,
            outputs: aggregatedResult,
            errors,
            tokens_used: totalTokens,
            duration_ms: totalDuration,
            aggregation,
            steps: stepResults,
        };
    }
    /**
     * Execute a wrap combo: wrapper → [sub-steps] → wrapper
     * The wrapper skill runs at start (setup), then sub-steps run, then wrapper runs at end (teardown)
     */
    async executeWrap(wrapperSkillId, subSteps, invoker) {
        const outputs = {};
        const errors = [];
        let totalTokens = 0;
        let totalDuration = 0;
        const startTime = Date.now();
        // Phase 1: Execute wrapper (setup)
        const wrapperAvailable = await invoker.isAvailable(wrapperSkillId);
        if (!wrapperAvailable) {
            return {
                success: false,
                outputs,
                errors: [`Wrapper skill not available: ${wrapperSkillId}`],
                tokens_used: 0,
                duration_ms: 0,
                aggregation: 'merge',
            };
        }
        let wrapperResult = await invoker.invoke(wrapperSkillId, { phase: 'setup', ...outputs });
        totalTokens += wrapperResult.tokens_used;
        totalDuration += wrapperResult.duration_ms;
        if (!wrapperResult.success) {
            errors.push(wrapperResult.error || 'Wrapper setup failed');
            return {
                success: false,
                outputs,
                errors,
                tokens_used: totalTokens,
                duration_ms: totalDuration,
                aggregation: 'merge',
            };
        }
        outputs[wrapperSkillId] = wrapperResult.result;
        // Phase 2: Execute sub-steps serially
        // Fix: Remap depends_on to internal indices since wrapper steps are filtered out
        if (subSteps.length > 0) {
            const remappedSteps = subSteps.map((step, idx) => ({
                ...step,
                step: idx,
                depends_on: [], // Sub-steps execute sequentially; wrapper dependencies are resolved by the setup phase
            }));
            const subResult = await this.executeSerial({}, remappedSteps, invoker, outputs);
            totalTokens += subResult.tokens_used;
            totalDuration += subResult.duration_ms;
            if (!subResult.success) {
                errors.push(...subResult.errors);
            }
            // Merge sub-step outputs
            Object.assign(outputs, subResult.outputs);
        }
        // Phase 3: Execute wrapper again (teardown)
        wrapperResult = await invoker.invoke(wrapperSkillId, { phase: 'teardown', ...outputs });
        totalTokens += wrapperResult.tokens_used;
        totalDuration += wrapperResult.duration_ms;
        if (!wrapperResult.success) {
            errors.push(wrapperResult.error || 'Wrapper teardown failed');
        }
        outputs[wrapperSkillId] = wrapperResult.result;
        const totalTime = Date.now() - startTime;
        return {
            success: errors.length === 0,
            outputs,
            errors,
            tokens_used: totalTokens,
            duration_ms: totalTime,
            aggregation: 'merge',
        };
    }
    /**
     * Execute skills with control alternation at yield points
     * DEFERRED - requires yield protocol definition
     */
    async executeInterleaved(_steps, _invoker) {
        throw new types_1.NotImplementedError('executeInterleaved', 'Interleaved execution requires yield protocol for control flow alternation');
    }
    /**
       * Execute a conditional combo - select branch based on condition evaluation
       * Branch is selected based on condition result (true/false)
       * Supports: env, ctx, skill-output conditions
       *
       * Note: skill-output conditions require context from previously executed steps.
       * In a standalone conditional combo (not part of a larger chain), only 'env' and
       * 'ctx' conditions are useful since no prior steps have produced outputs yet.
       * For skill-output conditions to work, use conditional within a serial combo
       * where prior steps have already populated the context with their outputs.
       */
    async executeConditional(condition, trueBranch, falseBranch, invoker, initialContext = {}) {
        const startTime = Date.now();
        // Evaluate condition with initial context
        const conditionResult = await this.evaluateCondition(condition, initialContext);
        // Select branch
        const selectedBranch = conditionResult ? trueBranch : falseBranch;
        if (selectedBranch.length === 0) {
            return {
                success: true,
                outputs: {},
                errors: [],
                tokens_used: 0,
                duration_ms: Date.now() - startTime,
                aggregation: 'merge',
            };
        }
        // Execute selected branch serially
        const result = await this.executeSerial({}, selectedBranch, invoker, initialContext);
        result.duration_ms = Date.now() - startTime;
        return result;
    }
    /**
     * Evaluate a condition and return boolean result
     * Supports env (environment variables) and ctx (context) types
     * Does NOT support js-expression (requires security model)
     */
    async evaluateCondition(condition, context) {
        switch (condition.type) {
            case 'env': {
                // Check environment variable: env:VAR_NAME=value
                const match = condition.expression.match(/^([^=]+)(?:=(.*))?$/);
                if (!match)
                    return false;
                const [, varName, expectedValue] = match;
                const actualValue = process.env[varName];
                if (expectedValue === undefined) {
                    // Just check if exists
                    return actualValue !== undefined;
                }
                return actualValue === expectedValue;
            }
            case 'ctx': {
                // Check context value: ctx:key.path=value
                const ctxMatch = condition.expression.match(/^(.+?)(?:=(.*))?$/);
                if (!ctxMatch)
                    return false;
                const [, keyPath, expectedValue] = ctxMatch;
                const keys = keyPath.split('.');
                let value = context;
                for (const key of keys) {
                    if (value === undefined || value === null)
                        return false;
                    value = value[key];
                }
                if (expectedValue === undefined) {
                    return value !== undefined && value !== null;
                }
                return String(value) === expectedValue;
            }
            case 'skill-output': {
                // Check if skill output exists and matches: skill-output:skillId.field=value
                const soMatch = condition.expression.match(/^(.+?)\.(.+?)(?:=(.*))?$/);
                if (!soMatch)
                    return false;
                const [, skillId, field, expectedValue] = soMatch;
                const skillOutput = context[`${skillId}.output`];
                if (!skillOutput)
                    return false;
                const fieldValue = skillOutput[field];
                if (expectedValue === undefined) {
                    return fieldValue !== undefined;
                }
                return String(fieldValue) === expectedValue;
            }
            case 'js-expression':
            default:
                throw new types_1.NotImplementedError('evaluateCondition', `Condition type "${condition.type}" requires security model for safe JS evaluation`);
        }
    }
    /**
     * Determine if an error is transient and retryable
     * Non-retryable: skill not found, skill not available, validation errors
     * Retryable: timeouts, network errors, temporary failures
     */
    isRetryableError(error) {
        const nonRetryablePatterns = [
            'not available',
            'not found',
            'does not exist',
            'invalid',
            'unauthorized',
            'permission denied',
            'validation failed',
        ];
        const lowerError = error.toLowerCase();
        return !nonRetryablePatterns.some(pattern => lowerError.includes(pattern));
    }
    /**
     * Invoke a skill with retry logic for transient failures
     * Returns { output, retryCount } where retryCount is total attempts - 1
     */
    async invokeWithRetry(skillId, context, invoker, timeout) {
        let retryCount = 0;
        let lastError;
        while (retryCount <= this.config.maxRetries) {
            let timeoutId;
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error(`Skill ${skillId} timed out after ${timeout}ms`)), timeout);
            });
            try {
                const output = await Promise.race([
                    invoker.invoke(skillId, context),
                    timeoutPromise
                ]);
                return { output, retryCount };
            }
            catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                lastError = `Execution error for ${skillId}: ${errorMsg}`;
                if (retryCount < this.config.maxRetries && this.isRetryableError(lastError)) {
                    retryCount++;
                    await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
                    continue;
                }
                // No more retries or non-retryable error - return failure output
                return {
                    output: {
                        skill_id: skillId,
                        success: false,
                        result: undefined,
                        error: lastError,
                        tokens_used: 0,
                        duration_ms: 0,
                    },
                    retryCount,
                };
            }
            finally {
                if (timeoutId !== undefined) {
                    clearTimeout(timeoutId);
                }
            }
        }
        // Should not reach here, but safety return
        return {
            output: {
                skill_id: skillId,
                success: false,
                result: undefined,
                error: lastError,
                tokens_used: 0,
                duration_ms: 0,
            },
            retryCount,
        };
    }
    /**
     * Build execution context for a step from previous outputs
     * Follows CONTEXT_KEYS convention: {skillId}.output.{field}
     * Enforces maxContextSize limit by truncating oldest entries if needed
     */
    buildContext(step, outputs) {
        const context = {};
        // Collect entries in order (first added = oldest)
        const entries = [];
        // Add outputs from all previous steps to context
        // Each skill's output is added with its skill_id prefix
        for (const [skillId, output] of Object.entries(outputs)) {
            entries.push({ key: `${skillId}.output`, value: output });
        }
        // Add step inputs
        if (step.inputs) {
            entries.push({ key: 'step.inputs', value: step.inputs });
        }
        // Build context and check size
        for (const entry of entries) {
            context[entry.key] = entry.value;
        }
        // Check context size and truncate if needed - compute size once
        let contextSize = JSON.stringify(context).length;
        if (contextSize > this.config.maxContextSize) {
            // Warn about truncation
            console.warn(`Engine: Context size ${contextSize} exceeds limit ${this.config.maxContextSize}. ` +
                `Truncating ${entries.length} entries to fit.`);
            // Rebuild context with oldest entries truncated first
            // (first entries in the list are the oldest skill outputs)
            const skillOutputEntries = entries.filter(e => e.key.endsWith('.output'));
            const otherEntries = entries.filter(e => !e.key.endsWith('.output'));
            // Clear context and rebuild
            const newContext = {};
            // First add non-skill-output entries (step.inputs, etc.)
            for (const entry of otherEntries) {
                newContext[entry.key] = entry.value;
            }
            // Then add skill outputs in reverse order (newest first) until we fit
            const reversedSkillEntries = [...skillOutputEntries].reverse();
            for (const entry of reversedSkillEntries) {
                newContext[entry.key] = entry.value;
                // Check size once after building - not inside loop
                const newSize = JSON.stringify(newContext).length;
                if (newSize > this.config.maxContextSize) {
                    // Too big even with just this one, remove it
                    delete newContext[entry.key];
                    break;
                }
                contextSize = newSize;
            }
            return newContext;
        }
        return context;
    }
    /**
     * Aggregate outputs from parallel execution
     * Handles different ResultAggregation strategies
     */
    aggregateOutputs(outputs, aggregation) {
        const result = {};
        const errors = [];
        const conflicts = [];
        switch (aggregation) {
            case 'merge':
                // Deep merge all outputs
                for (const output of outputs) {
                    if (output.success && output.result) {
                        Object.assign(result, output.result);
                    }
                    else if (output.error) {
                        errors.push(output.error);
                    }
                }
                break;
            case 'override':
                // Later outputs override earlier ones
                for (const output of outputs) {
                    if (output.success && output.result) {
                        Object.assign(result, output.result);
                    }
                    else if (output.error) {
                        errors.push(output.error);
                    }
                }
                break;
            case 'fail-on-conflict':
                // Error if keys overlap
                for (const output of outputs) {
                    if (output.success && output.result) {
                        for (const key of Object.keys(output.result)) {
                            if (result[key] !== undefined) {
                                conflicts.push(key);
                            }
                            result[key] = output.result[key];
                        }
                    }
                    else if (output.error) {
                        errors.push(output.error);
                    }
                }
                if (conflicts.length > 0) {
                    errors.push(`Key conflicts detected: ${conflicts.join(', ')}`);
                }
                break;
            case 'first-win':
                // First non-null value wins
                for (const output of outputs) {
                    if (output.success && output.result) {
                        for (const [key, value] of Object.entries(output.result)) {
                            if (result[key] === undefined && value !== null) {
                                result[key] = value;
                            }
                        }
                    }
                    else if (output.error) {
                        errors.push(output.error);
                    }
                }
                break;
            default:
                errors.push(`Unknown aggregation strategy: ${aggregation}`);
        }
        return { result, errors };
    }
}
exports.Engine = Engine;
//# sourceMappingURL=engine.js.map