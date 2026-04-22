/**
 * OpenCodeInvoker Tests
 */

import { OpenCodeInvoker, createOpenCodeInvoker } from '../src/opencode-invoker';
import { DefaultInvoker } from '../src/cli';
import { SkillContext } from '../src/types';

describe('OpenCodeInvoker', () => {
  describe('Constructor', () => {
    it('should create invoker with skillTool function', () => {
      const mockSkillTool = jest.fn().mockResolvedValue({ success: true, result: {} });
      const invoker = new OpenCodeInvoker({
        skillTool: mockSkillTool,
        timeout: 300000,
      });

      expect(invoker).toBeDefined();
    });

    it('should use default timeout of 300000ms when not specified', () => {
      const mockSkillTool = jest.fn().mockResolvedValue({ success: true, result: {} });
      const invoker = new OpenCodeInvoker({
        skillTool: mockSkillTool,
      });

      expect(invoker).toBeDefined();
    });
  });

  describe('invoke', () => {
    it('should call skillTool with correct arguments', async () => {
      const mockSkillTool = jest.fn().mockResolvedValue({
        success: true,
        result: { message: 'done' },
        tokens_used: 100,
        duration_ms: 500,
      });

      const invoker = new OpenCodeInvoker({
        skillTool: mockSkillTool,
        timeout: 300000,
      });

      const context: SkillContext = { input: 'test' };
      const result = await invoker.invoke('test-skill', context);

      expect(mockSkillTool).toHaveBeenCalledWith({
        name: 'test-skill',
        user_message: context,
      });
      expect(result.skill_id).toBe('test-skill');
      expect(result.success).toBe(true);
    });

    it('should handle timeout (skill takes too long)', async () => {
      const mockSkillTool = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ success: true, result: {} }), 1000);
        });
      });

      const invoker = new OpenCodeInvoker({
        skillTool: mockSkillTool,
        timeout: 50, // Very short timeout
      });

      const context: SkillContext = {};
      const result = await invoker.invoke('slow-skill', context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });

    it('should handle skillTool returning error', async () => {
      const mockSkillTool = jest.fn().mockRejectedValue(new Error('Skill execution failed'));

      const invoker = new OpenCodeInvoker({
        skillTool: mockSkillTool,
        timeout: 300000,
      });

      const context: SkillContext = {};
      const result = await invoker.invoke('failing-skill', context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Skill execution failed');
    });

    it('should handle skillTool returning object with success=false', async () => {
      const mockSkillTool = jest.fn().mockResolvedValue({
        success: false,
        error: 'Skill not found',
        tokens_used: 0,
        duration_ms: 100,
      });

      const invoker = new OpenCodeInvoker({
        skillTool: mockSkillTool,
        timeout: 300000,
      });

      const context: SkillContext = {};
      const result = await invoker.invoke('missing-skill', context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Skill not found');
    });

    it('should clean up timer on successful invoke', async () => {
      jest.useFakeTimers();

      const mockSkillTool = jest.fn().mockResolvedValue({
        success: true,
        result: { data: 'test' },
        tokens_used: 50,
        duration_ms: 100,
      });

      const invoker = new OpenCodeInvoker({
        skillTool: mockSkillTool,
        timeout: 300000,
      });

      const context: SkillContext = {};
      const resultPromise = invoker.invoke('quick-skill', context);

      // Fast-forward time
      jest.advanceTimersByTime(50);
      const result = await resultPromise;

      expect(result.success).toBe(true);
      // Timer should be cleaned up (no pending timers)
      expect(jest.getTimerCount()).toBe(0);

      jest.useRealTimers();
    });
  });

  describe('isAvailable', () => {
    it('should return true for valid skill IDs', async () => {
      const mockSkillTool = jest.fn();
      const invoker = new OpenCodeInvoker({
        skillTool: mockSkillTool,
        timeout: 300000,
      });

      // Valid skill IDs according to the pattern /^[a-zA-Z0-9-_]+$/
      expect(await invoker.isAvailable('valid-skill')).toBe(true);
      expect(await invoker.isAvailable('Valid_Skill-123')).toBe(true);
      expect(await invoker.isAvailable('a')).toBe(true);
    });

    it('should return false for invalid skill IDs', async () => {
      const mockSkillTool = jest.fn();
      const invoker = new OpenCodeInvoker({
        skillTool: mockSkillTool,
        timeout: 300000,
      });

      // Empty string
      expect(await invoker.isAvailable('')).toBe(false);
      // Invalid characters (spaces, special chars)
      expect(await invoker.isAvailable('invalid skill')).toBe(false);
      expect(await invoker.isAvailable('invalid@skill')).toBe(false);
    });
  });

  describe('createOpenCodeInvoker', () => {
    it('should return DefaultInvoker when not in OpenCode runtime', () => {
      // Save original skill reference
      const originalSkill = (globalThis as any).skill;

      // Ensure no skill tool is available
      delete (globalThis as any).skill;

      const invoker = createOpenCodeInvoker();

      expect(invoker).toBeInstanceOf(DefaultInvoker);

      // Restore original skill reference
      if (originalSkill !== undefined) {
        (globalThis as any).skill = originalSkill;
      }
    });

    it('should return OpenCodeInvoker when skill tool is available', () => {
      // Save original skill reference
      const originalSkill = (globalThis as any).skill;

      // Mock OpenCode runtime with skill tool
      const mockSkillTool = jest.fn().mockResolvedValue({ success: true, result: {} });
      (globalThis as any).skill = mockSkillTool;

      const invoker = createOpenCodeInvoker();

      expect(invoker).toBeInstanceOf(OpenCodeInvoker);
      expect(invoker).not.toBeInstanceOf(DefaultInvoker);

      // Restore original skill reference
      if (originalSkill !== undefined) {
        (globalThis as any).skill = originalSkill;
      } else {
        delete (globalThis as any).skill;
      }
    });
  });
});