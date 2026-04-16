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

import * as fs from 'fs';
import * as path from 'path';
import { Skill, ScanResult, ScanError } from './types';

const SKILL_LOCATIONS = [
  path.join(process.env.HOME || process.env.USERPROFILE || '', '.config', 'opencode', 'skills'),
  path.join(process.env.HOME || process.env.USERPROFILE || '', '.agents', 'skills'),
];

const SKILL_FILE = 'SKILL.md';

/**
 * Scans all skill directories and returns discovered skills
 */
export async function scanSkills(): Promise<ScanResult> {
  const skills: Skill[] = [];
  const errors: ScanError[] = [];

  for (const location of SKILL_LOCATIONS) {
    if (fs.existsSync(location)) {
      await scanDirectory(location, skills, errors);
    }
  }

  return {
    skills,
    errors,
    timestamp: Date.now(),
  };
}

/**
 * Recursively scans a directory for skills
 */
async function scanDirectory(dir: string, skills: Skill[], errors: ScanError[]): Promise<void> {
  let entries: fs.Dirent[];

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    errors.push({ location: dir, error: `Cannot read directory: ${err}` });
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Check if this directory contains a SKILL.md file
      const skillFile = path.join(fullPath, SKILL_FILE);
      if (fs.existsSync(skillFile)) {
        const skill = await parseSkillFile(skillFile);
        if (skill) {
          skills.push(skill);
        }
      } else {
        // Recurse into subdirectories
        await scanDirectory(fullPath, skills, errors);
      }
    }
  }
}

/**
 * Parses a SKILL.md file and extracts skill metadata
 */
export async function parseSkillFile(filePath: string): Promise<Skill | null> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const skill = parseSkillMarkdown(content, filePath);
    return skill;
  } catch (_err) {
    // Return null for invalid files - scanner handles errors gracefully
    return null;
  }
}

/**
 * Extracts metadata from SKILL.md markdown content
 */
export function parseSkillMarkdown(content: string, filePath: string): Skill {
  // Extract name from first heading
  const nameMatch = content.match(/^#\s+(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : extractNameFromPath(filePath);

  // Extract description (first paragraph after name)
  // Match the heading line, then capture everything until the next heading or end
  const descMatch = content.match(/^#\s+.+[\r\n]+([^\n#][^\n]*?(?=\n#|$))/m);
  const description = descMatch ? descMatch[1].trim().substring(0, 200) : '';

  // Extract category/tags from description line
  const category = extractCategories(content);

  // Extract load_skills from skill tool invocations
  const load_skills = extractLoadSkills(content);

  // Extract capabilities (what the skill can do)
  const capabilities = extractCapabilities(content);

  // Extract inputs/outputs
  const inputs = extractInputs(content);
  const outputs = extractOutputs(content);

  // Extract compatibility (works well with)
  const compatibility = extractCompatibility(content);

  const id = extractNameFromPath(filePath).toLowerCase().replace(/\s+/g, '-');

  return {
    id,
    name,
    description,
    location: filePath,
    category,
    capabilities,
    inputs,
    outputs,
    compatibility,
    load_skills,
    category_priority: 5,
  };
}

function extractNameFromPath(filePath: string): string {
  // Normalize path separators for cross-platform compatibility
  const normalizedPath = filePath.replace(/\\/g, '/');
  const parts = normalizedPath.split('/');

  // Find SKILL.md and get its parent directory name
  const skillyMdIndex = parts.findIndex(p => p.toLowerCase() === 'skill.md');

  if (skillyMdIndex > 0) {
    // Parent of SKILL.md is the skill name
    return parts[skillyMdIndex - 1].toLowerCase().replace(/\s+/g, '-');
  }

  // Fallback: get the second-to-last part
  return parts[parts.length - 2] || 'unknown';
}

function extractCategories(content: string): string[] {
  const categories: string[] = [];

  // Look for category patterns in content
  const categoryPatterns = [
    /(?:category|categories|tag|tags)[:\s]+([^\n]+)/gi,
    /```skill[\s\S]*?category:\s*([^\n]+)/gi,
  ];

  for (const pattern of categoryPatterns) {
    pattern.lastIndex = 0;
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const cats = match[1].split(/[,\s]+/).filter(Boolean);
      categories.push(...cats);
    }
  }

  return [...new Set(categories)].slice(0, 10);
}

function extractLoadSkills(content: string): string[] {
  const skills: string[] = [];

  // Match skill tool invocations: skill(name="...")
  const skillPattern = /skill\s*\(\s*name\s*=\s*["']([^"']+)["']/gi;
  skillPattern.lastIndex = 0;
  const matches = content.matchAll(skillPattern);
  for (const match of matches) {
    skills.push(match[1]);
  }

  return [...new Set(skills)];
}

function extractCapabilities(content: string): string[] {
  const capabilities: string[] = [];

  // Look for capability-related sections
  const capPatterns = [
    /(?:capability|capabilities|can do|does)[:\s]+([^\n]+)/gi,
    /-\s+(?:can|capable of|does)\s+([^\n]+)/gi,
  ];

  for (const pattern of capPatterns) {
    pattern.lastIndex = 0;
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const caps = match[1].split(/[,;]/).map(c => c.trim()).filter(Boolean);
      capabilities.push(...caps);
    }
  }

  return [...new Set(capabilities)].slice(0, 20);
}

function extractInputs(content: string): string[] {
  const inputs: string[] = [];

  // Look for input-related sections
  const inputPatterns = [
    /(?:input|inputs|expect|expects|receives)[:\s]+([^\n]+)/gi,
  ];

  for (const pattern of inputPatterns) {
    pattern.lastIndex = 0;
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const ins = match[1].split(/[,;]/).map(i => i.trim()).filter(Boolean);
      inputs.push(...ins);
    }
  }

  return [...new Set(inputs)];
}

function extractOutputs(content: string): string[] {
  const outputs: string[] = [];

  // Look for output-related sections
  const outputPatterns = [
    /(?:output|outputs|produces|generates|creates)[:\s]+([^\n]+)/gi,
  ];

  for (const pattern of outputPatterns) {
    pattern.lastIndex = 0;
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const outs = match[1].split(/[,;]/).map(o => o.trim()).filter(Boolean);
      outputs.push(...outs);
    }
  }

  return [...new Set(outputs)];
}

function extractCompatibility(content: string): string[] {
  const compat: string[] = [];

  // Look for compatibility/works-well-with sections
  const compatPatterns = [
    /(?:works?\s+well\s+with|compatible\s+with|paired\s+with)[:\s]+([^\n]+)/gi,
  ];

  for (const pattern of compatPatterns) {
    pattern.lastIndex = 0;
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const items = match[1].split(/[,;]/).map(i => i.trim()).filter(Boolean);
      compat.push(...items);
    }
  }

  return [...new Set(compat)];
}

export { SKILL_LOCATIONS, extractCategories, extractLoadSkills, extractCapabilities, extractInputs, extractOutputs, extractCompatibility };
