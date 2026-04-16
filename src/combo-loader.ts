// Combo Loader - Load combo definitions from YAML files

import * as fs from 'fs';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
import { Combo } from './types';

/**
 * Normalize a parsed combo object
 */
function normalizeCombo(combo: any, filePath: string): Combo | null {
  if (!combo) return null;

  // Handle nested combo: { combo: { name: ..., skills: ... } }
  if (combo.combo) {
    combo = combo.combo;
  }

  // Validate required fields
  if (!combo.name || !combo.type || !combo.skills) {
    console.error(`Invalid combo in ${filePath}: missing required fields`);
    return null;
  }

  // Set defaults
  combo.execution = combo.execution || 'serial';

  return combo as Combo;
}

/**
 * Load a single combo from a YAML file
 */
export function loadComboFromFile(filePath: string): Combo | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseYaml(content);

    // Handle three formats:
    // format 1: { combo: { ... } } - single nested combo
    // format 2: { name: ..., skills: ... } - single top-level combo
    // format 3: { combos: [...] } - list of combos at top level

    // Check if it's a list of combos
    if (Array.isArray(parsed)) {
      // format 3 - already an array, treat as single combo
      return normalizeCombo(parsed[0], filePath);
    } else if (parsed.combos && Array.isArray(parsed.combos)) {
      // It's a { combos: [...] } wrapper, return first combo
      // For single combo loading, return first; use loadCombosFromFile for all
      return normalizeCombo(parsed.combos[0], filePath);
    } else {
      // Single combo format (format 1 or 2)
      return normalizeCombo(parsed, filePath);
    }
  } catch (error) {
    console.error(`Error loading combo from ${filePath}:`, error);
    return null;
  }
}

/**
 * Load ALL combos from a YAML file (handles { combos: [...] } format)
 */
export function loadAllCombosFromFile(filePath: string): Combo[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseYaml(content);
    const combos: Combo[] = [];

    // Get the array of combos
    let comboArray: any[] = [];
    if (Array.isArray(parsed)) {
      comboArray = parsed;
    } else if (parsed.combos && Array.isArray(parsed.combos)) {
      comboArray = parsed.combos;
    } else if (parsed.combo) {
      comboArray = [parsed.combo];
    } else {
      comboArray = [parsed];
    }

    for (const combo of comboArray) {
      const normalized = normalizeCombo(combo, filePath);
      if (normalized) {
        combos.push(normalized);
      }
    }

    return combos;
  } catch (error) {
    console.error(`Error loading combos from ${filePath}:`, error);
    return [];
  }
}

/**
 * Load all combos from a directory
 */
export function loadCombosFromDirectory(dirPath: string): Combo[] {
  const combos: Combo[] = [];

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
    } else if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      const fileCombos = loadAllCombosFromFile(filePath);
      combos.push(...fileCombos);
    }
  }

  return combos;
}

/**
 * Load default combos from the plugin's config directory
 */
export function loadDefaultCombos(): Combo[] {
  const configDir = path.join(__dirname, '..', 'config');
  const examplesDir = path.join(__dirname, '..', 'combos', 'examples');

  const combos: Combo[] = [];

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
