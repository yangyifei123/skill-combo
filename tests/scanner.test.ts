/**
 * Skill Scanner Tests
 */

import { parseSkillMarkdown, extractCategories, extractLoadSkills, extractCapabilities } from '../src/scanner';

describe('Skill Scanner', () => {
  describe('parseSkillMarkdown', () => {
    it('should extract name from first heading', () => {
      const content = `# Test Skill\n\nThis is a test skill description.`;
      const skill = parseSkillMarkdown(content, '/fake/path/skills/test-skill/SKILL.md');

      expect(skill.name).toBe('Test Skill');
    });

    it('should extract description from first paragraph', () => {
      const content = `# Test Skill

This is a detailed description of the skill.

## Usage`;
      const skill = parseSkillMarkdown(content, '/fake/path/skills/test-skill/SKILL.md');

      expect(skill.description).toBe('This is a detailed description of the skill.');
    });

    it('should generate id from path', () => {
      const content = `# Test Skill\n\nDescription`;
      const skill = parseSkillMarkdown(content, '/fake/path/.agents/skills/my-test-skill/SKILL.md');

      expect(skill.id).toBe('my-test-skill');
    });

    it('should handle missing heading gracefully', () => {
      const content = `No heading here, just plain text.`;
      const skill = parseSkillMarkdown(content, '/fake/path/skills/test-skill/SKILL.md');

      expect(skill.name).toBeTruthy();
      expect(skill.id).toBe('test-skill');
    });
  });

  describe('extractCategories', () => {
    it('should extract category keywords', () => {
      const content = `
        category: web, frontend, typescript
        This skill does things.
      `;
      const categories = extractCategories(content);

      expect(categories).toContain('web');
      expect(categories).toContain('frontend');
      expect(categories).toContain('typescript');
    });

    it('should extract tags', () => {
      const content = `tags: python, backend, api`;
      const categories = extractCategories(content);

      expect(categories).toContain('python');
      expect(categories).toContain('backend');
    });

    it('should return empty array when no categories found', () => {
      const content = `Just some content without categories.`;
      const categories = extractCategories(content);

      expect(categories).toEqual([]);
    });

    it('should deduplicate categories', () => {
      const content = `category: web, web, frontend, web`;
      const categories = extractCategories(content);

      expect(categories.filter((c: string) => c === 'web').length).toBe(1);
    });
  });

  describe('extractLoadSkills', () => {
    it('should extract skill tool invocations', () => {
      const content = `
        Use the skill(name="typescript-pro") for TypeScript work.
        Also use skill(name="api-rest-design") for API design.
      `;
      const skills = extractLoadSkills(content);

      expect(skills).toContain('typescript-pro');
      expect(skills).toContain('api-rest-design');
    });

    it('should handle single quotes', () => {
      const content = `skill(name='single-quote-skill')`;
      const skills = extractLoadSkills(content);

      expect(skills).toContain('single-quote-skill');
    });

    it('should return empty array when no skills found', () => {
      const content = `No skill references here.`;
      const skills = extractLoadSkills(content);

      expect(skills).toEqual([]);
    });
  });

  describe('extractCapabilities', () => {
    it('should extract capability patterns', () => {
      const content = `
        capabilities: web development, API design, database optimization
      `;
      const capabilities = extractCapabilities(content);

      expect(capabilities.some((c: string) => c.includes('web development'))).toBeTruthy();
    });

    it('should extract bullet point capabilities', () => {
      const content = `
        - can do data analysis
        - can do machine learning
      `;
      const capabilities = extractCapabilities(content);

      expect(capabilities.some((c: string) => c.includes('data analysis'))).toBeTruthy();
    });
  });

  describe('EDGE CASES - Malformed SKILL.md', () => {
    it('should handle empty content', () => {
      const content = '';
      const skill = parseSkillMarkdown(content, '/fake/path/test/SKILL.md');

      expect(skill.name).toBe('test');
      expect(skill.id).toBe('test');
      expect(skill.description).toBe('');
    });

    it('should handle only whitespace content', () => {
      const content = '   \n\n  \n   ';
      const skill = parseSkillMarkdown(content, '/fake/path/test/SKILL.md');

      expect(skill.name).toBe('test');
      expect(skill.id).toBe('test');
    });

    it('should handle description that is only newlines', () => {
      const content = `# Test Skill\n\n\n\n\n## Other`;
      const skill = parseSkillMarkdown(content, '/fake/path/test/SKILL.md');

      expect(skill.description).toBe('');
    });

    it('should truncate long descriptions to 200 chars', () => {
      const longDesc = 'A'.repeat(300);
      const content = `# Test Skill\n\n${longDesc}`;
      const skill = parseSkillMarkdown(content, '/fake/path/test/SKILL.md');

      expect(skill.description.length).toBe(200);
    });

    it('should handle very long category lists (cap at 10)', () => {
      const content = `category: cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9, cat10, cat11, cat12`;
      const categories = extractCategories(content);

      expect(categories.length).toBeLessThanOrEqual(10);
    });

    it('should handle very long capability lists (cap at 20)', () => {
      const content = `capabilities: cap1, cap2, cap3, cap4, cap5, cap6, cap7, cap8, cap9, cap10, cap11, cap12, cap13, cap14, cap15, cap16, cap17, cap18, cap19, cap20, cap21, cap22`;
      const capabilities = extractCapabilities(content);

      expect(capabilities.length).toBeLessThanOrEqual(20);
    });

    it('should handle multiple headings without breaking', () => {
      const content = `# First Skill\n\nDesc 1\n\n# Second Skill\n\nDesc 2\n\n## Usage\n\nDetails`;
      const skill = parseSkillMarkdown(content, '/fake/path/test/SKILL.md');

      expect(skill.name).toBe('First Skill');
      expect(skill.description).toBe('Desc 1');
    });

    it('should handle skill names with special characters', () => {
      const content = `# API REST Design\n\nA skill for REST APIs.`;
      const skill = parseSkillMarkdown(content, '/fake/path/api-rest-design/SKILL.md');

      expect(skill.name).toBe('API REST Design');
    });

    it('should extract categories from code block format', () => {
      const content = `
\`\`\`skill
category: testing, unit
\`\`\`
      `;
      const categories = extractCategories(content);

      expect(categories).toContain('testing');
      expect(categories).toContain('unit');
    });

    it('should extract capabilities with semicolon separator', () => {
      const content = `capabilities: does X; does Y; does Z`;
      const capabilities = extractCapabilities(content);

      expect(capabilities.length).toBe(3);
    });

    it('should extract inputs with various formats', () => {
      const { extractInputs } = require('../src/scanner');
      const content = `inputs: param1, param2; param3`;
      const inputs = extractInputs(content);

      expect(inputs.length).toBe(3);
    });

    it('should extract outputs with various formats', () => {
      const { extractOutputs } = require('../src/scanner');
      const content = `outputs: result1; result2, result3`;
      const outputs = extractOutputs(content);

      expect(outputs.length).toBe(3);
    });

    it('should extract compatibility patterns', () => {
      const { extractCompatibility } = require('../src/scanner');
      const content = `works well with: skill-a, skill-b`;
      const compat = extractCompatibility(content);

      expect(compat).toContain('skill-a');
      expect(compat).toContain('skill-b');
    });

    it('should extract compatibility - alternative pattern', () => {
      const { extractCompatibility } = require('../src/scanner');
      const content = `compatible with: other-skill`;
      const compat = extractCompatibility(content);

      expect(compat).toContain('other-skill');
    });

    it('should handle skill references with escaped quotes', () => {
      const content = `skill(name=\\"escaped-skill\\")`;
      const { extractLoadSkills } = require('../src/scanner');
      const skills = extractLoadSkills(content);

      // Should not match (escaped quotes are not standard)
      expect(skills).toEqual([]);
    });

    it('should handle Windows path separators in extractNameFromPath', () => {
      const content = `# Test`;
      const skill = parseSkillMarkdown(content, 'E:\\AI_field\\skills\\my-skill\\SKILL.md');

      expect(skill.id).toBe('my-skill');
    });

    it('should handle path with no SKILL.md (fallback behavior)', () => {
      const content = `# Test Skill`;
      const skill = parseSkillMarkdown(content, '/no/skill.md/here');

      // Falls back to second-to-last path part
      expect(skill.name).toBeTruthy();
    });

    it('should handle extractCategories with mixed case keywords', () => {
      const content = `Category: WEB, Frontend\nTAGS: testing, API`;
      const categories = extractCategories(content);

      expect(categories).toContain('WEB');
      expect(categories).toContain('Frontend');
      expect(categories).toContain('testing');
      expect(categories).toContain('API');
    });

    it('should handle capability extraction with "does" pattern', () => {
      const content = `does: data processing, file conversion`;
      const capabilities = extractCapabilities(content);

      expect(capabilities.some((c: string) => c.includes('data processing'))).toBeTruthy();
    });
  });
});
