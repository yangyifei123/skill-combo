"use strict";
// Skill-Combo Core Types
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotImplementedError = exports.CONTEXT_KEYS = void 0;
/**
 * Context key convention for skill data flow
 * Format: {skillId}.output.{field}
 *
 * Example:
 * - skill A outputs: { code: "...", errors: [] }
 * - Accessed as: context['skill-a'].output.code
 *
 * For chain combos, step N's outputs become part of context
 * before step N+1 executes
 */
exports.CONTEXT_KEYS = {
    outputPrefix: (skillId) => `${skillId}.output`,
    inputPrefix: (skillId) => `${skillId}.input`,
    errorPrefix: (skillId) => `${skillId}.error`,
};
/**
 * NotImplementedError - thrown when a deferred feature is called
 */
class NotImplementedError extends Error {
    constructor(feature, reason) {
        super(`[DEFERRED] ${feature}: ${reason}`);
        this.name = 'NotImplementedError';
    }
}
exports.NotImplementedError = NotImplementedError;
//# sourceMappingURL=types.js.map