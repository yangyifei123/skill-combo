// Wave Scheduler - dependency-ordered wave execution for subagents

import type {
  SubagentStep,
  ExecutionWave,
  SkillContext,
  SubagentOutput,
  SubagentCombo,
  SubagentExecutionPlan,
} from './types';

/**
 * WaveScheduler - orchestrates SubagentStep execution into dependency-ordered waves
 *
 * Wave logic:
 * - Wave 0: steps with empty depends_on (no dependencies)
 * - Wave N: steps whose dependencies are ALL satisfied by waves < N
 */
export class WaveScheduler {
  /**
   * Validate that there are no circular dependencies in the steps
   * Uses DFS with visiting/visited sets to detect cycles
   * @throws Error if circular dependency is detected
   */
  validateDependencies(steps: SubagentStep[]): boolean {
    const stepMap = new Map<string, SubagentStep>();
    for (const step of steps) {
      stepMap.set(step.name, step);
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();

    const dfs = (stepName: string): void => {
      if (visiting.has(stepName)) {
        throw new Error(`Circular dependency detected: ${stepName}`);
      }
      if (visited.has(stepName)) {
        return;
      }

      visiting.add(stepName);

      const step = stepMap.get(stepName);
      if (step) {
        for (const dep of step.depends_on) {
          if (stepMap.has(dep)) {
            dfs(dep);
          }
        }
      }

      visiting.delete(stepName);
      visited.add(stepName);
    };

    for (const step of steps) {
      if (!visited.has(step.name)) {
        dfs(step.name);
      }
    }

    return true;
  }

  /**
   * Group steps into waves based on their dependencies
   * Steps with empty depends_on go to Wave 0
   * Steps depending only on completed waves go to subsequent waves
   */
  buildWaves(steps: SubagentStep[]): ExecutionWave[] {
    // Validate first - will throw on circular deps
    this.validateDependencies(steps);

    const stepMap = new Map<string, SubagentStep>();
    const stepWave = new Map<string, number>();

    for (const step of steps) {
      stepMap.set(step.name, step);
    }

    // Calculate wave number for each step
    const calculateWave = (step: SubagentStep): number => {
      if (stepWave.has(step.name)) {
        return stepWave.get(step.name)!;
      }

      if (step.depends_on.length === 0) {
        stepWave.set(step.name, 0);
        return 0;
      }

      let maxDepWave = 0;
      for (const depName of step.depends_on) {
        const depStep = stepMap.get(depName);
        if (depStep) {
          const depWave = calculateWave(depStep);
          maxDepWave = Math.max(maxDepWave, depWave + 1);
        }
      }

      stepWave.set(step.name, maxDepWave);
      return maxDepWave;
    };

    // Calculate wave for each step
    for (const step of steps) {
      calculateWave(step);
    }

    // Group steps by wave number
    const waveMap = new Map<number, SubagentStep[]>();
    for (const step of steps) {
      const waveNum = stepWave.get(step.name) ?? 0;
      if (!waveMap.has(waveNum)) {
        waveMap.set(waveNum, []);
      }
      waveMap.get(waveNum)!.push(step);
    }

    // Convert to ExecutionWave array, sorted by wave number
    const waves: ExecutionWave[] = [];
    const sortedWaveNums = Array.from(waveMap.keys()).sort((a, b) => a - b);

    for (const waveNum of sortedWaveNums) {
      waves.push({
        wave_number: waveNum,
        steps: waveMap.get(waveNum) ?? [],
      });
    }

    return waves;
  }

  /**
   * Create a full SubagentExecutionPlan from a SubagentCombo
   * Validates dependencies, builds waves, sets defaults
   */
  schedule(combo: SubagentCombo): SubagentExecutionPlan {
    const waves = this.buildWaves(combo.subagent_steps);
    return {
      combo,
      waves,
      aggregation: combo.subagent_aggregation ?? 'structured',
      error_strategy: combo.subagent_error_strategy ?? 'continue',
    };
  }

  /**
    * Propagate context from previous step outputs to the next step
   * Includes outputs from steps listed in context_from
   */
  propagateContext(
    previousOutputs: Record<string, SubagentOutput>,
    nextStep: SubagentStep
  ): SkillContext {
    const context: SkillContext = {};

    // Include outputs from steps specified in context_from
    const stepsToInclude = new Set<string>(nextStep.context_from ?? []);

    // Build context from collected steps
    for (const stepName of stepsToInclude) {
      const output = previousOutputs[stepName];
      if (output) {
        context[`${stepName}.output`] = output.result;
        context[`${stepName}.success`] = output.success;
        context[`${stepName}.error`] = output.error;
        context[`${stepName}.tokens_used`] = output.tokens_used;
        context[`${stepName}.duration_ms`] = output.duration_ms;
      }
    }

    return context;
  }
}