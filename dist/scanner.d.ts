/**
 * Skill Scanner - Discovers and indexes skills from OpenCode skill directories
 *
 * TDD Tests for Scanner:
 * 1. Should scan ~/.config/opencode/skills/ directory
 * 2. Should scan ~/.agents/skills/ directory
 * 3. Should parse SKILL.md files and extract metadata
 * 4. Should handle missing/invalid SKILL.md gracefully
 * 5. Should return list of discovered skills with metadata
 */
import { Skill, ScanResult } from './types';
declare const SKILL_LOCATIONS: string[];
/**
 * Scans all skill directories and returns discovered skills
 */
export declare function scanSkills(): Promise<ScanResult>;
/**
 * Parses a SKILL.md file and extracts skill metadata
 */
export declare function parseSkillFile(filePath: string): Promise<Skill | null>;
/**
 * Extracts metadata from SKILL.md markdown content
 */
export declare function parseSkillMarkdown(content: string, filePath: string): Skill;
declare function extractCategories(content: string): string[];
declare function extractLoadSkills(content: string): string[];
declare function extractCapabilities(content: string): string[];
declare function extractInputs(content: string): string[];
declare function extractOutputs(content: string): string[];
declare function extractCompatibility(content: string): string[];
export { SKILL_LOCATIONS, extractCategories, extractLoadSkills, extractCapabilities, extractInputs, extractOutputs, extractCompatibility };
//# sourceMappingURL=scanner.d.ts.map