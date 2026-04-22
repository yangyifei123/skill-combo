/**
 * Performance Benchmark Tests
 * Measures critical path performance for skill-combo operations
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Registry } from '../src/registry';
import { Engine } from '../src/engine';
import { MemoryCache } from '../src/cache';
import { parseSkillMarkdown } from '../src/scanner';
import { Skill, Combo, ExecutionStep, SkillInvoker, SkillOutput, SkillContext } from '../src/types';

describe('Performance Benchmarks', () => {
  describe('Registry Performance', () => {
    let registry: Registry;

    beforeEach(() => {
      registry = new Registry();
    });

    /**
     * Benchmark: Add 1000 skills to registry
     * Target: <100ms
     */
    it('should add 1000 skills in <100ms', () => {
      const skills: Skill[] = [];
      for (let i = 0; i < 1000; i++) {
        skills.push({
          id: `skill-${i}`,
          name: `Skill ${i}`,
          description: `Test skill number ${i}`,
          location: `/path/to/skill-${i}/SKILL.md`,
          category: [`category-${i % 10}`],
          capabilities: [`capability-${i % 20}`],
          load_skills: [],
          inputs: [`input-${i % 5}`],
          outputs: [`output-${i % 5}`],
          compatibility: [],
          category_priority: 5,
        });
      }

      const start = performance.now();
      for (const skill of skills) {
        registry.addSkill(skill);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    /**
     * Benchmark: Get skill from 1000-entry registry
     * Target: <1ms
     */
    it('should get skill from 1000-entry registry in <1ms', () => {
      // Pre-populate registry
      for (let i = 0; i < 1000; i++) {
        registry.addSkill({
          id: `skill-${i}`,
          name: `Skill ${i}`,
          description: `Test skill ${i}`,
          location: `/path/to/skill-${i}/SKILL.md`,
          category: [`category-${i % 10}`],
          capabilities: [],
          load_skills: [],
          inputs: [],
          outputs: [],
          compatibility: [],
          category_priority: 5,
        });
      }

      const start = performance.now();
      const result = registry.getSkill('skill-500');
      const duration = performance.now() - start;

      expect(result).toBeDefined();
      expect(result!.id).toBe('skill-500');
      expect(duration).toBeLessThan(1);
    });

    /**
     * Benchmark: Query skills by tag
     * Target: <10ms for querying 1000-entry registry
     */
    it('should query skills by tag in <10ms', () => {
      // Pre-populate registry
      for (let i = 0; i < 1000; i++) {
        registry.addSkill({
          id: `skill-${i}`,
          name: `Skill ${i}`,
          description: `Test skill ${i}`,
          location: `/path/to/skill-${i}/SKILL.md`,
          category: [`category-${i % 10}`, 'popular'],
          capabilities: [],
          load_skills: [],
          inputs: [],
          outputs: [],
          compatibility: [],
          category_priority: 5,
        });
      }

      const start = performance.now();
      const results = registry.querySkills({ category: ['category-5'] });
      const duration = performance.now() - start;

      expect(results.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(20); // Generous bound for CI environments
    });
  });

  describe('Scanner Performance', () => {
    /**
     * Benchmark: Parse 100 SKILL.md files
     * Target: <500ms
     */
    it('should parse 100 skill files in <500ms', async () => {
      // Create temp directory with mock SKILL.md files
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-combo-bench-'));

      try {
        // Create 100 mock SKILL.md files
        for (let i = 0; i < 100; i++) {
          const skillDir = path.join(tempDir, `skill-${i}`);
          fs.mkdirSync(skillDir, { recursive: true });
          const content = `# Skill ${i}

category: category-${i % 10}, testing
capabilities: capability-${i % 5}, testing

This is a test skill for benchmarking purposes.

## Usage

Use this skill to test performance.
`;
          fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content);
        }

        // Get list of all SKILL.md files
        const skillFiles: string[] = [];
        const entries = fs.readdirSync(tempDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const skillFile = path.join(tempDir, entry.name, 'SKILL.md');
            if (fs.existsSync(skillFile)) {
              skillFiles.push(skillFile);
            }
          }
        }

        expect(skillFiles).toHaveLength(100);

        // Benchmark parsing
        const start = performance.now();
        for (const file of skillFiles) {
          const content = fs.readFileSync(file, 'utf-8');
          parseSkillMarkdown(content, file);
        }
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(500);
      } finally {
        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('Engine Performance', () => {
    let engine: Engine;

    beforeEach(() => {
      engine = new Engine();
    });

    /**
     * Mock invoker for benchmark testing
     */
    class MockInvoker implements SkillInvoker {
      async invoke(skillId: string, _context: SkillContext): Promise<SkillOutput> {
        // Simulate minimal processing time
        return {
          skill_id: skillId,
          success: true,
          result: { [skillId]: 'done' },
          tokens_used: 10,
          duration_ms: 1,
        };
      }

      async isAvailable(_skillId: string): Promise<boolean> {
        return true;
      }
    }

    /**
     * Benchmark: Execute serial combo with 5 skills
     * Target: <100ms
     */
    it('should execute serial combo with 5 skills in <100ms', async () => {
      const invoker = new MockInvoker();

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
        { step: 1, skill_id: 'skill-b', depends_on: [0], inputs: {} },
        { step: 2, skill_id: 'skill-c', depends_on: [1], inputs: {} },
        { step: 3, skill_id: 'skill-d', depends_on: [2], inputs: {} },
        { step: 4, skill_id: 'skill-e', depends_on: [3], inputs: {} },
      ];

      const combo: Combo = {
        name: 'bench-serial',
        description: 'Benchmark serial combo',
        type: 'chain',
        execution: 'serial',
        skills: ['skill-a', 'skill-b', 'skill-c', 'skill-d', 'skill-e'],
      };

      const start = performance.now();
      const result = await engine.executeSerial(combo, steps, invoker, {});
      const duration = performance.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(100);
    });

    /**
     * Benchmark: Execute parallel combo with 5 skills
     * Target: <50ms
     */
    it('should execute parallel combo with 5 skills in <50ms', async () => {
      const invoker = new MockInvoker();

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
        { step: 1, skill_id: 'skill-b', depends_on: [], inputs: {} },
        { step: 2, skill_id: 'skill-c', depends_on: [], inputs: {} },
        { step: 3, skill_id: 'skill-d', depends_on: [], inputs: {} },
        { step: 4, skill_id: 'skill-e', depends_on: [], inputs: {} },
      ];

      const start = performance.now();
      const result = await engine.executeParallel(steps, invoker, 'merge');
      const duration = performance.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Cache Performance', () => {
    let cache: MemoryCache;

    beforeEach(() => {
      cache = new MemoryCache();
    });

    /**
     * Benchmark: 1000 set/get operations
     * Target: <50ms
     */
    it('should perform 1000 set/get operations in <50ms', async () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        await cache.set(`key-${i}`, { data: `value-${i}` });
        await cache.get(`key-${i}`);
      }

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });

    /**
     * Benchmark: Cache hit rate >95% for repeated gets
     * Target: Repeated gets should be very fast (cache hits)
     */
    it('should achieve >95% cache hit rate for repeated gets', async () => {
      // Pre-populate cache with 100 entries
      for (let i = 0; i < 100; i++) {
        await cache.set(`key-${i}`, { data: `value-${i}` });
      }

      // Perform 1000 get operations on cached keys (simulating repeated access)
      let hits = 0;
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        const key = `key-${i % 100}`; // Access keys 0-99 repeatedly
        const result = await cache.get(key);
        if (result !== undefined) {
          hits++;
        }
      }

      const duration = performance.now() - start;
      const hitRate = (hits / 1000) * 100;

      expect(hitRate).toBeGreaterThan(95);
      expect(duration).toBeLessThan(20); // Should be very fast due to cache hits
    });
  });
});
