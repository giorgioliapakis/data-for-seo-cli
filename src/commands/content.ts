import { Command } from 'commander';
import { AuthConfig } from '../types/index.js';
import { DataForSeoClient } from '../lib/api-client.js';
import { CacheManager } from '../lib/cache.js';
import { filterContent } from '../lib/filter.js';
import { addGlobalOptions, parseGlobalOpts } from '../utils/options.js';
import { outputError, writeJson } from '../utils/output.js';
import { formatNumber } from '../utils/format.js';

export function registerContentCommand(program: Command): void {
  const cmd = new Command('content')
    .description('Fetch and parse page content')
    .argument('<url>', 'URL to fetch')
    .option('--full', 'Include full content (not just preview)');

  addGlobalOptions(cmd);

  cmd.action(async (url: string, rawOpts) => {
    const opts = parseGlobalOpts(rawOpts);
    const auth = rawOpts['_authConfig'] as AuthConfig;
    const client = new DataForSeoClient(auth, new CacheManager(), opts.debug);
    const showFull = Boolean(rawOpts['full']);

    try {
      const result = await client.post<Record<string, unknown>>(
        'on_page/content_parsing/live',
        [{
          url,
          enable_javascript: true,
        }],
        { noCache: !opts.cache },
      );

      if (result.cached) process.stderr.write('(cached)\n');

      const content = filterContent(result.items, url);

      if (opts.json) {
        const output = { ...content };
        if (!showFull) delete (output as Record<string, unknown>)['full_content'];
        writeJson({
          success: true,
          command: 'content',
          data: output,
          meta: { cached: result.cached, count: 1, location: opts.location, timestamp: new Date().toISOString() },
        });
        return;
      }

      if (opts.table) {
        // Human-readable format
        process.stdout.write(`URL: ${content.url}\n`);
        process.stdout.write(`Title: ${content.title}\n`);
        process.stdout.write(`Word Count: ${formatNumber(content.word_count)}\n\n`);

        process.stdout.write('Headings:\n');
        for (const h of content.headings.slice(0, 15)) {
          const indent = '  '.repeat(h.level - 1);
          const text = h.text.length > 60 ? h.text.substring(0, 60) + '...' : h.text;
          process.stdout.write(`${indent}H${h.level}: ${text}\n`);
        }
        if (content.headings.length > 15) {
          process.stdout.write(`  ... and ${content.headings.length - 15} more\n`);
        }

        process.stdout.write('\nContent:\n');
        const preview = showFull ? content.full_content : content.content_preview;
        process.stdout.write(preview + '\n');
        return;
      }

      // TSV: compact single-row summary + headings on stderr
      process.stdout.write('url\ttitle\tword_count\theadings_count\n');
      process.stdout.write(`${content.url}\t${content.title}\t${content.word_count}\t${content.headings.length}\n`);

      // Headings to stderr for reference
      if (content.headings.length > 0) {
        process.stderr.write('headings:\n');
        for (const h of content.headings.slice(0, 15)) {
          process.stderr.write(`  H${h.level}: ${h.text}\n`);
        }
      }
    } catch (err) {
      const error = err as Error & { code?: string };
      outputError(
        { code: error.code || 'UNKNOWN_ERROR', message: error.message },
        opts,
        'content',
      );
      process.exit(1);
    }
  });

  program.addCommand(cmd);
}
