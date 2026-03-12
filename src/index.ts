#!/usr/bin/env node

import { Command } from 'commander';
import { resolveAuth } from './utils/auth.js';
import { CacheManager } from './lib/cache.js';
import { registerVolumeCommand } from './commands/volume.js';
import { registerSuggestionsCommand } from './commands/suggestions.js';
import { registerRelatedCommand } from './commands/related.js';
import { registerDifficultyCommand } from './commands/difficulty.js';
import { registerSerpCommand } from './commands/serp.js';
import { registerRankedCommand } from './commands/ranked.js';
import { registerOverlapCommand } from './commands/overlap.js';
import { registerCompetitorsCommand } from './commands/competitors.js';
import { registerContentCommand } from './commands/content.js';
import { registerLocationsCommand } from './commands/locations.js';
import { registerLanguagesCommand } from './commands/languages.js';
import { registerLoginCommand, registerLogoutCommand, registerWhoamiCommand } from './commands/login.js';

const AUTH_REQUIRED = [
  'volume', 'suggestions', 'related', 'difficulty',
  'serp', 'ranked', 'overlap', 'competitors', 'content',
  'locations', 'languages',
];

const program = new Command();

program
  .name('dataforseo')
  .description('Agent-first DataForSEO CLI for keyword research, SERP analysis, and competitor intelligence')
  .version('1.0.0');

// Global cache management options
program
  .option('--clear-cache', 'Purge all cached data');

// Pre-action hook: resolve auth for data commands
program.hook('preAction', (_thisCommand, actionCommand) => {
  const cmdName = actionCommand.name();

  // Handle --clear-cache at program level
  const programOpts = program.opts();
  if (programOpts['clearCache']) {
    const cache = new CacheManager();
    const { count, bytes } = cache.clear();
    const mb = (bytes / 1024 / 1024).toFixed(1);
    process.stderr.write(`Cleared ${count} cached entries (${mb} MB freed)\n`);
    process.exit(0);
  }

  if (!AUTH_REQUIRED.includes(cmdName)) return;

  try {
    const opts = actionCommand.optsWithGlobals();
    const auth = resolveAuth(
      opts['login'] as string | undefined,
      opts['password'] as string | undefined,
    );
    actionCommand.setOptionValue('_authConfig', auth);
  } catch (err) {
    process.stderr.write(
      `${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }
});

process.on('SIGINT', () => {
  process.stderr.write('\nAborted.\n');
  process.exit(130);
});

// Register all commands
registerVolumeCommand(program);
registerSuggestionsCommand(program);
registerRelatedCommand(program);
registerDifficultyCommand(program);
registerSerpCommand(program);
registerRankedCommand(program);
registerOverlapCommand(program);
registerCompetitorsCommand(program);
registerContentCommand(program);
registerLocationsCommand(program);
registerLanguagesCommand(program);
registerLoginCommand(program);
registerLogoutCommand(program);
registerWhoamiCommand(program);

program.parse();
