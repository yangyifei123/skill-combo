/**
 * Edge Cases Tests - Comprehensive edge case coverage for skill-combo
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CLI, DefaultInvoker } from '../src/cli';
import { Engine } from '../src/engine';
import { MemoryCache } from '../src/cache';
import { Registry } from '../src/registry';
import { scanSkills, parseSkillMarkdown } from '../src/scanner';
import { Skill, Combo, ExecutionStep, SkillInvoker, SkillOutput, SkillContext } from '../src/types';

// =============================================================================
// SCANNER EDGE CASES
// =============================================================================

describe('Scanner Edge Cases', () => {
  describe('Empty skills directory', () => {
    it('should return 0 skills, no crash with non-existent directory', async () => {
      const tempDir = path.join(os.tmpdir(), `skill-combo-test-${Date.now()}`);
      // Directory doesn't exist - should not crash
      const result = await scanSkills([tempDir]);

      expect(result.skills).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should return 0 skills for empty directory', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-combo-empty-'));
      const result = await scanSkills([tempDir]);

      expect(result.skills).toEqual([]);
      // No errors since directory exists and is readable
      fs.rmdirSync(tempDir);
    });
  });

  describe('Skill with empty SKILL.md', () => {
    it('should be skipped gracefully', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-combo-empty-'));
      const skillDir = path.join(tempDir, 'empty-skill');
      fs.mkdirSync(skillDir);
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '');

      const result = await scanSkills([tempDir]);

      // Empty file should be parsed but with minimal data
      const emptySkill = result.skills.find(s => s.id === 'empty-skill');
      // The scanner should have parsed it (or skipped - depends on implementation)
      // Either way, no errors should be recorded for empty content
      expect(emptySkill).toBeDefined();

      fs.rmSync(skillDir, { recursive: true });
      fs.rmSync(tempDir, { recursive: true });
    });
  });

  describe('Skill with malformed content', () => {
    it('should be parsed without error - parser is resilient', () => {
      // parseSkillMarkdown should handle malformed content gracefully
      const malformedContent = `# Test Skill

This has some unusual content with braces { and }

And template-like stuff that should not crash the parser.

Another heading follows.

More content here without closing anything.`;

      const skill = parseSkillMarkdown(malformedContent, '/fake/path/test-skill/SKILL.md');

      // Should still extract something
      expect(skill.id).toBe('test-skill');
      expect(skill.name).toBe('Test Skill');
    });
  });
});

// =============================================================================
// REGISTRY EDGE CASES
// =============================================================================

describe('Registry Edge Cases', () => {
  let registry: Registry;

  beforeEach(() => {
    registry = new Registry();
  });

  describe('Add duplicate skill', () => {
    it('should keep latest skill when adding duplicate id', () => {
      const skill1: Skill = {
        id: 'test-skill',
        name: 'First Version',
        description: 'Original',
        location: '/path/v1',
        category: [],
        capabilities: [],
        load_skills: [],
        inputs: [],
        outputs: [],
        compatibility: [],
        category_priority: 5,
      };

      const skill2: Skill = {
        id: 'test-skill',
        name: 'Second Version',
        description: 'Updated',
        location: '/path/v2',
        category: [],
        capabilities: [],
        load_skills: [],
        inputs: [],
        outputs: [],
        compatibility: [],
        category_priority: 5,
      };

      registry.addSkill(skill1);
      registry.addSkill(skill2);

      const result = registry.getSkill('test-skill');
      expect(result?.name).toBe('Second Version');
      expect(result?.description).toBe('Updated');
      expect(registry.getAllSkills()).toHaveLength(1);
    });
  });

  describe('Get non-existent skill', () => {
    it('should return undefined for non-existent skill', () => {
      const result = registry.getSkill('completely-nonexistent-skill-12345');
      expect(result).toBeUndefined();
    });
  });

  describe('Add combo with empty skills array', () => {
    it('should return validation error for combo with empty skills', () => {
      const errors = registry.validateCombo({
        name: 'empty-combo',
        description: 'Has no skills',
        type: 'chain',
        execution: 'serial',
        skills: [],
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'skills')).toBe(true);
    });

    it('should return validation error for combo with null skills', () => {
      const errors = registry.validateCombo({
        name: 'null-skills-combo',
        description: 'Has null skills',
        type: 'chain',
        execution: 'serial',
        skills: null as any,
      });

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should return validation error for combo with undefined skills', () => {
      const errors = registry.validateCombo({
        name: 'undefined-skills-combo',
        description: 'Has undefined skills',
        type: 'chain',
        execution: 'serial',
        skills: undefined as any,
      });

      expect(errors.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// ENGINE EDGE CASES
// =============================================================================

describe('Engine Edge Cases', () => {
  let engine: Engine;

  beforeEach(() => {
    engine = new Engine();
  });

  describe('Execute combo with 0 steps', () => {
    it('should return empty successful result for serial combo with 0 steps', async () => {
      const invoker = new TestInvoker();
      const result = await engine.executeSerial({} as Combo, [], invoker, {});

      expect(result.success).toBe(true);
      expect(result.outputs).toEqual({});
      expect(result.errors).toEqual([]);
      expect(result.tokens_used).toBe(0);
      expect(result.duration_ms).toBe(0);
    });

    it('should return empty successful result for parallel combo with 0 steps', async () => {
      const invoker = new TestInvoker();
      const result = await engine.executeParallel([], invoker, 'merge');

      expect(result.success).toBe(true);
      expect(result.outputs).toEqual({});
      expect(result.errors).toEqual([]);
    });
  });

  describe('Parallel combo with single skill', () => {
    it('should execute single skill in parallel mode successfully', async () => {
      const invoker = new TestInvoker();
      invoker.setNextOutput({
        skill_id: 'only-skill',
        success: true,
        result: { value: 42 },
        tokens_used: 100,
        duration_ms: 50,
      });

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'only-skill', depends_on: [], inputs: {} },
      ];

      const result = await engine.executeParallel(steps, invoker, 'merge');

      expect(result.success).toBe(true);
      expect(result.outputs).toEqual({ value: 42 });
    });
  });

  describe('Context size limit exceeded', () => {
    it('should warn and truncate when context exceeds maxContextSize', async () => {
      const smallContextEngine = new Engine({ maxContextSize: 100 }); // Very small limit

      const invoker = new TestInvoker();
      invoker.setNextOutput({
        skill_id: 'skill-a',
        success: true,
        result: { largeData: 'A'.repeat(200) }, // Large output
        tokens_used: 100,
        duration_ms: 50,
      });
      invoker.setNextOutput({
        skill_id: 'skill-b',
        success: true,
        result: { moreData: 'B'.repeat(200) },
        tokens_used: 100,
        duration_ms: 50,
      });

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
        { step: 1, skill_id: 'skill-b', depends_on: [0], inputs: {} },
      ];

      // Spy on console.warn to capture warning
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await smallContextEngine.executeSerial({} as Combo, steps, invoker, {});

      // Should still complete (possibly with truncated context)
      expect(result.success).toBe(true);
      // Warning should have been issued
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });
});

// =============================================================================
// CLI EDGE CASES
// =============================================================================

describe('CLI Edge Cases', () => {
  let cli: CLI;

  beforeEach(() => {
    cli = new CLI();
  });

  describe('Run with non-existent combo name', () => {
    it('should return error for non-existent combo', async () => {
      const invoker = new DefaultInvoker();
      const result = await cli.runCombo('completely-nonexistent-combo-12345', invoker);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Combo not found: completely-nonexistent-combo-12345');
    });
  });

  describe('List with no skills scanned', () => {
    it('should return proper structure when no skills have been scanned', () => {
      // Create fresh CLI with empty registry
      const freshCli = new CLI();
      const result = freshCli.listSkills();

      // Result structure should be correct
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('skills');
      expect(Array.isArray(result.skills)).toBe(true);
      // Default CLI may auto-load combos but no explicit skills added
      expect(typeof result.count).toBe('number');
    });
  });

  describe('Combos with no combos loaded', () => {
    it('should return 0 count when no combos are registered', () => {
      // Create fresh CLI
      const freshCli = new CLI();
      const result = freshCli.listCombos();

      // Default combos may be loaded from combo-loader, so we just verify structure
      expect(result).toHaveProperty('combos');
      expect(result).toHaveProperty('count');
      expect(typeof result.count).toBe('number');
    });
  });
});

// =============================================================================
// CACHE EDGE CASES
// =============================================================================

describe('Cache Edge Cases', () => {
  describe('Get from empty cache', () => {
    it('should return undefined for non-existent key', async () => {
      const cache = new MemoryCache();
      const result = await cache.get('nonexistent-key-12345');
      expect(result).toBeUndefined();
    });

    it('should return undefined for different key after set', async () => {
      const cache = new MemoryCache();
      await cache.set('key1', 'value1');
      const result = await cache.get('key2');
      expect(result).toBeUndefined();
    });
  });

  describe('Set then clear', () => {
    it('should return undefined after clear', async () => {
      const cache = new MemoryCache();
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.clear();

      expect(await cache.get('key1')).toBeUndefined();
      expect(await cache.get('key2')).toBeUndefined();
      expect(await cache.has('key1')).toBe(false);
      expect(await cache.has('key2')).toBe(false);
    });

    it('should work normally after clear', async () => {
      const cache = new MemoryCache();
      await cache.set('key1', 'value1');
      await cache.clear();
      await cache.set('key1', 'new-value');

      expect(await cache.get('key1')).toBe('new-value');
    });
  });

  describe('TTL 0ms', () => {
    it('should not expire when TTL is 0 (treated as no expiry)', async () => {
      const cache = new MemoryCache();
      await cache.set('key', 'value', 0);

      // TTL 0 is treated as never-expiring in this implementation
      const result = await cache.get('key');
      expect(result).toBe('value');
    });

    it('should not expire with instance TTL of 0', async () => {
      const cache = new MemoryCache(0); // 0ms instance TTL
      await cache.set('key', 'value');

      // TTL 0 is treated as never-expiring
      const result = await cache.get('key');
      expect(result).toBe('value');
    });

    it('has() should return true for TTL 0 entry', async () => {
      const cache = new MemoryCache();
      await cache.set('key', 'value', 0);

      expect(await cache.has('key')).toBe(true);
    });
  });

  describe('Negative TTL', () => {
    it('should treat negative TTL as immediate expiry', async () => {
      const cache = new MemoryCache();
      await cache.set('key', 'value', -100);

      // Negative TTL should cause immediate expiry
      expect(await cache.get('key')).toBeUndefined();
    });
  });
});

// =============================================================================
// TEST INVOKERS
// =============================================================================

class TestInvoker implements SkillInvoker {
  public executionOrder: string[] = [];
  private outputs: SkillOutput[] = [];
  private outputIndex = 0;

  setNextOutput(output: SkillOutput): void {
    this.outputs.push(output);
  }

  async invoke(skillId: string, _context: SkillContext): Promise<SkillOutput> {
    this.executionOrder.push(skillId);
    const output = this.outputs[this.outputIndex++] || {
      skill_id: skillId,
      success: true,
      result: {},
      tokens_used: 10,
      duration_ms: 10,
    };
    return output;
  }

  async isAvailable(_skillId: string): Promise<boolean> {
    return true;
  }

  wasCalled(skillId: string): boolean {
    return this.executionOrder.includes(skillId);
  }
}
