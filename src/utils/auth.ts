import { AuthConfig } from '../types/index.js';
import { loadCredentials } from './credentials.js';

export function buildToken(login: string, password: string): string {
  return Buffer.from(`${login}:${password}`).toString('base64');
}

export function resolveAuth(flagLogin?: string, flagPassword?: string): AuthConfig {
  // 1. CLI flags (both must be present)
  if (flagLogin && flagPassword) {
    return { login: flagLogin, token: buildToken(flagLogin, flagPassword) };
  }

  // 2. Environment variables
  const envLogin = process.env.DATAFORSEO_LOGIN;
  const envPassword = process.env.DATAFORSEO_PASSWORD;
  if (envLogin && envPassword) {
    return { login: envLogin, token: buildToken(envLogin, envPassword) };
  }

  // 3. Stored credentials
  const stored = loadCredentials();
  if (stored) {
    return stored;
  }

  throw new Error(
    'No credentials found. Run `dfs login` or set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD environment variables.',
  );
}

export function getAuthSource(flagLogin?: string, flagPassword?: string): string {
  if (flagLogin && flagPassword) return 'cli flags';
  const envLogin = process.env.DATAFORSEO_LOGIN;
  const envPassword = process.env.DATAFORSEO_PASSWORD;
  if (envLogin && envPassword) return 'environment variables';
  const stored = loadCredentials();
  if (stored) return 'stored credentials';
  return 'none';
}
