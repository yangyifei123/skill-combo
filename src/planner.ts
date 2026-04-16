// Combo Planner - Converts combos to execution plans
// MVP: Simple linear planning for serial execution

import {
  Combo,
  ExecutionPlan,
  ExecutionStep,
  IPlanner,
  ResultAggregation,
  Skill,
} from './types';

/**
 * Planner creates execution plans from combos
 * MVP supports simple chain/serial planning only
 */
export class Planner implements IPlanner {
  constructor() {}

  /**
   * Create an execution plan from a combo
   * For MVP, this creates simple linear steps for serial execution
   */
  plan(combo: Combo, _skills: Skill[]): ExecutionPlan {
    const steps: ExecutionStep[] = [];

    // Create a step for each skill in the combo
    combo.skills.forEach((skillId, index) => {
      const step: ExecutionStep = {
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
   * DEFERRED to future iteration - requires NLP/analyzer
   */
  suggest(_taskDescription: string, _skills: Skill[]): Combo[] {
    // TODO: Implement combo suggestion based on task analysis
    // For now, return empty array
    return [];
  }

  /**
   * Map combo type to appropriate aggregation strategy
   */
  private getAggregationForComboType(type: string): ResultAggregation {
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