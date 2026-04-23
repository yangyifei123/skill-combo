// Pattern Miner - Extract patterns from session data and score worthiness

import type {
  SessionSummary,
  ExtractedPattern,
  WorthinessScore,
  ExtractionConfig,
} from './types';

interface FrequencyEntry {
  key: string;
  skills: string[];
  session_ids: Set<string>;
  count: number;
}

export class PatternMiner {
  private config: Required<ExtractionConfig>;

  constructor(config: ExtractionConfig = {}) {
    this.config = {
      min_sessions: config.min_sessions ?? 2,
      min_occurrences: config.min_occurrences ?? 3,
      max_skills: config.max_skills ?? 5,
      output_dir: config.output_dir ?? './generated-skills/',
      min_worthiness: config.min_worthiness ?? 50,
    };
  }

  /**
   * Mine patterns from session data
   * Returns patterns sorted by worthiness score (descending)
   */
  mine(sessions: SessionSummary[]): ExtractedPattern[] {
    // Step 1: Extract skill invocation sequences from each session
    const allSequences = this.extractSequences(sessions);

    // Step 2: Count frequency of each unique sequence
    const frequencyMap = this.countFrequency(allSequences, sessions);

    // Step 3: Calculate worthiness score for each pattern
    const patterns = this.scorePatterns(frequencyMap, sessions.length);

    // Step 4: Filter and sort
    return patterns
      .filter(p => p.worthiness_score >= this.config.min_worthiness)
      .filter(p => p.session_count >= this.config.min_sessions)
      .filter(p => p.total_occurrences >= this.config.min_occurrences)
      .sort((a, b) => b.worthiness_score - a.worthiness_score)
      .slice(0, this.config.max_skills);
  }

  /**
   * Extract skill invocation sequences from sessions
   * Looks for patterns like: skill A → skill B → skill C
   */
  private extractSequences(sessions: SessionSummary[]): Array<{ sessionId: string; skills: string[] }> {
    const sequences: Array<{ sessionId: string; skills: string[] }> = [];
    sessions.forEach((session) => {
      const skills = this.extractSkillsFromMessages(session.messages);
      if (skills.length >= 2) {
        // Generate n-grams (n=2 to 4)
        for (let n = 2; n <= Math.min(4, skills.length); n++) {
          for (let i = 0; i <= skills.length - n; i++) {
            sequences.push({ sessionId: session.id, skills: skills.slice(i, i + n) });
          }
        }
      }
    });
    return sequences;
  }

  /**
   * Extract skill names from message content
   * Looks for skill() invocations, slash commands, combo names
   */
  private extractSkillsFromMessages(messages: SessionSummary['messages']): string[] {
    const skills: string[] = [];
    for (const msg of messages) {
      // Pattern 1: skill('skill-name') or skill("skill-name")
      const skillMatch = msg.content.matchAll(/(?:skill|load)\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
      for (const match of skillMatch) {
        skills.push(match[1]);
      }

      // Pattern 2: slash commands /skill-name
      const slashMatch = msg.content.matchAll(/\/([a-z][a-z0-9-]+)/g);
      for (const match of slashMatch) {
        skills.push(match[1]);
      }

      // Pattern 3: combo names in run commands
      const comboMatch = msg.content.matchAll(/(?:run|execute|combo)\s+([a-z][a-z0-9-]+)/g);
      for (const match of comboMatch) {
        skills.push(match[1]);
      }
    }
    return skills;
  }

  /**
   * Count frequency of each unique sequence, tracking session origin
   */
  private countFrequency(
    sequences: Array<{ sessionId: string; skills: string[] }>,
    _sessions: SessionSummary[],
  ): Map<string, FrequencyEntry> {
    const map = new Map<string, FrequencyEntry>();

    // Deduplicate sequences within each session
    const sessionSeenKeys = new Map<string, Set<string>>();

    for (const seq of sequences) {
      const key = seq.skills.join(' → ');
      const sessionId = seq.sessionId;
      if (!sessionSeenKeys.has(sessionId)) {
        sessionSeenKeys.set(sessionId, new Set());
      }
      if (sessionSeenKeys.get(sessionId)!.has(key)) continue;
      sessionSeenKeys.get(sessionId)!.add(key);

      if (!map.has(key)) {
        map.set(key, { key, skills: [...seq.skills], session_ids: new Set([sessionId]), count: 0 });
      }
      const entry = map.get(key)!;
      entry.session_ids.add(sessionId);
      entry.count++;
    }

    return map;
  }

  /**
   * Score patterns based on worthiness criteria
   */
  private scorePatterns(
    frequencyMap: Map<string, FrequencyEntry>,
    totalSessions: number,
  ): ExtractedPattern[] {
    const patterns: ExtractedPattern[] = [];

    for (const entry of frequencyMap.values()) {
      const scores = this.calculateWorthiness(entry, totalSessions);
      patterns.push({
        description: entry.key,
        skills: entry.skills,
        session_count: entry.session_ids.size,
        total_occurrences: entry.count,
        worthiness_score: scores.total,
      });
    }

    return patterns;
  }

  /**
   * Calculate worthiness score
   */
  calculateWorthiness(entry: FrequencyEntry, totalSessions: number): WorthinessScore {
    const frequency = Math.min(40, Math.round((entry.session_ids.size / Math.max(1, totalSessions)) * 40));
    const generalizability = entry.skills.length >= 2 ? 20 : (entry.skills.length === 1 ? 10 : 0);
    const uniqueSkills = new Set(entry.skills).size;
    const complexityReduction = Math.min(20, uniqueSkills * 7);
    const errorReduction = entry.count >= 5 ? 10 : (entry.count >= 3 ? 5 : 0);
    return {
      frequency,
      generalizability,
      complexity_reduction: complexityReduction,
      error_reduction: errorReduction,
      total: frequency + generalizability + complexityReduction + errorReduction,
    };
  }
}
