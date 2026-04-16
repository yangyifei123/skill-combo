import { Engine } from './engine';
import { Planner } from './planner';
import { Registry } from './registry';
import { SkillInvoker, SkillContext, SkillOutput } from './types';
/**
 * CLI exports functions for command-line usage
 * Can be used directly or wrapped by OpenCode integration
 */
export declare class CLI {
    private registry;
    private planner;
    private engine;
    constructor();
    /**
     * Scan skill directories and populate registry
     */
    scan(): Promise<{
        skills: number;
        errors: number;
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
     * Run a combo by name
     */
    runCombo(comboName: string, invoker: SkillInvoker, _initialContext?: SkillContext): Promise<{
        success: boolean;
        outputs: any;
        errors: string[];
    }>;
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