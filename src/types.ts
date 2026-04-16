// Skill-Combo Core Types

export interface Skill {
  id: string;
  name: string;
  description: string;
  location: string;
  category: string[];
  capabilities: string[];
  /** Skills that MUST be loaded before this skill can run */
  dependencies: string[];
  /** Skills that this skill INVOKES/CALLS during execution */
  load_skills: string[];
  /** Expected inputs this skill consumes */
  inputs: string[];
  /** Outputs this skill produces */
  outputs: string[];
  /** Skills that work well with this one */
  compatibility: string[];
  category_priority: number;
}

/**
 * Combo Type - structural patterns for skill composition
 * These define HOW skills are composed together
 */
export type ComboType = 'chain' | 'parallel' | 'wrap' | 'conditional';

/**
 * Execution Mode - HOW skills actually run (serial vs parallel vs interleaved)
 * These define WHEN skills execute relative to each other
 */
export type ExecutionMode = 'serial' | 'parallel' | 'interleaved';

export interface Combo {
  name: string;
  description: string;
  type: ComboType;
  execution: ExecutionMode;
  skills: string[];
  /** For conditional combos: variable to evaluate */
  condition?: string;
  /** For conditional combos: mapping of condition values to skill sequences */
  branches?: Record<string, string[]>;
  /** For wrap combos: skill that wraps the sub-combo */
  wrapper?: string;
  /** Input/output schema for validation */
  schema?: ComboSchema;
}

export interface ComboSchema {
  input: Record<string, string>;
  output: Record<string, string>;
}

/** Result aggregation strategy for parallel execution */
export type ResultAggregation = 'merge' | 'override' | 'fail-on-conflict' | 'first-win';

export interface ExecutionPlan {
  combo: Combo;
  steps: ExecutionStep[];
  aggregation: ResultAggregation;
}

export interface ExecutionStep {
  step: number;
  skill_id: string;
  depends_on: number[];
  inputs: Record<string, any>;
}

export interface ScanResult {
  skills: Skill[];
  errors: ScanError[];
  timestamp: number;
}

export interface ScanError {
  location: string;
  error: string;
}

export interface Registry {
  skills: Map<string, Skill>;
  combos: Map<string, Combo>;
  last_scan: number;
}

export interface ComboResult {
  success: boolean;
  outputs: Record<string, any>;
  errors: string[];
  tokens_used: number;
  duration_ms: number;
  aggregation: ResultAggregation;
}
