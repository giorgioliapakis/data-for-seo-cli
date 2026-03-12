import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

interface CacheEntry {
  cachedAt: string;
  ttlMs: number;
  endpoint: string;
  response: unknown;
}

// TTL tiers by endpoint pattern (milliseconds)
const TTL_TIERS: Array<{ pattern: RegExp; ttlMs: number }> = [
  { pattern: /appendix\/(locations|languages)/, ttlMs: 30 * 24 * 60 * 60 * 1000 },   // 30 days
  { pattern: /keyword_overview|keyword_suggestions|related_keywords|bulk_keyword_difficulty/, ttlMs: 7 * 24 * 60 * 60 * 1000 }, // 7 days
  { pattern: /ranked_keywords|domain_intersection|serp_competitors/, ttlMs: 3 * 24 * 60 * 60 * 1000 }, // 3 days
  { pattern: /serp\/google\/organic/, ttlMs: 24 * 60 * 60 * 1000 },                    // 1 day
  { pattern: /on_page\/content_parsing/, ttlMs: 24 * 60 * 60 * 1000 },                 // 1 day
];

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 1 day
const MAX_CACHE_BYTES = 100 * 1024 * 1024;   // 100 MB

function getCacheDir(): string {
  const home = os.homedir();
  switch (process.platform) {
    case 'darwin':
      return path.join(home, 'Library', 'Caches', 'dataforseo-cli');
    case 'win32':
      return path.join(home, 'AppData', 'Local', 'dataforseo-cli', 'cache');
    default:
      return path.join(home, '.cache', 'dataforseo-cli');
  }
}

function getTtl(endpoint: string): number {
  for (const tier of TTL_TIERS) {
    if (tier.pattern.test(endpoint)) return tier.ttlMs;
  }
  return DEFAULT_TTL_MS;
}

export class CacheManager {
  private cacheDir: string;

  constructor() {
    this.cacheDir = getCacheDir();
  }

  static hashKey(endpoint: string, body: unknown): string {
    const canonical = JSON.stringify({ endpoint, body });
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  get(key: string): unknown | null {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      if (!fs.existsSync(filePath)) return null;

      const entry: CacheEntry = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const age = Date.now() - new Date(entry.cachedAt).getTime();

      if (age > entry.ttlMs) {
        // Expired - clean up lazily
        fs.unlinkSync(filePath);
        return null;
      }

      return entry.response;
    } catch {
      return null;
    }
  }

  set(key: string, endpoint: string, response: unknown, ttlMs?: number): void {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true, mode: 0o700 });
      }

      const entry: CacheEntry = {
        cachedAt: new Date().toISOString(),
        ttlMs: ttlMs ?? getTtl(endpoint),
        endpoint,
        response,
      };

      const filePath = path.join(this.cacheDir, `${key}.json`);
      fs.writeFileSync(filePath, JSON.stringify(entry), { mode: 0o600 });

      // Check total size and evict if needed (lazy, non-blocking)
      this.evictIfNeeded();
    } catch {
      // Cache write failures are non-fatal
    }
  }

  clear(): { count: number; bytes: number } {
    let count = 0;
    let bytes = 0;
    try {
      if (!fs.existsSync(this.cacheDir)) return { count: 0, bytes: 0 };
      const files = fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stat = fs.statSync(filePath);
        bytes += stat.size;
        fs.unlinkSync(filePath);
        count++;
      }
    } catch {
      // Best effort
    }
    return { count, bytes };
  }

  info(): { entries: number; totalBytes: number } {
    try {
      if (!fs.existsSync(this.cacheDir)) return { entries: 0, totalBytes: 0 };
      const files = fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.json'));
      let totalBytes = 0;
      for (const file of files) {
        const stat = fs.statSync(path.join(this.cacheDir, file));
        totalBytes += stat.size;
      }
      return { entries: files.length, totalBytes };
    } catch {
      return { entries: 0, totalBytes: 0 };
    }
  }

  private evictIfNeeded(): void {
    try {
      const { totalBytes } = this.info();
      if (totalBytes <= MAX_CACHE_BYTES) return;

      // Sort by mtime (oldest first), delete until under 90%
      const targetBytes = MAX_CACHE_BYTES * 0.9;
      const files = fs.readdirSync(this.cacheDir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const fp = path.join(this.cacheDir, f);
          const stat = fs.statSync(fp);
          return { path: fp, size: stat.size, mtime: stat.mtimeMs };
        })
        .sort((a, b) => a.mtime - b.mtime);

      let freed = 0;
      const toFree = totalBytes - targetBytes;
      for (const file of files) {
        if (freed >= toFree) break;
        fs.unlinkSync(file.path);
        freed += file.size;
      }
    } catch {
      // Best effort
    }
  }
}
