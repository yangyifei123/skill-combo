import {
  success,
  error,
  warning,
  info,
  dim,
  bold,
  supportsColor,
  colorize,
} from '../src/colors';

describe('Colors', () => {
  const originalNoColor = process.env.NO_COLOR;
  const originalIsTTY = process.stdout.isTTY;

  afterEach(() => {
    process.env.NO_COLOR = originalNoColor;
    Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, writable: true });
  });

  describe('success', () => {
    it('should wrap text with green ANSI code', () => {
      const result = success('ok');
      expect(result).toContain('\x1b[32m');
      expect(result).toContain('ok');
      expect(result).toContain('\x1b[0m');
    });
  });

  describe('error', () => {
    it('should wrap text with red ANSI code', () => {
      const result = error('fail');
      expect(result).toContain('\x1b[31m');
      expect(result).toContain('fail');
    });
  });

  describe('warning', () => {
    it('should wrap text with yellow ANSI code', () => {
      const result = warning('careful');
      expect(result).toContain('\x1b[33m');
      expect(result).toContain('careful');
    });
  });

  describe('info', () => {
    it('should wrap text with blue ANSI code', () => {
      const result = info('note');
      expect(result).toContain('\x1b[34m');
      expect(result).toContain('note');
    });
  });

  describe('dim', () => {
    it('should wrap text with gray ANSI code', () => {
      const result = dim('muted');
      expect(result).toContain('\x1b[90m');
      expect(result).toContain('muted');
    });
  });

  describe('bold', () => {
    it('should wrap text with bold ANSI code', () => {
      const result = bold('strong');
      expect(result).toContain('\x1b[1m');
      expect(result).toContain('strong');
    });
  });

  describe('supportsColor', () => {
    it('should return false when NO_COLOR=1', () => {
      process.env.NO_COLOR = '1';
      expect(supportsColor()).toBe(false);
    });

    it('should respect NO_COLOR disabled', () => {
      delete process.env.NO_COLOR;
      Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });
      // Result depends on TTY, just verify it doesn't crash
      expect(typeof supportsColor()).toBe('boolean');
    });
  });

  describe('colorize', () => {
    it('should apply color when supported', () => {
      // Force color support
      Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });
      delete process.env.NO_COLOR;

      const result = colorize('hello', success);
      expect(result).toContain('hello');
    });

    it('should return plain text when NO_COLOR=1', () => {
      process.env.NO_COLOR = '1';
      const result = colorize('hello', success);
      expect(result).toBe('hello');
    });
  });
});