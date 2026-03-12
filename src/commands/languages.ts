import { Command } from 'commander';
import { AuthConfig, ColumnDef } from '../types/index.js';
import { DataForSeoClient } from '../lib/api-client.js';
import { CacheManager } from '../lib/cache.js';
import { addGlobalOptions, parseGlobalOpts } from '../utils/options.js';
import { outputResults, outputError } from '../utils/output.js';

const COLUMNS: ColumnDef[] = [
  { key: 'language_code', label: 'Code' },
  { key: 'language_name', label: 'Name' },
];

export function registerLanguagesCommand(program: Command): void {
  const cmd = new Command('languages')
    .description('Look up language codes')
    .argument('[search]', 'Search term to filter languages');

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

      // Extract unique languages from the location+language response
      const seen = new Set<string>();
      let rows: Array<{ language_code: string; language_name: string }> = [];

      for (const item of result.items) {
        const languages = (item['available_languages'] || []) as Array<Record<string, unknown>>;
        for (const lang of languages) {
          const code = String(lang['language_code'] || '');
          if (code && !seen.has(code)) {
            seen.add(code);
            rows.push({
              language_code: code,
              language_name: String(lang['language_name'] || ''),
            });
          }
        }
      }

      // Sort by name
      rows.sort((a, b) => a.language_name.localeCompare(b.language_name));

      // Filter by search term
      if (search) {
        const searchLower = search.toLowerCase();
        rows = rows.filter(r =>
          r.language_name.toLowerCase().includes(searchLower) ||
          r.language_code.toLowerCase().includes(searchLower),
        );
      }

      outputResults(
        rows as unknown as Record<string, unknown>[],
        COLUMNS,
        opts,
        'languages',
        { cached: result.cached, count: rows.length, location: opts.location },
      );
    } catch (err) {
      const error = err as Error & { code?: string };
      outputError(
        { code: error.code || 'UNKNOWN_ERROR', message: error.message },
        opts,
        'languages',
      );
      process.exit(1);
    }
  });

  program.addCommand(cmd);
}
