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
});
