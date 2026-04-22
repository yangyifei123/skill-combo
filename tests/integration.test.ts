/**
 * Integration Tests for skill-combo CLI
 * Tests full workflow: scan → register → run with dry-run
 */

import { CLI, DefaultInvoker } from '../src/cli';
import { scanSkills, loadDefaultCombos } from '../src/index';
import { Combo } from '../src/types';

describe('Integration Tests', () => {
  let cli: CLI;
  let invoker: DefaultInvoker;

  beforeEach(() => {
    cli = new CLI();
    invoker = new DefaultInvoker();
  });

  describe('Full Workflow: scan → register → run', () => {
    it('should scan, load combos, and run with dry-run', async () => {
      // Step 1: Scan for skills (may find 0 in CI, that's OK)
      const scanResult = await cli.scan();
      expect(scanResult).toHaveProperty('skills');
      expect(scanResult).toHaveProperty('errors');
      expect(typeof scanResult.skills).toBe('number');
      expect(typeof scanResult.errors).toBe('number');

      // Step 2: Verify default combos are loaded
      const combosResult = cli.listCombos();
      expect(combosResult).toHaveProperty('combos');
      expect(combosResult).toHaveProperty('count');

      // Step 3: Run research-report with dry-run
      // Note: May fail if market-research or seo-content-writer not discovered
      // but the plan structure should still be correct if combo exists
      const result = await cli.runCombo('research-report', invoker, undefined, true);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('dryRun');
      expect(result.dryRun).toBe(true);

      // If combo exists (default combos loaded), verify plan structure
      if (result.plan) {
        expect(result.plan).toHaveProperty('skillOrder');
        expect(result.plan).toHaveProperty('totalSteps');
        expect(result.plan).toHaveProperty('comboName');
        expect(result.plan.skillOrder).toContain('content-research-writer');
        expect(result.plan.skillOrder).toContain('humanizer');
        expect(result.plan.totalSteps).toBe(2);
        expect(result.plan.comboName).toBe('research-report');
      }
    });

    it('should execute research-report dry-run and verify skill_ids', async () => {
      // Scan first
      await cli.scan();

      // Run dry-run
      const result = await cli.runCombo('research-report', invoker, undefined, true);

      // Verify dry-run returned plan info
      if (result.plan) {
        expect(result.plan.skillOrder).toEqual(
          expect.arrayContaining(['content-research-writer', 'humanizer'])
        );
        expect(result.plan.comboType).toBe('chain');
        expect(result.plan.executionMode).toBe('serial');
      }

      // Should not have errors in dry-run
      expect(result.errors).toHaveLength(0);
    });

    it('should load default combos and list them', () => {
      const defaultCombos = loadDefaultCombos();
      expect(Array.isArray(defaultCombos)).toBe(true);

      // If combos exist, verify structure
      if (defaultCombos.length > 0) {
        const combo = defaultCombos[0];
        expect(combo).toHaveProperty('name');
        expect(combo).toHaveProperty('type');
        expect(combo).toHaveProperty('execution');
        expect(combo).toHaveProperty('skills');
        expect(Array.isArray(combo.skills)).toBe(true);
      }
    });
  });

  describe('Invalid Combo Handling', () => {
    it('should return error for non-existent combo via runCombo', async () => {
      // Scan first
      await cli.scan();

      // Try to run a combo that doesn't exist
      const result = await cli.runCombo('non-existent-combo-xyz', invoker, undefined, false);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Combo not found: non-existent-combo-xyz');
    });

    it('should handle run with invalid combo gracefully in dry-run', async () => {
      await cli.scan();

      const result = await cli.runCombo('invalid-combo-123', invoker, undefined, true);

      expect(result.success).toBe(false);
      expect(result.dryRun).toBe(true); // dry-run flag is still true even on validation error
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should register and run custom combo', async () => {
      const customCombo: Combo = {
        name: 'test-custom-combo',
        description: 'A custom test combo',
        type: 'chain',
        execution: 'serial',
        skills: ['test-skill-a', 'test-skill-b'],
      };

      cli.registerCombo(customCombo);

      // Verify it's registered
      const combosResult = cli.listCombos();
      const found = combosResult.combos.find((c: any) => c.name === 'test-custom-combo');
      expect(found).toBeDefined();

      // Run with dry-run
      const result = await cli.runCombo('test-custom-combo', invoker, undefined, true);

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.plan?.skillOrder).toEqual(['test-skill-a', 'test-skill-b']);
    });
  });

  describe('scanSkills standalone', () => {
    it('should work as standalone function', async () => {
      const result = await scanSkills();

      expect(result).toHaveProperty('skills');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.skills)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
});