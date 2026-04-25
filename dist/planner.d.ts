import { Combo, ExecutionPlan, IPlanner, Skill, SubagentCombo, SubagentExecutionPlan } from './types';
/**
 * Planner creates execution plans from combos
 * Respects skill load_skills dependencies via topological sort
 */
export declare class Planner implements IPlanner {
    constructor();
    /**
     * Create a subagent execution plan from a SubagentCombo
     * Uses WaveScheduler to build dependency-ordered waves
     */
    planSubagent(combo: SubagentCombo): SubagentExecutionPlan;
    /**
      * Create an execution plan from a combo
     * Uses topological sort to respect load_skills dependencies
     */
    plan(combo: Combo, skills: Skill[]): ExecutionPlan;
    /**
     * Create a linear execution plan (fallback when no skill metadata available)
     */
    private createLinearPlan;
    /**
     * Detect circular dependencies using DFS
     * Returns the cycle path if found, null otherwise
     */
    private findCycle;
    /**
     * Topological sort using Kahn's algorithm with combo order as tiebreaker
     */
    private topologicalSort;
    /**
     * Suggest best combo for a task description
     * @deprecated Not implemented - requires NLP task analysis
     * @returns Empty array - NLP integration required for implementation
     */
    suggest(_taskDescription: string, _skills: Skill[]): Combo[];
    /**
     * Map combo type to appropriate aggregation strategy
     */
    private getAggregationForComboType;
    /**
     * Distribute combo timeout to steps based on execution mode and combo type
     */
    private distributeTimeoutToSteps;
}
//# sourceMappingURL=planner.d.ts.map