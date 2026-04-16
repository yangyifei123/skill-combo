// CLI - Command line interface for skill-combo
// MVP: scan, list, and run commands

import { Engine } from './engine';
import { loadDefaultCombos } from './combo-loader';
import { Planner } from './planner';
import { Registry } from './registry';
import { scanSkills } from './scanner';
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
 * Display execution statistics in verbose mode
 */
function displayExecutionStats(result: RunResult, verbose: boolean): void {
  if (verbose && result.stats) {
    console.log('\n📊 Execution Stats (Verbose)');
    console.log('─'.repeat(40));
    for (const step of result.stats.steps) {
      console.log(`  ${step.skill_id}: ${step.tokens_used} tokens, ${step.duration_ms}ms`);
    }
    console.log('─'.repeat(40));
  }
  if (result.stats) {
    console.log(`Total: ${result.stats.totalTokens} tokens, ${result.stats.totalDuration}ms`);
  }
}

/**
 * CLI exports functions for command-line usage
 * Can be used directly or wrapped by OpenCode integration
 */
export class CLI {
  private registry: Registry;
  private planner: Planner;
  private engine: Engine;
  private config: CLIConfig;

  constructor(config: CLIConfig = {}) {
    // Enable debug mode if DEBUG env var is set or config.debug is true
    this.config = {
      debug: config.debug || process.env.DEBUG === '1',
      verbose: config.verbose || false,
      dryRun: config.dryRun || false,
      output: config.output || 'text',
    };
    this.registry = new Registry();
    this.planner = new Planner();
    this.engine = new Engine();

    // Auto-load default combos
    try {
      const defaultCombos = loadDefaultCombos();
      for (const combo of defaultCombos) {
        this.registry.addCombo(combo);
      }
    } catch (e) {
      // Silently ignore if combo loading fails (e.g., not in Node.js context)
    }
  }

  /**
   * Scan skill directories and populate registry
   */
  async scan(): Promise<{ skills: number; errors: number }> {
    const scanResult = await scanSkills();

    // Populate registry with discovered skills
    for (const skill of scanResult.skills) {
      this.registry.addSkill(skill);
    }

    // Update scan timestamp
    this.registry.updateScanTimestamp();

    return {
      skills: scanResult.skills.length,
      errors: scanResult.errors.length,
    };
  }

  /**
   * List all discovered skills
   */
  listSkills(): { skills: any[]; count: number } {
    const skills = this.registry.getAllSkills();
    return {
      skills: skills.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        capabilities: s.capabilities,
      })),
      count: skills.length,
    };
  }

  /**
   * List all registered combos
   */
  listCombos(): { combos: any[]; count: number } {
    const combos = this.registry.listCombos();
    return {
      combos: combos.map(c => ({
        name: c.name,
        description: c.description,
        type: c.type,
        execution: c.execution,
        skills: c.skills,
      })),
      count: combos.length,
    };
  }

  /**
   * Register a combo
   */
  registerCombo(combo: any): void {
    this.registry.addCombo(combo);
  }

  /**
   * Check if debug mode is enabled
   */
  isDebug(): boolean {
    return this.config.debug || false;
  }

  /**
   * Run a combo by name
   * @param dryRun If true, only display the execution plan without actually executing skills
   */
  async runCombo(
    comboName: string,
    invoker: SkillInvoker,
    _initialContext?: SkillContext,
    dryRun: boolean = false
  ): Promise<RunResult> {
    const combo = this.registry.getCombo(comboName);
    if (!combo) {
      if (this.isDebug()) {
        console.debug(`[DEBUG] Combo not found: ${comboName}`);
      }
      return {
        success: false,
        outputs: {},
        errors: [`Combo not found: ${comboName}`],
        dryRun,
      };
    }

    if (this.isDebug()) {
      console.debug(`[DEBUG] Starting combo execution: ${comboName}`);
      console.debug(`[DEBUG] Combo type: ${combo.type}, execution: ${combo.execution}`);
      console.debug(`[DEBUG] Skills in combo: ${combo.skills.join(' -> ')}`);
    }

    const skills = this.registry.getAllSkills();
    const plan = this.planner.plan(combo, skills);

    if (this.isDebug()) {
      console.debug(`[DEBUG] Plan created with ${plan.steps.length} steps`);
    }

    // Dry-run mode: display plan without execution
    if (dryRun) {
      const planInfo = this.displayPlan(plan);
      return {
        success: true,
        outputs: {},
        errors: [],
        dryRun: true,
        plan: planInfo,
      };
    }

    if (this.isDebug()) {
      console.debug(`[DEBUG] Executing combo...`);
    }

    const result = await this.engine.execute(combo, plan, invoker);

    if (this.isDebug()) {
      if (result.success) {
        console.debug(`[DEBUG] Combo execution completed successfully`);
      } else {
        console.debug(`[DEBUG] Combo execution failed with ${result.errors.length} error(s)`);
        result.errors.forEach(e => { console.debug(`[DEBUG] Error: ${e}`); });
      }
    }

    // Extract step stats for verbose output
    const stepStats: StepStats[] = result.steps
      ? result.steps.map(step => ({
          skill_id: step.skill_id,
          tokens_used: step.tokens_used ?? 0,
          duration_ms: step.timing.duration_ms,
        }))
      : [];

    return {
      success: result.success,
      outputs: result.outputs,
      errors: result.errors,
      dryRun: false,
      stats: {
        steps: stepStats,
        totalTokens: result.tokens_used,
        totalDuration: result.duration_ms,
      },
    };
  }

  /**
   * Display execution plan information for dry-run mode
   */
  private displayPlan(plan: any): {
    skillOrder: string[];
    totalSteps: number;
    comboName: string;
    comboType: string;
    executionMode: string;
  } {
    const skillOrder = plan.steps.map((s: any) => s.skill_id);
    const totalSteps = plan.steps.length;

    console.log('\n📋 Execution Plan (Dry Run)');
    console.log('═'.repeat(40));
    console.log(`Combo: ${plan.combo.name}`);
    console.log(`Type: ${plan.combo.type}`);
    console.log(`Execution: ${plan.combo.execution}`);
    console.log(`Total Steps: ${totalSteps}`);
    console.log('\nSkill Execution Order:');
    skillOrder.forEach((skillId: string, index: number) => {
      const dependsOn = plan.steps[index].depends_on;
      const depsStr = dependsOn.length > 0 ? ` (depends on step ${dependsOn.join(', ')})` : '';
      console.log(`  ${index + 1}. ${skillId}${depsStr}`);
    });
    console.log('═'.repeat(40));
    console.log('(No skills were actually executed)\n');

    return {
      skillOrder,
      totalSteps,
      comboName: plan.combo.name,
      comboType: plan.combo.type,
      executionMode: plan.combo.execution,
    };
  }

  /**
   * Get planner for external use
   */
  getPlanner(): Planner {
    return this.planner;
  }

  /**
   * Get engine for external use
   */
  getEngine(): Engine {
    return this.engine;
  }

  /**
   * Get registry for external use
   */
  getRegistry(): Registry {
    return this.registry;
  }
}

/**
 * Default invoker that provides mock execution for testing
 * In OpenCode integration, this would use the actual task() function
 */
export class DefaultInvoker implements SkillInvoker {
  async invoke(skillId: string, _context: SkillContext): Promise<SkillOutput> {
    // Mock implementation - in real usage, this would call OpenCode's task()
    return {
      skill_id: skillId,
      success: true,
      result: { message: `Executed ${skillId}` },
      tokens_used: 10,
      duration_ms: 50,
    };
  }

  async isAvailable(_skillId: string): Promise<boolean> {
    // Mock - always available
    return true;
  }
}

/**
 * Main CLI entry point when run directly
 */
export async function main(args: string[]): Promise<void> {
  const cli = new CLI();

  const command = args[0] || 'help';

  switch (command) {
    case 'scan': {
      const result = await cli.scan();
      console.log(`Scan complete: ${result.skills} skills found, ${result.errors} errors`);
      break;
    }

    case 'list': {
      const result = cli.listSkills();
      console.log(`Found ${result.count} skills:`);
      result.skills.forEach(s => {
        console.log(`  - ${s.id}: ${s.description}`);
      });
      break;
    }

    case 'combos': {
      const result = cli.listCombos();
      console.log(`Found ${result.count} combos:`);
      result.combos.forEach(c => {
        console.log(`  - ${c.name} (${c.type}/${c.execution}): ${c.skills.join(' -> ')}`);
      });
      break;
    }

    case 'run': {
      // Parse flags
      const flags: string[] = [];
      let comboName = args[1];

      for (let i = 2; i < args.length; i++) {
        if (args[i].startsWith('--')) {
          flags.push(args[i]);
        } else {
          comboName = args[i];
        }
      }

      const debug = flags.includes('--debug');
      const dryRun = flags.includes('--dry-run');
      const verbose = flags.includes('--verbose');
      const config: CLIConfig = { debug, verbose };

      if (debug) {
        console.debug('[DEBUG] Debug mode enabled via --debug flag');
      }

      if (!comboName) {
        console.error('Usage: skill-combo run <combo-name> [--debug] [--dry-run] [--verbose]');
        process.exit(1);
      }

      // Use DefaultInvoker for CLI (mock execution)
      const debugCli = new CLI(config);
      const invoker = new DefaultInvoker();
      const result = await debugCli.runCombo(comboName, invoker, undefined, dryRun);

      if (result.dryRun) {
        // Dry-run completed - plan was displayed, exit cleanly
        return;
      }

      if (result.success) {
        console.log('Combo executed successfully!');
        console.log('Outputs:', JSON.stringify(result.outputs, null, 2));
        displayExecutionStats(result, verbose);
      } else {
        console.error('Combo execution failed:');
        result.errors.forEach(err => { console.error(`  - ${err}`); });
        process.exit(1);
      }
      break;
    }

    case 'help':
    default: {
      console.log(`
skill-combo CLI

Commands:
  scan      - Scan skill directories and index skills
  list      - List all discovered skills
  combos    - List all registered combos
  run       - Execute a combo by name (skill-combo run <combo-name> [--debug] [--dry-run] [--verbose])
  help      - Show this help message

Options:
  --debug   - Enable debug mode (also enabled via DEBUG=1 environment variable)
  --dry-run - Show execution plan without actually executing skills
  --verbose - Show detailed execution statistics (token usage and timing per step)
`);
      break;
    }
  }
}

// Run main if executed directly
if (require.main === module) {
  main(process.argv.slice(2)).catch(console.error);
}