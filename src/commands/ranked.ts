import { Command } from 'commander';
import { AuthConfig, ColumnDef } from '../types/index.js';
import { DataForSeoClient } from '../lib/api-client.js';
import { CacheManager } from '../lib/cache.js';
import { filterRanked } from '../lib/filter.js';
import { addGlobalOptions, parseGlobalOpts } from '../utils/options.js';
import { outputResults, outputError, columnFormatters } from '../utils/output.js';
import { formatNumber } from '../utils/format.js';

const COLUMNS: ColumnDef[] = [
  { key: 'keyword', label: 'Keyword' },
  { key: 'position', label: 'Position', align: 'right', format: columnFormatters.position },
  { key: 'volume', label: 'Volume', align: 'right', format: columnFormatters.volume },
  { key: 'cpc', label: 'CPC', align: 'right', format: columnFormatters.cpc },
  { key: 'url', label: 'URL' },
];

export function registerRankedCommand(program: Command): void {
  const cmd = new Command('ranked')
    .description('Keywords a domain ranks for')
    .argument('<domain>', 'Domain to analyze');

  addGlobalOptions(cmd);

  cmd.action(async (domain: string, rawOpts) => {
    const opts = parseGlobalOpts(rawOpts);
    const auth = rawOpts['_authConfig'] as AuthConfig;
    const client = new DataForSeoClient(auth, new CacheManager(), opts.debug);

    try {
      const result = await client.post<Record<string, unknown>>(
        'dataforseo_labs/google/ranked_keywords/live',
        [{
          target: domain,
          location_code: parseInt(opts.location),
          language_code: opts.language,
          limit: opts.limit,
          order_by: ['keyword_data.keyword_info.search_volume,desc'],
        }],
        { noCache: !opts.cache },
      );

      if (result.cached) process.stderr.write('(cached)\n');

      const filtered = filterRanked(result.items, result.totalCount, domain);
      process.stderr.write(`${domain}: ${formatNumber(filtered.total_keywords)} total keywords\n`);

      outputResults(
        filtered.keywords as unknown as Record<string, unknown>[],
        COLUMNS,
        opts,
        'ranked',
        { cached: result.cached, count: filtered.keywords.length, location: opts.location },
      );
    } catch (err) {
      const error = err as Error & { code?: string };
      outputError(
        { code: error.code || 'UNKNOWN_ERROR', message: error.message },
        opts,
        'ranked',
      );
      process.exit(1);
    }
  });

  program.addCommand(cmd);
}
