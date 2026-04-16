/**
 * CLI Tests
 */

import { CLI, DefaultInvoker } from '../src/cli';
import { Combo } from '../src/types';

describe('CLI', () => {
  let cli: CLI;

  beforeEach(() => {
    cli = new CLI();
  });

  describe('scan', () => {
    it('should return scan results', async () => {
      // Note: This test may return 0 skills if no skills are installed
      const result = await cli.scan();

      expect(result).toHaveProperty('skills');
      expect(result).toHaveProperty('errors');
      expect(typeof result.skills).toBe('number');
      expect(typeof result.errors).toBe('number');
    });
  });

  describe('listSkills', () => {
    it('should return skills list', () => {
      const result = cli.listSkills();

      expect(result).toHaveProperty('skills');
      expect(result).toHaveProperty('count');
      expect(Array.isArray(result.skills)).toBe(true);
    });

    it('should return skill info with expected fields', () => {
      // First add a skill
      const skill = {
        id: 'test-skill',
        name: 'Test Skill',
        description: 'A test skill',
        location: '/test/path',
        category: ['testing'],
        capabilities: ['test'],
        load_skills: [],
        inputs: [],
        outputs: [],
        compatibility: [],
        category_priority: 5,
      };
      cli.getRegistry().addSkill(skill);

      const result = cli.listSkills();

      expect(result.skills.length).toBeGreaterThan(0);
      const found = result.skills.find((s: any) => s.id === 'test-skill');
      expect(found).toBeDefined();
      expect(found.name).toBe('Test Skill');
      expect(found.description).toBe('A test skill');
    });
  });

  describe('listCombos', () => {
    it('should return combos list', () => {
      const result = cli.listCombos();

      expect(result).toHaveProperty('combos');
      expect(result).toHaveProperty('count');
      expect(Array.isArray(result.combos)).toBe(true);
    });

    it('should return combo info with expected fields', () => {
      const combo: Combo = {
        name: 'test-combo',
        description: 'A test combo',
        type: 'chain',
        execution: 'serial',
        skills: ['skill-a', 'skill-b'],
      };
      cli.registerCombo(combo);

      const result = cli.listCombos();

      expect(result.combos.length).toBeGreaterThan(0);
      const found = result.combos.find((c: any) => c.name === 'test-combo');
      expect(found).toBeDefined();
      expect(found.type).toBe('chain');
      expect(found.execution).toBe('serial');
      expect(found.skills).toEqual(['skill-a', 'skill-b']);
    });
  });

  describe('registerCombo', () => {
    it('should register a combo', () => {
      const combo: Combo = {
        name: 'new-combo',
        description: 'New combo',
        type: 'parallel',
        execution: 'parallel',
        skills: ['a', 'b'],
      };

      cli.registerCombo(combo);

      const retrieved = cli.getRegistry().getCombo('new-combo');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('new-combo');
    });
  });

  describe('getPlanner', () => {
    it('should return planner instance', () => {
      const planner = cli.getPlanner();
      expect(planner).toBeDefined();
    });
  });

  describe('getEngine', () => {
    it('should return engine instance', () => {
      const engine = cli.getEngine();
      expect(engine).toBeDefined();
    });
  });

  describe('getRegistry', () => {
    it('should return registry instance', () => {
      const registry = cli.getRegistry();
      expect(registry).toBeDefined();
    });
  });
});

describe('DefaultInvoker', () => {
  let invoker: DefaultInvoker;

  beforeEach(() => {
    invoker = new DefaultInvoker();
  });

  describe('invoke', () => {
    it('should return mock success result', async () => {
      const result = await invoker.invoke('test-skill', { input: 'data' });

      expect(result.success).toBe(true);
      expect(result.skill_id).toBe('test-skill');
      expect(result.result).toBeDefined();
      expect(result.tokens_used).toBe(10);
      expect(result.duration_ms).toBe(50);
    });
  });

  describe('isAvailable', () => {
    it('should always return true', async () => {
      const available = await invoker.isAvailable('any-skill');
      expect(available).toBe(true);
    });
  });
});

describe('main function', () => {
  // We can't easily test main() directly since it uses process.exit
  // But we can verify the CLI class works

  it('should work as expected', async () => {
    const cli = new CLI();
    const result = await cli.scan();
    expect(result).toHaveProperty('skills');
    expect(result).toHaveProperty('errors');
  });
});
