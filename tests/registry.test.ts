/**
 * Registry Tests
 * TDD: Tests written first to define expected behavior
 */

import { Registry } from '../src/registry';
import { Skill, Combo } from '../src/types';

describe('Registry', () => {
  let registry: Registry;

  beforeEach(() => {
    registry = new Registry();
  });

  describe('addSkill / getSkill', () => {
    it('should add a skill and retrieve it by id', () => {
      const skill: Skill = {
        id: 'test-skill',
        name: 'Test Skill',
        description: 'A test skill',
        location: '/path/to/test-skill/SKILL.md',
        category: ['testing'],
        capabilities: ['test'],
        load_skills: [],
        inputs: ['input1'],
        outputs: ['output1'],
        compatibility: [],
        category_priority: 5,
      };

      registry.addSkill(skill);
      const retrieved = registry.getSkill('test-skill');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Skill');
      expect(retrieved?.description).toBe('A test skill');
    });

    it('should return undefined for non-existent skill', () => {
      const retrieved = registry.getSkill('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should overwrite existing skill with same id', () => {
      const skill1: Skill = {
        id: 'test-skill',
        name: 'Skill V1',
        description: 'Version 1',
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
        name: 'Skill V2',
        description: 'Version 2',
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

      const retrieved = registry.getSkill('test-skill');
      expect(retrieved?.name).toBe('Skill V2');
    });
  });

  describe('getAllSkills', () => {
    it('should return all registered skills', () => {
      registry.addSkill({
        id: 'skill-1',
        name: 'Skill 1',
        description: '',
        location: '/path/1',
        category: [],
        capabilities: [],
        load_skills: [],
        inputs: [],
        outputs: [],
        compatibility: [],
        category_priority: 5,
      });

      registry.addSkill({
        id: 'skill-2',
        name: 'Skill 2',
        description: '',
        location: '/path/2',
        category: [],
        capabilities: [],
        load_skills: [],
        inputs: [],
        outputs: [],
        compatibility: [],
        category_priority: 5,
      });

      const all = registry.getAllSkills();
      expect(all).toHaveLength(2);
      expect(all.map(s => s.id)).toContain('skill-1');
      expect(all.map(s => s.id)).toContain('skill-2');
    });

    it('should return empty array when no skills registered', () => {
      const all = registry.getAllSkills();
      expect(all).toEqual([]);
    });
  });

  describe('querySkills', () => {
    beforeEach(() => {
      registry.addSkill({
        id: 'web-skill',
        name: 'Web Skill',
        description: 'Handles web development',
        location: '/path/web',
        category: ['web', 'frontend'],
        capabilities: ['html', 'css', 'javascript'],
        load_skills: [],
        inputs: ['design'],
        outputs: ['website'],
        compatibility: ['api-design'],
        category_priority: 8,
      });

      registry.addSkill({
        id: 'api-skill',
        name: 'API Skill',
        description: 'Handles API development',
        location: '/path/api',
        category: ['backend', 'api'],
        capabilities: ['rest', 'graphql'],
        load_skills: [],
        inputs: ['spec'],
        outputs: ['endpoints'],
        compatibility: ['web-skill'],
        category_priority: 7,
      });

      registry.addSkill({
        id: 'db-skill',
        name: 'Database Skill',
        description: 'Handles database',
        location: '/path/db',
        category: ['backend', 'database'],
        capabilities: ['sql', 'mongodb'],
        load_skills: [],
        inputs: ['schema'],
        outputs: ['queries'],
        compatibility: ['api-skill'],
        category_priority: 6,
      });
    });

    it('should query by category', () => {
      const results = registry.querySkills({ category: ['backend'] });
      expect(results).toHaveLength(2);
      expect(results.map(s => s.id)).toContain('api-skill');
      expect(results.map(s => s.id)).toContain('db-skill');
    });

    it('should query by capabilities', () => {
      const results = registry.querySkills({ capabilities: ['sql'] });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('db-skill');
    });

    it('should query by inputs', () => {
      const results = registry.querySkills({ inputs: ['spec'] });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('api-skill');
    });

    it('should query by outputs', () => {
      const results = registry.querySkills({ outputs: ['endpoints'] });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('api-skill');
    });

    it('should combine multiple criteria (AND)', () => {
      const results = registry.querySkills({
        category: ['backend'],
        capabilities: ['rest'],
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('api-skill');
    });

    it('should return empty array when no match', () => {
      const results = registry.querySkills({ category: ['nonexistent'] });
      expect(results).toEqual([]);
    });
  });

  describe('addCombo / getCombo', () => {
    it('should add a combo and retrieve it by name', () => {
      const combo: Combo = {
        name: 'web-dev-combo',
        description: 'Full web development',
        type: 'chain',
        execution: 'serial',
        skills: ['web-skill', 'api-skill', 'db-skill'],
      };

      registry.addCombo(combo);
      const retrieved = registry.getCombo('web-dev-combo');

      expect(retrieved).toBeDefined();
      expect(retrieved?.description).toBe('Full web development');
      expect(retrieved?.skills).toHaveLength(3);
    });

    it('should return undefined for non-existent combo', () => {
      const retrieved = registry.getCombo('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('listCombos', () => {
    it('should list all registered combos', () => {
      registry.addCombo({
        name: 'combo-1',
        description: 'Combo 1',
        type: 'chain',
        execution: 'serial',
        skills: ['skill-a'],
      });

      registry.addCombo({
        name: 'combo-2',
        description: 'Combo 2',
        type: 'chain',
        execution: 'serial',
        skills: ['skill-b'],
      });

      const all = registry.listCombos();
      expect(all).toHaveLength(2);
    });
  });

  describe('EDGE CASES - querySkills edge cases', () => {
    beforeEach(() => {
      // Re-add the standard skills for these edge case tests
      registry.addSkill({
        id: 'web-skill',
        name: 'Web Skill',
        description: 'Handles web development',
        location: '/path/web',
        category: ['web', 'frontend'],
        capabilities: ['html', 'css', 'javascript'],
        load_skills: [],
        inputs: ['design'],
        outputs: ['website'],
        compatibility: ['api-design'],
        category_priority: 8,
      });

      registry.addSkill({
        id: 'api-skill',
        name: 'API Skill',
        description: 'Handles API development',
        location: '/path/api',
        category: ['backend', 'api'],
        capabilities: ['rest', 'graphql'],
        load_skills: [],
        inputs: ['spec'],
        outputs: ['endpoints'],
        compatibility: ['web-skill'],
        category_priority: 7,
      });

      registry.addSkill({
        id: 'db-skill',
        name: 'Database Skill',
        description: 'Handles database',
        location: '/path/db',
        category: ['backend', 'database'],
        capabilities: ['sql', 'mongodb'],
        load_skills: [],
        inputs: ['schema'],
        outputs: ['queries'],
        compatibility: ['api-skill'],
        category_priority: 6,
      });

      registry.addSkill({
        id: 'skill-with-empty-arrays',
        name: 'Empty Arrays Skill',
        description: '',
        location: '/path',
        category: [],
        capabilities: [],
        load_skills: [],
        inputs: [],
        outputs: [],
        compatibility: [],
        category_priority: 5,
      });
    });

    it('should match skills with empty category when query category is empty', () => {
      // Empty criteria should match all skills
      const results = registry.querySkills({});
      expect(results.length).toBeGreaterThan(0);
    });

    it('should not match when skill has no matching capability', () => {
      const results = registry.querySkills({ capabilities: ['nonexistent'] });
      expect(results).toEqual([]);
    });

    it('should not match when skill has no matching input', () => {
      const results = registry.querySkills({ inputs: ['nonexistent'] });
      expect(results).toEqual([]);
    });

    it('should not match when skill has no matching output', () => {
      const results = registry.querySkills({ outputs: ['nonexistent'] });
      expect(results).toEqual([]);
    });

    it('should return empty array when registry is empty', () => {
      const emptyRegistry = new Registry();
      const results = emptyRegistry.querySkills({ category: ['web'] });
      expect(results).toEqual([]);
    });

    it('should match multiple categories with OR logic (criteria uses OR)', () => {
      // Query category: ['frontend', 'database'] means frontend OR database
      const results = registry.querySkills({ category: ['frontend', 'database'] });
      // web-skill has 'frontend', db-skill has 'database'
      expect(results.length).toBe(2);
      expect(results.map(s => s.id)).toContain('web-skill');
      expect(results.map(s => s.id)).toContain('db-skill');
    });

    it('should combine multiple different criteria with AND logic', () => {
      // Category AND capabilities must both match
      const results = registry.querySkills({
        category: ['backend'],
        capabilities: ['rest'],
      });
      // api-skill has both 'backend' category and 'rest' capability
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('api-skill');
    });
  });

  describe('EDGE CASES - clear and reset', () => {
    it('should clear all skills and combos', () => {
      registry.addSkill({
        id: 'test-skill',
        name: 'Test',
        description: '',
        location: '/path',
        category: [],
        capabilities: [],
        load_skills: [],
        inputs: [],
        outputs: [],
        compatibility: [],
        category_priority: 5,
      });

      registry.addCombo({
        name: 'test-combo',
        description: 'Test',
        type: 'chain',
        execution: 'serial',
        skills: ['test-skill'],
      });

      registry.clear();

      expect(registry.getAllSkills()).toEqual([]);
      expect(registry.listCombos()).toEqual([]);
      expect(registry.getSkill('test-skill')).toBeUndefined();
      expect(registry.getCombo('test-combo')).toBeUndefined();
    });

    it('should reset last_scan after clear', () => {
      registry.updateScanTimestamp();
      registry.clear();

      // After clear, last_scan should be 0
      expect((registry as any).last_scan).toBe(0);
    });
  });

  describe('EDGE CASES - duplicate handling', () => {
    it('should overwrite skill when adding with same id', () => {
      const skill1: Skill = {
        id: 'dup-skill',
        name: 'Original',
        description: 'Original desc',
        location: '/path1',
        category: ['cat1'],
        capabilities: [],
        load_skills: [],
        inputs: [],
        outputs: [],
        compatibility: [],
        category_priority: 5,
      };

      const skill2: Skill = {
        id: 'dup-skill',
        name: 'Updated',
        description: 'Updated desc',
        location: '/path2',
        category: ['cat2'],
        capabilities: [],
        load_skills: [],
        inputs: [],
        outputs: [],
        compatibility: [],
        category_priority: 6,
      };

      registry.addSkill(skill1);
      registry.addSkill(skill2);

      const retrieved = registry.getSkill('dup-skill');
      expect(retrieved?.name).toBe('Updated');
      expect(retrieved?.description).toBe('Updated desc');
    });

    it('should overwrite combo when adding with same name', () => {
      const combo1: Combo = {
        name: 'dup-combo',
        description: 'Original',
        type: 'chain',
        execution: 'serial',
        skills: ['skill-a'],
      };

      const combo2: Combo = {
        name: 'dup-combo',
        description: 'Updated',
        type: 'parallel',
        execution: 'parallel',
        skills: ['skill-b', 'skill-c'],
      };

      registry.addCombo(combo1);
      registry.addCombo(combo2);

      const retrieved = registry.getCombo('dup-combo');
      expect(retrieved?.description).toBe('Updated');
      expect(retrieved?.skills).toHaveLength(2);
    });
  });
});
