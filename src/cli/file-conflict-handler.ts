/**
 * File Conflict Handler
 * Detects when output files would overwrite existing files and provides user-friendly prompts
 */

import { promises as fs, existsSync } from 'fs';
import { resolve, isAbsolute } from 'path';

/**
 * Information about a conflicting file
 */
export interface FileConflict {
  path: string;
  size: number;
  mtime: Date;
}

/**
 * Checks for file conflicts in the output directory
 * @param outputDir - Directory where files will be generated
 * @param filesToGenerate - Array of file paths that will be generated
 * @returns Array of FileConflict objects for existing files
 */
export async function checkFileConflicts(
  outputDir: string,
  filesToGenerate: string[]
): Promise<FileConflict[]> {
  const conflicts: FileConflict[] = [];

  // Resolve the output directory path
  const resolvedOutputDir = isAbsolute(outputDir)
    ? outputDir
    : resolve(process.cwd(), outputDir);

  for (const filePath of filesToGenerate) {
    const fullPath = resolve(resolvedOutputDir, filePath);

    try {
      // Use fs.stat to follow symlinks and get file information
      const stats = await fs.stat(fullPath);

      if (stats.isFile()) {
        conflicts.push({
          path: filePath,
          size: stats.size,
          mtime: stats.mtime,
        });
      }
    } catch (error) {
      // File doesn't exist or cannot be accessed - no conflict
      if (
        error instanceof Error &&
        'code' in error &&
        error.code !== 'ENOENT'
      ) {
        // Permission or other errors are silently ignored
        // as we want to be permissive during conflict checking
      }
    }
  }

  return conflicts;
}

/**
 * Formats a list of conflicts for display
 * Shows first 3 files, then "... and N more" if there are additional files
 * @param conflicts - Array of conflicting files
 * @returns Formatted string showing the conflicts
 */
export function formatConflictList(conflicts: FileConflict[]): string {
  if (conflicts.length === 0) {
    return '(no conflicts)';
  }

  const displayLimit = 3;
  const displayedConflicts = conflicts.slice(0, displayLimit);
  const hiddenCount = Math.max(0, conflicts.length - displayLimit);

  let formatted = displayedConflicts
    .map((conflict) => {
      const sizeMB = (conflict.size / (1024 * 1024)).toFixed(2);
      const mtime = conflict.mtime.toLocaleString();
      return `  • ${conflict.path} (${sizeMB} MB, modified ${mtime})`;
    })
    .join('\n');

  if (hiddenCount > 0) {
    formatted += `\n  ... and ${hiddenCount} more file${hiddenCount > 1 ? 's' : ''}`;
  }

  return formatted;
}

/**
 * Generates a user-friendly prompt message for file conflicts
 * @param conflicts - Array of conflicting files
 * @param outputDir - Directory where files will be generated
 * @returns Prompt message string
 */
export function generateConflictPrompt(
  conflicts: FileConflict[],
  outputDir: string
): string {
  if (conflicts.length === 0) {
    return '';
  }

  const conflictCount = conflicts.length;
  const fileWord = conflictCount === 1 ? 'file' : 'files';

  return `The following existing ${fileWord} would be overwritten:\n\n${formatConflictList(conflicts)}\n\nDo you want to continue and overwrite these files?`;
}

/**
 * Creates an array of sample file paths that would be generated
 * This is a placeholder that returns common generation patterns
 * In future phases, this will be determined by actual generator logic
 * @param spec - Parsed OpenAPI specification
 * @returns Array of file paths that would be generated
 */
export function getFilesToGenerate(spec: Record<string, unknown>): string[] {
  // Placeholder implementation
  // In real usage, this would analyze the spec and determine
  // which files need to be generated based on available generators
  const files: string[] = [];

  // Check if spec has paths (API endpoints)
  if (spec.paths && typeof spec.paths === 'object') {
    files.push('controller.ts');
  }

  // Check if spec has components/schemas (data models)
  if (spec.components && typeof spec.components === 'object') {
    const components = spec.components as Record<string, unknown>;
    if (components.schemas) {
      files.push('dto.ts');
    }
  }

  // Default files
  if (files.length === 0) {
    files.push('index.ts');
  }

  return files;
}
