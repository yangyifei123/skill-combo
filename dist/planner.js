"use strict";
// Combo Planner - Converts combos to execution plans
// MVP: Simple linear planning for serial execution
Object.defineProperty(exports, "__esModule", { value: true });
exports.Planner = void 0;
/**
 * Planner creates execution plans from combos
 * MVP supports simple chain/serial planning only
 */
class Planner {
    constructor() { }
    /**
     * Create an execution plan from a combo
     * For MVP, this creates simple linear steps for serial execution
     */
    plan(combo, _skills) {
        const steps = [];
        // Create a step for each skill in the combo
        combo.skills.forEach((skillId, index) => {
            const step = {
                step: index,
                skill_id: skillId,
                // For serial execution, each step depends on all previous steps
                depends_on: index > 0 ? [index - 1] : [],
                inputs: {}, // Inputs would be populated from combo schema or user
            };
            steps.push(step);
        });
        // Determine aggregation strategy from combo type
        // For MVP, default to 'merge'
        const aggregation = this.getAggregationForComboType(combo.type);
        return {
            combo,
            steps,
            aggregation,
        };
    }
    /**
     * Suggest best combo for a task description
     * @deprecated Not implemented - requires NLP task analysis
     * @returns Empty array - NLP integration required for implementation
     */
    suggest(_taskDescription, _skills) {
        // Not implemented - requires NLP task analysis to match user intent to combos
        // Return empty array until this is implemented
        return [];
    }
    /**
     * Map combo type to appropriate aggregation strategy
     */
    getAggregationForComboType(type) {
        switch (type) {
            case 'parallel':
                return 'merge'; // Parallel outputs merged
            case 'chain':
                return 'merge'; // Chain outputs flow to next
            case 'wrap':
                return 'merge'; // Wrapper aggregates inner
            case 'conditional':
                return 'merge'; // Conditional branches merged
            default:
                return 'merge';
        }
    }
}
exports.Planner = Planner;
//# sourceMappingURL=planner.js.map