/**
 * Skill represents a discovered skill with its metadata
 * In OpenCode, skills are defined in SKILL.md files
 */
export interface Skill {
    id: string;
    name: string;
    description: string;
    location: string;
    category: string[];
    capabilities: string[];
    /** OpenCode skill load dependencies - skills this skill requires */
    load_skills: string[];
    /** Expected inputs this skill consumes */
    inputs: string[];
    /** Outputs this skill produces */
    outputs: string[];
    /** Skills that work well with this one (for combo planning) */
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
/**
 * Condition evaluation type for conditional combos
 */
export type ConditionType = 'env' | 'ctx' | 'skill-output' | 'js-expression';
/**
 * Condition for conditional combos
 */
export interface Condition {
    type: ConditionType;
    expression: string;
}
/**
 * Combo definition - how to compose skills together
 */
export interface Combo {
    name: string;
    description: string;
    type: ComboType;
    execution: ExecutionMode;
    /** Ordered list of skill IDs for chain/parallel combos */
    skills: string[];
    /** For conditional combos: condition to evaluate */
    condition?: Condition;
    /** For conditional combos: mapping of condition values to skill sequences */
    branches?: Record<string, string[]>;
    /** For wrap combos: the wrapped sub-combo (skills executed inside wrapper) */
    sub_combo?: string[];
    /** Input/output schema for validation */
    schema?: ComboSchema;
}
export interface ComboSchema {
    input: Record<string, string>;
    output: Record<string, string>;
}
/** Result aggregation strategy for parallel execution */
export type ResultAggregation = 'merge' | 'override' | 'fail-on-conflict' | 'first-win';
/**
 * Execution plan output by planner, input to engine
 */
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
/**
 * Registry snapshot - data structure for serialization
 * Note: This is the data shape, not the implementation contract
 */
export interface RegistrySnapshot {
    skills: Map<string, Skill>;
    combos: Map<string, Combo>;
    last_scan: number;
}
/**
 * Skill execution context - shared state between skills in a combo
 */
export interface SkillContext {
    [key: string]: any;
}
/**
 * Individual skill output
 */
export interface SkillOutput {
    skill_id: string;
    success: boolean;
    result: any;
    error?: string;
    tokens_used: number;
    duration_ms: number;
}
/**
 * Step-level execution timing information
 */
export interface StepTiming {
    /** Unix timestamp ms when step started */
    start_time: number;
    /** Unix timestamp ms when step ended */
    end_time: number;
    /** Calculated duration in ms (end_time - start_time) */
    duration_ms: number;
}
/**
 * Individual step result with timing and output details
 */
export interface StepResult {
    step_id: string;
    skill_id: string;
    success: boolean;
    timing: StepTiming;
    tokens_used?: number;
    output?: unknown;
    error?: string;
}
/**
 * Skill invocation interface - HOW skills are actually executed
 * This is the contract that OpenCode integration must implement
 */
export interface SkillInvoker {
    /**
     * Invoke a skill by ID with given context
     */
    invoke(skillId: string, context: SkillContext): Promise<SkillOutput>;
    /**
     * Check if a skill is available
     */
    isAvailable(skillId: string): Promise<boolean>;
}
/**
 * Default invoker using OpenCode's task() function
 */
export interface OpenCodeInvokerOptions {
    /** OpenCode session ID for context */
    sessionId?: string;
    /** Timeout for skill execution */
    timeout?: number;
}
export interface ComboResult {
    success: boolean;
    outputs: Record<string, any>;
    errors: string[];
    tokens_used: number;
    duration_ms: number;
    aggregation: ResultAggregation;
    /** Optional step-level details for debugging and analysis */
    steps?: StepResult[];
}
/**
 * Registry API - what registry.ts must implement
 */
export interface IRegistry {
    addSkill(skill: Skill): void;
    getSkill(id: string): Skill | undefined;
    getAllSkills(): Skill[];
    querySkills(criteria: SkillQuery): Skill[];
    addCombo(combo: Combo): void;
    getCombo(name: string): Combo | undefined;
    listCombos(): Combo[];
}
export interface SkillQuery {
    category?: string[];
    capabilities?: string[];
    inputs?: string[];
    outputs?: string[];
}
/**
 * OpenCode Skill Invoker Implementation
 *
 * This invoker uses OpenCode's task() function to execute skills.
 * In the OpenCode runtime, skills are invoked via the skill() tool:
 *
 * ```typescript
 * // Using OpenCode's skill tool
 * const result = await skill({ name: skillId, user_message: context });
 * ```
 *
 * The skill() tool:
 * - Takes skill name and context as input
 * - Returns skill execution result as output
 * - Shares session context with other skills in same session
 *
 * For skill chaining, the invoker should:
 * 1. Call skill() with skillId and current context
 * 2. Extract outputs from result
 * 3. Merge outputs into shared context
 * 4. Pass context to next skill
 */
export interface OpenCodeInvokerConfig {
    /** OpenCode session ID for context sharing */
    sessionId: string;
    /** Timeout per skill in milliseconds */
    timeout?: number;
    /** Base URL for OpenCode API (if not using local) */
    apiUrl?: string;
}
/**
 * Combo planner interface - what planner.ts must implement
 */
export interface IPlanner {
    /**
     * Create an execution plan from a combo
     */
    plan(combo: Combo, skills: Skill[]): ExecutionPlan;
    /**
     * Suggest best combo for a task description
     */
    suggest(taskDescription: string, skills: Skill[]): Combo[];
}
/**
 * Combo engine interface - what engine.ts must implement
 */
export interface IEngine {
    /**
     * Execute a combo and return results
     * Delegates to appropriate execution method based on combo.execution
     */
    execute(combo: Combo, plan: ExecutionPlan, invoker: SkillInvoker): Promise<ComboResult>;
    /**
     * Execute skills serially (chain combo)
     * Each step waits for previous to complete
     */
    executeSerial(steps: ExecutionStep[], invoker: SkillInvoker): Promise<ComboResult>;
    /**
     * Execute skills in parallel (parallel combo)
     * All steps start simultaneously, results aggregated at end
     */
    executeParallel(steps: ExecutionStep[], invoker: SkillInvoker, aggregation: ResultAggregation): Promise<ComboResult>;
    /**
     * Execute skills with control alternation (interleaved combo)
     * Skills yield at yield points, control passes to next skill
     */
    executeInterleaved(steps: ExecutionStep[], invoker: SkillInvoker): Promise<ComboResult>;
    /**
     * Evaluate a condition and return boolean result
     * Used for conditional combos
     */
    evaluateCondition(condition: Condition, context: SkillContext): Promise<boolean>;
}
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
export declare const CONTEXT_KEYS: {
    readonly outputPrefix: (skillId: string) => string;
    readonly inputPrefix: (skillId: string) => string;
    readonly errorPrefix: (skillId: string) => string;
};
/**
 * Validation error for skill/combo registration
 */
export interface ValidationError {
    field: string;
    message: string;
}
/**
 * Engine configuration options
 */
export interface EngineConfig {
    /** Maximum context size in bytes (default: 1MB) */
    maxContextSize?: number;
    /** Maximum execution steps per combo (default: 100) */
    maxSteps?: number;
    /** Default timeout per skill in ms (default: 5 minutes) */
    skillTimeout?: number;
}
/**
 * NotImplementedError - thrown when a deferred feature is called
 */
export declare class NotImplementedError extends Error {
    constructor(feature: string, reason: string);
}
//# sourceMappingURL=types.d.ts.map