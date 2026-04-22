// Skill-Combo OpenCode Plugin Entry Point
// Provides exports for OpenCode plugin integration

// Re-export core components for OpenCode plugin integration
export {
  CLI,
  DefaultInvoker,
  Engine,
  Planner,
  Registry,
  OpenCodeInvoker,
  createOpenCodeInvoker,
  loadComboFromFile,
  loadCombosFromDirectory,
  loadDefaultCombos,
  scanSkills,
  parseSkillFile,
  parseSkillMarkdown,
  Cache,
  MemoryCache,
  computeCacheKey,
  success,
  error,
  warning,
  info,
  dim,
  bold,
  supportsColor,
  colorize,
} from './index';

// Types
export * from './types';
