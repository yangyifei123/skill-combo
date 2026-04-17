// ANSI color codes for terminal output - zero dependencies
const ANSI = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

/**
 * Format text with success color (green)
 */
export function success(text: string): string {
  return `${ANSI.green}${text}${ANSI.reset}`;
}

/**
 * Format text with error color (red)
 */
export function error(text: string): string {
  return `${ANSI.red}${text}${ANSI.reset}`;
}

/**
 * Format text with warning color (yellow)
 */
export function warning(text: string): string {
  return `${ANSI.yellow}${text}${ANSI.reset}`;
}

/**
 * Format text with info color (blue)
 */
export function info(text: string): string {
  return `${ANSI.blue}${text}${ANSI.reset}`;
}

/**
 * Format text with dim/gray color
 */
export function dim(text: string): string {
  return `${ANSI.gray}${text}${ANSI.reset}`;
}

/**
 * Format text with bold style
 */
export function bold(text: string): string {
  return `${ANSI.bold}${text}${ANSI.reset}`;
}

/**
 * Check if the terminal supports colors
 * Respects NO_COLOR environment variable (https://no-color.org/)
 */
export function supportsColor(): boolean {
  return process.env.NO_COLOR !== '1' && process.stdout.isTTY === true;
}

/**
 * Color-aware wrapper: only applies colors if terminal supports them
 */
export function colorize(text: string, colorFn: (t: string) => string): string {
  return supportsColor() ? colorFn(text) : text;
}