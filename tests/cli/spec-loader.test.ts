/**
 * Tests for Spec Loader
 * Verifies URL detection, file loading, and spec parsing functionality
 */

import {
  loadSpec,
  isUrl,
  SpecNotFoundError,
  NetworkError,
  MalformedSpecError,
} from "../../src/cli/spec-loader";
import { promises as fs } from "fs";
import { resolve } from "path";

describe("Spec Loader", () => {
  describe("isUrl()", () => {
    it("should identify valid URLs", () => {
      expect(isUrl("https://api.example.com/spec.json")).toBe(true);
      expect(isUrl("http://example.com/spec.yaml")).toBe(true);
      expect(isUrl("https://api.example.com/v1/spec.json")).toBe(true);
    });

    it("should reject relative file paths", () => {
      expect(isUrl("./specs/api.yaml")).toBe(false);
      expect(isUrl("./openapi.json")).toBe(false);
      expect(isUrl("specs/api.yaml")).toBe(false);
    });

    it("should reject absolute file paths", () => {
      expect(isUrl("/http-api/spec.json")).toBe(false);
      expect(isUrl("/specs/api.yaml")).toBe(false);
      expect(isUrl("C:/specs/api.json")).toBe(false);
    });

    it("should reject invalid URLs and paths", () => {
      expect(isUrl("not a url")).toBe(false);
      expect(isUrl("api.json")).toBe(false);
    });
  });

  describe("loadSpec() - Local Files", () => {
    const fixturesDir = resolve(__dirname, "fixtures");

    it("should load a valid YAML file", async () => {
      const specPath = resolve(fixturesDir, "valid-openapi.yaml");
      const spec = await loadSpec(specPath);

      expect(spec).toBeDefined();
      expect((spec as any).openapi).toBe("3.0.0");
      expect((spec as any).info.title).toBe("Sample API");
    });

    it("should load a valid JSON file", async () => {
      const specPath = resolve(fixturesDir, "valid-openapi.json");
      const spec = await loadSpec(specPath);

      expect(spec).toBeDefined();
      expect((spec as any).openapi).toBe("3.0.0");
      expect((spec as any).info.title).toBe("Sample API (JSON)");
    });

    it("should resolve relative paths from process.cwd()", async () => {
      // Create a temporary relative path test
      const specPath = "tests/cli/fixtures/valid-openapi.yaml";
      const spec = await loadSpec(specPath);

      expect(spec).toBeDefined();
      expect((spec as any).openapi).toBe("3.0.0");
    });

    it("should throw SpecNotFoundError for missing files", async () => {
      const specPath = resolve(fixturesDir, "nonexistent.yaml");

      await expect(loadSpec(specPath)).rejects.toThrow(SpecNotFoundError);
      await expect(loadSpec(specPath)).rejects.toThrow(
        /Specification file not found/
      );
    });

    it("should throw MalformedSpecError for invalid specs", async () => {
      const specPath = resolve(fixturesDir, "malformed.yaml");

      await expect(loadSpec(specPath)).rejects.toThrow(MalformedSpecError);
      await expect(loadSpec(specPath)).rejects.toThrow(
        /Invalid specification format/
      );
    });
  });

  describe("loadSpec() - Remote URLs", () => {
    // Mock fetch for URL tests
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      // Reset fetch mock
      globalThis.fetch = jest.fn();
    });

    afterEach(() => {
      // Restore original fetch
      globalThis.fetch = originalFetch;
    });

    it("should load a valid spec from URL", async () => {
      const mockSpec = {
        openapi: "3.0.0",
        info: { title: "Remote API", version: "1.0.0" },
        paths: {},
      };

      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockSpec),
      });

      const spec = await loadSpec("https://api.example.com/spec.json");

      expect(spec).toBeDefined();
      expect((spec as any).info.title).toBe("Remote API");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://api.example.com/spec.json",
        expect.objectContaining({ timeout: 30000 })
      );
    });

    it("should retry on network failures and succeed", async () => {
      const mockSpec = {
        openapi: "3.0.0",
        info: { title: "Retry Success", version: "1.0.0" },
        paths: {},
      };

      // First call fails with network error
      // Second call succeeds
      (globalThis.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(mockSpec),
        });

      const spec = await loadSpec("https://api.example.com/spec.json");

      expect(spec).toBeDefined();
      expect((spec as any).info.title).toBe("Retry Success");
      // Should have been called twice (once failed, once succeeded)
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it("should retry on 5xx errors", async () => {
      const mockSpec = {
        openapi: "3.0.0",
        info: { title: "Server Error Retry", version: "1.0.0" },
        paths: {},
      };

      // First call returns 503, second succeeds
      (globalThis.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
          text: async () => "",
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(mockSpec),
        });

      const spec = await loadSpec("https://api.example.com/spec.json");

      expect(spec).toBeDefined();
      expect((spec as any).info.title).toBe("Server Error Retry");
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it("should not retry on 4xx errors (non-408)", async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: async () => "",
      });

      await expect(
        loadSpec("https://api.example.com/nonexistent.json")
      ).rejects.toThrow(NetworkError);

      // Should only be called once (no retry on 404)
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it("should throw NetworkError on unreachable URL", async () => {
      (globalThis.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Failed to fetch")
      );

      await expect(loadSpec("https://unreachable.example.com/spec.json")).rejects.toThrow(
        NetworkError
      );
      await expect(loadSpec("https://unreachable.example.com/spec.json")).rejects.toThrow(
        /Failed to fetch specification from/
      );
    });

    it("should throw MalformedSpecError for invalid JSON response", async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => "not valid json or yaml",
      });

      await expect(
        loadSpec("https://api.example.com/invalid.json")
      ).rejects.toThrow(MalformedSpecError);
    });
  });

  describe("Error Messages", () => {
    const fixturesDir = resolve(__dirname, "fixtures");

    it("should provide context in SpecNotFoundError", async () => {
      const specPath = resolve(fixturesDir, "missing.yaml");

      try {
        await loadSpec(specPath);
        fail("Should have thrown SpecNotFoundError");
      } catch (error) {
        expect(error).toBeInstanceOf(SpecNotFoundError);
        expect((error as Error).message).toContain("Specification file not found");
        expect((error as Error).message).toContain("missing.yaml");
      }
    });

    it("should provide context in MalformedSpecError", async () => {
      const specPath = resolve(fixturesDir, "malformed.yaml");

      try {
        await loadSpec(specPath);
        fail("Should have thrown MalformedSpecError");
      } catch (error) {
        expect(error).toBeInstanceOf(MalformedSpecError);
        expect((error as Error).message).toContain("Invalid specification format");
      }
    });
  });
});
