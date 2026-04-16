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
});
