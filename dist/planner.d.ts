import { Combo, ExecutionPlan, IPlanner, Skill } from './types';
/**
 * Planner creates execution plans from combos
 * MVP supports simple chain/serial planning only
 */
export declare class Planner implements IPlanner {
    constructor();
    /**
     * Create an execution plan from a combo
     * For MVP, this creates simple linear steps for serial execution
     */
    plan(combo: Combo, _skills: Skill[]): ExecutionPlan;
    /**
     * Suggest best combo for a task description
     * @deprecated Not implemented - requires NLP task analysis
     */
    suggest(_taskDescription: string, _skills: Skill[]): Combo[];
    /**
     * Map combo type to appropriate aggregation strategy
     */
    private getAggregationForComboType;
}
//# sourceMappingURL=planner.d.ts.map