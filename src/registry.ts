/**
 * Skill Registry - Central catalog of discovered skills and combos
 *
 * Implements IRegistry interface from types.ts
 */

import {
  Skill,
  Combo,
  IRegistry,
  SkillQuery,
} from './types';

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
   * Add a skill to the registry
   */
  addSkill(skill: Skill): void {
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
