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

      const result = await engine.executeSerial({} as Combo, steps, invoker, {});

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

      const result = await engine.executeSerial({} as Combo, steps, invoker, {});

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

      const result = await engine.executeSerial({} as Combo, steps, invoker, {});

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

      const result = await engine.executeSerial({} as Combo, steps, invoker, {});

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

      const result = await engine.executeSerial({} as Combo, steps, invoker, {});

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

      const result = await engine.executeSerial({} as Combo, steps, invoker, {});

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

    it('should throw error for unknown execution mode', async () => {
      const invoker = new TestInvoker();
      invoker.setNextOutput({
        skill_id: 'skill-a',
        success: true,
        result: {},
        tokens_used: 50,
        duration_ms: 30,
      });

      const combo: Combo = {
        name: 'test-combo',
        description: 'Test combo',
        type: 'chain',
        execution: 'unknown-mode' as any,
        skills: ['skill-a'],
      };

      const plan: ExecutionPlan = {
        combo,
        steps: [{ step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} }],
        aggregation: 'merge',
      };

      await expect(engine.execute(combo, plan, invoker)).rejects.toThrow('Unknown execution mode');
    });
  });

  describe('EDGE CASES - executeSerial', () => {
    it('should handle empty steps array', async () => {
      const invoker = new TestInvoker();
      const result = await engine.executeSerial({} as Combo, [], invoker, {});

      expect(result.success).toBe(true);
      expect(result.outputs).toEqual({});
      expect(result.errors).toEqual([]);
      expect(result.tokens_used).toBe(0);
      expect(result.duration_ms).toBe(0);
    });

    it('should handle single step successfully', async () => {
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

      const result = await engine.executeSerial({} as Combo, steps, invoker, {});

      expect(result.success).toBe(true);
      expect(result.outputs['only-skill']).toEqual({ value: 42 });
    });

    it('should stop on skill unavailable', async () => {
      const invoker = new UnavailableSkillInvoker();
      invoker.setUnavailable('unavailable-skill');

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'unavailable-skill', depends_on: [], inputs: {} },
        { step: 1, skill_id: 'should-not-run', depends_on: [0], inputs: {} },
      ];

      const result = await engine.executeSerial({} as Combo, steps, invoker, {});

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Skill not available: unavailable-skill');
      expect(invoker.wasCalled('should-not-run')).toBe(false);
    });

    it('should handle invoker throwing exception', async () => {
      const invoker = new ExceptionThrowingInvoker();

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'throwing-skill', depends_on: [], inputs: {} },
      ];

      const result = await engine.executeSerial({} as Combo, steps, invoker, {});

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should build context correctly from previous outputs', async () => {
      const invoker = new ContextCapturingInvoker();

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
        { step: 1, skill_id: 'skill-b', depends_on: [0], inputs: {} },
      ];

      await engine.executeSerial({} as Combo, steps, invoker, {});

      // skill-b should have received context with skill-a's output
      const capturedContext = invoker.getContextForSkill('skill-b');
      expect(capturedContext['skill-a.output']).toBeDefined();
    });

    it('should sort steps by step number even if out of order', async () => {
      const invoker = new TestInvoker();
      invoker.setNextOutput({
        skill_id: 'first',
        success: true,
        result: {},
        tokens_used: 10,
        duration_ms: 10,
      });
      invoker.setNextOutput({
        skill_id: 'second',
        success: true,
        result: {},
        tokens_used: 10,
        duration_ms: 10,
      });

      // Steps passed in wrong order
      const steps: ExecutionStep[] = [
        { step: 1, skill_id: 'second', depends_on: [0], inputs: {} },
        { step: 0, skill_id: 'first', depends_on: [], inputs: {} },
      ];

      const result = await engine.executeSerial({} as Combo, steps, invoker, {});

      expect(result.success).toBe(true);
      // Should execute in step order: first (0), second (1)
      expect(invoker.executionOrder[0]).toBe('first');
      expect(invoker.executionOrder[1]).toBe('second');
    });
  });

  describe('EDGE CASES - aggregateOutputs', () => {
    it('should handle merge aggregation with multiple outputs', () => {
      const outputs: SkillOutput[] = [
        { skill_id: 's1', success: true, result: { a: 1, b: 2 }, tokens_used: 10, duration_ms: 10 },
        { skill_id: 's2', success: true, result: { c: 3, d: 4 }, tokens_used: 10, duration_ms: 10 },
      ];

      const { result } = engine.aggregateOutputs(outputs, 'merge');

      expect(result).toEqual({ a: 1, b: 2, c: 3, d: 4 });
    });

    it('should handle override aggregation - later wins', () => {
      const outputs: SkillOutput[] = [
        { skill_id: 's1', success: true, result: { key: 'first' }, tokens_used: 10, duration_ms: 10 },
        { skill_id: 's2', success: true, result: { key: 'second' }, tokens_used: 10, duration_ms: 10 },
      ];

      const { result } = engine.aggregateOutputs(outputs, 'override');

      expect(result.key).toBe('second');
    });

    it('should handle first-win aggregation', () => {
      const outputs: SkillOutput[] = [
        { skill_id: 's1', success: true, result: { key: 'first' }, tokens_used: 10, duration_ms: 10 },
        { skill_id: 's2', success: true, result: { key: 'second' }, tokens_used: 10, duration_ms: 10 },
      ];

      const { result } = engine.aggregateOutputs(outputs, 'first-win');

      expect(result.key).toBe('first');
    });

    it('should handle first-win with null values', () => {
      const outputs: SkillOutput[] = [
        { skill_id: 's1', success: true, result: { key: null as any }, tokens_used: 10, duration_ms: 10 },
        { skill_id: 's2', success: true, result: { key: 'second' }, tokens_used: 10, duration_ms: 10 },
      ];

      const { result } = engine.aggregateOutputs(outputs, 'first-win');

      expect(result.key).toBe('second');
    });

    it('should handle fail-on-conflict with no conflicts', () => {
      const outputs: SkillOutput[] = [
        { skill_id: 's1', success: true, result: { a: 1 }, tokens_used: 10, duration_ms: 10 },
        { skill_id: 's2', success: true, result: { b: 2 }, tokens_used: 10, duration_ms: 10 },
      ];

      const { result, errors } = engine.aggregateOutputs(outputs, 'fail-on-conflict');

      expect(result).toEqual({ a: 1, b: 2 });
      expect(errors).toEqual([]);
    });

    it('should handle fail-on-conflict with conflicts', () => {
      const outputs: SkillOutput[] = [
        { skill_id: 's1', success: true, result: { key: 'first' }, tokens_used: 10, duration_ms: 10 },
        { skill_id: 's2', success: true, result: { key: 'second' }, tokens_used: 10, duration_ms: 10 },
      ];

      const { errors } = engine.aggregateOutputs(outputs, 'fail-on-conflict');

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Key conflicts detected');
    });

    it('should collect errors from failed outputs in merge', () => {
      const outputs: SkillOutput[] = [
        { skill_id: 's1', success: true, result: { a: 1 }, tokens_used: 10, duration_ms: 10 },
        { skill_id: 's2', success: false, error: 'Failed to execute', result: null, tokens_used: 0, duration_ms: 0 },
      ];

      const { result, errors } = engine.aggregateOutputs(outputs, 'merge');

      expect(result).toEqual({ a: 1 });
      expect(errors).toContain('Failed to execute');
    });

    it('should handle unknown aggregation strategy', () => {
      const outputs: SkillOutput[] = [
        { skill_id: 's1', success: true, result: { a: 1 }, tokens_used: 10, duration_ms: 10 },
      ];

      const { errors } = engine.aggregateOutputs(outputs, 'unknown' as any);

      expect(errors[0]).toContain('Unknown aggregation strategy');
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

/**
 * Test invoker that marks specific skills as unavailable
 */
class UnavailableSkillInvoker implements SkillInvoker {
  private unavailableSkills = new Set<string>();
  public executionOrder: string[] = [];

  setUnavailable(skillId: string): void {
    this.unavailableSkills.add(skillId);
  }

  async invoke(skillId: string, _context: SkillContext): Promise<SkillOutput> {
    this.executionOrder.push(skillId);
    return {
      skill_id: skillId,
      success: true,
      result: {},
      tokens_used: 10,
      duration_ms: 10,
    };
  }

  async isAvailable(skillId: string): Promise<boolean> {
    return !this.unavailableSkills.has(skillId);
  }

  wasCalled(skillId: string): boolean {
    return this.executionOrder.includes(skillId);
  }
}

/**
 * Test invoker that throws exceptions
 */
class ExceptionThrowingInvoker implements SkillInvoker {
  async invoke(_skillId: string, _context: SkillContext): Promise<SkillOutput> {
    throw new Error('Invoked skill threw an exception');
  }

  async isAvailable(_skillId: string): Promise<boolean> {
    return true;
  }
}

/**
 * Test invoker that captures context for verification
 */
class ContextCapturingInvoker implements SkillInvoker {
  public executionOrder: string[] = [];
  private contexts: Map<string, SkillContext> = new Map();

  async invoke(skillId: string, context: SkillContext): Promise<SkillOutput> {
    this.executionOrder.push(skillId);
    this.contexts.set(skillId, { ...context });
    return {
      skill_id: skillId,
      success: true,
      result: { output: `output from ${skillId}` },
      tokens_used: 10,
      duration_ms: 10,
    };
  }

  async isAvailable(_skillId: string): Promise<boolean> {
    return true;
  }

  getContextForSkill(skillId: string): SkillContext {
    return this.contexts.get(skillId) || {};
  }
}

describe('Engine - Parallel Execution', () => {
  let engine: Engine;

  beforeEach(() => {
    engine = new Engine();
  });

  describe('executeParallel', () => {
    it('should execute all skills and return success', async () => {
      const invoker = new ParallelTestInvoker();

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
        { step: 1, skill_id: 'skill-b', depends_on: [], inputs: {} },
      ];

      const result = await engine.executeParallel(steps, invoker, 'merge');

      expect(result.success).toBe(true);
    });

    it('should aggregate outputs correctly with different keys', async () => {
      const invoker = new ParallelTestInvoker();
      invoker.setOutputs([
        { skill_id: 'skill-a', success: true, result: { a: 1 }, tokens_used: 10, duration_ms: 10 },
        { skill_id: 'skill-b', success: true, result: { b: 2 }, tokens_used: 10, duration_ms: 10 },
      ]);

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
        { step: 1, skill_id: 'skill-b', depends_on: [], inputs: {} },
      ];

      const result = await engine.executeParallel(steps, invoker, 'merge');

      expect(result.success).toBe(true);
      expect(result.outputs).toEqual({ a: 1, b: 2 });
    });

    it('should handle parallel execution failures', async () => {
      const invoker = new ParallelTestInvoker();
      invoker.setOutputs([
        { skill_id: 'skill-a', success: true, result: { a: 1 }, tokens_used: 10, duration_ms: 10 },
        { skill_id: 'skill-b', success: false, error: 'Parallel skill failed', result: null, tokens_used: 0, duration_ms: 0 },
      ]);

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
        { step: 1, skill_id: 'skill-b', depends_on: [], inputs: {} },
      ];

      const result = await engine.executeParallel(steps, invoker, 'merge');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Parallel skill failed');
    });

    it('should reject when skills unavailable', async () => {
      const invoker = new UnavailableSkillInvoker();
      invoker.setUnavailable('skill-a');

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
        { step: 1, skill_id: 'skill-b', depends_on: [], inputs: {} },
      ];

      const result = await engine.executeParallel(steps, invoker, 'merge');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Skills not available');
    });
  });
});

describe('Engine - evaluateCondition', () => {
  let engine: Engine;

  beforeEach(() => {
    engine = new Engine();
  });

  describe('env conditions', () => {
    it('should check environment variable existence', async () => {
      process.env.TEST_VAR = 'test-value';

      const result = await engine.evaluateCondition(
        { type: 'env', expression: 'TEST_VAR' },
        {}
      );

      expect(result).toBe(true);
      delete process.env.TEST_VAR;
    });

    it('should check environment variable value', async () => {
      process.env.TEST_VAR = 'specific-value';

      const result = await engine.evaluateCondition(
        { type: 'env', expression: 'TEST_VAR=specific-value' },
        {}
      );

      expect(result).toBe(true);
      delete process.env.TEST_VAR;
    });

    it('should return false for non-matching value', async () => {
      process.env.TEST_VAR = 'actual-value';

      const result = await engine.evaluateCondition(
        { type: 'env', expression: 'TEST_VAR=wrong-value' },
        {}
      );

      expect(result).toBe(false);
      delete process.env.TEST_VAR;
    });
  });

  describe('ctx conditions', () => {
    it('should check context value existence', async () => {
      const context = { user: { name: 'test' } };

      const result = await engine.evaluateCondition(
        { type: 'ctx', expression: 'user.name' },
        context
      );

      expect(result).toBe(true);
    });

    it('should check context value equality', async () => {
      const context = { user: { name: 'test' } };

      const result = await engine.evaluateCondition(
        { type: 'ctx', expression: 'user.name=test' },
        context
      );

      expect(result).toBe(true);
    });

    it('should return false for non-existent context path', async () => {
      const context = { user: { name: 'test' } };

      const result = await engine.evaluateCondition(
        { type: 'ctx', expression: 'user.missing' },
        context
      );

      expect(result).toBe(false);
    });
  });

  describe('skill-output conditions', () => {
    it('should check skill output field', async () => {
      const context = {
        'research.output': { data: 'test-data', count: 42 }
      };

      const result = await engine.evaluateCondition(
        { type: 'skill-output', expression: 'research.data' },
        context
      );

      expect(result).toBe(true);
    });

    it('should check skill output field with value', async () => {
      const context = {
        'research.output': { status: 'success' }
      };

      const result = await engine.evaluateCondition(
        { type: 'skill-output', expression: 'research.status=success' },
        context
      );

      expect(result).toBe(true);
    });
  });

  describe('js-expression conditions', () => {
    it('should throw for js-expression type', async () => {
      await expect(
        engine.evaluateCondition(
          { type: 'js-expression', expression: 'true' },
          {}
        )
      ).rejects.toThrow();
    });
  });
});

describe('Engine - Step Level Tracking', () => {
  let engine: Engine;

  beforeEach(() => {
    engine = new Engine();
  });

  describe('executeSerial step tracking', () => {
    it('should track step-level timing with start_time, end_time, and duration_ms', async () => {
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

      const result = await engine.executeSerial({} as Combo, steps, invoker, {});

      expect(result.success).toBe(true);
      expect(result.steps).toBeDefined();
      expect(result.steps).toHaveLength(2);

      // Verify first step timing
      const stepA = result.steps![0];
      expect(stepA.step_id).toBe('skill-a');
      expect(stepA.skill_id).toBe('skill-a');
      expect(stepA.success).toBe(true);
      expect(stepA.timing.start_time).toBeGreaterThan(0);
      expect(stepA.timing.end_time).toBeGreaterThanOrEqual(stepA.timing.start_time);
      expect(stepA.timing.duration_ms).toBeGreaterThanOrEqual(0);
      expect(typeof stepA.timing.start_time).toBe('number');
      expect(typeof stepA.timing.end_time).toBe('number');
      expect(typeof stepA.timing.duration_ms).toBe('number');

      // Verify second step timing
      const stepB = result.steps![1];
      expect(stepB.step_id).toBe('skill-b');
      expect(stepB.skill_id).toBe('skill-b');
      expect(stepB.success).toBe(true);
      expect(stepB.timing.start_time).toBeGreaterThanOrEqual(stepA.timing.start_time);
      expect(stepB.timing.end_time).toBeGreaterThanOrEqual(stepB.timing.start_time);
    });

    it('should record step output and tokens_used', async () => {
      const invoker = new TestInvoker();
      invoker.setNextOutput({
        skill_id: 'skill-a',
        success: true,
        result: { computed: 42 },
        tokens_used: 150,
        duration_ms: 75,
      });

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
      ];

      const result = await engine.executeSerial({} as Combo, steps, invoker, {});

      expect(result.steps).toHaveLength(1);
      const step = result.steps![0];
      expect(step.tokens_used).toBe(150);
      expect(step.output).toEqual({ computed: 42 });
    });

    it('should record step error on failure', async () => {
      const invoker = new TestInvoker();
      invoker.setNextOutput({
        skill_id: 'skill-a',
        success: false,
        result: null,
        error: 'Skill A failed catastrophically',
        tokens_used: 0,
        duration_ms: 0,
      });

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
      ];

      const result = await engine.executeSerial({} as Combo, steps, invoker, {});

      expect(result.success).toBe(false);
      expect(result.steps).toHaveLength(1);
      const step = result.steps![0];
      expect(step.success).toBe(false);
      expect(step.error).toBe('Skill A failed catastrophically');
    });

    it('should track timing even when step fails', async () => {
      const invoker = new FailingOnSecondInvoker();

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
        { step: 1, skill_id: 'skill-b', depends_on: [0], inputs: {} },
      ];

      const result = await engine.executeSerial({} as Combo, steps, invoker, {});

      expect(result.success).toBe(false);
      expect(result.steps).toBeDefined();
      expect(result.steps).toHaveLength(2);

      // First step should succeed with timing
      expect(result.steps![0].success).toBe(true);
      expect(result.steps![0].timing.start_time).toBeGreaterThan(0);
      expect(result.steps![0].timing.end_time).toBeGreaterThan(0);

      // Second step should fail but still have timing recorded
      expect(result.steps![1].success).toBe(false);
      expect(result.steps![1].timing.start_time).toBeGreaterThan(0);
      expect(result.steps![1].timing.end_time).toBeGreaterThan(0);
    });

    it('should have duration_ms equal to end_time - start_time', async () => {
      const invoker = new TestInvoker();
      invoker.setNextOutput({
        skill_id: 'skill-a',
        success: true,
        result: {},
        tokens_used: 100,
        duration_ms: 50,
      });

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
      ];

      const result = await engine.executeSerial({} as Combo, steps, invoker, {});

      const step = result.steps![0];
      const calculatedDuration = step.timing.end_time - step.timing.start_time;
      expect(step.timing.duration_ms).toBe(calculatedDuration);
    });

    it('should track empty steps array', async () => {
      const invoker = new TestInvoker();
      const result = await engine.executeSerial({} as Combo, [], invoker, {});

      expect(result.success).toBe(true);
      expect(result.steps).toEqual([]);
    });
  });
});

/**
 * Test invoker that fails on the second invocation
 */
class FailingOnSecondInvoker implements SkillInvoker {
  private callCount = 0;
  public executionOrder: string[] = [];

  async invoke(skillId: string, _context: SkillContext): Promise<SkillOutput> {
    this.executionOrder.push(skillId);
    this.callCount++;

    if (this.callCount === 1) {
      return {
        skill_id: skillId,
        success: true,
        result: { data: 'success' },
        tokens_used: 50,
        duration_ms: 30,
      };
    } else {
      return {
        skill_id: skillId,
        success: false,
        result: null,
        error: 'Second skill failed',
        tokens_used: 0,
        duration_ms: 0,
      };
    }
  }

  async isAvailable(_skillId: string): Promise<boolean> {
    return true;
  }

  wasCalled(skillId: string): boolean {
    return this.executionOrder.includes(skillId);
  }
}

/**
 * Test invoker for parallel execution tests
 */
class ParallelTestInvoker implements SkillInvoker {
  public executedInParallel = false;
  private outputs: SkillOutput[] = [];

  setOutputs(outputs: SkillOutput[]): void {
    this.outputs = outputs;
  }

  async invoke(skillId: string, _context: SkillContext): Promise<SkillOutput> {
    const output = this.outputs.shift() || {
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
}

describe('Engine - Cache Integration', () => {
  let engine: Engine;

  beforeEach(() => {
    engine = new Engine();
  });

  describe('executeSerial with cache', () => {
    it('should skip invoker on cache hit', async () => {
      const invoker = new TestInvoker();
      invoker.setNextOutput({
        skill_id: 'skill-a',
        success: true,
        result: { data: 'from-a' },
        tokens_used: 100,
        duration_ms: 50,
      });

      // Create cache with pre-filled result
      const cache = new (await import('../src/cache')).MemoryCache();
      await cache.set(
        (await import('../src/cache')).computeCacheKey('skill-a', {}),
        {
          skill_id: 'skill-a',
          success: true,
          result: { data: 'cached-data' },
          tokens_used: 10,
          duration_ms: 5,
        }
      );

      engine = new Engine({ cache });

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
      ];

      const result = await engine.executeSerial({} as Combo, steps, invoker, {});

      expect(result.success).toBe(true);
      // Should use cached result, not invoker result
      expect(result.outputs['skill-a']).toEqual({ data: 'cached-data' });
      // Invoker should not have been called
      expect(invoker.executionOrder).toEqual([]);
    });

    it('should invoke and cache on cache miss', async () => {
      const invoker = new TestInvoker();
      invoker.setNextOutput({
        skill_id: 'skill-a',
        success: true,
        result: { data: 'fresh-data' },
        tokens_used: 100,
        duration_ms: 50,
      });

      const cache = new (await import('../src/cache')).MemoryCache();
      engine = new Engine({ cache });

      const steps: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: {} },
      ];

      const result = await engine.executeSerial({} as Combo, steps, invoker, {});

      expect(result.success).toBe(true);
      expect(result.outputs['skill-a']).toEqual({ data: 'fresh-data' });
      expect(invoker.executionOrder).toEqual(['skill-a']);

      // Verify result was cached
      const cached = await cache.has(
        (await import('../src/cache')).computeCacheKey('skill-a', {})
      );
      expect(cached).toBe(true);
    });

    it('should use cache for deduplication based on skill_id and inputs', async () => {
      const invoker = new TestInvoker();
      invoker.setNextOutput({
        skill_id: 'skill-a',
        success: true,
        result: { data: 'first-call' },
        tokens_used: 100,
        duration_ms: 50,
      });
      invoker.setNextOutput({
        skill_id: 'skill-a',
        success: true,
        result: { data: 'second-call' },
        tokens_used: 100,
        duration_ms: 50,
      });

      const cache = new (await import('../src/cache')).MemoryCache();
      engine = new Engine({ cache });

      // First execution with inputs { key: 'value1' }
      const steps1: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: { key: 'value1' } },
      ];
      const result1 = await engine.executeSerial({} as Combo, steps1, invoker, {});
      expect(result1.outputs['skill-a']).toEqual({ data: 'first-call' });

      // Second execution with same inputs should use cache
      const steps2: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: { key: 'value1' } },
      ];
      const result2 = await engine.executeSerial({} as Combo, steps2, invoker, {});
      expect(result2.outputs['skill-a']).toEqual({ data: 'first-call' }); // cached

      // Only one invocation should have occurred
      expect(invoker.executionOrder).toEqual(['skill-a']);

      // Third execution with different inputs should invoke again
      const steps3: ExecutionStep[] = [
        { step: 0, skill_id: 'skill-a', depends_on: [], inputs: { key: 'value2' } },
      ];
      const result3 = await engine.executeSerial({} as Combo, steps3, invoker, {});
      expect(result3.outputs['skill-a']).toEqual({ data: 'second-call' }); // fresh (second setNextOutput)
      expect(invoker.executionOrder).toEqual(['skill-a', 'skill-a']);
    });
  });
});
