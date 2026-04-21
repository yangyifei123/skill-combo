/**
 * Skill Registry - Central catalog of discovered skills and combos
 *
 * Implements IRegistry interface from types.ts
 */
import { Skill, Combo, IRegistry, SkillQuery, ValidationError } from './types';
export declare class Registry implements IRegistry {
    private skills;
    private combos;
    last_scan: number;
    constructor();
    /**
     * Validate a skill before adding to registry
     * Throws ValidationError if invalid
     */
    private validateSkill;
    /**
     * Add a skill to the registry with validation
     * @throws ValidationError[] if skill is invalid
     */
    addSkill(skill: Skill): void;
    /**
     * Get a skill by ID
     */
    getSkill(id: string): Skill | undefined;
    /**
     * Get all registered skills
     */
    getAllSkills(): Skill[];
    /**
     * Query skills by criteria (AND logic)
     * All specified criteria must match
     */
    querySkills(criteria: SkillQuery): Skill[];
    /**
     * Validate a combo's structure
     * Returns array of validation errors (empty if valid)
     */
    validateCombo(combo: Combo): ValidationError[];
    /**
     * Check if all skills referenced in a combo exist in the registry
     * Returns array of missing skill IDs (empty if all exist)
     */
    validateComboSkills(combo: Combo): string[];
    /**
     * Add a combo to the registry
     */
    addCombo(combo: Combo): void;
    /**
     * Get a combo by name
     */
    getCombo(name: string): Combo | undefined;
    /**
     * List all registered combos
     */
    listCombos(): Combo[];
    /**
     * Update last scan timestamp
     */
    updateScanTimestamp(): void;
    /**
     * Clear all skills and combos
     */
    clear(): void;
}
//# sourceMappingURL=registry.d.ts.map