// Skill Generator - Generate SKILL.md files from extracted patterns

import type {
  ExtractedPattern,
  GeneratedSkill,
} from './types';
import * as fs from 'fs';
import * as path from 'path';

export class SkillGenerator {
  /**
   * Generate a SKILL.md from an extracted pattern
   */
  generate(pattern: ExtractedPattern): GeneratedSkill {
    const name = this.deriveSkillName(pattern);
    const description = this.deriveDescription(pattern);
    const content = this.generateContent(name, description, pattern);
    const frontmatter = {
      name,
      description,
      generated_from: pattern.description,
      extraction_date: new Date().toISOString().split('T')[0],
    };
    return {
      name,
      description,
      content,
      frontmatter,
      patterns_used: [pattern.description],
      worthiness_score: pattern.worthiness_score,
    };
  }

  /**
   * Save generated skill to file
   */
  save(skill: GeneratedSkill, outputDir?: string): string {
    const dir = outputDir ?? './generated-skills/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, `${skill.name}.md`);
    fs.writeFileSync(filePath, skill.content, 'utf-8');
    return filePath;
  }

  /**
   * Derive a skill name from pattern
   */
  private deriveSkillName(pattern: ExtractedPattern): string {
    // Use first skill + "workflow" or "combo"
    const primary = pattern.skills[0] ?? 'custom';
    const suffix = pattern.skills.length > 1 ? 'combo' : 'workflow';
    return `${primary}-${suffix}`;
  }

  /**
   * Derive description with triggers
   */
  private deriveDescription(pattern: ExtractedPattern): string {
    const skillList = pattern.skills.join(', ');
    return `Auto-generated combo: ${pattern.description}. Use when running ${skillList} together. Extracted from ${pattern.session_count} sessions.`;
  }

  /**
   * Generate full SKILL.md content
   */
  private generateContent(name: string, description: string, pattern: ExtractedPattern): string {
    const yamlFrontmatter = [
      '---',
      `name: ${name}`,
      `description: "${description.replace(/"/g, '\\"')}"`,
      '---',
      '',
    ].join('\n');

    const body = [
      `# ${name}`,
      '',
      `> Auto-generated from ${pattern.session_count} session(s)`,
      `> Pattern: ${pattern.description}`,
      `> Worthiness Score: ${pattern.worthiness_score}/100`,
      '',
      '## Quick Start',
      '',
      'This skill guides the following combo execution:',
      '',
      ...pattern.skills.map((s, i) => `${i + 1}. Load and execute: \`${s}\``),
      '',
      '## Workflow',
      '',
      ...pattern.skills.map((s, i) => `### Step ${i + 1}: ${s}`),
      '',
      'Execute in sequence. Context from each step propagates to the next.',
      '',
      '## Tips',
      '',
      '- Run with `--dry-run` to preview without executing',
      '- Use `--verbose` for detailed output',
      '- Check token usage to stay within context limits',
      '',
      '## Anti-Patterns',
      '',
      '- Do NOT skip steps in the sequence',
      '- Do NOT run steps in parallel unless they have no dependencies',
      '- Do NOT ignore context propagation warnings',
      '',
    ].join('\n');

    return yamlFrontmatter + body;
  }
}
