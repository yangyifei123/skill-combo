"use strict";
// CLI - Command line interface for skill-combo
// MVP: scan, list, and run commands
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultInvoker = exports.CLI = void 0;
exports.main = main;
const engine_1 = require("./engine");
const planner_1 = require("./planner");
const registry_1 = require("./registry");
const scanner_1 = require("./scanner");
/**
 * CLI exports functions for command-line usage
 * Can be used directly or wrapped by OpenCode integration
 */
class CLI {
    constructor() {
        this.registry = new registry_1.Registry();
        this.planner = new planner_1.Planner();
        this.engine = new engine_1.Engine();
    }
    /**
     * Scan skill directories and populate registry
     */
    async scan() {
        const scanResult = await (0, scanner_1.scanSkills)();
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
    listSkills() {
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
    listCombos() {
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
    registerCombo(combo) {
        this.registry.addCombo(combo);
    }
    /**
     * Run a combo by name
     */
    async runCombo(comboName, invoker, _initialContext) {
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
    getPlanner() {
        return this.planner;
    }
    /**
     * Get engine for external use
     */
    getEngine() {
        return this.engine;
    }
    /**
     * Get registry for external use
     */
    getRegistry() {
        return this.registry;
    }
}
exports.CLI = CLI;
/**
 * Default invoker that provides mock execution for testing
 * In OpenCode integration, this would use the actual task() function
 */
class DefaultInvoker {
    async invoke(skillId, _context) {
        // Mock implementation - in real usage, this would call OpenCode's task()
        return {
            skill_id: skillId,
            success: true,
            result: { message: `Executed ${skillId}` },
            tokens_used: 10,
            duration_ms: 50,
        };
    }
    async isAvailable(_skillId) {
        // Mock - always available
        return true;
    }
}
exports.DefaultInvoker = DefaultInvoker;
/**
 * Main CLI entry point when run directly
 */
async function main(args) {
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
            }
            else {
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
//# sourceMappingURL=cli.js.map