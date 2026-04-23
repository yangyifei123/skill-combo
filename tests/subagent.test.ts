/**
 * SubagentOrchestrator Tests - Wave-based Subagent Execution
 * Tests for WaveScheduler, SubagentOrchestrator, MockTaskInvoker, and OpenCodeTaskInvoker
 */

import { SubagentOrchestrator } from '../src/subagent-orchestrator';
import { WaveScheduler } from '../src/wave-scheduler';
import { MockTaskInvoker, OpenCodeTaskInvoker, createTaskInvoker } from '../src/task-invoker';
import {
  SubagentCombo,
  SubagentStep,
  SubagentOutput,
  TaskInvoker,
  SkillContext,
  TaskSpawnOptions,
} from '../src/types';

/**
 * TestableMockTaskInvoker - MockTaskInvoker that can be configured to return specific outputs
 */
class TestableMockTaskInvoker implements TaskInvoker {
  private stepCounter = 0;
  
  constructor(
    private delay: number = 10,
    private customSpawn?: (skills: string[], prompt: string, context: SkillContext) => SubagentOutput,
    private available: boolean = true
  ) {}

  async spawn(skills: string[], prompt: string, _context: SkillContext, _options?: TaskSpawnOptions): Promise<SubagentOutput> {
    const startTime = Date.now();
    await new Promise((resolve) => setTimeout(resolve, this.delay));
    const duration = Date.now() - startTime;
    
    if (this.customSpawn) {
      return this.customSpawn(skills, prompt, _context);
    }
    
    const stepName = 'step-' + this.stepCounter++;
    
    return { 
      skill_id: 'mock-task', 
      success: true, 
      result: { mock: true, skills, prompt }, 
      tokens_used: 50, 
      duration_ms: duration, 
      step_name: stepName, 
      skills_loaded: skills 
    };
  }

  async isAvailable(): Promise<boolean> { 
    return this.available; 
  }
}

describe('WaveScheduler', () => {
  let waveScheduler: WaveScheduler;

  beforeEach(() => {
    waveScheduler = new WaveScheduler();
  });

  describe('buildWaves', () => {
    it('should create single wave for independent steps', () => {
      const steps: SubagentStep[] = [
        { name: 'step-a', skills: ['skill-a'], prompt: 'Do A', depends_on: [] },
        { name: 'step-b', skills: ['skill-b'], prompt: 'Do B', depends_on: [] },
        { name: 'step-c', skills: ['skill-c'], prompt: 'Do C', depends_on: [] },
      ];

      const waves = waveScheduler.buildWaves(steps);

      expect(waves).toHaveLength(1);
      expect(waves[0].wave_number).toBe(0);
      expect(waves[0].steps).toHaveLength(3);
      expect(waves[0].steps.map(s => s.name)).toEqual(['step-a', 'step-b', 'step-c']);
    });

    it('should create multiple waves for dependent steps', () => {
      const steps: SubagentStep[] = [
        { name: 'step-a', skills: ['skill-a'], prompt: 'Do A', depends_on: [] },
        { name: 'step-b', skills: ['skill-b'], prompt: 'Do B', depends_on: ['step-a'] },
        { name: 'step-c', skills: ['skill-c'], prompt: 'Do C', depends_on: ['step-b'] },
      ];

      const waves = waveScheduler.buildWaves(steps);

      expect(waves).toHaveLength(3);
      expect(waves[0].wave_number).toBe(0);
      expect(waves[0].steps.map(s => s.name)).toEqual(['step-a']);
      expect(waves[1].wave_number).toBe(1);
      expect(waves[1].steps.map(s => s.name)).toEqual(['step-b']);
      expect(waves[2].wave_number).toBe(2);
      expect(waves[2].steps.map(s => s.name)).toEqual(['step-c']);
    });

    it('should handle complex diamond dependency', () => {
      const steps: SubagentStep[] = [
        { name: 'step-a', skills: ['skill-a'], prompt: 'Do A', depends_on: [] },
        { name: 'step-b', skills: ['skill-b'], prompt: 'Do B', depends_on: ['step-a'] },
        { name: 'step-c', skills: ['skill-c'], prompt: 'Do C', depends_on: ['step-a'] },
        { name: 'step-d', skills: ['skill-d'], prompt: 'Do D', depends_on: ['step-b', 'step-c'] },
      ];

      const waves = waveScheduler.buildWaves(steps);

      expect(waves).toHaveLength(3);
      expect(waves[0].steps.map(s => s.name)).toEqual(['step-a']);
      expect(waves[1].steps.map(s => s.name).sort()).toEqual(['step-b', 'step-c']);
      expect(waves[2].steps.map(s => s.name)).toEqual(['step-d']);
    });
  });

  describe('validateDependencies', () => {
    it('should detect circular dependency', () => {
      const steps: SubagentStep[] = [
        { name: 'step-a', skills: ['skill-a'], prompt: 'Do A', depends_on: ['step-b'] },
        { name: 'step-b', skills: ['skill-b'], prompt: 'Do B', depends_on: ['step-a'] },
      ];

      expect(() => waveScheduler.buildWaves(steps)).toThrow('Circular dependency detected');
    });

    it('should detect longer circular dependency', () => {
      const steps: SubagentStep[] = [
        { name: 'step-a', skills: ['skill-a'], prompt: 'Do A', depends_on: ['step-c'] },
        { name: 'step-b', skills: ['skill-b'], prompt: 'Do B', depends_on: ['step-a'] },
        { name: 'step-c', skills: ['skill-c'], prompt: 'Do C', depends_on: ['step-b'] },
      ];

      expect(() => waveScheduler.buildWaves(steps)).toThrow('Circular dependency detected');
    });

    it('should return true for valid dependencies', () => {
      const steps: SubagentStep[] = [
        { name: 'step-a', skills: ['skill-a'], prompt: 'Do A', depends_on: [] },
        { name: 'step-b', skills: ['skill-b'], prompt: 'Do B', depends_on: ['step-a'] },
      ];

      const result = waveScheduler.validateDependencies(steps);
      expect(result).toBe(true);
    });
  });

  describe('propagateContext', () => {
    it('should include outputs from context_from', () => {
      const previousOutputs: Record<string, SubagentOutput> = {
        'step-a': {
          skill_id: 'skill-a',
          success: true,
          result: { data: 'output-a' },
          tokens_used: 100,
          duration_ms: 50,
          step_name: 'step-a',
          skills_loaded: ['skill-a'],
        },
        'step-b': {
          skill_id: 'skill-b',
          success: true,
          result: { data: 'output-b' },
          tokens_used: 100,
          duration_ms: 50,
          step_name: 'step-b',
          skills_loaded: ['skill-b'],
        },
      };

      const nextStep: SubagentStep = {
        name: 'step-c',
        skills: ['skill-c'],
        prompt: 'Do C',
        depends_on: [],
        context_from: ['step-a', 'step-b'],
      };

      const context = waveScheduler.propagateContext(previousOutputs, nextStep);

      expect(context['step-a.output']).toEqual({ data: 'output-a' });
      expect(context['step-a.success']).toBe(true);
      expect(context['step-b.output']).toEqual({ data: 'output-b' });
      expect(context['step-b.success']).toBe(true);
    });

    it('should handle missing outputs in context_from gracefully', () => {
      const previousOutputs: Record<string, SubagentOutput> = {
        'step-a': {
          skill_id: 'skill-a',
          success: true,
          result: { data: 'output-a' },
          tokens_used: 100,
          duration_ms: 50,
          step_name: 'step-a',
          skills_loaded: ['skill-a'],
        },
      };

      const nextStep: SubagentStep = {
        name: 'step-c',
        skills: ['skill-c'],
        prompt: 'Do C',
        depends_on: [],
        context_from: ['step-a', 'step-nonexistent'],
      };

      const context = waveScheduler.propagateContext(previousOutputs, nextStep);

      expect(context['step-a.output']).toEqual({ data: 'output-a' });
      expect(context['step-nonexistent']).toBeUndefined();
    });
  });

  describe('schedule', () => {
    it('should create execution plan from combo', () => {
      const combo: SubagentCombo = {
        name: 'test-combo',
        description: 'Test combo',
        type: 'subagent',
        execution: 'serial',
        skills: [],
        subagent_steps: [
          { name: 'step-a', skills: ['skill-a'], prompt: 'Do A', depends_on: [] },
          { name: 'step-b', skills: ['skill-b'], prompt: 'Do B', depends_on: ['step-a'] },
        ],
        subagent_aggregation: 'structured',
        subagent_error_strategy: 'continue',
      };

      const plan = waveScheduler.schedule(combo);

      expect(plan.waves).toHaveLength(2);
      expect(plan.aggregation).toBe('structured');
      expect(plan.error_strategy).toBe('continue');
      expect(plan.combo).toBe(combo);
    });
  });
});

describe('MockTaskInvoker', () => {
  let invoker: MockTaskInvoker;

  beforeEach(() => {
    invoker = new MockTaskInvoker();
  });

  describe('spawn', () => {
    it('should return mock output', async () => {
      const result = await invoker.spawn(['skill-a'], 'Do task A', {}, {});

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ mock: true, skills: ['skill-a'], prompt: 'Do task A' });
      expect(result.tokens_used).toBe(50);
      expect(result.skills_loaded).toEqual(['skill-a']);
      expect(result.step_name).toBe('mock');
    });

    it('should include skills_loaded in output', async () => {
      const result = await invoker.spawn(['skill-a', 'skill-b'], 'Do task', {}, {});

      expect(result.success).toBe(true);
      expect(result.skills_loaded).toEqual(['skill-a', 'skill-b']);
    });

    it('should handle context parameter', async () => {
      const context: SkillContext = { 'key': 'value' };
      const result = await invoker.spawn(['skill-a'], 'Do task', context, {});

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
    });

    it('should handle spawn options', async () => {
      const options: TaskSpawnOptions = {
        category: 'quick',
        timeout: 60000,
        run_in_background: false,
      };
      const result = await invoker.spawn(['skill-a'], 'Do task', {}, options);

      expect(result.success).toBe(true);
    });
  });

  describe('isAvailable', () => {
    it('should return true', async () => {
      const result = await invoker.isAvailable();
      expect(result).toBe(true);
    });
  });
});

describe('OpenCodeTaskInvoker', () => {
  describe('isAvailable', () => {
    it('should return false when no globalThis.task', async () => {
      const originalTask = (globalThis as { task?: unknown }).task;
      delete (globalThis as { task?: unknown }).task;
      
      const invoker = new OpenCodeTaskInvoker({
        taskTool: undefined as any,
      });
      
      const result = await invoker.isAvailable();
      expect(result).toBe(false);
      
      if (originalTask !== undefined) {
        (globalThis as { task?: unknown }).task = originalTask;
      }
    });
  });
});

describe('createTaskInvoker', () => {
  it('should return MockTaskInvoker when globalThis.task is not available', () => {
    const originalTask = (globalThis as { task?: unknown }).task;
    delete (globalThis as { task?: unknown }).task;
    
    const invoker = createTaskInvoker();
    
    expect(invoker).toBeInstanceOf(MockTaskInvoker);
    
    if (originalTask !== undefined) {
      (globalThis as { task?: unknown }).task = originalTask;
    }
  });
});

describe('SubagentOrchestrator', () => {
  let orchestrator: SubagentOrchestrator;
  let mockInvoker: MockTaskInvoker;

  beforeEach(() => {
    orchestrator = new SubagentOrchestrator();
    mockInvoker = new MockTaskInvoker({ defaultDelay: 10 });
  });

  describe('execute', () => {
    it('should execute single step with MockTaskInvoker', async () => {
      const combo: SubagentCombo = {
        name: 'single-step-combo',
        description: 'Single step test',
        type: 'subagent',
        execution: 'serial',
        skills: [],
        subagent_steps: [
          { name: 'step-a', skills: ['skill-a'], prompt: 'Do A', depends_on: [] },
        ],
      };

      const result = await orchestrator.execute(combo, mockInvoker);

      expect(result.success).toBe(true);
      // Outputs are keyed by step name from definition
      expect(result.outputs['step-a']).toBeDefined();
      expect(result.outputs['step-a'].success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should execute multi-wave with dependencies', async () => {
      // Use TestableMockTaskInvoker that returns unique step names
      const testableInvoker = new TestableMockTaskInvoker(10);

      const combo: SubagentCombo = {
        name: 'multi-wave-combo',
        description: 'Multi-wave test',
        type: 'subagent',
        execution: 'serial',
        skills: [],
        subagent_steps: [
          { name: 'step-a', skills: ['skill-a'], prompt: 'Do A', depends_on: [] },
          { name: 'step-b', skills: ['skill-b'], prompt: 'Do B', depends_on: ['step-a'] },
          { name: 'step-c', skills: ['skill-c'], prompt: 'Do C', depends_on: ['step-b'] },
        ],
      };

      const result = await orchestrator.execute(combo, testableInvoker);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      // With 3 waves of 1 step each using TestableMockTaskInvoker, we get 3 outputs with unique step names
      expect(Object.keys(result.outputs)).toHaveLength(3);
    });

    it('should handle fail-fast stops on first error', async () => {
      const failingInvoker = new TestableMockTaskInvoker(10, (skills, _prompt, _context) => {
        if (skills.includes('skill-b')) {
          return {
            skill_id: 'mock-task',
            success: false,
            result: undefined,
            error: 'Step B failed',
            tokens_used: 0,
            duration_ms: 0,
            step_name: 'step-b',
            skills_loaded: skills,
          };
        }
        return {
          skill_id: 'mock-task',
          success: true,
          result: { mock: true, skills, prompt: '' },
          tokens_used: 50,
          duration_ms: 10,
          step_name: 'step-b',
          skills_loaded: skills,
        };
      });

      const combo: SubagentCombo = {
        name: 'fail-fast-combo',
        description: 'Fail fast test',
        type: 'subagent',
        execution: 'serial',
        skills: [],
        subagent_steps: [
          { name: 'step-a', skills: ['skill-a'], prompt: 'Do A', depends_on: [] },
          { name: 'step-b', skills: ['skill-b'], prompt: 'Do B', depends_on: ['step-a'] },
          { name: 'step-c', skills: ['skill-c'], prompt: 'Do C', depends_on: ['step-b'] },
        ],
        subagent_error_strategy: 'fail-fast',
      };

      const result = await orchestrator.execute(combo, failingInvoker);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle continue strategy skips errors', async () => {
      const failingInvoker = new TestableMockTaskInvoker(10, (skills, _prompt, _context) => {
        if (skills.includes('skill-b')) {
          return {
            skill_id: 'mock-task',
            success: false,
            result: undefined,
            error: 'Step B failed',
            tokens_used: 0,
            duration_ms: 0,
            step_name: 'step-b',
            skills_loaded: skills,
          };
        }
        return {
          skill_id: 'mock-task',
          success: true,
          result: { mock: true, skills, prompt: '' },
          tokens_used: 50,
          duration_ms: 10,
          step_name: skills[0],
          skills_loaded: skills,
        };
      });

      const combo: SubagentCombo = {
        name: 'continue-combo',
        description: 'Continue test',
        type: 'subagent',
        execution: 'serial',
        skills: [],
        subagent_steps: [
          { name: 'step-a', skills: ['skill-a'], prompt: 'Do A', depends_on: [] },
          { name: 'step-b', skills: ['skill-b'], prompt: 'Do B', depends_on: ['step-a'] },
          { name: 'step-c', skills: ['skill-c'], prompt: 'Do C', depends_on: ['step-b'] },
        ],
        subagent_error_strategy: 'continue',
      };

      const result = await orchestrator.execute(combo, failingInvoker);

      // result.outputs is aggregated: structured format keys by step name
      // step-b failed, step-c depends on step-b but 'continue' means it still ran
      // Note: with 'continue' strategy, step-c still executes even though step-b failed
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // step-a should have succeeded (no dependency on step-b)
      expect(result.outputs['step-a']).toBeDefined();
    });

    it('should return error when invoker is not available', async () => {
      const unavailableInvoker: TaskInvoker = {
        spawn: async () => ({ 
          skill_id: 'test', 
          success: false, 
          result: null, 
          error: 'Not used', 
          tokens_used: 0, 
          duration_ms: 0,
          step_name: 'test',
          skills_loaded: []
        }),
        isAvailable: async () => false,
      };

      const combo: SubagentCombo = {
        name: 'unavailable-combo',
        description: 'Unavailable test',
        type: 'subagent',
        execution: 'serial',
        skills: [],
        subagent_steps: [
          { name: 'step-a', skills: ['skill-a'], prompt: 'Do A', depends_on: [] },
        ],
      };

      const result = await orchestrator.execute(combo, unavailableInvoker);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Task runtime not available');
    });

    it('should track tokens used across steps', async () => {
      const combo: SubagentCombo = {
        name: 'tokens-combo',
        description: 'Tokens tracking test',
        type: 'subagent',
        execution: 'serial',
        skills: [],
        subagent_steps: [
          { name: 'step-a', skills: ['skill-a'], prompt: 'Do A', depends_on: [] },
          { name: 'step-b', skills: ['skill-b'], prompt: 'Do B', depends_on: [] },
        ],
      };

      const result = await orchestrator.execute(combo, mockInvoker);

      expect(result.success).toBe(true);
      expect(result.tokens_used).toBeGreaterThan(0);
    });

    it('should include step results with timing', async () => {
      const combo: SubagentCombo = {
        name: 'timing-combo',
        description: 'Timing test',
        type: 'subagent',
        execution: 'serial',
        skills: [],
        subagent_steps: [
          { name: 'step-a', skills: ['skill-a'], prompt: 'Do A', depends_on: [] },
        ],
      };

      const result = await orchestrator.execute(combo, mockInvoker);

      expect(result.steps).toBeDefined();
      expect(result.steps).toHaveLength(1);
      expect(result.steps![0].timing).toBeDefined();
      expect(result.steps![0].timing.duration_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('buildStepContext', () => {
    it('should include outputs from depends_on', () => {
      const previousOutputs: Record<string, SubagentOutput> = {
        'step-a': {
          skill_id: 'skill-a',
          success: true,
          result: { data: 'from-a' },
          tokens_used: 100,
          duration_ms: 50,
          step_name: 'step-a',
          skills_loaded: ['skill-a'],
        },
      };

      const step: SubagentStep = {
        name: 'step-b',
        skills: ['skill-b'],
        prompt: 'Do B',
        depends_on: ['step-a'],
      };

      const context = orchestrator.buildStepContext(step, previousOutputs);

      // Flat key format: ${name}.output matches WaveScheduler convention
      expect(context['step-a.output']).toBeDefined();
      expect(context['step-a.output']).toEqual({ data: 'from-a' });
      expect(context['step-a.success']).toBe(true);
    });

    it('should include outputs from context_from', () => {
      const previousOutputs: Record<string, SubagentOutput> = {
        'step-a': {
          skill_id: 'skill-a',
          success: true,
          result: { data: 'from-a' },
          tokens_used: 100,
          duration_ms: 50,
          step_name: 'step-a',
          skills_loaded: ['skill-a'],
        },
        'step-b': {
          skill_id: 'skill-b',
          success: true,
          result: { data: 'from-b' },
          tokens_used: 100,
          duration_ms: 50,
          step_name: 'step-b',
          skills_loaded: ['skill-b'],
        },
      };

      const step: SubagentStep = {
        name: 'step-c',
        skills: ['skill-c'],
        prompt: 'Do C',
        depends_on: [],
        context_from: ['step-a', 'step-b'],
      };

      const context = orchestrator.buildStepContext(step, previousOutputs);

      // Flat key format: ${name}.output
      expect(context['step-a.output']).toBeDefined();
      expect(context['step-b.output']).toBeDefined();
    });
  });

  describe('aggregateResults', () => {
    it('should aggregate with structured strategy', () => {
      const outputs: SubagentOutput[] = [
        {
          skill_id: 'skill-a',
          success: true,
          result: { data: 'a' },
          tokens_used: 50,
          duration_ms: 30,
          step_name: 'step-a',
          skills_loaded: ['skill-a'],
        },
        {
          skill_id: 'skill-b',
          success: true,
          result: { data: 'b' },
          tokens_used: 60,
          duration_ms: 40,
          step_name: 'step-b',
          skills_loaded: ['skill-b'],
        },
      ];

      const result = orchestrator.aggregateResults(outputs, 'structured');

      expect(result.success).toBe(true);
      expect(result.outputs['step-a']).toBeDefined();
      expect(result.outputs['step-b']).toBeDefined();
    });

    it('should aggregate with merge strategy', () => {
      const outputs: SubagentOutput[] = [
        {
          skill_id: 'skill-a',
          success: true,
          result: { data: 'a' },
          tokens_used: 50,
          duration_ms: 30,
          step_name: 'step-a',
          skills_loaded: ['skill-a'],
        },
        {
          skill_id: 'skill-b',
          success: true,
          result: { data: 'b' },
          tokens_used: 60,
          duration_ms: 40,
          step_name: 'step-b',
          skills_loaded: ['skill-b'],
        },
      ];

      const result = orchestrator.aggregateResults(outputs, 'merge');

      expect(result.success).toBe(true);
      expect(result.outputs['step-a']).toEqual({ data: 'a' });
      expect(result.outputs['step-b']).toEqual({ data: 'b' });
    });

    it('should aggregate with last-win strategy', () => {
      const outputs: SubagentOutput[] = [
        {
          skill_id: 'skill-a',
          success: true,
          result: { key: 'first' },
          tokens_used: 50,
          duration_ms: 30,
          step_name: 'step-a',
          skills_loaded: ['skill-a'],
        },
        {
          skill_id: 'skill-b',
          success: true,
          result: { key: 'second' },
          tokens_used: 60,
          duration_ms: 40,
          step_name: 'step-b',
          skills_loaded: ['skill-b'],
        },
      ];

      const result = orchestrator.aggregateResults(outputs, 'last-win');

      expect(result.success).toBe(true);
      expect(result.outputs.key).toBe('second');
    });

    it('should collect errors from failed outputs', () => {
      const outputs: SubagentOutput[] = [
        {
          skill_id: 'skill-a',
          success: false,
          result: undefined,
          error: 'Failed A',
          tokens_used: 0,
          duration_ms: 0,
          step_name: 'step-a',
          skills_loaded: ['skill-a'],
        },
      ];

      const result = orchestrator.aggregateResults(outputs, 'structured');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed A');
    });
  });

  describe('handleError', () => {
    it('should return abort for fail-fast strategy', () => {
      const error = new Error('Test error');
      const step: SubagentStep = { name: 'test', skills: [], prompt: '', depends_on: [] };

      const decision = orchestrator.handleError(error, step, 'fail-fast');

      expect(decision.action).toBe('abort');
    });

    it('should return retry for continue with retryable error when maxRetries > 0', () => {
      const orchestratorWithRetry = new SubagentOrchestrator({ maxRetries: 2 });
      const error = new Error('Temporary issue');
      const step: SubagentStep = { name: 'test', skills: [], prompt: '', depends_on: [], retry_count: 0 };

      const decision = orchestratorWithRetry.handleError(error, step, 'continue');

      expect(decision.action).toBe('retry');
    });

    it('should return continue for non-retryable error with continue strategy', () => {
      const error = new Error('Not available');
      const step: SubagentStep = { name: 'test', skills: [], prompt: '', depends_on: [], retry_count: 0 };

      const decision = orchestrator.handleError(error, step, 'continue');

      expect(decision.action).toBe('continue');
      if (decision.action === 'continue') {
        expect(decision.skip).toBe(true);
      }
    });
  });
});
