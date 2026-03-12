import { Command } from 'commander';
import { AuthConfig, ColumnDef } from '../types/index.js';
import { DataForSeoClient } from '../lib/api-client.js';
import { CacheManager } from '../lib/cache.js';
import { filterSerp } from '../lib/filter.js';
import { addGlobalOptions, parseGlobalOpts } from '../utils/options.js';
import { outputResults, outputError, writeJson, columnFormatters } from '../utils/output.js';
import { SerpOrganicResult } from '../types/output.js';

const ORGANIC_COLUMNS: ColumnDef[] = [
  { key: 'position', label: 'Position', align: 'right', format: columnFormatters.position },
  { key: 'domain', label: 'Domain' },
  { key: 'title', label: 'Title' },
  { key: 'url', label: 'URL' },
];

export function registerSerpCommand(program: Command): void {
  const cmd = new Command('serp')
    .description('Live SERP analysis with feature detection')
    .argument('<keyword>', 'Keyword to analyze')
    .option('--depth <n>', 'Number of results', '10')
    .option('--target <domain>', 'Target domain to track position for');

  addGlobalOptions(cmd);

  cmd.action(async (keyword: string, rawOpts) => {
    const opts = parseGlobalOpts(rawOpts);
    const auth = rawOpts['_authConfig'] as AuthConfig;
    const client = new DataForSeoClient(auth, new CacheManager(), opts.debug);
    const depth = parseInt(String(rawOpts['depth'] || '10'), 10);
    const targetDomain = rawOpts['target'] as string | undefined;

    try {
      const result = await client.post<Record<string, unknown>>(
        'serp/google/organic/live/advanced',
        [{
          keyword,
          location_code: parseInt(opts.location),
          language_code: opts.language,
          depth,
          device: 'desktop',
        }],
        { noCache: !opts.cache },
      );

      if (result.cached) process.stderr.write('(cached)\n');

      const serpResult = filterSerp(result.items, targetDomain);
      serpResult.keyword = keyword;

      if (opts.json) {
        writeJson({
          success: true,
          command: 'serp',
          data: serpResult,
          meta: { cached: result.cached, count: serpResult.organic_results.length, location: opts.location, timestamp: new Date().toISOString() },
        });
        return;
      }

      // Features summary to stderr
      const activeFeatures = Object.entries(serpResult.features)
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (activeFeatures.length > 0) {
        process.stderr.write(`features: ${activeFeatures.join(', ')}\n`);
      }

      // Our position to stderr (if target domain set)
      if (targetDomain) {
        if (serpResult.our_position) {
          process.stderr.write(`${targetDomain}: #${serpResult.our_position} ${serpResult.our_url}\n`);
        } else {
          process.stderr.write(`${targetDomain}: not ranking in top ${depth}\n`);
        }
      }

      // PAA to stderr
      if (serpResult.people_also_ask.length > 0) {
        process.stderr.write(`paa: ${serpResult.people_also_ask.join(' | ')}\n`);
      }

      // Organic results to stdout
      outputResults(
        serpResult.organic_results as unknown as Record<string, unknown>[],
        ORGANIC_COLUMNS,
        opts,
        'serp',
        { cached: result.cached, count: serpResult.organic_results.length, location: opts.location },
      );
    } catch (err) {
      const error = err as Error & { code?: string };
      outputError(
        { code: error.code || 'UNKNOWN_ERROR', message: error.message },
        opts,
        'serp',
      );
      process.exit(1);
    }
  });

  program.addCommand(cmd);
}
