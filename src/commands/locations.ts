import { Command } from 'commander';
import { AuthConfig, ColumnDef } from '../types/index.js';
import { DataForSeoClient } from '../lib/api-client.js';
import { CacheManager } from '../lib/cache.js';
import { addGlobalOptions, parseGlobalOpts } from '../utils/options.js';
import { outputResults, outputError } from '../utils/output.js';

const COLUMNS: ColumnDef[] = [
  { key: 'location_code', label: 'Code', align: 'right' },
  { key: 'location_name', label: 'Name' },
  { key: 'country_iso_code', label: 'ISO' },
  { key: 'location_type', label: 'Type' },
];

export function registerLocationsCommand(program: Command): void {
  const cmd = new Command('locations')
    .description('Look up location codes')
    .argument('[search]', 'Search term to filter locations');

  addGlobalOptions(cmd);

  cmd.action(async (search: string | undefined, rawOpts) => {
    const opts = parseGlobalOpts(rawOpts);
    const auth = rawOpts['_authConfig'] as AuthConfig;
    const client = new DataForSeoClient(auth, new CacheManager(), opts.debug);

    try {
      const result = await client.post<Record<string, unknown>>(
        'dataforseo_labs/locations_and_languages',
        [{}],
        { noCache: !opts.cache },
      );

      if (result.cached) process.stderr.write('(cached)\n');

      let rows = result.items.map(item => ({
        location_code: item['location_code'],
        location_name: String(item['location_name'] || ''),
        country_iso_code: String(item['country_iso_code'] || ''),
        location_type: String(item['location_type'] || ''),
      }));

      // Filter by search term
      if (search) {
        const searchLower = search.toLowerCase();
        rows = rows.filter(r =>
          r.location_name.toLowerCase().includes(searchLower) ||
          r.country_iso_code.toLowerCase().includes(searchLower),
        );
      }

      // Limit to countries by default (most common use case)
      if (!search) {
        rows = rows.filter(r => r.location_type === 'Country');
      }

      outputResults(
        rows as unknown as Record<string, unknown>[],
        COLUMNS,
        opts,
        'locations',
        { cached: result.cached, count: rows.length, location: opts.location },
      );
    } catch (err) {
      const error = err as Error & { code?: string };
      outputError(
        { code: error.code || 'UNKNOWN_ERROR', message: error.message },
        opts,
        'locations',
      );
      process.exit(1);
    }
  });

  program.addCommand(cmd);
}
