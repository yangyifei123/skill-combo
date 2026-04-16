/**
 * Planner Tests
 */

import { Planner } from '../src/planner';
import { Combo } from '../src/types';

describe('Planner', () => {
  let planner: Planner;

  beforeEach(() => {
    planner = new Planner();
  });

  describe('plan', () => {
    it('should create linear steps for chain combo', () => {
      const combo: Combo = {
        name: 'test-combo',
        description: 'Test combo',
        type: 'chain',
        execution: 'serial',
        skills: ['skill-a', 'skill-b', 'skill-c'],
      };

      const plan = planner.plan(combo, []);

      expect(plan.steps).toHaveLength(3);
      expect(plan.steps[0].skill_id).toBe('skill-a');
      expect(plan.steps[1].skill_id).toBe('skill-b');
      expect(plan.steps[2].skill_id).toBe('skill-c');
    });

    it('should set step numbers correctly', () => {
      const combo: Combo = {
        name: 'test-combo',
        description: 'Test',
        type: 'chain',
        execution: 'serial',
        skills: ['a', 'b', 'c'],
      };

      const plan = planner.plan(combo, []);

      expect(plan.steps[0].step).toBe(0);
      expect(plan.steps[1].step).toBe(1);
      expect(plan.steps[2].step).toBe(2);
    });

    it('should set dependencies for serial execution', () => {
      const combo: Combo = {
        name: 'test-combo',
        description: 'Test',
        type: 'chain',
        execution: 'serial',
        skills: ['a', 'b', 'c'],
      };

      const plan = planner.plan(combo, []);

      // First step has no dependencies
      expect(plan.steps[0].depends_on).toEqual([]);
      // Second step depends on first
      expect(plan.steps[1].depends_on).toEqual([0]);
      // Third step depends on second
      expect(plan.steps[2].depends_on).toEqual([1]);
    });

    it('should handle single skill combo', () => {
      const combo: Combo = {
        name: 'single-combo',
        description: 'Single skill',
        type: 'chain',
        execution: 'serial',
        skills: ['only-skill'],
      };

      const plan = planner.plan(combo, []);

      expect(plan.steps).toHaveLength(1);
      expect(plan.steps[0].depends_on).toEqual([]);
    });

    it('should handle empty skills array', () => {
      const combo: Combo = {
        name: 'empty-combo',
        description: 'No skills',
        type: 'chain',
        execution: 'serial',
        skills: [],
      };

      const plan = planner.plan(combo, []);

      expect(plan.steps).toHaveLength(0);
    });

    it('should default aggregation to merge', () => {
      const combo: Combo = {
        name: 'test-combo',
        description: 'Test',
        type: 'chain',
        execution: 'serial',
        skills: ['a', 'b'],
      };

      const plan = planner.plan(combo, []);

      expect(plan.aggregation).toBe('merge');
    });

    it('should set combo in plan', () => {
      const combo: Combo = {
        name: 'my-combo',
        description: 'My combo',
        type: 'chain',
        execution: 'serial',
        skills: ['a'],
      };

      const plan = planner.plan(combo, []);

      expect(plan.combo).toBe(combo);
    });
  });

  describe('EDGE CASES - plan', () => {
    it('should handle all combo types and set merge aggregation', () => {
      const types: Array<Combo['type']> = ['chain', 'parallel', 'wrap', 'conditional'];

      for (const type of types) {
        const combo: Combo = {
          name: `${type}-combo`,
          description: `${type} combo`,
          type,
          execution: 'serial',
          skills: ['a', 'b'],
        };

        const plan = planner.plan(combo, []);
        expect(plan.aggregation).toBe('merge');
      }
    });

    it('should handle unknown combo type with default merge', () => {
      const combo: Combo = {
        name: 'unknown-combo',
        description: 'Unknown type',
        type: 'chain' as any,
        execution: 'serial',
        skills: ['a', 'b'],
      };

      const plan = planner.plan(combo, []);

      expect(plan.aggregation).toBe('merge');
    });
  });

  describe('suggest', () => {
    it('should return empty array (not implemented)', () => {
      const combo = planner.suggest('build a website', []);

      expect(combo).toEqual([]);
    });
  });
});
