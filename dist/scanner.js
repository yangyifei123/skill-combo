"use strict";
/**
 * Skill Scanner - Discovers and indexes skills from OpenCode skill directories
 *
 * TDD Tests for Scanner:
 * 1. Should scan ~/.config/opencode/skills/ directory
 * 2. Should scan ~/.agents/skills/ directory
 * 3. Should parse SKILL.md files and extract metadata
 * 4. Should handle missing/invalid SKILL.md gracefully
 * 5. Should return list of discovered skills with metadata
 * 6. Should support incremental scanning based on mtime
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SKILL_LOCATIONS = void 0;
exports.scanSkills = scanSkills;
exports.parseSkillFile = parseSkillFile;
exports.parseSkillMarkdown = parseSkillMarkdown;
exports.extractCategories = extractCategories;
exports.extractLoadSkills = extractLoadSkills;
exports.extractCapabilities = extractCapabilities;
exports.extractInputs = extractInputs;
exports.extractOutputs = extractOutputs;
exports.extractCompatibility = extractCompatibility;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const timestamp_store_1 = require("./timestamp-store");
const SKILL_LOCATIONS = [
    path.join(process.env.HOME || process.env.USERPROFILE || '', '.config', 'opencode', 'skills'),
    path.join(process.env.HOME || process.env.USERPROFILE || '', '.agents', 'skills'),
];
exports.SKILL_LOCATIONS = SKILL_LOCATIONS;
const SKILL_FILE = 'SKILL.md';
/**
 * SkillScanner - Internal class for scanning skills with mtime filtering
 */
class SkillScanner {
    setMinMtime(timestamp) {
        this.minMtime = timestamp;
    }
    /**
     * Check if a file should be included based on mtime
     */
    shouldIncludeFile(filePath) {
        if (!this.minMtime)
            return true;
        try {
            const stat = fs.statSync(filePath);
            return stat.mtimeMs > this.minMtime;
        }
        catch {
            return true;
        }
    }
    /**
     * Recursively scans a directory for skills
     */
    async scanDirectory(dir, skills, errors) {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch (err) {
            errors.push({ location: dir, error: `Cannot read directory: ${err}` });
            return;
        }
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                // Check if this directory contains a SKILL.md file
                const skillFile = path.join(fullPath, SKILL_FILE);
                if (fs.existsSync(skillFile)) {
                    // Skip if incremental scan and file is not modified
                    if (!this.shouldIncludeFile(skillFile)) {
                        continue;
                    }
                    const skill = await parseSkillFile(skillFile);
                    if (skill) {
                        skills.push(skill);
                    }
                }
                else {
                    // Recurse into subdirectories
                    await this.scanDirectory(fullPath, skills, errors);
                }
            }
        }
    }
    /**
     * Scans all skill directories and returns discovered skills
     */
    async scan(skillDirs) {
        const skills = [];
        const errors = [];
        for (const location of skillDirs) {
            if (fs.existsSync(location)) {
                await this.scanDirectory(location, skills, errors);
            }
        }
        return skills;
    }
}
/**
 * Scans all skill directories and returns discovered skills
 */
async function scanSkills(skillDirs = SKILL_LOCATIONS, options = {}) {
    const { incremental = true, force = false } = options;
    const scanner = new SkillScanner();
    const store = new timestamp_store_1.TimestampStore(process.cwd());
    if (incremental && !force) {
        const lastScan = await store.getLastScanTimestamp();
        if (lastScan) {
            scanner.setMinMtime(lastScan);
        }
    }
    // 执行扫描...
    const skills = await scanner.scan(skillDirs);
    // 保存时间戳
    await store.setLastScanTimestamp(Date.now());
    return { skills, errors: [], timestamp: Date.now() };
}
/**
 * Parses a SKILL.md file and extracts skill metadata
 */
async function parseSkillFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const skill = parseSkillMarkdown(content, filePath);
        return skill;
    }
    catch (_err) {
        // Return null for invalid files - scanner handles errors gracefully
        return null;
    }
}
/**
 * Extracts metadata from SKILL.md markdown content
 */
function parseSkillMarkdown(content, filePath) {
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
    const id = extractNameFromPath(filePath)
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/\./g, '-'); // Normalize dots to hyphens for valid IDs
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
function extractNameFromPath(filePath) {
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
function extractCategories(content) {
    const categories = [];
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
function extractLoadSkills(content) {
    const skills = [];
    // Match skill tool invocations: skill(name="...")
    const skillPattern = /skill\s*\(\s*name\s*=\s*["']([^"']+)["']/gi;
    skillPattern.lastIndex = 0;
    const matches = content.matchAll(skillPattern);
    for (const match of matches) {
        skills.push(match[1]);
    }
    return [...new Set(skills)];
}
function extractCapabilities(content) {
    const capabilities = [];
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
function extractInputs(content) {
    const inputs = [];
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
function extractOutputs(content) {
    const outputs = [];
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
function extractCompatibility(content) {
    const compat = [];
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
//# sourceMappingURL=scanner.js.map