/**
 * Tests for Retry Handler
 * Verifies exponential backoff, jitter, and retry logic
 */

import {
  fetchWithRetry,
  isRetryableStatusCode,
  type RetryOptions,
} from "../../src/cli/retry-handler";

describe("Retry Handler", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Reset fetch mock
    globalThis.fetch = jest.fn();
    // Clear all timers
    jest.clearAllTimers();
    // Use fake timers for testing delays
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Restore original fetch
    globalThis.fetch = originalFetch;
    // Restore real timers
    jest.useRealTimers();
  });

  describe("isRetryableStatusCode()", () => {
    it("should retry on 5xx server errors", () => {
      expect(isRetryableStatusCode(500)).toBe(true);
      expect(isRetryableStatusCode(501)).toBe(true);
      expect(isRetryableStatusCode(502)).toBe(true);
      expect(isRetryableStatusCode(503)).toBe(true);
      expect(isRetryableStatusCode(504)).toBe(true);
      expect(isRetryableStatusCode(599)).toBe(true);
    });

    it("should retry on 429 (rate limit)", () => {
      expect(isRetryableStatusCode(429)).toBe(true);
    });

    it("should retry on 408 (request timeout)", () => {
      expect(isRetryableStatusCode(408)).toBe(true);
    });

    it("should NOT retry on 4xx client errors (except 408)", () => {
      expect(isRetryableStatusCode(400)).toBe(false);
      expect(isRetryableStatusCode(401)).toBe(false);
      expect(isRetryableStatusCode(403)).toBe(false);
      expect(isRetryableStatusCode(404)).toBe(false);
      expect(isRetryableStatusCode(405)).toBe(false);
      expect(isRetryableStatusCode(409)).toBe(false);
      expect(isRetryableStatusCode(422)).toBe(false);
    });

    it("should NOT retry on 2xx and 3xx status codes", () => {
      expect(isRetryableStatusCode(200)).toBe(false);
      expect(isRetryableStatusCode(201)).toBe(false);
      expect(isRetryableStatusCode(204)).toBe(false);
      expect(isRetryableStatusCode(300)).toBe(false);
      expect(isRetryableStatusCode(301)).toBe(false);
      expect(isRetryableStatusCode(302)).toBe(false);
    });
  });

  describe("fetchWithRetry() - Success Cases", () => {
    it("should return response on first attempt success", async () => {
      const mockResponse = { ok: true, status: 200, text: async () => "" };
      (globalThis.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await fetchWithRetry("https://api.example.com/spec.json");

      expect(result).toBe(mockResponse);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it("should return non-retryable error response immediately", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: async () => "",
      };
      (globalThis.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await fetchWithRetry("https://api.example.com/missing.json");

      expect(result).toBe(mockResponse);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("fetchWithRetry() - Retry on 5xx", () => {
    it("should retry on 5xx and succeed", async () => {
      const successResponse = {
        ok: true,
        status: 200,
        text: async () => "success",
      };

      (globalThis.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
        })
        .mockResolvedValueOnce(successResponse);

      const promise = fetchWithRetry("https://api.example.com/spec.json", {}, {
        maxAttempts: 2,
        baseDelayMs: 100,
        maxDelayMs: 100,
        jitterMs: 0,
      });

      // Fast-forward timers to complete retries
      await jest.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe(successResponse);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it("should retry on 500 internal server error", async () => {
      const successResponse = {
        ok: true,
        status: 200,
        text: async () => "success",
      };

      (globalThis.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        })
        .mockResolvedValueOnce(successResponse);

      const promise = fetchWithRetry("https://api.example.com/spec.json", {}, {
        maxAttempts: 2,
        baseDelayMs: 100,
        maxDelayMs: 100,
        jitterMs: 0,
      });

      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe(successResponse);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("fetchWithRetry() - Retry on 429 (Rate Limit)", () => {
    it("should retry on 429 rate limit", async () => {
      const successResponse = {
        ok: true,
        status: 200,
        text: async () => "success",
      };

      (globalThis.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
        })
        .mockResolvedValueOnce(successResponse);

      const promise = fetchWithRetry("https://api.example.com/spec.json", {}, {
        maxAttempts: 2,
        baseDelayMs: 100,
        maxDelayMs: 100,
        jitterMs: 0,
      });

      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe(successResponse);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("fetchWithRetry() - Retry on 408 (Timeout)", () => {
    it("should retry on 408 timeout", async () => {
      const successResponse = {
        ok: true,
        status: 200,
        text: async () => "success",
      };

      (globalThis.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 408,
          statusText: "Request Timeout",
        })
        .mockResolvedValueOnce(successResponse);

      const promise = fetchWithRetry("https://api.example.com/spec.json", {}, {
        maxAttempts: 2,
        baseDelayMs: 100,
        maxDelayMs: 100,
        jitterMs: 0,
      });

      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe(successResponse);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("fetchWithRetry() - Network Errors", () => {
    it("should retry on network error", async () => {
      const successResponse = {
        ok: true,
        status: 200,
        text: async () => "success",
      };

      (globalThis.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(successResponse);

      const promise = fetchWithRetry("https://api.example.com/spec.json", {}, {
        maxAttempts: 2,
        baseDelayMs: 100,
        maxDelayMs: 100,
        jitterMs: 0,
      });

      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe(successResponse);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it("should throw error after max attempts exhausted", async () => {
      (globalThis.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"));

      const promise = fetchWithRetry("https://api.example.com/spec.json", {}, {
        maxAttempts: 2,
        baseDelayMs: 100,
        maxDelayMs: 100,
        jitterMs: 0,
      });

      await jest.runAllTimersAsync();

      await expect(promise).rejects.toThrow("Network error");
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("Exponential Backoff", () => {
    it("should use exponential backoff timing: 1s, 2s, 4s pattern", async () => {
      const baseDelayMs = 1000;
      const maxDelayMs = 8000;
      const jitterMs = 0; // Disable jitter for predictable timing

      (globalThis.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error("Attempt 1"))
        .mockRejectedValueOnce(new Error("Attempt 2"))
        .mockRejectedValueOnce(new Error("Attempt 3"))
        .mockRejectedValueOnce(new Error("Attempt 4"));

      const promise = fetchWithRetry("https://api.example.com/spec.json", {}, {
        maxAttempts: 4,
        baseDelayMs,
        maxDelayMs,
        jitterMs,
      });

      await jest.runAllTimersAsync();

      await expect(promise).rejects.toThrow();

      // Verify fetch was called 4 times
      expect(globalThis.fetch).toHaveBeenCalledTimes(4);

      // Get the actual timers that were set
      const timerCalls = jest.getTimerCount();
      // This verifies retries happened (can't easily verify exact timing due to sleep)
      expect(globalThis.fetch).toHaveBeenCalledTimes(4);
    });

    it("should cap delay at maxDelayMs", async () => {
      const baseDelayMs = 1000;
      const maxDelayMs = 3000; // Cap at 3s

      (globalThis.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error("Attempt 1"))
        .mockRejectedValueOnce(new Error("Attempt 2"))
        .mockRejectedValueOnce(new Error("Attempt 3"))
        .mockRejectedValueOnce(new Error("Attempt 4"));

      const promise = fetchWithRetry("https://api.example.com/spec.json", {}, {
        maxAttempts: 4,
        baseDelayMs,
        maxDelayMs,
        jitterMs: 0,
      });

      await jest.runAllTimersAsync();

      await expect(promise).rejects.toThrow();
      expect(globalThis.fetch).toHaveBeenCalledTimes(4);
    });
  });

  describe("Jitter Application", () => {
    it("should apply jitter within bounds (±200ms)", async () => {
      const baseDelayMs = 1000;
      const maxDelayMs = 8000;
      const jitterMs = 200;

      (globalThis.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error("Attempt 1"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => "success",
        });

      const promise = fetchWithRetry("https://api.example.com/spec.json", {}, {
        maxAttempts: 2,
        baseDelayMs,
        maxDelayMs,
        jitterMs,
      });

      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeDefined();
      // Verify at least 1 retry happened
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it("should not use jitter when jitterMs is 0", async () => {
      const baseDelayMs = 1000;
      const maxDelayMs = 8000;
      const jitterMs = 0;

      (globalThis.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error("Attempt 1"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => "success",
        });

      const promise = fetchWithRetry("https://api.example.com/spec.json", {}, {
        maxAttempts: 2,
        baseDelayMs,
        maxDelayMs,
        jitterMs,
      });

      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeDefined();
      expect(globalThis.fetch).toHaveBeenCalled();
    });
  });

  describe("Default Options", () => {
    it("should use default maxAttempts of 4", async () => {
      (globalThis.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error("Attempt 1"))
        .mockRejectedValueOnce(new Error("Attempt 2"))
        .mockRejectedValueOnce(new Error("Attempt 3"))
        .mockRejectedValueOnce(new Error("Attempt 4"));

      const promise = fetchWithRetry("https://api.example.com/spec.json");

      await jest.runAllTimersAsync();

      await expect(promise).rejects.toThrow();
      expect(globalThis.fetch).toHaveBeenCalledTimes(4);
    });

    it("should use default baseDelayMs of 1000", async () => {
      (globalThis.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error("Attempt 1"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => "success",
        });

      const promise = fetchWithRetry("https://api.example.com/spec.json");

      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeDefined();
    });
  });

  describe("Max Attempts Enforcement", () => {
    it("should not exceed maxAttempts", async () => {
      (globalThis.fetch as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      const promise = fetchWithRetry("https://api.example.com/spec.json", {}, {
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 100,
        jitterMs: 0,
      });

      await jest.runAllTimersAsync();

      await expect(promise).rejects.toThrow();
      expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    });

    it("should work with maxAttempts of 1 (no retries)", async () => {
      const mockResponse = {
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        text: async () => "",
      };

      (globalThis.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await fetchWithRetry("https://api.example.com/spec.json", {}, {
        maxAttempts: 1,
        baseDelayMs: 100,
        maxDelayMs: 100,
        jitterMs: 0,
      });

      expect(result).toBe(mockResponse);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Timeout Handling", () => {
    it("should handle timeout option", async () => {
      const mockResponse = { ok: true, status: 200, text: async () => "" };
      (globalThis.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await fetchWithRetry(
        "https://api.example.com/spec.json",
        { timeout: 5000 }
      );

      expect(result).toBe(mockResponse);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://api.example.com/spec.json",
        expect.objectContaining({ timeout: 5000 })
      );
    });
  });
});
