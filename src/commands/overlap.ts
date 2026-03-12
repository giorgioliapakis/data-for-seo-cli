import { Command } from 'commander';
import { AuthConfig, ColumnDef } from '../types/index.js';
import { DataForSeoClient } from '../lib/api-client.js';
import { CacheManager } from '../lib/cache.js';
import { filterOverlap } from '../lib/filter.js';
import { addGlobalOptions, parseGlobalOpts } from '../utils/options.js';
import { outputResults, outputError, columnFormatters } from '../utils/output.js';
import { formatNumber } from '../utils/format.js';

const COLUMNS: ColumnDef[] = [
  { key: 'keyword', label: 'Keyword' },
  { key: 'pos1', label: 'Pos1', align: 'right', format: columnFormatters.position },
  { key: 'pos2', label: 'Pos2', align: 'right', format: columnFormatters.position },
  { key: 'volume', label: 'Volume', align: 'right', format: columnFormatters.volume },
  { key: 'cpc', label: 'CPC', align: 'right', format: columnFormatters.cpc },
];

export function registerOverlapCommand(program: Command): void {
  const cmd = new Command('overlap')
    .description('Keyword intersection between two domains')
    .argument('<domain1>', 'First domain')
    .argument('<domain2>', 'Second domain');

  addGlobalOptions(cmd);

  cmd.action(async (domain1: string, domain2: string, rawOpts) => {
    const opts = parseGlobalOpts(rawOpts);
    const auth = rawOpts['_authConfig'] as AuthConfig;
    const client = new DataForSeoClient(auth, new CacheManager(), opts.debug);

    try {
      const result = await client.post<Record<string, unknown>>(
        'dataforseo_labs/google/domain_intersection/live',
        [{
          target1: domain1,
          target2: domain2,
          location_code: parseInt(opts.location),
          language_code: opts.language,
          limit: opts.limit,
          intersections: true,
          order_by: ['keyword_data.keyword_info.search_volume,desc'],
        }],
        { noCache: !opts.cache },
      );

      if (result.cached) process.stderr.write('(cached)\n');

      const filtered = filterOverlap(result.items, result.totalCount, domain1, domain2);
      process.stderr.write(`${domain1} vs ${domain2}: ${formatNumber(filtered.overlapping_keywords)} overlapping keywords\n`);

      outputResults(
        filtered.keywords as unknown as Record<string, unknown>[],
        COLUMNS,
        opts,
        'overlap',
        { cached: result.cached, count: filtered.keywords.length, location: opts.location },
      );
    } catch (err) {
      const error = err as Error & { code?: string };
      outputError(
        { code: error.code || 'UNKNOWN_ERROR', message: error.message },
        opts,
        'overlap',
      );
      process.exit(1);
    }
  });

  program.addCommand(cmd);
}
