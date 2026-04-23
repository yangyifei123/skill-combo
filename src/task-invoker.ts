// Task Invoker - Spawns subagents via OpenCode task() function

import type { TaskInvoker, SubagentOutput, SkillContext, TaskSpawnOptions } from './types';

type TaskTool = (args: { category?: string; load_skills: string[]; prompt: string; run_in_background?: boolean; }) => Promise<unknown>;

export class OpenCodeTaskInvoker implements TaskInvoker {
  private taskTool: TaskTool;
  private defaultCategory?: string;
  private timeout: number;

  constructor(config: { taskTool: TaskTool; defaultCategory?: string; timeout?: number; }) {
    this.taskTool = config.taskTool;
    this.defaultCategory = config.defaultCategory;
    this.timeout = config.timeout ?? 300000;
  }

  async spawn(load_skills: string[], prompt: string, _context: SkillContext, options?: TaskSpawnOptions): Promise<SubagentOutput> {
    const startTime = Date.now();
    const category = options?.category ?? this.defaultCategory;
    const stepName = options?.category ?? 'task';
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => { reject(new Error('Task invocation timed out after ' + this.timeout + 'ms')); }, this.timeout);
      });

      let result: unknown;
      try {
        result = await Promise.race([
          this.taskTool({ category, load_skills, prompt, run_in_background: false }),
          timeoutPromise,
        ]);
      } finally {
        if (timeoutId !== undefined) { clearTimeout(timeoutId); }
      }

      const duration = Date.now() - startTime;

      if (result === null || result === undefined) {
        return { skill_id: 'task', success: true, result, tokens_used: 0, duration_ms: duration, step_name: stepName, skills_loaded: load_skills };
      }

      if (typeof result === 'string') {
        return { skill_id: 'task', success: true, result: { text: result }, tokens_used: Math.round(result.length / 4), duration_ms: duration, step_name: stepName, skills_loaded: load_skills };
      }

      if (typeof result === 'object') {
        const resultObj = result as Record<string, unknown>;
        return {
          skill_id: (resultObj.skill_id as string) ?? 'task',
          success: resultObj.success !== false,
          result: resultObj.result ?? result,
          error: resultObj.error as string | undefined,
          tokens_used: (resultObj.tokens_used as number) ?? Math.round(JSON.stringify(result).length / 4),
          duration_ms: (resultObj.duration_ms as number) ?? duration,
          step_name: stepName,
          skills_loaded: load_skills,
        };
      }

      return { skill_id: 'task', success: true, result, tokens_used: 0, duration_ms: duration, step_name: stepName, skills_loaded: load_skills };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { skill_id: 'task', success: false, result: null, error: errorMessage, tokens_used: 0, duration_ms: duration, step_name: stepName, skills_loaded: load_skills };
    }
  }

  async isAvailable(): Promise<boolean> { return this.taskTool !== undefined && this.taskTool !== null; }
}

export class MockTaskInvoker implements TaskInvoker {
  private defaultDelay: number;
  constructor(config?: { defaultDelay?: number }) { this.defaultDelay = config?.defaultDelay ?? 100; }

  async spawn(load_skills: string[], prompt: string, _context: SkillContext, _options?: TaskSpawnOptions): Promise<SubagentOutput> {
    const startTime = Date.now();
    await new Promise((resolve) => setTimeout(resolve, this.defaultDelay));
    const duration = Date.now() - startTime;
    return { skill_id: 'mock-task', success: true, result: { mock: true, skills: load_skills, prompt }, tokens_used: 50, duration_ms: duration, step_name: 'mock', skills_loaded: load_skills };
  }

  async isAvailable(): Promise<boolean> { return true; }
}

export function createTaskInvoker(config?: { sessionId?: string; defaultCategory?: string; timeout?: number; }): TaskInvoker {
  const g = globalThis as { task?: TaskTool };
  if (g.task) {
    return new OpenCodeTaskInvoker({
      taskTool: g.task,
      defaultCategory: config?.defaultCategory,
      timeout: config?.timeout ?? 300000,
    });
  }
  console.warn('[task-invoker] Warning: OpenCode task() runtime not detected. Using MockTaskInvoker (mock execution). To use real subagent spawning, run within OpenCode runtime with task() available.');
  return new MockTaskInvoker();
}
