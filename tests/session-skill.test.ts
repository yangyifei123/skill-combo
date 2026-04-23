/**
 * Session-Skill Tests
 * Tests for PatternMiner, SkillGenerator, and SessionProvider
 */

import { PatternMiner } from '../src/pattern-miner';
import { SkillGenerator } from '../src/skill-generator';
import { JsonlSessionProvider, OpenCodeSessionProvider } from '../src/session-provider';
import type { SessionSummary, SessionMessage, ExtractedPattern } from '../src/types';
import * as path from 'path';

describe('PatternMiner', () => {
  describe('extractSkillsFromMessages', () => {
    let miner: PatternMiner;

    beforeEach(() => {
      miner = new PatternMiner();
    });

    it('should detect skill() invocations', () => {
      const messages: SessionMessage[] = [
        { id: '1', role: 'user', content: 'Use skill("typescript") for this', timestamp: 0 },
      ];
      // Access private method via casting for testing
      const extractSkills = (miner as any).extractSkillsFromMessages.bind(miner);
      const skills = extractSkills(messages);
      expect(skills).toContain('typescript');
    });

    it('should detect slash commands', () => {
      const messages: SessionMessage[] = [
        { id: '1', role: 'user', content: 'Run /typescript and /nodejs together', timestamp: 0 },
      ];
      const extractSkills = (miner as any).extractSkillsFromMessages.bind(miner);
      const skills = extractSkills(messages);
      expect(skills).toContain('typescript');
      expect(skills).toContain('nodejs');
    });
  });

  describe('mine', () => {
    it('should return empty patterns for empty sessions', () => {
      const miner = new PatternMiner({ min_sessions: 2, min_occurrences: 3 });
      const sessions: SessionSummary[] = [];
      const patterns = miner.mine(sessions);
      expect(patterns).toEqual([]);
    });

    it('should return below min_sessions threshold for single session', () => {
      const miner = new PatternMiner({ min_sessions: 2, min_occurrences: 2 });
      const sessions: SessionSummary[] = [
        {
          id: 'session-1',
          title: 'Test',
          messages: [
            { id: '1', role: 'user', content: 'Use skill("typescript") then skill("nodejs")', timestamp: 0 },
          ],
          start_time: 0,
          end_time: 0,
          total_tokens: 0,
        },
      ];
      const patterns = miner.mine(sessions);
      // Single session with 1 unique pattern, min_sessions=2 should filter it
      expect(patterns.length).toBe(0);
    });

    it('should extract pattern from multiple sessions with repeated pattern', () => {
      const miner = new PatternMiner({ min_sessions: 2, min_occurrences: 2 });
      const sessions: SessionSummary[] = [
        {
          id: 'session-1',
          title: 'Test 1',
          messages: [
            { id: '1', role: 'user', content: 'Use skill("typescript") then skill("nodejs")', timestamp: 0 },
          ],
          start_time: 0,
          end_time: 0,
          total_tokens: 0,
        },
        {
          id: 'session-2',
          title: 'Test 2',
          messages: [
            { id: '2', role: 'user', content: 'skill("typescript") -> skill("nodejs")', timestamp: 0 },
          ],
          start_time: 0,
          end_time: 0,
          total_tokens: 0,
        },
      ];
      const patterns = miner.mine(sessions);
      expect(patterns.length).toBeGreaterThan(0);
      const pattern = patterns.find(p => p.skills.includes('typescript') && p.skills.includes('nodejs'));
      expect(pattern).toBeDefined();
      expect(pattern?.session_count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('calculateWorthiness', () => {
    it('should calculate score components correctly', () => {
      const miner = new PatternMiner();
      const entry = {
        key: 'typescript → nodejs',
        skills: ['typescript', 'nodejs'],
        session_ids: new Set(['1', '2', '3', '4', '5']),
        count: 10,
      };
      const score = miner.calculateWorthiness(entry, 5);
      
      expect(score.frequency).toBe(40); // 5/5 * 40 = 40 (capped)
      expect(score.generalizability).toBe(20); // 2 skills >= 2
      expect(score.complexity_reduction).toBe(14); // 2 unique * 7 = 14 (capped at 20)
      expect(score.error_reduction).toBe(10); // count >= 5
      expect(score.total).toBe(84);
    });

    it('should handle single skill pattern', () => {
      const miner = new PatternMiner();
      const entry = {
        key: 'typescript',
        skills: ['typescript'],
        session_ids: new Set(['1', '2']),
        count: 3,
      };
      const score = miner.calculateWorthiness(entry, 4);
      
      expect(score.frequency).toBe(20); // 2/4 * 40 = 20
      expect(score.generalizability).toBe(10); // 1 skill = 10
      expect(score.complexity_reduction).toBe(7); // 1 unique * 7 = 7
      expect(score.error_reduction).toBe(5); // 3 >= 3
    });
  });
});

describe('SkillGenerator', () => {
  describe('generate', () => {
    let generator: SkillGenerator;
    let pattern: ExtractedPattern;

    beforeEach(() => {
      generator = new SkillGenerator();
      pattern = {
        description: 'typescript → nodejs',
        skills: ['typescript', 'nodejs'],
        session_count: 3,
        total_occurrences: 5,
        worthiness_score: 75,
      };
    });

    it('should produce valid SKILL.md with frontmatter', () => {
      const skill = generator.generate(pattern);
      
      expect(skill.name).toBeDefined();
      expect(skill.description).toBeDefined();
      expect(skill.content).toContain('---');
      expect(skill.content).toContain('name:');
      expect(skill.content).toContain('description:');
      expect(skill.content).toContain('# ' + skill.name);
      expect(skill.frontmatter).toBeDefined();
      expect(skill.frontmatter.name).toBe(skill.name);
    });

    it('should derive name from pattern', () => {
      const skill = generator.generate(pattern);
      
      // Name should be derived from first skill + suffix
      expect(skill.name).toMatch(/^typescript-/);
    });
  });

  describe('save', () => {
    it('should create file in output directory', () => {
      const generator = new SkillGenerator();
      const skill = generator.generate({
        description: 'test → pattern',
        skills: ['test', 'pattern'],
        session_count: 2,
        total_occurrences: 4,
        worthiness_score: 60,
      });
      
      const fs = require('fs');
      const os = require('os');
      const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-test-'));
      
      const filePath = generator.save(skill, testDir);
      
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('---');
      expect(content).toContain(skill.name);
      
      // Cleanup
      fs.rmSync(testDir, { recursive: true });
    });
  });
});

describe('SessionProvider', () => {
  describe('JsonlSessionProvider', () => {
    it('should return false when no JSONL file exists', () => {
      const provider = new JsonlSessionProvider({ jsonlPath: '/nonexistent/path/to/file.jsonl' });
      expect(provider.isAvailable()).toBe(false);
    });
  });

  describe('OpenCodeSessionProvider', () => {
    it('should return false when no runtime is available', () => {
      // Save original values
      const originalSessionList = (globalThis as any).session_list;
      const originalSessionRead = (globalThis as any).session_read;
      
      // Ensure no runtime functions exist
      delete (globalThis as any).session_list;
      delete (globalThis as any).session_read;
      
      const provider = new OpenCodeSessionProvider();
      expect(provider.isAvailable()).toBe(false);
      
      // Restore original values
      if (originalSessionList !== undefined) {
        (globalThis as any).session_list = originalSessionList;
      }
      if (originalSessionRead !== undefined) {
        (globalThis as any).session_read = originalSessionRead;
      }
    });
  });
});
