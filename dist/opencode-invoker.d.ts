import { SkillContext, SkillInvoker, SkillOutput } from './types';
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
export declare class OpenCodeInvoker implements SkillInvoker {
    private skillTool;
    private timeout;
    constructor(config: {
        /** OpenCode's skill() tool function */
        skillTool: (args: {
            name: string;
            user_message?: string;
        }) => Promise<any>;
        /** OpenCode session ID for context sharing (unused but available for future) */
        sessionId?: string;
        /** Timeout per skill in ms (default: 5 min) */
        timeout?: number;
    });
    /**
     * Invoke a skill by ID with given context
     * Uses OpenCode's skill() tool to execute the skill
     */
    invoke(skillId: string, context: SkillContext): Promise<SkillOutput>;
    /**
     * Check if a skill is available
     * In OpenCode, all discovered skills are available
     * This could ping the skill registry to verify
     */
    isAvailable(skillId: string): Promise<boolean>;
    /**
     * Estimate token usage when not provided by skill
     * This is a rough heuristic based on input/output size
     */
    private estimateTokens;
}
/**
 * Create an OpenCodeInvoker from global OpenCode context
 * This function should be called when loading the plugin in OpenCode runtime
 */
export declare function createOpenCodeInvoker(): OpenCodeInvoker;
//# sourceMappingURL=opencode-invoker.d.ts.map