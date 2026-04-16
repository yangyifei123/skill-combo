// Combo Engine - Skill orchestration execution
// MVP: Serial execution only, other modes stubbed

import {
  Combo,
  ComboResult,
  EngineConfig,
  ExecutionPlan,
  ExecutionStep,
  IEngine,
  NotImplementedError,
  ResultAggregation,
  SkillContext,
  SkillInvoker,
  SkillOutput,
} from './types';

/**
 * Engine implements IEngine for skill combo orchestration
 * MVP supports serial execution only
 */
export class Engine implements IEngine {
  private config: Required<EngineConfig>;

  constructor(config: EngineConfig = {}) {
    this.config = {
      maxContextSize: config.maxContextSize ?? 1024 * 1024, // 1MB default
      maxSteps: config.maxSteps ?? 100,
      skillTimeout: config.skillTimeout ?? 300000, // 5 min default
    };
    // Validate config early
    if (config.maxContextSize !== undefined && config.maxContextSize <= 0) {
      throw new Error('maxContextSize must be positive');
    }
    if (config.maxSteps !== undefined && config.maxSteps <= 0) {
      throw new Error('maxSteps must be positive');
    }
  }

  /**
   * Main entry point - dispatch to appropriate execution method
   */
  async execute(
    combo: Combo,
    plan: ExecutionPlan,
    invoker: SkillInvoker
  ): Promise<ComboResult> {
    switch (combo.execution) {
      case 'serial':
        return this.executeSerial(plan.steps, invoker);
      case 'parallel':
        // Deferred to future iteration
        return this.executeParallel(plan.steps, invoker, plan.aggregation);
      case 'interleaved':
        // Deferred - requires yield protocol
        return this.executeInterleaved(plan.steps, invoker);
      default:
        throw new Error(`Unknown execution mode: ${combo.execution}`);
    }
  }

  /**
   * Execute skills serially - each step waits for previous to complete
   * This is the MVP implementation for chain combos
   */
  async executeSerial(
    steps: ExecutionStep[],
    invoker: SkillInvoker
  ): Promise<ComboResult> {
    const outputs: Record<string, any> = {};
    const errors: string[] = [];
    let totalTokens = 0;
    let totalDuration = 0;

    // Check max steps limit
    if (steps.length > this.config.maxSteps) {
      return {
        success: false,
        outputs,
        errors: [`Exceeds max steps limit (${steps.length} > ${this.config.maxSteps})`],
        tokens_used: 0,
        duration_ms: 0,
        aggregation: 'merge',
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
        };
      }

      // Build context for this step from previous outputs
      const context = this.buildContext(step, outputs);

      // Execute the skill
      try {
        const output = await invoker.invoke(step.skill_id, context);
        totalTokens += output.tokens_used;
        totalDuration += output.duration_ms;

        if (output.success) {
          outputs[step.skill_id] = output.result;
        } else {
          errors.push(output.error || `Skill failed: ${step.skill_id}`);
          // In serial mode, stop on first error
          return {
            success: false,
            outputs,
            errors,
            tokens_used: totalTokens,
            duration_ms: totalDuration,
            aggregation: 'merge',
          };
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`Execution error for ${step.skill_id}: ${errorMsg}`);
        return {
          success: false,
          outputs,
          errors,
          tokens_used: totalTokens,
          duration_ms: totalDuration,
          aggregation: 'merge',
        };
      }
    }

    return {
      success: true,
      outputs,
      errors,
      tokens_used: totalTokens,
      duration_ms: totalDuration,
      aggregation: 'merge',
    };
  }

  /**
   * Execute skills in parallel - all steps start simultaneously
   * Results aggregated at end according to aggregation strategy
   */
  async executeParallel(
    steps: ExecutionStep[],
    invoker: SkillInvoker,
    aggregation: ResultAggregation
  ): Promise<ComboResult> {
    const errors: string[] = [];
    let totalTokens = 0;
    let totalDuration = 0;
    const outputs: Record<string, any> = {};

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
    const availabilityChecks = await Promise.all(
      steps.map(step => invoker.isAvailable(step.skill_id))
    );

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

    // Execute all skills in parallel
    const startTime = Date.now();
    const results = await Promise.all(
      steps.map(step => invoker.invoke(step.skill_id, {}))
    );
    const endTime = Date.now();

    // Collect results
    const skillOutputs: SkillOutput[] = [];
    for (const output of results) {
      totalTokens += output.tokens_used;
      if (output.success) {
        skillOutputs.push(output);
      } else {
        errors.push(output.error || `Skill ${output.skill_id} failed`);
      }
    }

    // Aggregate outputs
    const { result: aggregatedResult, errors: aggErrors } = this.aggregateOutputs(skillOutputs, aggregation);
    errors.push(...aggErrors);

    totalDuration = endTime - startTime;

    return {
      success: errors.length === 0,
      outputs: aggregatedResult,
      errors,
      tokens_used: totalTokens,
      duration_ms: totalDuration,
      aggregation,
    };
  }

  /**
   * Execute skills with control alternation at yield points
   * DEFERRED - requires yield protocol definition
   */
  async executeInterleaved(
    _steps: ExecutionStep[],
    _invoker: SkillInvoker
  ): Promise<ComboResult> {
    throw new NotImplementedError(
      'executeInterleaved',
      'Interleaved execution requires yield protocol for control flow alternation'
    );
  }

  /**
   * Evaluate a condition and return boolean result
   * Supports env (environment variables) and ctx (context) types
   * Does NOT support js-expression (requires security model)
   */
  async evaluateCondition(
    condition: { type: string; expression: string },
    context: SkillContext
  ): Promise<boolean> {
    switch (condition.type) {
      case 'env': {
        // Check environment variable: env:VAR_NAME=value
        const match = condition.expression.match(/^([^=]+)(?:=(.*))?$/);
        if (!match) return false;
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
        if (!ctxMatch) return false;
        const [, keyPath, expectedValue] = ctxMatch;
        const keys = keyPath.split('.');
        let value: any = context;
        for (const key of keys) {
          if (value === undefined || value === null) return false;
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
        if (!soMatch) return false;
        const [, skillId, field, expectedValue] = soMatch;
        const skillOutput = context[`${skillId}.output`];
        if (!skillOutput) return false;
        const fieldValue = skillOutput[field];
        if (expectedValue === undefined) {
          return fieldValue !== undefined;
        }
        return String(fieldValue) === expectedValue;
      }

      case 'js-expression':
      default:
        throw new NotImplementedError(
          'evaluateCondition',
          `Condition type "${condition.type}" requires security model for safe JS evaluation`
        );
    }
  }

  /**
   * Build execution context for a step from previous outputs
   * Follows CONTEXT_KEYS convention: {skillId}.output.{field}
   */
  private buildContext(step: ExecutionStep, outputs: Record<string, any>): SkillContext {
    const context: SkillContext = {};

    // Add outputs from all previous steps to context
    // Each skill's output is added with its skill_id prefix
    for (const [skillId, output] of Object.entries(outputs)) {
      context[`${skillId}.output`] = output;
    }

    // Add step inputs
    if (step.inputs) {
      context['step.inputs'] = step.inputs;
    }

    return context;
  }

  /**
   * Aggregate outputs from parallel execution
   * Handles different ResultAggregation strategies
   */
  aggregateOutputs(
    outputs: SkillOutput[],
    aggregation: ResultAggregation
  ): { result: Record<string, any>; errors: string[] } {
    const result: Record<string, any> = {};
    const errors: string[] = [];
    const conflicts: string[] = [];

    switch (aggregation) {
      case 'merge':
        // Deep merge all outputs
        for (const output of outputs) {
          if (output.success && output.result) {
            Object.assign(result, output.result);
          } else if (output.error) {
            errors.push(output.error);
          }
        }
        break;

      case 'override':
        // Later outputs override earlier ones
        for (const output of outputs) {
          if (output.success && output.result) {
            Object.assign(result, output.result);
          } else if (output.error) {
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
          } else if (output.error) {
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
          } else if (output.error) {
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