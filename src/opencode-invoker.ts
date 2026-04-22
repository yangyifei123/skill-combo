// OpenCode Skill Invoker - Real implementation for skill execution
// This invoker integrates with OpenCode runtime to execute real skills

import {
  SkillContext,
  SkillInvoker,
  SkillOutput,
} from './types';
import { DefaultInvoker } from './cli';

/**
 * OpenCodeInvoker - Real skill invoker that uses OpenCode runtime
 *
 * This invoker integrates with OpenCode to execute skills via the task() function.
 * When loaded by OpenCode as a plugin, the runtime provides access to skill execution.
 *
 * Usage:
 * ```typescript
 * // In OpenCode runtime context:
 * const invoker = new OpenCodeInvoker({
 *   skillTool: globalThis.skill, // OpenCode's skill() function
 *   sessionId: session.id,
 *   timeout: 300000
 * });
 * ```
 */
export class OpenCodeInvoker implements SkillInvoker {
  private skillTool: (args: { name: string; user_message?: string }) => Promise<any>;
  private timeout: number;

  constructor(config: {
    /** OpenCode's skill() tool function */
    skillTool: (args: { name: string; user_message?: string }) => Promise<any>;
    /** OpenCode session ID for context sharing (unused but available for future) */
    sessionId?: string;
    /** Timeout per skill in ms (default: 5 min) */
    timeout?: number;
  }) {
    this.skillTool = config.skillTool;
    this.timeout = config.timeout ?? 300000;
  }

  /**
   * Invoke a skill by ID with given context
   * Uses OpenCode's skill() tool to execute the skill
   */
  async invoke(skillId: string, context: SkillContext): Promise<SkillOutput> {
    const startTime = Date.now();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      // Execute skill via OpenCode's skill tool with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Skill invocation timed out after ${this.timeout}ms`));
        }, this.timeout);
      });

      let result: any;
      try {
        result = await Promise.race([
          this.skillTool({
            name: skillId,
            user_message: context as any,
          }),
          timeoutPromise,
        ]);
      } finally {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
      }

      const duration = Date.now() - startTime;

      // Parse skill output
      // Skills typically return { result, success, ... } or just the raw result
      if (result && typeof result === 'object') {
        return {
          skill_id: skillId,
          success: result.success !== false,
          result: result.result ?? result,
          error: result.error,
          tokens_used: result.tokens_used ?? this.estimateTokens(context, result),
          duration_ms: result.duration_ms ?? duration,
        };
      }

      // Raw result case
      return {
        skill_id: skillId,
        success: true,
        result,
        tokens_used: this.estimateTokens(context, result),
        duration_ms: duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        skill_id: skillId,
        success: false,
        result: null,
        error: errorMessage,
        tokens_used: 0,
        duration_ms: duration,
      };
    }
  }

  /**
   * Check if a skill is available
   * In OpenCode, all discovered skills are available
   * This could ping the skill registry to verify
   */
  async isAvailable(skillId: string): Promise<boolean> {
    // For now, assume all skills are available if they exist in the registry
    // A real implementation might check with OpenCode's skill registry
    return skillId.length > 0 && /^[a-zA-Z0-9-_]+$/.test(skillId);
  }

  /**
   * Estimate token usage when not provided by skill
   * This is a rough heuristic based on input/output size
   */
  private estimateTokens(input: any, output: any): number {
    const inputSize = JSON.stringify(input).length;
    const outputSize = JSON.stringify(output).length;
    // Rough estimate: ~4 characters per token
    return Math.round((inputSize + outputSize) / 4);
  }
}

/**
 * Create an OpenCodeInvoker from global OpenCode context
 * This function should be called when loading the plugin in OpenCode runtime
 *
 * @returns OpenCodeInvoker if running in OpenCode runtime with skill() available,
 *          otherwise returns DefaultInvoker with a warning
 */
export function createOpenCodeInvoker(): SkillInvoker {
  // Access OpenCode's global skill tool
  // In OpenCode runtime, skill() is available globally
  const skillTool = (globalThis as any).skill;

  if (skillTool) {
    return new OpenCodeInvoker({
      skillTool,
      sessionId: (globalThis as any).session?.id || 'default',
      timeout: 300000,
    });
  }

  // Fallback: not in OpenCode runtime
  console.warn(
    '[skill-combo] Warning: OpenCode runtime not detected. Using DefaultInvoker (mock execution). ' +
    'To use real skill execution, load skill-combo as an OpenCode plugin.'
  );
  return new DefaultInvoker();
}
