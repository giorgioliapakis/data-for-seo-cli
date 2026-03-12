import { Command } from 'commander';
import { GlobalOptions } from '../types/index.js';

export function addGlobalOptions(cmd: Command): Command {
  return cmd
    .option('-l, --location <code>', 'Location code (default: 2840 = US)', '2840')
    .option('--language <code>', 'Language code', 'en')
    .option('-n, --limit <n>', 'Max results', '50')
    .option('--json', 'JSON output')
    .option('--table', 'Human-readable table output')
    .option('--login <login>', 'Override DataForSEO login')
    .option('--password <password>', 'Override DataForSEO password')
    .option('--no-cache', 'Skip cache read')
    .option('--debug', 'Show request details (redacts auth)');
}

export function parseGlobalOpts(opts: Record<string, unknown>): GlobalOptions {
  return {
    location: String(opts['location'] || '2840'),
    language: String(opts['language'] || 'en'),
    limit: parseInt(String(opts['limit'] || '50'), 10),
    json: Boolean(opts['json']),
    table: Boolean(opts['table']),
    cache: opts['cache'] !== false, // --no-cache sets this to false
    login: opts['login'] as string | undefined,
    password: opts['password'] as string | undefined,
    debug: Boolean(opts['debug']),
  };
}
