import { Command } from 'commander';
import { AuthConfig, ColumnDef } from '../types/index.js';
import { DataForSeoClient } from '../lib/api-client.js';
import { CacheManager } from '../lib/cache.js';
import { filterCompetitors } from '../lib/filter.js';
import { addGlobalOptions, parseGlobalOpts } from '../utils/options.js';
import { outputResults, outputError, columnFormatters } from '../utils/output.js';

const COLUMNS: ColumnDef[] = [
  { key: 'domain', label: 'Domain' },
  { key: 'avg_position', label: 'Avg Position', align: 'right' },
  { key: 'visibility', label: 'Visibility', align: 'right', format: columnFormatters.percent },
  { key: 'keywords_count', label: 'Keywords', align: 'right', format: columnFormatters.volume },
];

export function registerCompetitorsCommand(program: Command): void {
  const cmd = new Command('competitors')
    .description('SERP competitors for a keyword set')
    .argument('<keywords...>', 'Keywords to analyze');

  addGlobalOptions(cmd);

  cmd.action(async (keywords: string[], rawOpts) => {
    const opts = parseGlobalOpts(rawOpts);
    const auth = rawOpts['_authConfig'] as AuthConfig;
    const client = new DataForSeoClient(auth, new CacheManager(), opts.debug);

    try {
      const result = await client.post<Record<string, unknown>>(
        'dataforseo_labs/google/serp_competitors/live',
        [{
          keywords,
          location_code: parseInt(opts.location),
          language_code: opts.language,
          limit: opts.limit,
        }],
        { noCache: !opts.cache },
      );

      if (result.cached) process.stderr.write('(cached)\n');

      const rows = filterCompetitors(result.items);

      outputResults(
        rows as unknown as Record<string, unknown>[],
        COLUMNS,
        opts,
        'competitors',
        { cached: result.cached, count: rows.length, location: opts.location },
      );
    } catch (err) {
      const error = err as Error & { code?: string };
      outputError(
        { code: error.code || 'UNKNOWN_ERROR', message: error.message },
        opts,
        'competitors',
      );
      process.exit(1);
    }
  });

  program.addCommand(cmd);
}
