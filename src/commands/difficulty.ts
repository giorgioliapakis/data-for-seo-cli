import { Command } from 'commander';
import { AuthConfig, ColumnDef } from '../types/index.js';
import { DataForSeoClient } from '../lib/api-client.js';
import { CacheManager } from '../lib/cache.js';
import { filterDifficulty } from '../lib/filter.js';
import { addGlobalOptions, parseGlobalOpts } from '../utils/options.js';
import { outputResults, outputError, columnFormatters } from '../utils/output.js';

const COLUMNS: ColumnDef[] = [
  { key: 'keyword', label: 'Keyword' },
  { key: 'difficulty', label: 'Difficulty', align: 'right', format: columnFormatters.difficulty },
];

export function registerDifficultyCommand(program: Command): void {
  const cmd = new Command('difficulty')
    .description('Bulk keyword difficulty scores')
    .argument('<keywords...>', 'Keywords to check');

  addGlobalOptions(cmd);

  cmd.action(async (keywords: string[], rawOpts) => {
    const opts = parseGlobalOpts(rawOpts);
    const auth = rawOpts['_authConfig'] as AuthConfig;
    const client = new DataForSeoClient(auth, new CacheManager(), opts.debug);

    try {
      const result = await client.post<Record<string, unknown>>(
        'dataforseo_labs/google/bulk_keyword_difficulty/live',
        [{
          keywords,
          location_code: parseInt(opts.location),
          language_code: opts.language,
        }],
        { noCache: !opts.cache },
      );

      if (result.cached) process.stderr.write('(cached)\n');

      const rows = filterDifficulty(result.items);

      outputResults(
        rows as unknown as Record<string, unknown>[],
        COLUMNS,
        opts,
        'difficulty',
        { cached: result.cached, count: rows.length, location: opts.location },
      );
    } catch (err) {
      const error = err as Error & { code?: string };
      outputError(
        { code: error.code || 'UNKNOWN_ERROR', message: error.message },
        opts,
        'difficulty',
      );
      process.exit(1);
    }
  });

  program.addCommand(cmd);
}
