import { Combo } from './types';
/**
 * Load a single combo from a YAML file
 */
export declare function loadComboFromFile(filePath: string): Combo | null;
/**
 * Load ALL combos from a YAML file (handles { combos: [...] } format)
 */
export declare function loadAllCombosFromFile(filePath: string): Combo[];
/**
 * Load all combos from a directory
 */
export declare function loadCombosFromDirectory(dirPath: string): Combo[];
/**
 * Load default combos from the plugin's config directory
 */
export declare function loadDefaultCombos(): Combo[];
//# sourceMappingURL=combo-loader.d.ts.map