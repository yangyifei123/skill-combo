"use strict";
// CLI - Command line interface for skill-combo
// MVP: scan, list, and run commands
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultInvoker = exports.CLI = void 0;
exports.main = main;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const engine_1 = require("./engine");
const combo_loader_1 = require("./combo-loader");
const planner_1 = require("./planner");
const registry_1 = require("./registry");
const scanner_1 = require("./scanner");
const colors_1 = require("./colors");
const opencode_invoker_1 = require("./opencode-invoker");
const session_provider_1 = require("./session-provider");
const pattern_miner_1 = require("./pattern-miner");
const skill_generator_1 = require("./skill-generator");
const remote_scanner_1 = require("./remote-scanner");
const clawhub_client_1 = require("./clawhub-client");
const REGISTRY_FILE = '.skill-combo-registry.json';
/**
 * Adapt ClawHubClient to ClawHubClientLike (cursor string -> options object)
 */
function adaptClient(client) {
    return {
        async listSkills(cursor) {
            return client.listSkills({ cursor });
        },
        async searchSkills(query) {
            return client.searchSkills(query);
        },
    };
}
/**
 * Display execution statistics in verbose mode
 */
function displayExecutionStats(result, verbose) {
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
class CLI {
    constructor(config = {}) {
        // Enable debug mode if DEBUG env var is set or config.debug is true
        this.config = {
            debug: config.debug || process.env.DEBUG === '1',
            verbose: config.verbose || false,
            dryRun: config.dryRun || false,
            output: config.output || 'text',
        };
        this.registry = new registry_1.Registry();
        this.planner = new planner_1.Planner();
        this.engine = new engine_1.Engine();
        // Auto-load default combos
        try {
            const defaultCombos = (0, combo_loader_1.loadDefaultCombos)();
            for (const combo of defaultCombos) {
                this.registry.addCombo(combo);
            }
        }
        catch (e) {
            // Silently ignore if combo loading fails (e.g., not in Node.js context)
        }
        // Auto-load registry snapshot if exists
        this.loadRegistry();
    }
    /**
     * Save registry snapshot to disk
     */
    saveRegistry() {
        try {
            const skills = this.registry.getAllSkills();
            const combos = this.registry.listCombos();
            const snapshot = {
                skills,
                combos,
                timestamp: Date.now(),
            };
            const filePath = path.join(process.cwd(), REGISTRY_FILE);
            fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
            return true;
        }
        catch (e) {
            if (this.isDebug()) {
                console.debug(`[DEBUG] Failed to save registry: ${e}`);
            }
            return false;
        }
    }
    /**
     * Load registry snapshot from disk if exists
     */
    loadRegistry() {
        try {
            const filePath = path.join(process.cwd(), REGISTRY_FILE);
            if (!fs.existsSync(filePath)) {
                return false;
            }
            const content = fs.readFileSync(filePath, 'utf-8');
            const snapshot = JSON.parse(content);
            // Load skills
            if (snapshot.skills && Array.isArray(snapshot.skills)) {
                for (const skill of snapshot.skills) {
                    this.registry.addSkill(skill);
                }
            }
            // Load combos
            if (snapshot.combos && Array.isArray(snapshot.combos)) {
                for (const combo of snapshot.combos) {
                    this.registry.addCombo(combo);
                }
            }
            // Restore last scan timestamp
            if (snapshot.timestamp) {
                this.registry.updateScanTimestamp();
            }
            return true;
        }
        catch (e) {
            if (this.isDebug()) {
                console.debug(`[DEBUG] Failed to load registry: ${e}`);
            }
            return false;
        }
    }
    /**
     * Scan skill directories and populate registry
     * @param save If true, save registry snapshot to disk
     * @param fullResult If true, return full scan result instead of just counts
     */
    async scan(save, fullResult = false) {
        const scanResult = await (0, scanner_1.scanSkills)();
        // Populate registry with discovered skills
        for (const skill of scanResult.skills) {
            this.registry.addSkill(skill);
        }
        // Update scan timestamp
        this.registry.updateScanTimestamp();
        // Optionally save registry snapshot
        if (save) {
            this.saveRegistry();
        }
        if (fullResult) {
            return {
                skills: scanResult.skills,
                errors: scanResult.errors,
                timestamp: scanResult.timestamp,
            };
        }
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
     * Check if debug mode is enabled
     */
    isDebug() {
        return this.config.debug || false;
    }
    /**
     * Run a combo by name
     * @param dryRun If true, only display the execution plan without actually executing skills
     */
    async runCombo(comboName, invoker, _initialContext, dryRun = false) {
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
            }
            else {
                console.debug(`[DEBUG] Combo execution failed with ${result.errors.length} error(s)`);
                result.errors.forEach(e => { console.debug(`[DEBUG] Error: ${e}`); });
            }
        }
        // Extract step stats for verbose output
        const stepStats = result.steps
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
    displayPlan(plan) {
        const skillOrder = plan.steps.map((s) => s.skill_id);
        const totalSteps = plan.steps.length;
        console.log('\n📋 Execution Plan (Dry Run)');
        console.log('═'.repeat(40));
        console.log(`Combo: ${plan.combo.name}`);
        console.log(`Type: ${plan.combo.type}`);
        console.log(`Execution: ${plan.combo.execution}`);
        console.log(`Total Steps: ${totalSteps}`);
        console.log('\nSkill Execution Order:');
        skillOrder.forEach((skillId, index) => {
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
    /**
     * Display help for a specific subcommand or general help
     */
    async help(args) {
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
                case 'search':
                    this.printSearchHelp();
                    break;
                default:
                    console.log(`Unknown command: ${subcommand}`);
                    this.printHelp();
            }
        }
        else {
            this.printHelp();
        }
    }
    /**
     * Print general help message
     */
    printHelp() {
        console.log(`
skill-combo CLI

Commands:
  scan      - Scan skill directories and index skills
  list      - List all discovered skills (auto-loads registry)
  combos    - List all registered combos
  run       - Execute a combo by name (auto-loads registry)
  search    - Search ClawHub remote registry for skills
  extract   - Extract skill patterns from session history
  help      - Show this help message

Use 'skill-combo help <command>' for detailed help on a specific command.

Options:
  --debug   - Enable debug mode (also enabled via DEBUG=1 environment variable)
  --dry-run - Show execution plan without actually executing skills
  --verbose - Show detailed execution statistics (token usage and timing per step)
  --save    - Save registry snapshot to disk (for scan command)
  --json    - Output results as machine-readable JSON (single line)
`);
    }
    /**
     * Print detailed help for scan command
     */
    printScanHelp() {
        console.log(`
skill-combo scan - Scan skill directories and index skills

Usage:
  skill-combo scan [--save] [--remote] [--force] [--limit=N] [--sort=MODE] [--json]

Options:
  --save          Save registry snapshot to .skill-combo-registry.json
  --remote        Also fetch skills from ClawHub remote registry
  --force         Bypass cache for remote fetch (use with --remote)
  --limit=N       Limit number of remote skills fetched (use with --remote)
  --sort=MODE     Sort remote results: updated|downloads|stars|trending (use with --remote)
  --json          Output results as machine-readable JSON (single line)

Description:
  Scans the OpenCode skills directories to discover and index all available skills.
  The scan results are stored in the registry and can be accessed using the 'list' command.
  Use --save to persist the registry for auto-loading by list and run commands.

  With --remote, also fetches skills from ClawHub and merges them into the registry.
  Remote skills are tagged [R] in the list output. Skills installed locally that also
  exist on ClawHub are tagged [L+R].

Examples:
  skill-combo scan
  skill-combo scan --save
  skill-combo scan --remote --save
  skill-combo scan --remote --force --limit=50
  skill-combo scan --remote --sort=stars --save
  skill-combo scan --json

Output:
  Shows the number of skills found and any errors encountered during scanning.
  With --json: { "skills": [...], "errors": [...], "timestamp": number }
`);
    }
    /**
     * Print detailed help for run command
     */
    printRunHelp() {
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
  --json        Output full RunResult as machine-readable JSON (single line)

Examples:
  skill-combo run research-report
  skill-combo run my-combo --debug
  skill-combo run my-combo --dry-run
  skill-combo run my-combo --verbose
  skill-combo run my-combo --json

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

JSON Mode:
  When --json is enabled, the full RunResult is output as a single-line JSON object,
  suitable for machine parsing and integration with other tools.
`);
    }
    /**
     * Print detailed help for list command
     */
    printListHelp() {
        console.log(`
skill-combo list - List all discovered skills

Usage:
  skill-combo list [--source=FILTER] [--json]

Options:
  --source=FILTER  Filter by source: all|local|remote (default: all)
  --json           Output results as machine-readable JSON (single line)

Description:
  Lists all skills that have been discovered by the scan command.
  Use 'skill-combo scan' first to discover skills.

  Source filters:
    all     - Show all skills (default)
    local   - Show only locally installed skills
    remote  - Show only remote-only skills (from ClawHub, not installed)

  Indicators:
    [L]   - Local skill only
    [R]   - Remote-only skill (not installed locally)
    [L+R] - Local skill with remote metadata (also available on ClawHub)

Examples:
  skill-combo list
  skill-combo list --source=local
  skill-combo list --source=remote
  skill-combo list --json

Output:
  Shows the total count of skills and lists each skill with its ID and description.
  With --json: { "skills": [...], "count": number }
`);
    }
    /**
     * Print detailed help for combos command
     */
    printCombosHelp() {
        console.log(`
skill-combo combos - List all registered combos

Usage:
  skill-combo combos [--json]

Options:
  --json    Output results as machine-readable JSON (single line)

Description:
  Lists all combo definitions that are registered in the system.
  Combos are skill chains that can be executed together.

Examples:
  skill-combo combos
  skill-combo combos --json

Output:
  Shows the total count of combos and lists each combo with its name, type,
  execution mode, and the skill chain it contains.
  With --json: { "combos": [...], "count": number }
`);
    }
    /**
     * Print detailed help for search command
     */
    printSearchHelp() {
        console.log(`
skill-combo search - Search ClawHub remote registry for skills

Usage:
  skill-combo search <query> [--limit=N] [--json]

Arguments:
  query    Search query string

Options:
  --limit=N  Maximum number of results (default: 20)
  --json     Output results as machine-readable JSON (single line)

Description:
  Searches the ClawHub remote skill registry for skills matching the query.
  Results are marked with [R] indicator (remote).

Examples:
  skill-combo search testing
  skill-combo search "rest api"
  skill-combo search python --limit=10
  skill-combo search security --json

Output:
  Shows matching skills with [R] indicator, name, and description.
  With --json: { "skills": [...], "count": number, "query": string }
`);
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
        case '--version':
        case '-v': {
            console.log(require('../package.json').version);
            process.exit(0);
        }
        case 'scan': {
            // Parse flags for scan command
            const rawFlags = args.slice(1).filter(a => a.startsWith('--'));
            const flags = rawFlags.map(f => {
                const eqIdx = f.indexOf('=');
                return eqIdx === -1 ? f : f.substring(0, eqIdx);
            });
            const save = flags.includes('--save');
            const jsonOutput = flags.includes('--json');
            const remote = flags.includes('--remote');
            const forceRemote = flags.includes('--force');
            const getFlagValue = (flag, fallback) => {
                for (const f of rawFlags) {
                    const eqIdx = f.indexOf('=');
                    if (f.substring(0, eqIdx) === flag)
                        return f.substring(eqIdx + 1);
                }
                return fallback;
            };
            const remoteLimit = parseInt(getFlagValue('--limit', '0'), 10) || undefined;
            const remoteSort = getFlagValue('--sort', '');
            // Local scan always runs
            if (jsonOutput) {
                const result = await cli.scan(save, true);
                let remoteCount = 0;
                if (remote) {
                    try {
                        const client = new clawhub_client_1.ClawHubClient();
                        const scanner = new remote_scanner_1.RemoteScanner(adaptClient(client));
                        const remoteResult = await scanner.scan({ force: forceRemote, limit: remoteLimit, sort: remoteSort || undefined });
                        cli.getRegistry().mergeRemoteSkills(remoteResult.skills);
                        remoteCount = remoteResult.skills.length;
                    }
                    catch (e) {
                        console.error((0, colors_1.colorize)(`Remote scan failed: ${e.message}`, colors_1.warning));
                    }
                }
                const allSkills = cli.getRegistry().getAllSkills();
                console.log(JSON.stringify({ skills: allSkills, remoteCount, timestamp: result.timestamp }));
            }
            else {
                const result = await cli.scan(save);
                let remoteCount = 0;
                if (remote) {
                    try {
                        const client = new clawhub_client_1.ClawHubClient();
                        const scanner = new remote_scanner_1.RemoteScanner(adaptClient(client));
                        const remoteResult = await scanner.scan({ force: forceRemote, limit: remoteLimit, sort: remoteSort || undefined });
                        cli.getRegistry().mergeRemoteSkills(remoteResult.skills);
                        remoteCount = remoteResult.skills.length;
                        if (save)
                            cli.saveRegistry();
                    }
                    catch (e) {
                        console.error((0, colors_1.colorize)(`Remote scan failed: ${e.message}`, colors_1.warning));
                    }
                }
                console.log((0, colors_1.colorize)(`Scan complete: ${result.skills} local skills found, ${result.errors} errors`, result.errors > 0 ? colors_1.warning : colors_1.success));
                if (remote && remoteCount > 0) {
                    console.log((0, colors_1.colorize)(`  + ${remoteCount} remote skills from ClawHub`, colors_1.info));
                }
            }
            break;
        }
        case 'search': {
            const query = args[1];
            if (!query) {
                console.error('Usage: skill-combo search <query> [--limit=N] [--json]');
                process.exit(1);
            }
            const searchFlags = args.slice(2).filter(a => a.startsWith('--'));
            const searchFlagNames = searchFlags.map(f => {
                const eqIdx = f.indexOf('=');
                return eqIdx === -1 ? f : f.substring(0, eqIdx);
            });
            const jsonOutput = searchFlagNames.includes('--json');
            const getFlagValue = (flag, fallback) => {
                for (const f of searchFlags) {
                    const eqIdx = f.indexOf('=');
                    if (f.substring(0, eqIdx) === flag)
                        return f.substring(eqIdx + 1);
                }
                return fallback;
            };
            const searchLimit = parseInt(getFlagValue('--limit', '20'), 10);
            console.log((0, colors_1.colorize)(`🔍 Searching ClawHub for "${query}"...`, colors_1.info));
            try {
                const client = new clawhub_client_1.ClawHubClient();
                const scanner = new remote_scanner_1.RemoteScanner(adaptClient(client));
                const remoteResult = await scanner.scan({ search: query, limit: searchLimit });
                if (remoteResult.errors.length > 0) {
                    remoteResult.errors.forEach(e => {
                        console.error((0, colors_1.colorize)(`  Error: ${e.message}`, colors_1.warning));
                    });
                }
                const skills = remoteResult.skills.slice(0, searchLimit);
                if (jsonOutput) {
                    console.log(JSON.stringify({ skills, count: skills.length, query }));
                }
                else {
                    if (skills.length === 0) {
                        console.log((0, colors_1.colorize)('  No results found.', colors_1.warning));
                    }
                    else {
                        console.log(`Found ${skills.length} result(s):`);
                        skills.forEach(s => {
                            const owner = s.remote?.remoteOwner ? ` by ${s.remote.remoteOwner}` : '';
                            console.log(`  [R] ${s.id}: ${s.description}${owner}`);
                        });
                    }
                }
            }
            catch (e) {
                console.error((0, colors_1.colorize)(`Search failed: ${e.message}`, colors_1.error));
                process.exit(1);
            }
            break;
        }
        case 'list': {
            const rawFlags = args.slice(1).filter(a => a.startsWith('--'));
            const flags = rawFlags.map(f => {
                const eqIdx = f.indexOf('=');
                return eqIdx === -1 ? f : f.substring(0, eqIdx);
            });
            const jsonOutput = flags.includes('--json');
            const getFlagValue = (flag, fallback) => {
                for (const f of rawFlags) {
                    const eqIdx = f.indexOf('=');
                    if (f.substring(0, eqIdx) === flag)
                        return f.substring(eqIdx + 1);
                }
                return fallback;
            };
            const sourceFilter = getFlagValue('--source', 'all');
            let skills = cli.getRegistry().getAllSkills();
            if (sourceFilter === 'local') {
                skills = cli.getRegistry().getInstalledSkills();
            }
            else if (sourceFilter === 'remote') {
                skills = cli.getRegistry().getRemoteOnlySkills();
            }
            if (jsonOutput) {
                console.log(JSON.stringify({ skills: skills.map(s => ({ id: s.id, name: s.name, description: s.description, source: s.source })), count: skills.length, sourceFilter }));
            }
            else {
                console.log(`Found ${skills.length} skills (source: ${sourceFilter}):`);
                skills.forEach(s => {
                    const indicator = s.source === 'local' && s.remote ? '[L+R]' : s.source === 'local' ? '[L]' : '[R]';
                    console.log(`  ${indicator} ${s.id}: ${s.description}`);
                });
            }
            break;
        }
        case 'combos': {
            const rawFlags = args.slice(1).filter(a => a.startsWith('--'));
            const flags = rawFlags.map(f => {
                const eqIdx = f.indexOf('=');
                return eqIdx === -1 ? f : f.substring(0, eqIdx);
            });
            const jsonOutput = flags.includes('--json');
            const validate = flags.includes('--validate');
            const result = cli.listCombos();
            if (validate) {
                // Validate each combo's skills exist in registry
                let hasErrors = false;
                const registry = cli.getRegistry();
                for (const combo of result.combos) {
                    const missing = registry.validateComboSkills(combo);
                    if (missing.length === 0) {
                        console.log((0, colors_1.colorize)(`✓ ${combo.name}`, colors_1.success));
                    }
                    else {
                        console.log((0, colors_1.colorize)(`✗ ${combo.name}: missing ${missing.join(', ')}`, colors_1.error));
                        hasErrors = true;
                    }
                }
                if (hasErrors) {
                    process.exit(1);
                }
                break;
            }
            if (jsonOutput) {
                console.log(JSON.stringify({ combos: result.combos, count: result.count }));
            }
            else {
                console.log(`Found ${result.count} combos:`);
                result.combos.forEach(c => {
                    console.log(`  - ${c.name} (${c.type}/${c.execution}): ${c.skills.join(' -> ')}`);
                });
            }
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
            const jsonOutput = flags.includes('--json');
            const config = { debug, verbose };
            if (debug) {
                console.debug('[DEBUG] Debug mode enabled via --debug flag');
            }
            if (!comboName) {
                console.error('Usage: skill-combo run <combo-name> [--debug] [--dry-run] [--verbose] [--json]');
                process.exit(1);
            }
            // Use OpenCode invoker (real execution in OpenCode runtime, fallback to mock otherwise)
            const debugCli = new CLI(config);
            const invoker = (0, opencode_invoker_1.createOpenCodeInvoker)();
            // Validate combo exists before execution
            const combo = debugCli.getRegistry().getCombo(comboName);
            if (!combo) {
                if (jsonOutput) {
                    console.log(JSON.stringify({ success: false, outputs: {}, errors: [`Combo not found: ${comboName}`] }));
                    process.exit(1);
                }
                console.error((0, colors_1.colorize)(`✗ Combo not found: ${comboName}`, colors_1.error));
                console.error('Available combos:');
                if (debugCli.listCombos().count === 0) {
                    console.error('  (none - no combos registered)');
                }
                else {
                    debugCli.listCombos().combos.forEach(c => {
                        console.error(`  - ${c.name}`);
                    });
                }
                process.exit(1);
            }
            const result = await debugCli.runCombo(comboName, invoker, undefined, dryRun);
            if (jsonOutput) {
                console.log(JSON.stringify(result));
                return;
            }
            if (result.dryRun) {
                // Dry-run completed - plan was displayed, exit cleanly
                return;
            }
            if (result.success) {
                console.log((0, colors_1.colorize)('✓ Combo executed successfully!', colors_1.success));
                console.log('Outputs:', JSON.stringify(result.outputs, null, 2));
                displayExecutionStats(result, verbose);
            }
            else {
                console.error((0, colors_1.colorize)('✗ Combo execution failed:', colors_1.error));
                result.errors.forEach(err => { console.error((0, colors_1.colorize)(`  - ${err}`, colors_1.error)); });
                process.exit(1);
            }
            break;
        }
        case 'extract': {
            // skill-combo extract [--min-score=50] [--max=5] [--output-dir=./generated-skills/]
            const rawFlags = args.slice(2).filter(a => a.startsWith('--'));
            const flags = rawFlags.map(f => {
                const eqIdx = f.indexOf('=');
                return eqIdx === -1 ? f : f.substring(0, eqIdx);
            });
            const getFlagValue = (flag, fallback) => {
                for (const f of rawFlags) {
                    const eqIdx = f.indexOf('=');
                    if (f.substring(0, eqIdx) === flag)
                        return f.substring(eqIdx + 1);
                }
                return fallback;
            };
            const minScore = parseInt(getFlagValue('--min-score', '50'), 10);
            const maxSkills = parseInt(getFlagValue('--max', '5'), 10);
            const outputDir = getFlagValue('--output-dir', './generated-skills/');
            const jsonOutput = flags.includes('--json');
            // Validate output-dir: prevent path traversal
            const resolvedOutputDir = path.resolve(outputDir);
            if (outputDir.includes('..')) {
                console.error((0, colors_1.colorize)('✗ --output-dir cannot contain ".." (path traversal not allowed).', colors_1.error));
                process.exit(1);
            }
            console.log((0, colors_1.colorize)('🔍 Analyzing sessions for skill extraction patterns...', colors_1.info));
            const provider = (0, session_provider_1.createSessionProvider)();
            if (!provider.isAvailable()) {
                console.error((0, colors_1.colorize)('✗ No session data available. Run within OpenCode or provide prompt-history.jsonl.', colors_1.error));
                process.exit(1);
            }
            const sessions = await provider.listSessions(20);
            if (sessions.length === 0) {
                console.error((0, colors_1.colorize)('✗ No sessions found.', colors_1.error));
                process.exit(1);
            }
            console.log((0, colors_1.colorize)(`  Found ${sessions.length} session(s)`, colors_1.info));
            const miner = new pattern_miner_1.PatternMiner({
                min_worthiness: minScore,
                max_skills: maxSkills,
                output_dir: outputDir,
            });
            const patterns = miner.mine(sessions);
            if (patterns.length === 0) {
                console.log((0, colors_1.colorize)('  No skill-worthy patterns found. Try lowering --min-score.', colors_1.warning));
                process.exit(0);
            }
            console.log((0, colors_1.colorize)(`  Found ${patterns.length} pattern(s) above score ${minScore}`, colors_1.success));
            const generator = new skill_generator_1.SkillGenerator();
            const results = patterns.map(p => {
                const skill = generator.generate(p);
                const filePath = generator.save(skill, resolvedOutputDir);
                return { ...skill, file_path: filePath };
            });
            if (jsonOutput) {
                console.log(JSON.stringify({ success: true, patterns: results }, null, 2));
            }
            else {
                for (const r of results) {
                    console.log((0, colors_1.colorize)(`  ✓ Generated: ${r.file_path}`, colors_1.success));
                    console.log(`    Name: ${r.name}`);
                    console.log(`    Score: ${r.worthiness_score}/100`);
                    console.log(`    Pattern: ${r.patterns_used.join(' → ')}`);
                }
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
//# sourceMappingURL=cli.js.map