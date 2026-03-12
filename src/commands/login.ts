import { Command } from 'commander';
import * as readline from 'readline';
import { buildToken } from '../utils/auth.js';
import { saveCredentials, removeCredentials, loadCredentials, getCredentialSource } from '../utils/credentials.js';
import { DataForSeoClient } from '../lib/api-client.js';
import { CacheManager } from '../lib/cache.js';
import { getAuthSource } from '../utils/auth.js';

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function registerLoginCommand(program: Command): void {
  const cmd = new Command('login')
    .description('Store DataForSEO credentials')
    .option('--login <login>', 'DataForSEO login (email)')
    .option('--password <password>', 'DataForSEO password')
    .option('--token <base64>', 'Pre-computed base64 token');

  cmd.action(async (opts) => {
    let login: string;
    let token: string;

    if (opts.token) {
      // Base64 token mode - extract login from decoded token
      try {
        const decoded = Buffer.from(opts.token, 'base64').toString();
        const colonIdx = decoded.indexOf(':');
        login = colonIdx > 0 ? decoded.substring(0, colonIdx) : 'unknown';
        token = opts.token;
      } catch {
        process.stderr.write('Invalid base64 token.\n');
        process.exit(1);
      }
    } else if (opts.login && opts.password) {
      login = opts.login;
      token = buildToken(opts.login, opts.password);
    } else {
      // Interactive mode
      login = await prompt('DataForSEO login (email): ');
      const password = await prompt('DataForSEO password: ');
      if (!login || !password) {
        process.stderr.write('Login and password are required.\n');
        process.exit(1);
      }
      token = buildToken(login, password);
    }

    // Validate credentials
    process.stderr.write('Validating credentials...\n');
    const client = new DataForSeoClient({ login, token }, new CacheManager());
    const valid = await client.testAuth();

    if (!valid) {
      process.stderr.write('Authentication failed. Check your login and password.\n');
      process.exit(1);
    }

    saveCredentials({ login, token });
    process.stderr.write(`Authenticated as ${login}. Credentials saved.\n`);
  });

  program.addCommand(cmd);
}

export function registerLogoutCommand(program: Command): void {
  const cmd = new Command('logout')
    .description('Remove stored credentials');

  cmd.action(() => {
    const removed = removeCredentials();
    if (removed) {
      process.stderr.write('Credentials removed.\n');
    } else {
      process.stderr.write('No stored credentials found.\n');
    }
  });

  program.addCommand(cmd);
}

export function registerWhoamiCommand(program: Command): void {
  const cmd = new Command('whoami')
    .description('Show current credential source and account');

  cmd.action(() => {
    const source = getAuthSource();
    if (source === 'none') {
      process.stderr.write('Not authenticated. Run `dfs login` or set environment variables.\n');
      process.exit(1);
    }

    process.stderr.write(`Auth source: ${source}\n`);

    if (source === 'stored credentials') {
      const creds = loadCredentials();
      if (creds) {
        process.stderr.write(`Account: ${creds.login}\n`);
        const credPath = getCredentialSource();
        if (credPath) process.stderr.write(`File: ${credPath}\n`);
      }
    } else if (source === 'environment variables') {
      const login = process.env.DATAFORSEO_LOGIN;
      if (login) process.stderr.write(`Account: ${login}\n`);
    }
  });

  program.addCommand(cmd);
}
