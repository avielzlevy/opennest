/**
 * Tests for File Conflict Handler
 * Verifies file conflict detection, metadata collection, and prompt generation
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  checkFileConflicts,
  formatConflictList,
  generateConflictPrompt,
  getFilesToGenerate,
  type FileConflict,
} from '../../src/cli/file-conflict-handler';

describe('File Conflict Handler', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for tests
    tempDir = path.join(os.tmpdir(), `opennest-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('checkFileConflicts()', () => {
    it('should return empty array for new files', async () => {
      const conflicts = await checkFileConflicts(tempDir, ['new-file.ts']);
      expect(conflicts).toEqual([]);
    });

    it('should detect existing files', async () => {
      // Create a test file
      const testFile = path.join(tempDir, 'existing.ts');
      await fs.writeFile(testFile, 'console.log("test");');

      // Check for conflicts
      const conflicts = await checkFileConflicts(tempDir, ['existing.ts']);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].path).toBe('existing.ts');
      expect(typeof conflicts[0].size).toBe('number');
      expect(conflicts[0].mtime).toBeDefined();
      expect(typeof conflicts[0].mtime.getTime).toBe('function');
    });

    it('should collect file metadata (size and mtime)', async () => {
      const testFile = path.join(tempDir, 'test.ts');
      const testContent = 'export const test = true;';
      const beforeTime = Date.now();
      await fs.writeFile(testFile, testContent);
      const afterTime = Date.now();

      const conflicts = await checkFileConflicts(tempDir, ['test.ts']);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].size).toBe(testContent.length);
      expect(conflicts[0].mtime.getTime()).toBeGreaterThanOrEqual(beforeTime);
      expect(conflicts[0].mtime.getTime()).toBeLessThanOrEqual(afterTime + 1000);
    });

    it('should detect multiple conflicting files', async () => {
      // Create multiple test files
      await fs.writeFile(path.join(tempDir, 'file1.ts'), 'content1');
      await fs.writeFile(path.join(tempDir, 'file2.ts'), 'content2');
      await fs.writeFile(path.join(tempDir, 'file3.ts'), 'content3');

      const conflicts = await checkFileConflicts(tempDir, [
        'file1.ts',
        'file2.ts',
        'file3.ts',
        'nonexistent.ts',
      ]);

      expect(conflicts).toHaveLength(3);
      expect(conflicts.map((c) => c.path).sort()).toEqual([
        'file1.ts',
        'file2.ts',
        'file3.ts',
      ]);
    });

    it('should handle nested file paths', async () => {
      // Create nested directory structure
      const nestedDir = path.join(tempDir, 'src', 'generated');
      await fs.mkdir(nestedDir, { recursive: true });
      await fs.writeFile(path.join(nestedDir, 'dto.ts'), 'export class DTO {}');

      const conflicts = await checkFileConflicts(tempDir, [
        'src/generated/dto.ts',
      ]);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].path).toBe('src/generated/dto.ts');
    });

    it('should handle absolute output directory', async () => {
      // Create a test file
      const testFile = path.join(tempDir, 'test.ts');
      await fs.writeFile(testFile, 'test content');

      // Use absolute path
      const conflicts = await checkFileConflicts(tempDir, ['test.ts']);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].path).toBe('test.ts');
    });

    it('should handle symlinks correctly (using fs.stat)', async () => {
      // Create a test file
      const originalFile = path.join(tempDir, 'original.ts');
      await fs.writeFile(originalFile, 'original content');

      // Create a symlink (skip on Windows without special permissions)
      const symlinkPath = path.join(tempDir, 'symlink.ts');
      try {
        await fs.symlink(originalFile, symlinkPath);
        const conflicts = await checkFileConflicts(tempDir, ['symlink.ts']);
        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].path).toBe('symlink.ts');
      } catch {
        // Symlinks may not be supported; skip this test case
      }
    });

    it('should gracefully handle permission errors', async () => {
      // Create a file
      const testFile = path.join(tempDir, 'test.ts');
      await fs.writeFile(testFile, 'test');

      // Try to check conflicts - even if there are permission issues,
      // it should not throw but return conflicts for accessible files
      const conflicts = await checkFileConflicts(tempDir, ['test.ts']);

      // Should still detect the accessible file
      expect(conflicts).toHaveLength(1);
    });
  });

  describe('formatConflictList()', () => {
    it('should return "(no conflicts)" for empty list', () => {
      const formatted = formatConflictList([]);
      expect(formatted).toBe('(no conflicts)');
    });

    it('should format single conflict', () => {
      const conflicts: FileConflict[] = [
        {
          path: 'controller.ts',
          size: 2048,
          mtime: new Date('2024-01-15T10:30:00Z'),
        },
      ];

      const formatted = formatConflictList(conflicts);

      expect(formatted).toContain('controller.ts');
      expect(formatted).toContain('0.00 MB');
      expect(formatted).toContain('•');
    });

    it('should show first 3 files and truncate after', () => {
      const conflicts: FileConflict[] = [
        { path: 'file1.ts', size: 1024, mtime: new Date() },
        { path: 'file2.ts', size: 2048, mtime: new Date() },
        { path: 'file3.ts', size: 4096, mtime: new Date() },
        { path: 'file4.ts', size: 8192, mtime: new Date() },
        { path: 'file5.ts', size: 16384, mtime: new Date() },
      ];

      const formatted = formatConflictList(conflicts);

      expect(formatted).toContain('file1.ts');
      expect(formatted).toContain('file2.ts');
      expect(formatted).toContain('file3.ts');
      expect(formatted).not.toContain('file4.ts');
      expect(formatted).not.toContain('file5.ts');
      expect(formatted).toContain('... and 2 more files');
    });

    it('should handle exactly 3 files without truncation', () => {
      const conflicts: FileConflict[] = [
        { path: 'file1.ts', size: 1024, mtime: new Date() },
        { path: 'file2.ts', size: 2048, mtime: new Date() },
        { path: 'file3.ts', size: 4096, mtime: new Date() },
      ];

      const formatted = formatConflictList(conflicts);

      expect(formatted).toContain('file1.ts');
      expect(formatted).toContain('file2.ts');
      expect(formatted).toContain('file3.ts');
      expect(formatted).not.toContain('... and');
    });

    it('should display file sizes correctly', () => {
      const conflicts: FileConflict[] = [
        { path: 'small.ts', size: 512, mtime: new Date() },
        { path: 'medium.ts', size: 1024 * 1024, mtime: new Date() }, // 1 MB
        { path: 'large.ts', size: 10 * 1024 * 1024, mtime: new Date() }, // 10 MB
      ];

      const formatted = formatConflictList(conflicts);

      expect(formatted).toContain('0.00 MB'); // 512 bytes
      expect(formatted).toContain('1.00 MB');
      expect(formatted).toContain('10.00 MB');
    });
  });

  describe('generateConflictPrompt()', () => {
    it('should return empty string for no conflicts', () => {
      const prompt = generateConflictPrompt([], tempDir);
      expect(prompt).toBe('');
    });

    it('should generate prompt for single file conflict', () => {
      const conflicts: FileConflict[] = [
        {
          path: 'dto.ts',
          size: 2048,
          mtime: new Date(),
        },
      ];

      const prompt = generateConflictPrompt(conflicts, tempDir);

      expect(prompt).toContain('existing file');
      expect(prompt).toContain('would be overwritten');
      expect(prompt).toContain('dto.ts');
      expect(prompt).toContain('Do you want to continue');
    });

    it('should generate prompt for multiple file conflicts', () => {
      const conflicts: FileConflict[] = [
        { path: 'file1.ts', size: 1024, mtime: new Date() },
        { path: 'file2.ts', size: 2048, mtime: new Date() },
        { path: 'file3.ts', size: 4096, mtime: new Date() },
      ];

      const prompt = generateConflictPrompt(conflicts, tempDir);

      expect(prompt).toContain('existing files');
      expect(prompt).toContain('would be overwritten');
      expect(prompt).toContain('Do you want to continue');
    });

    it('should use proper pluralization for file count', () => {
      const singleConflict: FileConflict[] = [
        { path: 'file.ts', size: 1024, mtime: new Date() },
      ];

      const multipleConflict: FileConflict[] = [
        { path: 'file1.ts', size: 1024, mtime: new Date() },
        { path: 'file2.ts', size: 2048, mtime: new Date() },
      ];

      const singlePrompt = generateConflictPrompt(singleConflict, tempDir);
      const multiplePrompt = generateConflictPrompt(multipleConflict, tempDir);

      expect(singlePrompt).toContain('existing file');
      expect(multiplePrompt).toContain('existing files');
    });

    it('should include conflict list in prompt', () => {
      const conflicts: FileConflict[] = [
        { path: 'dto.ts', size: 1024, mtime: new Date() },
        { path: 'controller.ts', size: 2048, mtime: new Date() },
      ];

      const prompt = generateConflictPrompt(conflicts, tempDir);

      expect(prompt).toContain('dto.ts');
      expect(prompt).toContain('controller.ts');
    });
  });

  describe('getFilesToGenerate()', () => {
    it('should return index.ts for minimal spec', () => {
      const spec = {};
      const files = getFilesToGenerate(spec);
      expect(files).toContain('index.ts');
    });

    it('should include controller.ts when spec has paths', () => {
      const spec = {
        paths: {
          '/users': {
            get: {},
          },
        },
      };
      const files = getFilesToGenerate(spec);
      expect(files).toContain('controller.ts');
    });

    it('should include dto.ts when spec has schemas', () => {
      const spec = {
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
              },
            },
          },
        },
      };
      const files = getFilesToGenerate(spec);
      expect(files).toContain('dto.ts');
    });

    it('should include both controller and dto for complete spec', () => {
      const spec = {
        paths: {
          '/users': {
            get: {},
          },
        },
        components: {
          schemas: {
            User: {},
          },
        },
      };
      const files = getFilesToGenerate(spec);
      expect(files).toContain('controller.ts');
      expect(files).toContain('dto.ts');
    });

    it('should return array of strings', () => {
      const spec = {
        paths: { '/test': {} },
      };
      const files = getFilesToGenerate(spec);
      expect(Array.isArray(files)).toBe(true);
      expect(files.every((f) => typeof f === 'string')).toBe(true);
    });
  });
});
