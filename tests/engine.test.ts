/**
 * Engine Tests - Serial Combo Execution
 * TDD: Tests written first to define expected behavior
 */

import { Engine } from '../src/engine';
import { Combo, ExecutionPlan, ExecutionStep, SkillInvoker, SkillOutput, SkillContext } from '../src/types';

describe('Engine - Serial Execution', () => {
  let engine: Engine;

  beforeEach(() => {
    engine = new Engine();
  });

  describe('executeSerial', () => {
    it('should execute steps in order', async () => {
      const invoker = new TestInvoker();
      invoker.setNextOutput({
        skill_id: 'skill-a',
        success: true,
        result: { data: 'from-a' },
        tokens_used: 100,
        duration_ms: 50,
      });
      invoker.setNextOutput({
        skill_id: 'skill-b',
        success: true,
        result: { data: 'from-b' },
        tokens_used: 100,
        duration_ms: 50,
      });

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
        { step: 1, skill_id: 'skill-b', depends_on: [0], inputs: {} },
      ];

      const result = await engine.executeSerial(steps, invoker);

      expect(result.success).toBe(true);
      expect(invoker.executionOrder).toEqual(['skill-a', 'skill-b']);
    });

    it('should aggregate outputs from all steps', async () => {
      const invoker = new TestInvoker();
      invoker.setNextOutput({
        skill_id: 'skill-a',
        success: true,
        result: { value: 1 },
        tokens_used: 50,
        duration_ms: 30,
      });
      invoker.setNextOutput({
        skill_id: 'skill-b',
        success: true,
        result: { value: 2 },
        tokens_used: 60,
        duration_ms: 40,
      });

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
        { step: 1, skill_id: 'skill-b', depends_on: [0], inputs: {} },
      ];

      const result = await engine.executeSerial(steps, invoker);

      expect(result.outputs['skill-a']).toBeDefined();
      expect(result.outputs['skill-b']).toBeDefined();
    });

    it('should track total tokens used', async () => {
      const invoker = new TestInvoker();
      invoker.setNextOutput({
        skill_id: 'skill-a',
        success: true,
        result: {},
        tokens_used: 100,
        duration_ms: 50,
      });
      invoker.setNextOutput({
        skill_id: 'skill-b',
        success: true,
        result: {},
        tokens_used: 200,
        duration_ms: 75,
      });

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
        { step: 1, skill_id: 'skill-b', depends_on: [0], inputs: {} },
      ];

      const result = await engine.executeSerial(steps, invoker);

      expect(result.tokens_used).toBe(300);
    });

    it('should track total duration', async () => {
      const invoker = new TestInvoker();
      invoker.setNextOutput({
        skill_id: 'skill-a',
        success: true,
        result: {},
        tokens_used: 100,
        duration_ms: 50,
      });
      invoker.setNextOutput({
        skill_id: 'skill-b',
        success: true,
        result: {},
        tokens_used: 100,
        duration_ms: 75,
      });

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
        { step: 1, skill_id: 'skill-b', depends_on: [0], inputs: {} },
      ];

      const result = await engine.executeSerial(steps, invoker);

      expect(result.duration_ms).toBe(125);
    });

    it('should handle skill failure', async () => {
      const invoker = new TestInvoker();
      invoker.setNextOutput({
        skill_id: 'skill-a',
        success: false,
        result: null,
        error: 'Skill A failed',
        tokens_used: 50,
        duration_ms: 30,
      });

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
        { step: 1, skill_id: 'skill-b', depends_on: [0], inputs: {} },
      ];

      const result = await engine.executeSerial(steps, invoker);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Skill A failed');
    });

    it('should stop execution on first error in serial mode', async () => {
      const invoker = new TestInvoker();
      invoker.setNextOutput({
        skill_id: 'skill-a',
        success: true,
        result: {},
        tokens_used: 50,
        duration_ms: 30,
      });
      invoker.setNextOutput({
        skill_id: 'skill-b',
        success: false,
        result: null,
        error: 'Skill B failed',
        tokens_used: 75,
        duration_ms: 40,
      });

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
        { step: 1, skill_id: 'skill-b', depends_on: [0], inputs: {} },
        { step: 2, skill_id: 'skill-c', depends_on: [1], inputs: {} },
      ];

      const result = await engine.executeSerial(steps, invoker);

      expect(result.success).toBe(false);
      // skill-c should not have been called
      expect(invoker.wasCalled('skill-c')).toBe(false);
    });
  });

  describe('execute (dispatcher)', () => {
    it('should dispatch to executeSerial for serial execution', async () => {
      const invoker = new TestInvoker();
      invoker.setNextOutput({
        skill_id: 'skill-a',
        success: true,
        result: {},
        tokens_used: 50,
        duration_ms: 30,
      });
      invoker.setNextOutput({
        skill_id: 'skill-b',
        success: true,
        result: {},
        tokens_used: 60,
        duration_ms: 40,
      });

      const combo: Combo = {
        name: 'test-combo',
        description: 'Test combo',
        type: 'chain',
        execution: 'serial',
        skills: ['skill-a', 'skill-b'],
      };

      const plan: ExecutionPlan = {
        combo,
        steps: [
          { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
          { step: 1, skill_id: 'skill-b', depends_on: [0], inputs: {} },
        ],
        aggregation: 'merge',
      };

      const result = await engine.execute(combo, plan, invoker);

      expect(result.success).toBe(true);
      expect(invoker.executionOrder).toEqual(['skill-a', 'skill-b']);
    });
  });
});

/**
 * Test invoker implementation for unit tests
 */
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
