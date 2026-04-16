// CLI - Command line interface for skill-combo
// MVP: scan, list, and run commands

import { Engine } from './engine';
import { Planner } from './planner';
import { Registry } from './registry';
import { scanSkills } from './scanner';
import { SkillInvoker, SkillContext, SkillOutput } from './types';

/**
 * CLI exports functions for command-line usage
 * Can be used directly or wrapped by OpenCode integration
 */
export class CLI {
  private registry: Registry;
  private planner: Planner;
  private engine: Engine;

  constructor() {
    this.registry = new Registry();
    this.planner = new Planner();
    this.engine = new Engine();
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
   * Run a combo by name
   */
  async runCombo(
    comboName: string,
    invoker: SkillInvoker,
    _initialContext?: SkillContext
  ): Promise<{ success: boolean; outputs: any; errors: string[] }> {
    const combo = this.registry.getCombo(comboName);
    if (!combo) {
      return {
        success: false,
        outputs: {},
        errors: [`Combo not found: ${comboName}`],
      };
    }

    const skills = this.registry.getAllSkills();
    const plan = this.planner.plan(combo, skills);

    const result = await this.engine.execute(combo, plan, invoker);
    return {
      success: result.success,
      outputs: result.outputs,
      errors: result.errors,
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
      const comboName = args[1];
      if (!comboName) {
        console.error('Usage: skill-combo run <combo-name>');
        process.exit(1);
      }
      // Use DefaultInvoker for CLI (mock execution)
      const invoker = new DefaultInvoker();
      const result = await cli.runCombo(comboName, invoker);
      if (result.success) {
        console.log('Combo executed successfully!');
        console.log('Outputs:', JSON.stringify(result.outputs, null, 2));
      } else {
        console.error('Combo execution failed:');
        result.errors.forEach(e => console.error(`  - ${e}`));
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
  help      - Show this help message
`);
      break;
    }
  }
}

// Run main if executed directly
if (require.main === module) {
  main(process.argv.slice(2)).catch(console.error);
}