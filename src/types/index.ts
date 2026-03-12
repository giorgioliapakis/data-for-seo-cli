// --- Auth ---

export interface AuthConfig {
  login: string;
  token: string; // base64(login:password)
}

export interface StoredCredentials {
  login: string;
  token: string;
  storedAt: string;
}

// --- Global CLI Options ---

export interface GlobalOptions {
  location: string;
  language: string;
  limit: number;
  json: boolean;
  table: boolean;
  cache: boolean; // --no-cache sets this to false
  login?: string;
  password?: string;
  debug?: boolean;
}

// --- API Client ---

export interface RequestOptions {
  cacheKey?: string;
  ttl?: number;
  noCache?: boolean;
}

export interface ApiResult<T> {
  items: T[];
  totalCount: number;
  cost: number;
  cached: boolean;
}

// --- Output ---

export interface ApiResponse<T> {
  success: boolean;
  command: string;
  data: T;
  error?: { code: string; message: string };
  meta?: {
    cached: boolean;
    count: number;
    location: string;
    timestamp: string;
  };
}

export interface ColumnDef {
  key: string;
  label: string;
  align?: 'left' | 'right';
  format?: (val: unknown) => string;
}
