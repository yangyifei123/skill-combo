// Subagent Orchestrator - Wave-based subagent execution

import {
  SubagentCombo,
  SubagentStep,
  SubagentOutput,
  TaskInvoker,
  ComboResult,
  SkillContext,
  SubagentExecutionPlan,
  ErrorHandlingDecision,
  SubagentAggregation,
  SubagentErrorStrategy,
  ExecutionWave,
  WaveResult,
  TaskSpawnOptions,
  StepResult,
} from './types';
import { WaveScheduler } from './wave-scheduler';

/**
 * SubagentConfig - Configuration for SubagentOrchestrator
 */
export interface SubagentConfig {
  /** Maximum context size in characters (default: 100KB) */
  maxContextSize?: number;
  /** Default timeout per step in ms (default: 300000ms = 5 min) */
  defaultTimeout?: number;
  /** Maximum retry attempts for transient failures (default: 0 = no retry) */
  maxRetries?: number;
  /** Delay between retries in ms (default: 1000ms) */
  retryDelayMs?: number;
  /** Default task category for spawned subagents (default: 'quick') */
  defaultCategory?: string;
}

/**
 * SubagentOrchestrator orchestrates subagent execution in waves
 * 
 * Follows Engine.ts patterns:
 * - Retry loop for transient failures
 * - Timeout handling with Promise.race
 * - Context propagation between steps
 * - Wave-based parallel execution via WaveScheduler
 */
export class SubagentOrchestrator {
  private config: Required<Omit<SubagentConfig, 'defaultCategory'>> & { defaultCategory: string };
  private waveScheduler: WaveScheduler;

  constructor(config: SubagentConfig = {}) {
    this.config = {
      maxContextSize: config.maxContextSize ?? 100 * 1024, // 100KB default
      defaultTimeout: config.defaultTimeout ?? 300000, // 5 min default
      maxRetries: config.maxRetries ?? 0, // no retry by default
      retryDelayMs: config.retryDelayMs ?? 1000, // 1s default delay
      defaultCategory: config.defaultCategory ?? 'quick',
    };
    this.waveScheduler = new WaveScheduler();
  }

  /**
   * Execute a subagent combo - entry point
   * Uses WaveScheduler to create execution waves, then executes wave by wave
   */
  async execute(combo: SubagentCombo, invoker: TaskInvoker): Promise<ComboResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let totalTokens = 0;
    const allOutputs: Record<string, SubagentOutput> = {};
    const stepResults: StepResult[] = [];

    // Check if task runtime is available
    const isAvailable = await invoker.isAvailable();
    if (!isAvailable) {
      return {
        success: false,
        outputs: {},
        errors: ['Task runtime not available'],
        tokens_used: 0,
        duration_ms: Date.now() - startTime,
        aggregation: 'merge',
        steps: [],
      };
    }

// Create execution plan with waves via WaveScheduler
    const plan: SubagentExecutionPlan = this.waveScheduler.schedule(combo);
    const errorStrategy = plan.error_strategy;
    const aggregation = plan.aggregation;

    // Track per-wave start times for accurate timing
    const stepTimings = new Map<string, { start_time: number; end_time: number }>();

    // Execute wave by wave
    for (const wave of plan.waves) {
      const waveStartTime = Date.now();
      const waveResult = await this.executeWave(wave, allOutputs, invoker);
      
      // Collect outputs from this wave
      for (const output of waveResult.outputs) {
        allOutputs[output.step_name] = output;
        totalTokens += output.tokens_used;
        
        // Calculate per-step timing from SubagentOutput.duration_ms
        const stepEndTime = waveStartTime + output.duration_ms;
        stepTimings.set(output.step_name, {
          start_time: waveStartTime,
          end_time: stepEndTime,
        });
        
        stepResults.push({
          step_id: output.step_name,
          skill_id: output.skills_loaded.join(','),
          success: output.success,
          timing: {
            start_time: waveStartTime,
            end_time: stepEndTime,
            duration_ms: output.duration_ms,
          },
          tokens_used: output.tokens_used,
          output: output.result,
          error: output.error,
          retry_count: 0,
        });
      }

      // Collect errors from this wave
      errors.push(...waveResult.errors);

      // Handle wave failure based on error strategy
      if (!waveResult.success) {
        if (errorStrategy === 'fail-fast') {
          // Use aggregateResults for proper aggregation strategy
          const aggregated = this.aggregateResults(
            Object.values(allOutputs),
            aggregation
          );
          return {
            ...aggregated,
            duration_ms: Date.now() - startTime,
            aggregation: 'merge' as const,
            steps: stepResults,
          };
        }
        // For 'continue' and 'partial', we continue to next wave
      }
    }

    // Use aggregateResults for final aggregation with strategy from plan
    const finalResult = this.aggregateResults(Object.values(allOutputs), aggregation);
    return {
      ...finalResult,
      duration_ms: Date.now() - startTime,
      aggregation: 'merge' as const,
      steps: stepResults,
    };
  }

  /**
   * Execute a single wave of subagent steps (all parallel)
   */
  private async executeWave(
    wave: ExecutionWave,
    previousOutputs: Record<string, SubagentOutput>,
    invoker: TaskInvoker,
  ): Promise<WaveResult> {
    const waveErrors: string[] = [];
    const outputs: SubagentOutput[] = [];

    // Build context for each step from previous wave outputs
    const stepContexts = new Map<string, SkillContext>();
    for (const step of wave.steps) {
      stepContexts.set(step.name, this.buildStepContext(step, previousOutputs));
    }

    // Execute all steps in parallel
    const stepNames = wave.steps.map(s => s.name);
    const results = await Promise.all(
      wave.steps.map(step => this.spawnStep(step, stepContexts.get(step.name)!, invoker))
    );

    // Collect results - key by step name from definition, not from invoker output
    for (let i = 0; i < results.length; i++) {
      const output = results[i];
      const stepName = stepNames[i];
      // Override step_name with the actual step name (invoker may return wrong name)
      const namedOutput: SubagentOutput = { ...output, step_name: stepName };
      outputs.push(namedOutput);
      
      if (!output.success && output.error) {
        waveErrors.push(`[${wave.steps[i].name}] ${output.error}`);
      }
    }

    return {
      wave_number: wave.wave_number,
      outputs,
      errors: waveErrors,
      success: waveErrors.length === 0,
    };
  }

  /**
   * Spawn a single subagent step with retry logic and timeout
   * Uses TaskInvoker.spawn() - NOT skill() directly
   */
  async spawnStep(
    step: SubagentStep,
    context: SkillContext,
    invoker: TaskInvoker
  ): Promise<SubagentOutput> {
    const timeout = step.timeout ?? this.config.defaultTimeout;
    let retryCount = 0;
    let lastError: Error | undefined;

    // Retry loop for transient failures
    while (retryCount <= this.config.maxRetries) {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      let timeoutPromise: Promise<never>;

      // Create timeout promise
      timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`Step ${step.name} timed out after ${timeout}ms`)),
          timeout
        );
      });

      try {
        // Prepare spawn options
        const spawnOptions: TaskSpawnOptions = {
          category: this.config.defaultCategory,
          timeout,
          run_in_background: false,
        };

        // Race between step execution and timeout
        const output = await Promise.race([
          invoker.spawn(step.skills, step.prompt, context, spawnOptions),
          timeoutPromise,
        ]);

        // Success - return output
        return output;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if we should retry
        if (retryCount < this.config.maxRetries && this.isRetryableError(lastError)) {
          retryCount++;
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
          continue;
        }

        // No more retries or non-retryable error
        return {
          skill_id: step.skills.join(','),
          success: false,
          result: undefined,
          error: lastError.message,
          tokens_used: 0,
          duration_ms: 0,
          step_name: step.name,
          skills_loaded: step.skills,
        };
      } finally {
        // Cleanup timeout timer
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
      }
    }

    // Should not reach here, but safety return
    return {
      skill_id: step.skills.join(','),
      success: false,
      result: undefined,
      error: lastError?.message ?? 'Unknown error',
      tokens_used: 0,
      duration_ms: 0,
      step_name: step.name,
      skills_loaded: step.skills,
    };
  }

  /**
   * Build context for a step from previous wave outputs
   * Context includes outputs from dependency steps
   */
  buildStepContext(step: SubagentStep, previousOutputs: Record<string, SubagentOutput>): SkillContext {
    const context: SkillContext = {};
    
    // Collect outputs from steps this step depends on
    // Use ${name}.output format to match WaveScheduler.propagateContext convention
    for (const depName of step.depends_on) {
      const depOutput = previousOutputs[depName];
      if (depOutput) {
        context[`${depName}.output`] = depOutput.result;
        context[`${depName}.success`] = depOutput.success;
      }
    }

    // Include additional context from specified steps (context_from)
    if (step.context_from) {
      for (const contextStepName of step.context_from) {
        const contextOutput = previousOutputs[contextStepName];
        if (contextOutput) {
          context[`${contextStepName}.output`] = contextOutput.result;
          context[`${contextStepName}.success`] = contextOutput.success;
        }
      }
    }

    // Check context size and truncate if needed
    let contextSize = JSON.stringify(context).length;
    if (contextSize > this.config.maxContextSize) {
      console.warn(
        `SubagentOrchestrator: Context size ${contextSize} exceeds limit ${this.config.maxContextSize}. Truncating.`
      );
      
      // Truncate by removing newest entries (last in the object)
      // Keep oldest (foundational) context, drop newest to fit
      const entries = Object.entries(context);
      const newContext: SkillContext = {};
      
      for (let i = 0; i < entries.length; i++) {
        const [key, value] = entries[i];
        newContext[key] = value;
        contextSize = JSON.stringify(newContext).length;
        
        if (contextSize > this.config.maxContextSize) {
          // Remove this newest entry and stop
          delete newContext[key];
          break;
        }
      }
      
      return newContext;
    }

    return context;
  }

  /**
   * Aggregate results from all subagent steps based on aggregation strategy
   */
  aggregateResults(outputs: SubagentOutput[], strategy: SubagentAggregation): ComboResult {
    const result: Record<string, any> = {};
    const errors: string[] = [];
    let totalTokens = 0;
    let totalDuration = 0;

    for (const output of outputs) {
      totalTokens += output.tokens_used;
      totalDuration += output.duration_ms;

      if (!output.success) {
        errors.push(output.error ?? `Step ${output.step_name} failed`);
        continue;
      }

      switch (strategy) {
        case 'structured':
          // Key by step name for structured output
          result[output.step_name] = {
            result: output.result,
            skills_loaded: output.skills_loaded,
            success: output.success,
          };
          break;

        case 'last-win':
          // Later outputs override earlier ones
          Object.assign(result, output.result ?? {});
          break;

        case 'merge':
          // Merge all outputs, keyed by step name to prevent overwrite
          if (output.step_name) {
            result[output.step_name] = output.result;
          } else {
            Object.assign(result, output.result ?? {});
          }
          break;
      }
    }

    return {
      success: errors.length === 0,
      outputs: result,
      errors,
      tokens_used: totalTokens,
      duration_ms: totalDuration,
      aggregation: 'merge',
    };
  }

  /**
   * Handle error based on error strategy
   * Returns decision on how to proceed with the failed step
   */
  handleError(
    error: Error,
    step: SubagentStep,
    strategy: SubagentErrorStrategy
  ): ErrorHandlingDecision {
    const retryable = this.isRetryableError(error);
    const retryCount = step.retry_count ?? 0;

    switch (strategy) {
      case 'fail-fast':
        return { action: 'abort', reason: error.message };

      case 'continue':
        if (retryable && retryCount < this.config.maxRetries) {
          return { action: 'retry', delay: this.config.retryDelayMs };
        }
        return { action: 'continue', skip: true };

      case 'partial':
        if (retryable && retryCount < this.config.maxRetries) {
          return { action: 'retry', delay: this.config.retryDelayMs };
        }
        return { action: 'continue', skip: false };

      default:
        return { action: 'abort', reason: `Unknown error strategy: ${strategy}` };
    }
  }

  /**
   * Determine if an error is transient and retryable
   */
  private isRetryableError(error: Error): boolean {
    const nonRetryablePatterns = [
      'not available',
      'not found',
      'does not exist',
      'invalid',
      'unauthorized',
      'permission denied',
      'validation failed',
      // Note: 'timeout' is REMOVED - timeouts are transient and should be retried
    ];
    const lowerError = error.message.toLowerCase();
    return !nonRetryablePatterns.some(pattern => lowerError.includes(pattern));
  }
}
