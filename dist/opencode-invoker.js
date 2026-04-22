"use strict";
// OpenCode Skill Invoker - Real implementation for skill execution
// This invoker integrates with OpenCode runtime to execute real skills
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenCodeInvoker = void 0;
exports.createOpenCodeInvoker = createOpenCodeInvoker;
const cli_1 = require("./cli");
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
class OpenCodeInvoker {
    constructor(config) {
        this.skillTool = config.skillTool;
        this.timeout = config.timeout ?? 300000;
    }
    /**
     * Invoke a skill by ID with given context
     * Uses OpenCode's skill() tool to execute the skill
     */
    async invoke(skillId, context) {
        const startTime = Date.now();
        let timeoutId;
        try {
            // Execute skill via OpenCode's skill tool with timeout
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error(`Skill invocation timed out after ${this.timeout}ms`));
                }, this.timeout);
            });
            let result;
            try {
                result = await Promise.race([
                    this.skillTool({
                        name: skillId,
                        user_message: context,
                    }),
                    timeoutPromise,
                ]);
            }
            finally {
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
        }
        catch (error) {
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
    async isAvailable(skillId) {
        // For now, assume all skills are available if they exist in the registry
        // A real implementation might check with OpenCode's skill registry
        return skillId.length > 0 && /^[a-zA-Z0-9-_]+$/.test(skillId);
    }
    /**
     * Estimate token usage when not provided by skill
     * This is a rough heuristic based on input/output size
     */
    estimateTokens(input, output) {
        const inputSize = JSON.stringify(input).length;
        const outputSize = JSON.stringify(output).length;
        // Rough estimate: ~4 characters per token
        return Math.round((inputSize + outputSize) / 4);
    }
}
exports.OpenCodeInvoker = OpenCodeInvoker;
/**
 * Create an OpenCodeInvoker from global OpenCode context
 * This function should be called when loading the plugin in OpenCode runtime
 *
 * @returns OpenCodeInvoker if running in OpenCode runtime with skill() available,
 *          otherwise returns DefaultInvoker with a warning
 */
function createOpenCodeInvoker() {
    // Access OpenCode's global skill tool
    // In OpenCode runtime, skill() is available globally
    const skillTool = globalThis.skill;
    if (skillTool) {
        return new OpenCodeInvoker({
            skillTool,
            sessionId: globalThis.session?.id || 'default',
            timeout: 300000,
        });
    }
    // Fallback: not in OpenCode runtime
    console.warn('[skill-combo] Warning: OpenCode runtime not detected. Using DefaultInvoker (mock execution). ' +
        'To use real skill execution, load skill-combo as an OpenCode plugin.');
    return new cli_1.DefaultInvoker();
}
//# sourceMappingURL=opencode-invoker.js.map