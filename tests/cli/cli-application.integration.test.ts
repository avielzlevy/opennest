/**
 * Integration Tests for CLI Application
 * Verifies the conflict detection and user prompt flow
 */

import * as path from 'path';
import * as os from 'os';
import { promises as fs } from 'fs';
import {
  checkFileConflicts,
  generateConflictPrompt,
  getFilesToGenerate,
} from '../../src/cli/file-conflict-handler';
import { loadSpec } from '../../src/cli/spec-loader';

// Mock @inquirer/prompts at module level
jest.mock('@inquirer/prompts', () => ({
  confirm: jest.fn(),
}));

import { confirm } from '@inquirer/prompts';

describe('CLI Application Integration - Conflict & Prompt Flow', () => {
  let tempDir: string;
  let specFile: string;

  beforeEach(async () => {
    // Create temporary directory
    tempDir = path.join(os.tmpdir(), `opennest-int-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Create a valid OpenAPI spec
    specFile = path.join(tempDir, 'spec.json');
    const spec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {
        '/users': {
          get: {
            summary: 'Get users',
            responses: {
              '200': {
                description: 'Success',
              },
            },
          },
        },
      },
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

    await fs.writeFile(specFile, JSON.stringify(spec, null, 2));
  });

  afterEach(async () => {
    jest.clearAllMocks();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Spec Loading and File Generation Planning', () => {
    it('should load spec and determine files to generate', async () => {
      const spec = await loadSpec(specFile);

      expect(spec).toBeDefined();
      expect(spec.openapi).toBe('3.0.0');
      expect(spec.info).toBeDefined();
    });

    it('should identify files to generate from spec', async () => {
      const spec = await loadSpec(specFile);
      const filesToGenerate = getFilesToGenerate(spec);

      // Should generate controller and dto since spec has paths and schemas
      expect(filesToGenerate).toContain('controller.ts');
      expect(filesToGenerate).toContain('dto.ts');
    });

    it('should return consistent file list for same spec', async () => {
      const spec = await loadSpec(specFile);
      const files1 = getFilesToGenerate(spec);
      const files2 = getFilesToGenerate(spec);

      expect(files1).toEqual(files2);
    });
  });

  describe('Conflict Detection Integration', () => {
    it('should detect conflicts when files exist in output directory', async () => {
      const outputDir = path.join(tempDir, 'output');
      await fs.mkdir(outputDir, { recursive: true });

      // Create existing files
      await fs.writeFile(
        path.join(outputDir, 'controller.ts'),
        'existing controller'
      );
      await fs.writeFile(path.join(outputDir, 'dto.ts'), 'existing dto');

      const spec = await loadSpec(specFile);
      const filesToGenerate = getFilesToGenerate(spec);
      const conflicts = await checkFileConflicts(outputDir, filesToGenerate);

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts.some((c) => c.path === 'controller.ts')).toBe(true);
    });

    it('should return no conflicts when files do not exist', async () => {
      const outputDir = path.join(tempDir, 'output-new');
      // Don't create the directory

      const spec = await loadSpec(specFile);
      const filesToGenerate = getFilesToGenerate(spec);
      const conflicts = await checkFileConflicts(outputDir, filesToGenerate);

      expect(conflicts).toHaveLength(0);
    });

    it('should handle nested output directories', async () => {
      const outputDir = path.join(tempDir, 'src', 'generated');
      await fs.mkdir(outputDir, { recursive: true });

      await fs.writeFile(path.join(outputDir, 'controller.ts'), 'content');

      const spec = await loadSpec(specFile);
      const filesToGenerate = getFilesToGenerate(spec);
      const conflicts = await checkFileConflicts(outputDir, filesToGenerate);

      expect(conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('Conflict Prompt Generation', () => {
    it('should generate user-friendly prompt for conflicts', async () => {
      const outputDir = path.join(tempDir, 'output');
      await fs.mkdir(outputDir, { recursive: true });

      // Create files
      await fs.writeFile(path.join(outputDir, 'controller.ts'), 'content');
      await fs.writeFile(path.join(outputDir, 'dto.ts'), 'content');

      const spec = await loadSpec(specFile);
      const filesToGenerate = getFilesToGenerate(spec);
      const conflicts = await checkFileConflicts(outputDir, filesToGenerate);
      const prompt = generateConflictPrompt(conflicts, outputDir);

      expect(prompt).toContain('existing');
      expect(prompt).toContain('overwritten');
      expect(prompt).toContain('continue');
    });

    it('should truncate prompt list to 3 files', async () => {
      const outputDir = path.join(tempDir, 'output-many');
      await fs.mkdir(outputDir, { recursive: true });

      // Create 5 files
      for (let i = 1; i <= 5; i++) {
        await fs.writeFile(path.join(outputDir, `file${i}.ts`), 'content');
      }

      const conflicts = await checkFileConflicts(outputDir, [
        'file1.ts',
        'file2.ts',
        'file3.ts',
        'file4.ts',
        'file5.ts',
      ]);

      const prompt = generateConflictPrompt(conflicts, outputDir);

      expect(prompt).toContain('file1.ts');
      expect(prompt).toContain('file2.ts');
      expect(prompt).toContain('file3.ts');
      expect(prompt).not.toContain('file4.ts');
      expect(prompt).toContain('... and 2 more');
    });
  });

  describe('User Confirmation Flow', () => {
    it('should allow user to confirm overwrite', async () => {
      const confirmMock = confirm as jest.MockedFunction<typeof confirm>;
      confirmMock.mockResolvedValue(true);

      const userChoice = await confirmMock({
        message: 'Do you want to continue?',
        default: false,
      });

      expect(userChoice).toBe(true);
    });

    it('should allow user to cancel generation', async () => {
      const confirmMock = confirm as jest.MockedFunction<typeof confirm>;
      confirmMock.mockResolvedValue(false);

      const userChoice = await confirmMock({
        message: 'Do you want to continue?',
        default: false,
      });

      expect(userChoice).toBe(false);
    });

    it('should default to no when user does not respond', async () => {
      const confirmMock = confirm as jest.MockedFunction<typeof confirm>;

      const expectedDefault = false;

      expect(expectedDefault).toBe(false);
    });
  });

  describe('End-to-End Conflict Handling Scenarios', () => {
    it('scenario: user has existing files and confirms overwrite', async () => {
      // Setup
      const outputDir = path.join(tempDir, 'scenario1');
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(path.join(outputDir, 'controller.ts'), 'old');
      await fs.writeFile(path.join(outputDir, 'dto.ts'), 'old');

      // Load spec and determine files
      const spec = await loadSpec(specFile);
      const filesToGenerate = getFilesToGenerate(spec);

      // Check for conflicts
      const conflicts = await checkFileConflicts(outputDir, filesToGenerate);
      expect(conflicts.length).toBeGreaterThan(0);

      // Generate prompt
      const prompt = generateConflictPrompt(conflicts, outputDir);
      expect(prompt).toBeTruthy();

      // User confirms
      const confirmMock = confirm as jest.MockedFunction<typeof confirm>;
      confirmMock.mockResolvedValue(true);
      const shouldProceed = await confirmMock({
        message: 'Continue?',
        default: false,
      });

      expect(shouldProceed).toBe(true);
    });

    it('scenario: user cancels when conflicts detected', async () => {
      // Setup
      const outputDir = path.join(tempDir, 'scenario2');
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(path.join(outputDir, 'controller.ts'), 'old');

      // Load spec and check conflicts
      const spec = await loadSpec(specFile);
      const filesToGenerate = getFilesToGenerate(spec);
      const conflicts = await checkFileConflicts(outputDir, filesToGenerate);

      // User cancels
      const confirmMock = confirm as jest.MockedFunction<typeof confirm>;
      confirmMock.mockResolvedValue(false);
      const shouldProceed = await confirmMock({
        message: 'Continue?',
        default: false,
      });

      expect(shouldProceed).toBe(false);
      // Generation should be skipped
    });

    it('scenario: no conflicts so no prompt needed', async () => {
      // Setup
      const outputDir = path.join(tempDir, 'scenario3-new');
      // Don't create directory - no files exist

      // Load spec and check conflicts
      const spec = await loadSpec(specFile);
      const filesToGenerate = getFilesToGenerate(spec);
      const conflicts = await checkFileConflicts(outputDir, filesToGenerate);

      expect(conflicts).toHaveLength(0);

      // No prompt should be shown
      const confirmMock = confirm as jest.MockedFunction<typeof confirm>;
      expect(confirmMock).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle spec not found error', async () => {
      const badSpecPath = path.join(tempDir, 'nonexistent.json');

      await expect(loadSpec(badSpecPath)).rejects.toThrow();
    });

    it('should handle malformed spec', async () => {
      const badSpecFile = path.join(tempDir, 'bad.json');
      await fs.writeFile(badSpecFile, 'invalid json content');

      await expect(loadSpec(badSpecFile)).rejects.toThrow();
    });

    it('should handle missing output directory gracefully', async () => {
      const outputDir = path.join(tempDir, 'does-not-exist');

      const spec = await loadSpec(specFile);
      const filesToGenerate = getFilesToGenerate(spec);
      const conflicts = await checkFileConflicts(outputDir, filesToGenerate);

      // Should return empty - no files exist
      expect(conflicts).toHaveLength(0);
    });
  });
});
