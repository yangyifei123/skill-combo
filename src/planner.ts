// Combo Planner - Converts combos to execution plans
// Supports skill load_skills dependencies with topological sort

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
 * Respects skill load_skills dependencies via topological sort
 */
export class Planner implements IPlanner {
  constructor() {}

  /**
   * Create an execution plan from a combo
   * Uses topological sort to respect load_skills dependencies
   */
  plan(combo: Combo, skills: Skill[]): ExecutionPlan {
    // Build skill lookup map
    const skillsMap = new Map<string, Skill>();
    for (const skill of skills) {
      skillsMap.set(skill.id, skill);
    }

    // Collect load_skills for all skills in combo
    const loadSkillsMap = new Map<string, string[]>();
    let hasAnyMetadata = false;
    for (const skillId of combo.skills) {
      const skill = skillsMap.get(skillId);
      if (skill) {
        hasAnyMetadata = true;
        if (skill.load_skills.length > 0) {
          loadSkillsMap.set(skillId, [...new Set(skill.load_skills)]);
        }
      }
    }

    // If no skill metadata available, fall back to linear dependencies
    if (!hasAnyMetadata) {
      return this.createLinearPlan(combo);
    }

    // Detect circular dependencies
    const cycle = this.findCycle(loadSkillsMap, combo.skills);
    if (cycle) {
      throw new Error(`Circular dependency detected: ${cycle.join(' -> ')}`);
    }

    // Topological sort with combo order as tiebreaker
    const executionOrder = this.topologicalSort(combo.skills, loadSkillsMap);

    // Create skill-to-position map for dependency resolution
    const skillPosition = new Map<string, number>();
    for (let i = 0; i < executionOrder.length; i++) {
      skillPosition.set(executionOrder[i], i);
    }

    // Build steps with proper dependencies
    const steps: ExecutionStep[] = [];
    for (let i = 0; i < executionOrder.length; i++) {
      const skillId = executionOrder[i];
      const deps = loadSkillsMap.get(skillId) || [];

      // Convert skill dependencies to step indices
      const depends_on = deps
        .filter(dep => skillPosition.has(dep))
        .map(dep => skillPosition.get(dep)!);

      const step: ExecutionStep = {
        step: i,
        skill_id: skillId,
        depends_on: depends_on.sort((a, b) => a - b),
        inputs: {},
      };
      steps.push(step);
    }

    const aggregation = this.getAggregationForComboType(combo.type);

    // Distribute timeout to steps
    this.distributeTimeoutToSteps(steps, combo);

    return {
      combo,
      steps,
      aggregation,
    };
  }

  /**
   * Create a linear execution plan (fallback when no skill metadata available)
   */
  private createLinearPlan(combo: Combo): ExecutionPlan {
    const steps: ExecutionStep[] = [];
    for (let i = 0; i < combo.skills.length; i++) {
      steps.push({
        step: i,
        skill_id: combo.skills[i],
        depends_on: i > 0 ? [i - 1] : [],
        inputs: {},
      });
    }
    // Distribute timeout to steps
    this.distributeTimeoutToSteps(steps, combo);
    return {
      combo,
      steps,
      aggregation: this.getAggregationForComboType(combo.type),
    };
  }

  /**
   * Detect circular dependencies using DFS
   * Returns the cycle path if found, null otherwise
   */
  private findCycle(
    loadSkillsMap: Map<string, string[]>,
    comboSkills: string[]
  ): string[] | null {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const path: string[] = [];

    function dfs(skillId: string): boolean {
      if (visiting.has(skillId)) {
        // Found cycle - path now contains the cycle
        path.push(skillId);
        return true;
      }
      if (visited.has(skillId)) {
        return false;
      }

      visiting.add(skillId);
      path.push(skillId);

      const deps = loadSkillsMap.get(skillId) || [];
      for (const dep of deps) {
        if (dfs(dep)) {
          return true;
        }
      }

      path.pop();
      visited.add(skillId);
      return false;
    }

    for (const skillId of comboSkills) {
      if (!visited.has(skillId)) {
        if (dfs(skillId)) {
          return path;
        }
      }
    }

    return null;
  }

  /**
   * Topological sort using Kahn's algorithm with combo order as tiebreaker
   */
  private topologicalSort(
    comboSkills: string[],
    loadSkillsMap: Map<string, string[]>
  ): string[] {
    // Build combo order map (lower = earlier in combo)
    const comboOrder = new Map<string, number>();
    for (let i = 0; i < comboSkills.length; i++) {
      comboOrder.set(comboSkills[i], i);
    }

    // Build adjacency list and in-degree count
    // Edge: from prerequisite to dependent (prerequisite must execute first)
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize all skills from combo
    for (const skillId of comboSkills) {
      graph.set(skillId, []);
      inDegree.set(skillId, 0);
    }

    // Add edges based on load_skills dependencies
    for (const [skillId, deps] of loadSkillsMap) {
      if (!graph.has(skillId)) continue;
      for (const dep of deps) {
        if (graph.has(dep)) {
          // dep -> skillId (dep must run before skillId)
          graph.get(dep)!.push(skillId);
          inDegree.set(skillId, inDegree.get(skillId)! + 1);
        }
      }
    }

    // Start with skills that have no dependencies
    const queue = comboSkills.filter(s => inDegree.get(s) === 0);
    // Sort by combo order (lower index = higher priority)
    queue.sort((a, b) => (comboOrder.get(a) || 0) - (comboOrder.get(b) || 0));

    const result: string[] = [];
    while (queue.length > 0) {
      // Pick skill with lowest combo order
      const skillId = queue.shift()!;
      result.push(skillId);

      // Process dependents
      for (const dependent of graph.get(skillId) || []) {
        inDegree.set(dependent, inDegree.get(dependent)! - 1);
        if (inDegree.get(dependent) === 0) {
          queue.push(dependent);
          // Re-sort to maintain combo order priority
          queue.sort((a, b) => (comboOrder.get(a) || 0) - (comboOrder.get(b) || 0));
        }
      }
    }

    return result;
  }

  /**
   * Suggest best combo for a task description
   * @deprecated Not implemented - requires NLP task analysis
   * @returns Empty array - NLP integration required for implementation
   */
  suggest(_taskDescription: string, _skills: Skill[]): Combo[] {
    // Not implemented - requires NLP task analysis to match user intent to combos
    // Return empty array until this is implemented
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

  /**
   * Distribute combo timeout to steps based on execution mode and combo type
   */
  private distributeTimeoutToSteps(steps: ExecutionStep[], combo: Combo): void {
    if (combo.timeout === undefined) {
      return; // Don't set timeout if combo has no timeout
    }

    if (steps.length === 0) {
      return;
    }

    if (combo.type === 'wrap') {
      // Wrap: wrapper (first step) gets 20%, sub-steps get remaining 80%
      const wrapperTimeout = Math.floor(combo.timeout * 0.2);
      const subStepsTimeout = combo.timeout - wrapperTimeout;
      const subStepsCount = steps.length - 1;

      steps[0].timeout = wrapperTimeout;
      if (subStepsCount > 0) {
        const perSubStepTimeout = Math.floor(subStepsTimeout / subStepsCount);
        for (let i = 1; i < steps.length; i++) {
          steps[i].timeout = perSubStepTimeout;
        }
      }
    } else if (combo.execution === 'parallel') {
      // Parallel: all steps get the same timeout
      for (const step of steps) {
        step.timeout = combo.timeout;
      }
    } else {
      // Serial (chain/conditional): divide evenly, first step gets 10% buffer
      const count = steps.length;
      const baseTimeout = Math.floor(combo.timeout / count);
      const setupBuffer = Math.floor(baseTimeout * 0.1);

      for (let i = 0; i < count; i++) {
        steps[i].timeout = i === 0 ? baseTimeout + setupBuffer : baseTimeout;
      }
    }
  }
}