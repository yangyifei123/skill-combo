// Skill-Combo Core Types

export interface Skill {
  id: string;
  name: string;
  description: string;
  location: string;
  category: string[];
  capabilities: string[];
  dependencies: string[];
  inputs: string[];
  outputs: string[];
  compatibility: string[];
  load_skills: string[];
  category_priority: number;
}

export interface Combo {
  name: string;
  description: string;
  execution: ExecutionMode;
  skills: string[];
  condition?: string;
  branches?: Record<string, string>;
}

export type ExecutionMode = 'serial' | 'parallel' | 'interleaved' | 'conditional' | 'composite';

export interface ExecutionPlan {
  combo: Combo;
  steps: ExecutionStep[];
  estimated_tokens: number;
  estimated_time: string;
}

export interface ExecutionStep {
  step: number;
  skill_id: string;
  depends_on: number[];
  mode: ExecutionMode;
  inputs: Record<string, any>;
}

export interface ScanResult {
  skills: Skill[];
  errors: ScanError[];
  timestamp: number;
}

export interface ScanError {
  location: string;
  error: string;
}

export interface Registry {
  skills: Map<string, Skill>;
  combos: Map<string, Combo>;
  last_scan: number;
}

export interface ComboResult {
  success: boolean;
  outputs: Record<string, any>;
  errors: string[];
  tokens_used: number;
  duration_ms: number;
}
