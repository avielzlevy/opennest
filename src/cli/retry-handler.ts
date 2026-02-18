/**
 * Retry Handler with Exponential Backoff
 * Implements robust retry logic for network requests with exponential backoff and jitter
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterMs?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 4,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  jitterMs: 200,
};

/**
 * Determines if a given HTTP status code should trigger a retry
 * Retries on: 5xx (server errors), 429 (rate limit), 408 (timeout)
 * Does NOT retry on: 4xx client errors (401, 403, 404, etc.)
 */
export function isRetryableStatusCode(status: number): boolean {
  // Retry on server errors (5xx)
  if (status >= 500 && status < 600) {
    return true;
  }

  // Retry on specific client errors that are retryable
  if (status === 429) {
    // Rate limit
    return true;
  }

  if (status === 408) {
    // Request timeout
    return true;
  }

  return false;
}

/**
 * Calculates delay for exponential backoff with jitter
 * Formula: min(baseDelay * 2^attempt + jitter, maxDelay)
 * where jitter is random between -jitterMs and +jitterMs
 */
function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  jitterMs: number
): number {
  // Calculate exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);

  // Apply jitter (random value between -jitterMs and +jitterMs)
  const jitter = (Math.random() - 0.5) * 2 * jitterMs;
  const delayWithJitter = exponentialDelay + jitter;

  // Cap at maxDelay
  return Math.min(Math.max(delayWithJitter, 0), maxDelayMs);
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface FetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * Fetches a URL with exponential backoff retry logic
 * Retries on server errors (5xx), rate limits (429), and timeouts (408)
 * Does not retry on client errors (4xx except 408)
 * Network errors (connection failures, etc.) are also retried
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
  retryOptions?: RetryOptions
): Promise<Response> {
  const mergedOptions = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  const { maxAttempts, baseDelayMs, maxDelayMs, jitterMs } = mergedOptions;

  let lastError: Error | null = null;
  let lastResponse: Response | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = options.timeout
        ? setTimeout(() => controller.abort(), options.timeout)
        : undefined;

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        if (timeoutId) clearTimeout(timeoutId);

        // Check if status is retryable
        if (!response.ok && !isRetryableStatusCode(response.status)) {
          // Non-retryable error (4xx except 408), return immediately
          return response;
        }

        // Success or retryable error
        if (response.ok) {
          return response;
        }

        // Retryable error - save response and retry
        lastResponse = response;
        if (attempt < maxAttempts) {
          const delay = calculateDelay(
            attempt,
            baseDelayMs,
            maxDelayMs,
            jitterMs
          );
          await sleep(delay);
          continue;
        }

        // Last attempt failed with retryable error
        return response;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    } catch (error) {
      // Network error or other fetch failure
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        const delay = calculateDelay(attempt, baseDelayMs, maxDelayMs, jitterMs);
        await sleep(delay);
        continue;
      }

      // Last attempt failed with network error
      throw lastError;
    }
  }

  // This should not be reached, but throw if we somehow exit the loop
  if (lastError) {
    throw lastError;
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw new Error("Fetch failed: unknown error");
}
