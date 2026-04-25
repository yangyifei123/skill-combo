import { Engine } from './engine';
import { Planner } from './planner';
import { Registry } from './registry';
import { SkillInvoker, SkillContext, SkillOutput } from './types';
/**
 * CLI configuration options
 */
export interface CLIConfig {
    verbose?: boolean;
    debug?: boolean;
    dryRun?: boolean;
    output?: 'json' | 'text';
}
/**
 * Step execution stats for verbose output
 */
export interface StepStats {
    skill_id: string;
    tokens_used: number;
    duration_ms: number;
}
/**
 * Full execution result with stats
 */
export interface RunResult {
    success: boolean;
    outputs: Record<string, any>;
    errors: string[];
    dryRun?: boolean;
    plan?: any;
    stats?: {
        steps: StepStats[];
        totalTokens: number;
        totalDuration: number;
    };
}
/**
 * CLI exports functions for command-line usage
 * Can be used directly or wrapped by OpenCode integration
 */
export declare class CLI {
    private registry;
    private planner;
    private engine;
    private config;
    constructor(config?: CLIConfig);
    /**
     * Save registry snapshot to disk
     */
    saveRegistry(): boolean;
    /**
     * Load registry snapshot from disk if exists
     */
    loadRegistry(): boolean;
    /**
     * Scan skill directories and populate registry
     * @param save If true, save registry snapshot to disk
     * @param fullResult If true, return full scan result instead of just counts
     */
    scan(save?: boolean, fullResult?: boolean): Promise<{
        skills: number;
        errors: number;
    } | {
        skills: any[];
        errors: any[];
        timestamp: number;
    }>;
    /**
     * List all discovered skills
     */
    listSkills(): {
        skills: any[];
        count: number;
    };
    /**
     * List all registered combos
     */
    listCombos(): {
        combos: any[];
        count: number;
    };
    /**
     * Register a combo
     */
    registerCombo(combo: any): void;
    /**
     * Check if debug mode is enabled
     */
    isDebug(): boolean;
    /**
     * Run a combo by name
     * @param dryRun If true, only display the execution plan without actually executing skills
     */
    runCombo(comboName: string, invoker: SkillInvoker, _initialContext?: SkillContext, dryRun?: boolean): Promise<RunResult>;
    /**
     * Display execution plan information for dry-run mode
     */
    private displayPlan;
    /**
     * Get planner for external use
     */
    getPlanner(): Planner;
    /**
     * Get engine for external use
     */
    getEngine(): Engine;
    /**
     * Get registry for external use
     */
    getRegistry(): Registry;
    /**
     * Display help for a specific subcommand or general help
     */
    help(args: string[]): Promise<void>;
    /**
     * Print general help message
     */
    printHelp(): void;
    /**
     * Print detailed help for scan command
     */
    printScanHelp(): void;
    /**
     * Print detailed help for run command
     */
    printRunHelp(): void;
    /**
     * Print detailed help for list command
     */
    printListHelp(): void;
    /**
     * Print detailed help for combos command
     */
    printCombosHelp(): void;
    /**
     * Print detailed help for search command
     */
    printSearchHelp(): void;
}
/**
 * Default invoker that provides mock execution for testing
 * In OpenCode integration, this would use the actual task() function
 */
export declare class DefaultInvoker implements SkillInvoker {
    invoke(skillId: string, _context: SkillContext): Promise<SkillOutput>;
    isAvailable(_skillId: string): Promise<boolean>;
}
/**
 * Main CLI entry point when run directly
 */
export declare function main(args: string[]): Promise<void>;
//# sourceMappingURL=cli.d.ts.map