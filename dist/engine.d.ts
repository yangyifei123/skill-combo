import { Combo, ComboResult, EngineConfig, ExecutionPlan, ExecutionStep, IEngine, ResultAggregation, SkillContext, SkillInvoker, SkillOutput } from './types';
/**
 * Engine implements IEngine for skill combo orchestration
 * MVP supports serial execution only
 */
export declare class Engine implements IEngine {
    private config;
    private cache?;
    constructor(config?: EngineConfig);
    /**
     * Main entry point - dispatch to appropriate execution method
     */
    execute(combo: Combo, plan: ExecutionPlan, invoker: SkillInvoker): Promise<ComboResult>;
    /**
     * Execute skills serially - each step waits for previous to complete
     * This is the MVP implementation for chain combos
     */
    executeSerial(combo: Combo, steps: ExecutionStep[], invoker: SkillInvoker, initialContext?: Record<string, unknown>): Promise<ComboResult>;
    /**
     * Execute skills in parallel - all steps start simultaneously
     * Results aggregated at end according to aggregation strategy
     */
    executeParallel(steps: ExecutionStep[], invoker: SkillInvoker, aggregation: ResultAggregation): Promise<ComboResult>;
    /**
     * Execute a wrap combo: wrapper → [sub-steps] → wrapper
     * The wrapper skill runs at start (setup), then sub-steps run, then wrapper runs at end (teardown)
     */
    executeWrap(wrapperSkillId: string, subSteps: ExecutionStep[], invoker: SkillInvoker): Promise<ComboResult>;
    /**
     * Execute skills with control alternation at yield points
     * DEFERRED - requires yield protocol definition
     */
    executeInterleaved(_steps: ExecutionStep[], _invoker: SkillInvoker): Promise<ComboResult>;
    /**
     * Execute a conditional combo - select branch based on condition evaluation
      * Branch is selected based on condition result (true/false)
      * Supports: env, ctx, skill-output conditions
      * Note: skill-output conditions require context from previous steps
      */
    executeConditional(condition: {
        type: string;
        expression: string;
    }, trueBranch: ExecutionStep[], falseBranch: ExecutionStep[], invoker: SkillInvoker, initialContext?: SkillContext): Promise<ComboResult>;
    /**
     * Evaluate a condition and return boolean result
     * Supports env (environment variables) and ctx (context) types
     * Does NOT support js-expression (requires security model)
     */
    evaluateCondition(condition: {
        type: string;
        expression: string;
    }, context: SkillContext): Promise<boolean>;
    /**
     * Build execution context for a step from previous outputs
     * Follows CONTEXT_KEYS convention: {skillId}.output.{field}
     */
    private buildContext;
    /**
     * Aggregate outputs from parallel execution
     * Handles different ResultAggregation strategies
     */
    aggregateOutputs(outputs: SkillOutput[], aggregation: ResultAggregation): {
        result: Record<string, any>;
        errors: string[];
    };
}
//# sourceMappingURL=engine.d.ts.map