import { AuthConfig, ApiResult } from '../types/index.js';
import { DataForSeoEnvelope, DataForSeoTaskResult } from '../types/api.js';
import { CacheManager } from './cache.js';

const BASE_URL = 'https://api.dataforseo.com/v3';
const TIMEOUT_MS = 60_000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

export class DataForSeoError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'DataForSeoError';
  }
}

export class DataForSeoClient {
  private authHeader: string;
  private cache: CacheManager;
  private debug: boolean;

  constructor(auth: AuthConfig, cache: CacheManager, debug = false) {
    this.authHeader = `Basic ${auth.token}`;
    this.cache = cache;
    this.debug = debug;
  }

  async post<T>(
    endpoint: string,
    body: unknown[],
    opts?: { noCache?: boolean },
  ): Promise<ApiResult<T>> {
    const cacheKey = CacheManager.hashKey(endpoint, body);

    // Check cache first
    if (opts?.noCache !== true) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        const result = cached as DataForSeoTaskResult;
        return {
          items: (result.items || []) as T[],
          totalCount: result.total_count ?? result.items_count ?? 0,
          cost: 0,
          cached: true,
        };
      }
    }

    // Make HTTP request with retry
    const envelope = await this.fetchWithRetry(endpoint, body);

    // Unwrap envelope
    if (envelope.status_code !== 20000) {
      throw this.mapApiError(envelope.status_code, envelope.status_message);
    }

    const task = envelope.tasks?.[0];
    if (!task) {
      throw new DataForSeoError('No tasks in response', 'EMPTY_RESPONSE');
    }

    if (task.status_code !== 20000) {
      throw this.mapApiError(task.status_code, task.status_message);
    }

    const result = task.result?.[0];
    if (!result) {
      // Valid response but no results (e.g. no data for this keyword)
      return { items: [], totalCount: 0, cost: envelope.cost, cached: false };
    }

    // Cache the result
    this.cache.set(cacheKey, endpoint, result);

    return {
      items: (result.items || []) as T[],
      totalCount: result.total_count ?? result.items_count ?? 0,
      cost: envelope.cost,
      cached: false,
    };
  }

  async testAuth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const response = await fetch(`${BASE_URL}/appendix/user_data`, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await response.json() as DataForSeoEnvelope;
      return data.status_code === 20000;
    } catch {
      return false;
    }
  }

  private async fetchWithRetry(endpoint: string, body: unknown[]): Promise<DataForSeoEnvelope> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        if (this.debug) {
          process.stderr.write(`[debug] POST ${BASE_URL}/${endpoint}\n`);
          process.stderr.write(`[debug] Authorization: Basic ***\n`);
          process.stderr.write(`[debug] Body: ${JSON.stringify(body).substring(0, 200)}\n`);
        }

        const response = await fetch(`${BASE_URL}/${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);

        // HTTP-level errors
        if (response.status === 401 || response.status === 403) {
          throw new DataForSeoError(
            "Authentication failed. Check your credentials with 'dfs login'.",
            'AUTH_FAILED',
            response.status,
          );
        }

        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          throw new DataForSeoError(
            `Rate limited. Retry after ${retryAfter || '60'} seconds.`,
            'RATE_LIMITED',
            429,
          );
        }

        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json() as DataForSeoEnvelope;

        if (this.debug) {
          process.stderr.write(`[debug] Status: ${data.status_code} Cost: $${data.cost?.toFixed(4) || '0'}\n`);
        }

        return data;
      } catch (err) {
        lastError = err as Error;

        // Don't retry on 4xx (permanent failures)
        if (err instanceof DataForSeoError) throw err;

        // Retry on network/5xx errors
        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_DELAYS[attempt];
          if (this.debug) {
            process.stderr.write(`[debug] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms\n`);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Map network errors
    if (lastError) {
      const msg = lastError.message || '';
      if (msg.includes('abort') || msg.includes('timeout')) {
        throw new DataForSeoError(
          'Request timed out after 60s. Check your connection.',
          'NETWORK_TIMEOUT',
        );
      }
      if (msg.includes('ENOTFOUND')) {
        throw new DataForSeoError(
          'Cannot resolve api.dataforseo.com. Check your DNS/network.',
          'NETWORK_DNS',
        );
      }
      if (msg.includes('ECONNREFUSED')) {
        throw new DataForSeoError(
          'Connection refused. DataForSEO API may be down.',
          'NETWORK_REFUSED',
        );
      }
      throw new DataForSeoError(
        `Network error: ${msg}`,
        'NETWORK_ERROR',
      );
    }

    throw new DataForSeoError('Request failed after retries', 'UNKNOWN_ERROR');
  }

  private mapApiError(statusCode: number, message: string): DataForSeoError {
    if (statusCode === 40100 || statusCode === 40300) {
      return new DataForSeoError(
        "Authentication failed. Check your credentials with 'dfs login'.",
        'AUTH_FAILED',
        statusCode,
      );
    }
    if (statusCode === 40200) {
      return new DataForSeoError(
        'Insufficient API balance. Check your DataForSEO account.',
        'INSUFFICIENT_BALANCE',
        statusCode,
      );
    }
    if (statusCode >= 40000 && statusCode < 50000) {
      return new DataForSeoError(
        `Invalid request: ${message}`,
        'INVALID_REQUEST',
        statusCode,
      );
    }
    if (statusCode >= 50000) {
      return new DataForSeoError(
        `Server error: ${message}`,
        'SERVER_ERROR',
        statusCode,
      );
    }
    return new DataForSeoError(
      `API error (${statusCode}): ${message}`,
      'UNKNOWN_ERROR',
      statusCode,
    );
  }
}
