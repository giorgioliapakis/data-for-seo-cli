import { Command } from 'commander';
import { AuthConfig, ColumnDef } from '../types/index.js';
import { DataForSeoClient } from '../lib/api-client.js';
import { CacheManager } from '../lib/cache.js';
import { filterSuggestions } from '../lib/filter.js';
import { addGlobalOptions, parseGlobalOpts } from '../utils/options.js';
import { outputResults, outputError, columnFormatters } from '../utils/output.js';

const COLUMNS: ColumnDef[] = [
  { key: 'keyword', label: 'Keyword' },
  { key: 'volume', label: 'Volume', align: 'right', format: columnFormatters.volume },
  { key: 'cpc', label: 'CPC', align: 'right', format: columnFormatters.cpc },
  { key: 'difficulty', label: 'Difficulty', align: 'right', format: columnFormatters.difficulty },
  { key: 'competition', label: 'Competition' },
];

export function registerSuggestionsCommand(program: Command): void {
  const cmd = new Command('suggestions')
    .description('Keyword suggestions from a seed keyword')
    .argument('<seed>', 'Seed keyword');

  addGlobalOptions(cmd);

  cmd.action(async (seed: string, rawOpts) => {
    const opts = parseGlobalOpts(rawOpts);
    const auth = rawOpts['_authConfig'] as AuthConfig;
    const client = new DataForSeoClient(auth, new CacheManager(), opts.debug);

    try {
      const result = await client.post<Record<string, unknown>>(
        'dataforseo_labs/google/keyword_suggestions/live',
        [{
          keyword: seed,
          location_code: parseInt(opts.location),
          language_code: opts.language,
          limit: opts.limit,
          include_seed_keyword: true,
        }],
        { noCache: !opts.cache },
      );

      if (result.cached) process.stderr.write('(cached)\n');

      const rows = filterSuggestions(result.items);

      outputResults(
        rows as unknown as Record<string, unknown>[],
        COLUMNS,
        opts,
        'suggestions',
        { cached: result.cached, count: rows.length, location: opts.location },
      );
    } catch (err) {
      const error = err as Error & { code?: string };
      outputError(
        { code: error.code || 'UNKNOWN_ERROR', message: error.message },
        opts,
        'suggestions',
      );
      process.exit(1);
    }
  });

  program.addCommand(cmd);
}
