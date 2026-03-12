import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AuthConfig, StoredCredentials } from '../types/index.js';

function getConfigDir(): string {
  const home = os.homedir();
  switch (process.platform) {
    case 'darwin':
      return path.join(home, 'Library', 'Application Support', 'dataforseo-cli');
    case 'win32':
      return path.join(home, 'AppData', 'Roaming', 'dataforseo-cli');
    default:
      return path.join(home, '.config', 'dataforseo-cli');
  }
}

function getCredentialsPath(): string {
  return path.join(getConfigDir(), 'credentials.json');
}

export function loadCredentials(): AuthConfig | null {
  try {
    const credPath = getCredentialsPath();
    if (!fs.existsSync(credPath)) return null;
    const data: StoredCredentials = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
    if (data.login && data.token) {
      return { login: data.login, token: data.token };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCredentials(auth: AuthConfig): void {
  const configDir = getConfigDir();
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
  }
  const stored: StoredCredentials = {
    login: auth.login,
    token: auth.token,
    storedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    getCredentialsPath(),
    JSON.stringify(stored, null, 2),
    { mode: 0o600 },
  );
}

export function removeCredentials(): boolean {
  const credPath = getCredentialsPath();
  if (fs.existsSync(credPath)) {
    fs.unlinkSync(credPath);
    return true;
  }
  return false;
}

export function getCredentialSource(): string | null {
  const credPath = getCredentialsPath();
  if (fs.existsSync(credPath)) return credPath;
  return null;
}
