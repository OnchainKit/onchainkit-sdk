import * as path from 'path';
import * as fs from 'fs-extra';

/**
 * Check if a path exists
 * @param filePath - The path to the file to check
 * @returns True if the file exists, False if it doesn't
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Get the absolute path from a relative path
 * @param relativePath - The relative path
 * @returns The absolute path
 */
export function getAbsolutePath(relativePath: string): string {
  return path.resolve(process.cwd(), relativePath);
}

/**
 * Create a directory if it doesn't exist
 * @param dirPath - The path to the directory to create
 * @returns True if the directory was created or already exists, False if there was an error
 */
export function ensureDirectory(dirPath: string): boolean {
  try {
    fs.ensureDirSync(dirPath);
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error creating directory: ${errorMessage}`);
    return false;
  }
} 