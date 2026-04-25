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
    /** Skill origin source - local (installed) or remote (ClawHub catalog) */
    source?: SkillSource;
    /** Remote metadata if skill is from ClawHub (composition pattern) */
    remote?: RemoteSkillMeta;
}
/**
 * Combo Type - structural patterns for skill composition
 * These define HOW skills are composed together
 */
export type ComboType = 'chain' | 'parallel' | 'wrap' | 'conditional' | 'subagent';
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
    /** Default timeout for all steps in this combo (ms) */
    timeout?: number;
    /** Estimated token usage for this combo (rough heuristic) */
    token_estimate?: number;
    /** Whether this combo is safe for parallel execution (default: true) */
    parallel_safe?: boolean;
    /** Tags for categorizing and discovering combos */
    tags?: string[];
}
/** Subagent aggregation strategy */
export type SubagentAggregation = 'structured' | 'last-win' | 'merge';
/** Subagent error handling strategy */
export type SubagentErrorStrategy = 'fail-fast' | 'continue' | 'partial';
/**
 * SubagentStep - a single step in a subagent combo
 * Each step spawns a subagent that loads one or more skills
 */
export interface SubagentStep {
    /** Unique step name (used for dependency references and output keys) */
    name: string;
    /** Skills to load into this subagent via load_skills */
    skills: string[];
    /** Task prompt describing what the subagent should do */
    prompt: string;
    /** Names of steps this step depends on (must complete first) */
    depends_on: string[];
    /** Per-step timeout in ms (default: inherited from combo) */
    timeout?: number;
    /** Step names whose outputs to include in this step's context */
    context_from?: string[];
    /** Retry attempts for transient failures (default: 0) */
    retry_count?: number;
}
/**
 * SubagentCombo - a combo that orchestrates subagents
 * Each subagent loads skill(s) via task() with load_skills
 */
export interface SubagentCombo extends Combo {
    type: 'subagent';
    /** Subagent steps with dependencies and skill assignments */
    subagent_steps: SubagentStep[];
    /** How to aggregate results from all subagent steps */
    subagent_aggregation?: SubagentAggregation;
    /** How to handle errors during subagent execution */
    subagent_error_strategy?: SubagentErrorStrategy;
}
/**
 * SubagentOutput - output from a subagent step
 */
export interface SubagentOutput extends SkillOutput {
    /** Which subagent step produced this output */
    step_name: string;
    /** Skills loaded in this subagent */
    skills_loaded: string[];
}
/** Options for spawning a subagent via task() */
export interface TaskSpawnOptions {
    /** OpenCode task category (e.g. 'quick', 'ultrabrain') */
    category?: string;
    /** Session ID for context sharing between subagents */
    session_id?: string;
    /** Timeout for this subagent spawn in ms */
    timeout?: number;
    /** Whether to run in background (async) */
    run_in_background?: boolean;
}
/**
 * TaskInvoker - interface for spawning subagents via OpenCode's task()
 * DISTINCT from SkillInvoker which uses skill() for single skill invocation.
 * TaskInvoker uses task() with load_skills to create subagents with skill sets.
 */
export interface TaskInvoker {
    /**
     * Spawn a subagent with given skills and prompt
     * Returns subagent execution output
     */
    spawn(load_skills: string[], prompt: string, context: SkillContext, options?: TaskSpawnOptions): Promise<SubagentOutput>;
    /**
     * Check if task() runtime is available
     */
    isAvailable(): Promise<boolean>;
}
/** Wave of parallel subagent steps */
export interface ExecutionWave {
    /** Wave number (0-indexed) */
    wave_number: number;
    /** Steps in this wave (all run in parallel) */
    steps: SubagentStep[];
}
/** Result of executing a wave */
export interface WaveResult {
    wave_number: number;
    outputs: SubagentOutput[];
    errors: string[];
    success: boolean;
}
/** Subagent execution plan with waves */
export interface SubagentExecutionPlan {
    combo: SubagentCombo;
    waves: ExecutionWave[];
    aggregation: SubagentAggregation;
    error_strategy: SubagentErrorStrategy;
}
/** Error handling decision for a failed subagent step */
export type ErrorHandlingDecision = {
    action: 'retry';
    delay: number;
} | {
    action: 'continue';
    skip: boolean;
} | {
    action: 'abort';
    reason: string;
};
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
    /** Timeout for this step in milliseconds (optional) */
    timeout?: number;
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
    /** Number of retries attempted (0 if no retries) */
    retry_count?: number;
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
    executeSerial(combo: Combo, steps: ExecutionStep[], invoker: SkillInvoker, initialContext?: Record<string, unknown>): Promise<ComboResult>;
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
    /** Maximum context size in characters (default: 100KB) */
    maxContextSize?: number;
    /** Maximum execution steps per combo (default: 100) */
    maxSteps?: number;
    /** Default timeout per skill in ms (default: 5 minutes) */
    skillTimeout?: number;
    /** Optional cache for result deduplication */
    cache?: Cache;
    /** Maximum retry attempts for transient failures (default: 0 = no retry) */
    maxRetries?: number;
    /** Delay between retries in ms (default: 1000) */
    retryDelayMs?: number;
}
/**
 * Cache interface for result deduplication
 */
export interface Cache {
    get(key: string): Promise<unknown | undefined>;
    set(key: string, value: unknown, ttlMs?: number): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
}
/**
 * NotImplementedError - thrown when a deferred feature is called
 */
export declare class NotImplementedError extends Error {
    constructor(feature: string, reason: string);
}
/** A single session message */
export interface SessionMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    tokens?: number;
    tools?: string[];
}
/** A session summary for pattern analysis */
export interface SessionSummary {
    id: string;
    title?: string;
    messages: SessionMessage[];
    start_time: number;
    end_time: number;
    total_tokens: number;
}
/** Pattern extracted from session analysis */
export interface ExtractedPattern {
    /** Pattern description (e.g., "skill-combo run → test → commit") */
    description: string;
    /** Skills involved in this pattern */
    skills: string[];
    /** Number of sessions where this pattern appears */
    session_count: number;
    /** Total occurrences across all sessions */
    total_occurrences: number;
    /** Skill-worthiness score (0-100) */
    worthiness_score: number;
}
/** Skill-worthiness scoring criteria */
export interface WorthinessScore {
    frequency: number;
    generalizability: number;
    complexity_reduction: number;
    error_reduction: number;
    total: number;
}
/** Generated SKILL.md content */
export interface GeneratedSkill {
    name: string;
    description: string;
    content: string;
    frontmatter: {
        name: string;
        description: string;
        generated_from?: string;
        extraction_date?: string;
    };
    patterns_used: string[];
    worthiness_score: number;
}
/** Configuration for skill extraction */
export interface ExtractionConfig {
    /** Minimum sessions a pattern must appear in (default: 2) */
    min_sessions?: number;
    /** Minimum total occurrences (default: 3) */
    min_occurrences?: number;
    /** Maximum number of skills to generate (default: 5) */
    max_skills?: number;
    /** Output directory for generated SKILL.md files (default: ./generated-skills/) */
    output_dir?: string;
    /** Minimum worthiness score to generate (default: 50) */
    min_worthiness?: number;
}
/** Session data provider interface */
export interface SessionProvider {
    /** List available sessions */
    listSessions(limit?: number): Promise<SessionSummary[]>;
    /** Get full session details */
    getSession(id: string): Promise<SessionSummary | null>;
    /** Check if provider is available */
    isAvailable(): boolean;
}
/** Skill origin source */
export type SkillSource = 'local' | 'remote';
/** Remote skill metadata (composition, not flat fields on Skill) */
export interface RemoteSkillMeta {
    /** ClawHub slug (unique identifier) */
    remoteSlug: string;
    /** Latest version on ClawHub */
    remoteVersion?: string;
    /** Owner handle */
    remoteOwner?: string;
    /** Star count */
    remoteStars?: number;
    /** Download count (all time) */
    remoteDownloads?: number;
    /** When this metadata was fetched (epoch ms) */
    remoteFetchedAt?: number;
}
/** ClawHub API skill item (from GET /api/v1/skills) */
export interface ClawHubSkillItem {
    slug: string;
    displayName: string;
    summary?: string;
    tags?: Record<string, string>;
    latestVersion?: {
        version: string;
        createdAt: number;
        changelog?: string;
    } | null;
    metadata?: {
        os?: string[] | null;
        systems?: string[] | null;
    } | null;
    createdAt: number;
    updatedAt: number;
    owner?: {
        handle?: string | null;
        displayName?: string | null;
        image?: string | null;
    } | null;
    stats?: {
        stars?: number;
        downloads?: number;
        installsCurrent?: number;
        installsAllTime?: number;
    } | null;
}
/** ClawHub API list response */
export interface ClawHubSkillListResponse {
    items: ClawHubSkillItem[];
    nextCursor?: string | null;
}
/** ClawHub API search response */
export interface ClawHubSkillSearchResponse {
    results: Array<{
        score: number;
        slug: string;
        displayName: string;
        summary?: string;
        version?: string;
        updatedAt?: number;
    }>;
    total?: number;
}
/** Remote scan options */
export interface RemoteScanOptions {
    limit?: number;
    force?: boolean;
    sort?: 'updated' | 'downloads' | 'stars' | 'trending';
    search?: string;
}
/** Remote scan error */
export interface RemoteScanError {
    type: 'network' | 'rate-limit' | 'auth' | 'parse' | 'unknown';
    message: string;
    retryable: boolean;
    retryAfter?: number;
}
/** Remote scan result */
export interface RemoteScanResult {
    skills: Skill[];
    errors: RemoteScanError[];
    timestamp: number;
    cached: boolean;
    source: 'clawhub';
}
/** Rate limiter configuration */
export interface RateLimiterConfig {
    maxTokens: number;
    refillPerSecond: number;
}
//# sourceMappingURL=types.d.ts.map