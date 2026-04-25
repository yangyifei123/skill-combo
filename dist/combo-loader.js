"use strict";
// Combo Loader - Load combo definitions from YAML files
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
exports.loadComboFromFile = loadComboFromFile;
exports.loadAllCombosFromFile = loadAllCombosFromFile;
exports.loadCombosFromDirectory = loadCombosFromDirectory;
exports.loadDefaultCombos = loadDefaultCombos;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml_1 = require("yaml");
/**
 * Normalize a parsed combo object
 */
function normalizeCombo(combo, filePath) {
    if (!combo)
        return null;
    // Handle nested combo: { combo: { name: ..., skills: ... } }
    if (combo.combo) {
        combo = combo.combo;
    }
    // Validate required fields
    // Subagent combos use subagent_steps instead of skills
    if (!combo.name || !combo.type) {
        console.error(`Invalid combo in ${filePath}: missing required fields`);
        return null;
    }
    if (combo.type !== 'subagent' && !combo.skills) {
        console.error(`Invalid combo in ${filePath}: missing skills field`);
        return null;
    }
    // Set defaults
    combo.execution = combo.execution || 'serial';
    return combo;
}
/**
 * Load a single combo from a YAML file
 */
function loadComboFromFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = (0, yaml_1.parse)(content);
        // Handle three formats:
        // format 1: { combo: { ... } } - single nested combo
        // format 2: { name: ..., skills: ... } - single top-level combo
        // format 3: { combos: [...] } - list of combos at top level
        // Check if it's a list of combos
        if (Array.isArray(parsed)) {
            // format 3 - already an array, treat as single combo
            return normalizeCombo(parsed[0], filePath);
        }
        else if (parsed.combos && Array.isArray(parsed.combos)) {
            // It's a { combos: [...] } wrapper, return first combo
            // For single combo loading, return first; use loadCombosFromFile for all
            return normalizeCombo(parsed.combos[0], filePath);
        }
        else {
            // Single combo format (format 1 or 2)
            return normalizeCombo(parsed, filePath);
        }
    }
    catch (error) {
        console.error(`Error loading combo from ${filePath}:`, error);
        return null;
    }
}
/**
 * Load ALL combos from a YAML file (handles { combos: [...] } format)
 */
function loadAllCombosFromFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = (0, yaml_1.parse)(content);
        const combos = [];
        // Get the array of combos
        let comboArray = [];
        if (Array.isArray(parsed)) {
            comboArray = parsed;
        }
        else if (parsed.combos && Array.isArray(parsed.combos)) {
            comboArray = parsed.combos;
        }
        else if (parsed.combo) {
            comboArray = [parsed.combo];
        }
        else {
            comboArray = [parsed];
        }
        for (const combo of comboArray) {
            const normalized = normalizeCombo(combo, filePath);
            if (normalized) {
                combos.push(normalized);
            }
        }
        return combos;
    }
    catch (error) {
        console.error(`Error loading combos from ${filePath}:`, error);
        return [];
    }
}
/**
 * Load all combos from a directory
 */
function loadCombosFromDirectory(dirPath) {
    const combos = [];
    if (!fs.existsSync(dirPath)) {
        return combos;
    }
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            // Recursively load from subdirectories
            combos.push(...loadCombosFromDirectory(filePath));
        }
        else if (file.endsWith('.yaml') || file.endsWith('.yml')) {
            const fileCombos = loadAllCombosFromFile(filePath);
            combos.push(...fileCombos);
        }
    }
    return combos;
}
/**
 * Load default combos from the plugin's config directory
 */
function loadDefaultCombos() {
    const configDir = path.join(__dirname, '..', 'config');
    const examplesDir = path.join(__dirname, '..', 'combos', 'examples');
    const combos = [];
    // Load from config/default-combos.yaml
    const defaultCombosPath = path.join(configDir, 'default-combos.yaml');
    if (fs.existsSync(defaultCombosPath)) {
        const fileCombos = loadAllCombosFromFile(defaultCombosPath);
        combos.push(...fileCombos);
    }
    // Load from combos/examples/
    if (fs.existsSync(examplesDir)) {
        const exampleCombos = loadCombosFromDirectory(examplesDir);
        combos.push(...exampleCombos);
    }
    return combos;
}
//# sourceMappingURL=combo-loader.js.map