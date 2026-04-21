// CLI - Command line interface for skill-combo
// MVP: scan, list, and run commands

import { Engine } from './engine';
import { loadDefaultCombos } from './combo-loader';
import { Planner } from './planner';
import { Registry } from './registry';
import { scanSkills } from './scanner';
import { SkillInvoker, SkillContext, SkillOutput } from './types';
import { success, error, warning, colorize } from './colors';

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

  /**
   * Display help for a specific subcommand or general help
   */
  async help(args: string[]): Promise<void> {
    if (args.length > 0) {
      const subcommand = args[0];
      switch (subcommand) {
        case 'scan':
          this.printScanHelp();
          break;
        case 'run':
          this.printRunHelp();
          break;
        case 'list':
          this.printListHelp();
          break;
        case 'combos':
          this.printCombosHelp();
          break;
        default:
          console.log(`Unknown command: ${subcommand}`);
          this.printHelp();
      }
    } else {
      this.printHelp();
    }
  }

  /**
   * Print general help message
   */
  printHelp(): void {
    console.log(`
skill-combo CLI

Commands:
  scan      - Scan skill directories and index skills
  list      - List all discovered skills
  combos    - List all registered combos
  run       - Execute a combo by name
  help      - Show this help message

Use 'skill-combo help <command>' for detailed help on a specific command.

Options:
  --debug   - Enable debug mode (also enabled via DEBUG=1 environment variable)
  --dry-run - Show execution plan without actually executing skills
  --verbose - Show detailed execution statistics (token usage and timing per step)
`);
  }

  /**
   * Print detailed help for scan command
   */
  printScanHelp(): void {
    console.log(`
skill-combo scan - Scan skill directories and index skills

Usage:
  skill-combo scan

Description:
  Scans the OpenCode skills directories to discover and index all available skills.
  The scan results are stored in the registry and can be accessed using the 'list' command.

Examples:
  skill-combo scan

Output:
  Shows the number of skills found and any errors encountered during scanning.
`);
  }

  /**
   * Print detailed help for run command
   */
  printRunHelp(): void {
    console.log(`
skill-combo run - Execute a combo by name

Usage:
  skill-combo run <combo-name> [options]

Arguments:
  combo-name    Name of the combo to execute

Options:
  --debug       Enable debug mode with detailed execution information
  --dry-run     Show execution plan without actually executing skills
  --verbose     Show detailed execution statistics (token usage and timing per step)

Examples:
  skill-combo run research-report
  skill-combo run my-combo --debug
  skill-combo run my-combo --dry-run
  skill-combo run my-combo --verbose

Description:
  Executes a registered combo by name. The combo must be registered in the system
  before it can be executed. Use 'skill-combo combos' to see available combos.

Debug Mode:
  When --debug is enabled, detailed information about the execution plan and
  skill chain is displayed.

Dry-Run Mode:
  When --dry-run is enabled, the execution plan is displayed without actually
  executing any skills. This is useful for understanding what would happen.

Verbose Mode:
  When --verbose is enabled, detailed statistics including token usage and
  execution time per step are shown after execution completes.
`);
  }

  /**
   * Print detailed help for list command
   */
  printListHelp(): void {
    console.log(`
skill-combo list - List all discovered skills

Usage:
  skill-combo list

Description:
  Lists all skills that have been discovered by the scan command.
  Use 'skill-combo scan' first to discover skills.

Examples:
  skill-combo list

Output:
  Shows the total count of skills and lists each skill with its ID and description.
`);
  }

  /**
   * Print detailed help for combos command
   */
  printCombosHelp(): void {
    console.log(`
skill-combo combos - List all registered combos

Usage:
  skill-combo combos

Description:
  Lists all combo definitions that are registered in the system.
  Combos are skill chains that can be executed together.

Examples:
  skill-combo combos

Output:
  Shows the total count of combos and lists each combo with its name, type,
  execution mode, and the skill chain it contains.
`);
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
      console.log(colorize(`Scan complete: ${result.skills} skills found, ${result.errors} errors`, result.errors > 0 ? warning : success));
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
      // Parse combo name from args[1], flags from rest
      const comboName = args[1];
      // Parse flags supporting both --flag and --flag=value formats
      const rawFlags = args.slice(2).filter(a => a.startsWith('--'));
      const flags = rawFlags.map(f => {
        const eqIdx = f.indexOf('=');
        return eqIdx === -1 ? f : f.substring(0, eqIdx);
      });

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

      // Validate combo exists before execution
      const combo = debugCli.getRegistry().getCombo(comboName);
      if (!combo) {
        const availableCombos = debugCli.listCombos();
        console.error(colorize(`✗ Combo not found: ${comboName}`, error));
        console.error('Available combos:');
        if (availableCombos.count === 0) {
          console.error('  (none - no combos registered)');
        } else {
          availableCombos.combos.forEach(c => {
            console.error(`  - ${c.name}`);
          });
        }
        process.exit(1);
      }

      const result = await debugCli.runCombo(comboName, invoker, undefined, dryRun);

      if (result.dryRun) {
        // Dry-run completed - plan was displayed, exit cleanly
        return;
      }

      if (result.success) {
        console.log(colorize('✓ Combo executed successfully!', success));
        console.log('Outputs:', JSON.stringify(result.outputs, null, 2));
        displayExecutionStats(result, verbose);
      } else {
        console.error(colorize('✗ Combo execution failed:', error));
        result.errors.forEach(err => { console.error(colorize(`  - ${err}`, error)); });
        process.exit(1);
      }
      break;
    }

    case 'help':
    default: {
      // Pass remaining args to help (e.g., 'help run' -> ['run'])
      await cli.help(args.slice(1));
      break;
    }
  }
}

// Run main if executed directly
if (require.main === module) {
  main(process.argv.slice(2)).catch(console.error);
}