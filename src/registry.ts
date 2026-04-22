/**
 * Skill Registry - Central catalog of discovered skills and combos
 *
 * Implements IRegistry interface from types.ts
 */

import {
  Skill,
  Combo,
  ComboType,
  ExecutionMode,
  IRegistry,
  SkillQuery,
  ValidationError,
} from './types';

/**
 * Registry validation constants
 */
const VALID_ID_PATTERN = /^[a-z0-9-]+$/;
const MAX_ID_LENGTH = 100;
const MAX_NAME_LENGTH = 200;

export class Registry implements IRegistry {
  private skills: Map<string, Skill>;
  private combos: Map<string, Combo>;
  last_scan: number;

  constructor() {
    this.skills = new Map<string, Skill>();
    this.combos = new Map<string, Combo>();
    this.last_scan = 0;
  }

  /**
   * Validate a skill before adding to registry
   * Throws ValidationError if invalid
   */
  private validateSkill(skill: Skill): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate ID format
    if (!skill.id) {
      errors.push({ field: 'id', message: 'Skill ID is required' });
    } else if (!VALID_ID_PATTERN.test(skill.id)) {
      errors.push({
        field: 'id',
        message: `Invalid skill ID "${skill.id}". Use lowercase letters, numbers, and hyphens only.`,
      });
    } else if (skill.id.length > MAX_ID_LENGTH) {
      errors.push({
        field: 'id',
        message: `Skill ID too long (${skill.id.length} > ${MAX_ID_LENGTH})`,
      });
    }

    // Validate name
    if (!skill.name) {
      errors.push({ field: 'name', message: 'Skill name is required' });
    } else if (skill.name.length > MAX_NAME_LENGTH) {
      errors.push({
        field: 'name',
        message: `Skill name too long (${skill.name.length} > ${MAX_NAME_LENGTH})`,
      });
    }

    // Validate load_skills references
    if (skill.load_skills) {
      for (const depId of skill.load_skills) {
        if (!VALID_ID_PATTERN.test(depId)) {
          errors.push({
            field: 'load_skills',
            message: `Invalid dependency ID "${depId}" in load_skills`,
          });
        }
      }
    }

    return errors;
  }

  /**
   * Add a skill to the registry with validation
   * @throws ValidationError[] if skill is invalid
   */
  addSkill(skill: Skill): void {
    const errors = this.validateSkill(skill);
    if (errors.length > 0) {
      throw new Error(
        `Invalid skill "${skill.id || 'unknown'}": ${errors.map(e => e.message).join('; ')}`
      );
    }
    this.skills.set(skill.id, skill);
  }

  /**
   * Get a skill by ID
   */
  getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  /**
   * Get all registered skills
   */
  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Query skills by criteria (AND logic)
   * All specified criteria must match
   */
  querySkills(criteria: SkillQuery): Skill[] {
    return this.getAllSkills().filter(skill => {
      // Category filter
      if (criteria.category && criteria.category.length > 0) {
        const hasCategory = criteria.category.some(cat =>
          skill.category.includes(cat)
        );
        if (!hasCategory) return false;
      }

      // Capabilities filter
      if (criteria.capabilities && criteria.capabilities.length > 0) {
        const hasCapability = criteria.capabilities.some(cap =>
          skill.capabilities.includes(cap)
        );
        if (!hasCapability) return false;
      }

      // Inputs filter
      if (criteria.inputs && criteria.inputs.length > 0) {
        const hasInput = criteria.inputs.some(input =>
          skill.inputs.includes(input)
        );
        if (!hasInput) return false;
      }

      // Outputs filter
      if (criteria.outputs && criteria.outputs.length > 0) {
        const hasOutput = criteria.outputs.some(output =>
          skill.outputs.includes(output)
        );
        if (!hasOutput) return false;
      }

      return true;
    });
  }

  /**
   * Validate a combo's structure
   * Returns array of validation errors (empty if valid)
   */
  validateCombo(combo: Combo): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate name
    if (!combo.name) {
      errors.push({ field: 'name', message: 'Combo name is required' });
    }

    // Validate skills array
    if (!combo.skills || !Array.isArray(combo.skills) || combo.skills.length === 0) {
      errors.push({ field: 'skills', message: 'Combo must have a non-empty skills array' });
    }

    // Validate type
    const validTypes: ComboType[] = ['chain', 'parallel', 'wrap', 'conditional'];
    if (!combo.type || !validTypes.includes(combo.type)) {
      errors.push({
        field: 'type',
        message: `Invalid combo type "${combo.type}". Must be one of: ${validTypes.join(', ')}`,
      });
    }

    // Validate execution mode
    const validExecutions: ExecutionMode[] = ['serial', 'parallel', 'interleaved'];
    if (!combo.execution || !validExecutions.includes(combo.execution)) {
      errors.push({
        field: 'execution',
        message: `Invalid execution mode "${combo.execution}". Must be one of: ${validExecutions.join(', ')}`,
      });
    }

    return errors;
  }

  /**
   * Check if all skills referenced in a combo exist in the registry
   * Returns array of missing skill IDs (empty if all exist)
   */
  validateComboSkills(combo: Combo): string[] {
    const missing: string[] = [];
    if (combo.skills && Array.isArray(combo.skills)) {
      for (const skillId of combo.skills) {
        if (!this.skills.has(skillId)) {
          missing.push(skillId);
        }
      }
    }
    return missing;
  }

  /**
   * Add a combo to the registry
   */
  addCombo(combo: Combo): void {
    this.combos.set(combo.name, combo);
  }

  /**
   * Get a combo by name
   */
  getCombo(name: string): Combo | undefined {
    return this.combos.get(name);
  }

  /**
   * List all registered combos
   */
  listCombos(): Combo[] {
    return Array.from(this.combos.values());
  }

  /**
   * Update last scan timestamp
   */
  updateScanTimestamp(): void {
    this.last_scan = Date.now();
  }

  /**
   * Clear all skills and combos
   */
  clear(): void {
    this.skills.clear();
    this.combos.clear();
    this.last_scan = 0;
  }
}
