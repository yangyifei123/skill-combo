/**
 * CLI Error Handling & Coverage Tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { CLI, DefaultInvoker } from '../src/cli';

const REGISTRY_FILE = '.skill-combo-registry.json';

describe('CLI Error Handling & Coverage', () => {
  const testDir = process.cwd();
  const registryPath = path.join(testDir, REGISTRY_FILE);

  // Clean up registry file before/after each test
  beforeEach(() => {
    if (fs.existsSync(registryPath)) {
      fs.unlinkSync(registryPath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(registryPath)) {
      fs.unlinkSync(registryPath);
    }
  });

  describe('1. CLI.scan() with save=true creates .skill-combo-registry.json', () => {
    it('should create registry file when save=true', async () => {
      const cli = new CLI();
      await cli.scan(true);

      expect(fs.existsSync(registryPath)).toBe(true);

      const content = fs.readFileSync(registryPath, 'utf-8');
      const snapshot = JSON.parse(content);

      expect(snapshot).toHaveProperty('skills');
      expect(snapshot).toHaveProperty('combos');
      expect(snapshot).toHaveProperty('timestamp');
      expect(Array.isArray(snapshot.skills)).toBe(true);
      expect(Array.isArray(snapshot.combos)).toBe(true);
    });
  });

  describe('2. CLI.scan() with save=false does not create file', () => {
    it('should NOT create registry file when save=false', async () => {
      const cli = new CLI();
      await cli.scan(false);

      expect(fs.existsSync(registryPath)).toBe(false);
    });

    it('should NOT create registry file by default (no argument)', async () => {
      const cli = new CLI();
      await cli.scan();

      expect(fs.existsSync(registryPath)).toBe(false);
    });
  });

  describe('3. CLI.runCombo() with invalid combo name returns error', () => {
    it('should return error result for non-existent combo', async () => {
      const cli = new CLI();
      const invoker = new DefaultInvoker();

      const result = await cli.runCombo('non-existent-combo-xyz', invoker);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Combo not found');
    });
  });

  describe('4. CLI.runCombo() with --json flag outputs JSON', () => {
    it('should produce JSON-serializable result', async () => {
      const cli = new CLI();
      const invoker = new DefaultInvoker();

      // Use a valid default combo
      const result = await cli.runCombo('frontend-dev', invoker, undefined, true);

      // Should not throw when stringified
      expect(() => JSON.stringify(result)).not.toThrow();

      const json = JSON.parse(JSON.stringify(result));
      expect(json).toHaveProperty('success');
      expect(json).toHaveProperty('outputs');
      expect(json).toHaveProperty('errors');
    });
  });

  describe('5. CLI.runCombo() with --verbose shows step details', () => {
    it('should include step stats in result', async () => {
      const cli = new CLI({ verbose: true });
      const invoker = new DefaultInvoker();

      // Use dryRun=false to get actual execution with stats
      const result = await cli.runCombo('frontend-dev', invoker, undefined, false);

      expect(result).toHaveProperty('stats');
      expect(result.stats).toHaveProperty('steps');
      expect(result.stats).toHaveProperty('totalTokens');
      expect(result.stats).toHaveProperty('totalDuration');
    });
  });

  describe('6. CLI.listSkills() after scan shows correct count', () => {
    it('should return skills discovered by scan', async () => {
      const cli = new CLI();
      const scanResult = await cli.scan();

      const listResult = cli.listSkills();

      expect(listResult).toHaveProperty('count');
      expect(listResult).toHaveProperty('skills');
      expect(typeof listResult.count).toBe('number');
      expect(Array.isArray(listResult.skills)).toBe(true);
      expect(listResult.count).toBe(scanResult.skills);
    });
  });

  describe('7. CLI.listCombos() after loadDefaultCombos shows 10', () => {
    it('should show 10 default combos', () => {
      const cli = new CLI();
      const result = cli.listCombos();

      expect(result.count).toBe(10);
      expect(result.combos.length).toBe(10);

      // Verify specific expected combos exist
      const comboNames = result.combos.map((c: any) => c.name);
      expect(comboNames).toContain('frontend-dev');
      expect(comboNames).toContain('api-first');
      expect(comboNames).toContain('deploy-pipeline');
    });
  });

  describe('8. CLI.main() with unknown command prints error', () => {
    it('should handle unknown command gracefully', async () => {
      // We capture console.log to verify help output (unknown falls through to help)
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // Import main fresh to avoid state issues
      const { main } = await import('../src/cli');
      await main(['unknown-command-xyz']);

      // Unknown command falls through to help, which uses console.log
      expect(consoleSpy).toHaveBeenCalled();
      // It should not crash

      consoleSpy.mockRestore();
    });
  });

  describe('9. CLI.main() with --help shows help text', () => {
    it('should display help when help command is called', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const { main } = await import('../src/cli');
      await main(['help']);

      expect(consoleSpy).toHaveBeenCalled();
      const helpOutput = consoleSpy.mock.calls.join('');
      expect(helpOutput).toContain('skill-combo');

      consoleSpy.mockRestore();
    });
  });

  describe('10. CLI persistence: scan --save, new CLI instance, list loads from file', () => {
    it('should persist and restore registry across CLI instances', async () => {
      // First CLI: scan and save
      const cli1 = new CLI();
      await cli1.scan(true);
      const listResult1 = cli1.listSkills();

      expect(fs.existsSync(registryPath)).toBe(true);

      // Second CLI: should auto-load from file
      const cli2 = new CLI();
      const listResult2 = cli2.listSkills();

      // Both should show the same skills
      expect(listResult2.count).toBe(listResult1.count);

      // Verify the file was actually persisted with the skills from first scan
      const content = fs.readFileSync(registryPath, 'utf-8');
      const snapshot = JSON.parse(content);

      expect(snapshot.skills).toBeDefined();
      expect(Array.isArray(snapshot.skills)).toBe(true);
    });

    it('should persist combos across CLI instances', async () => {
      // First CLI: scan and save
      const cli1 = new CLI();
      await cli1.scan(true);
      const combosResult1 = cli1.listCombos();

      // Second CLI: should have same combos
      const cli2 = new CLI();
      const combosResult2 = cli2.listCombos();

      expect(combosResult2.count).toBe(combosResult1.count);
      expect(combosResult2.count).toBe(10);
    });
  });
});
