import fs from 'fs';
import path from 'path';

/**
 * File system utilities for iOS target plugin operations.
 * Provides safe, convenient wrappers for common file operations.
 */

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Write content to a file, ensuring the directory exists first.
 */
export function writeFileSafe(filePath: string, content: string): void {
  ensureDirectoryExists(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

/**
 * Copy a file, ensuring the destination directory exists.
 */
export function copyFileSafe(source: string, destination: string): void {
  if (!fs.existsSync(source)) {
    throw new Error(`Source file does not exist: ${source}`);
  }
  ensureDirectoryExists(path.dirname(destination));
  fs.copyFileSync(source, destination);
}

/**
 * Copy a directory recursively, ensuring the destination exists.
 */
export function copyDirectorySafe(source: string, destination: string): void {
  if (!fs.existsSync(source)) {
    throw new Error(`Source directory does not exist: ${source}`);
  }
  ensureDirectoryExists(path.dirname(destination));
  fs.cpSync(source, destination, { recursive: true });
}

/**
 * Read a file if it exists, otherwise return undefined.
 */
export function readFileIfExists(filePath: string): string | undefined {
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return undefined;
}

/**
 * Check if a file exists and is a file (not a directory).
 */
export function isFile(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * Check if a path exists and is a directory.
 */
export function isDirectory(dirPath: string): boolean {
  try {
    const stat = fs.statSync(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}
