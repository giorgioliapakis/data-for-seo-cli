import { ApiResponse, ColumnDef } from '../types/index.js';
import { formatNumber, formatCurrency } from './format.js';

// --- TSV (default - most token-efficient) ---

export function writeTsv(rows: Record<string, unknown>[], columns: string[]): void {
  // Header
  process.stdout.write(columns.join('\t') + '\n');
  // Rows
  for (const row of rows) {
    const cells = columns.map(col => {
      const val = row[col];
      if (val == null) return '';
      return String(val);
    });
    process.stdout.write(cells.join('\t') + '\n');
  }
}

// --- JSON ---

export function writeJson<T>(response: ApiResponse<T>): void {
  process.stdout.write(JSON.stringify(response, null, 2) + '\n');
}

// --- Table (human-readable) ---

export function writeTable(rows: Record<string, unknown>[], columnDefs: ColumnDef[]): void {
  if (rows.length === 0) {
    process.stdout.write('No results\n');
    return;
  }

  // Calculate column widths
  const widths: number[] = columnDefs.map(col => col.label.length);
  const formatted: string[][] = [];

  for (const row of rows) {
    const cells: string[] = [];
    for (let i = 0; i < columnDefs.length; i++) {
      const col = columnDefs[i];
      const val = row[col.key];
      let cell: string;
      if (col.format) {
        cell = col.format(val);
      } else if (val == null) {
        cell = '-';
      } else {
        cell = String(val);
      }
      cells.push(cell);
      if (cell.length > widths[i]) widths[i] = cell.length;
    }
    formatted.push(cells);
  }

  // Header
  const header = columnDefs.map((col, i) => col.label.padEnd(widths[i])).join(' | ');
  process.stdout.write(header + '\n');
  process.stdout.write(widths.map(w => '-'.repeat(w)).join('-+-') + '\n');

  // Rows
  for (const cells of formatted) {
    const line = cells.map((cell, i) => {
      const col = columnDefs[i];
      return col.align === 'right' ? cell.padStart(widths[i]) : cell.padEnd(widths[i]);
    }).join(' | ');
    process.stdout.write(line + '\n');
  }
}

// --- Unified output dispatcher ---

export function outputResults(
  rows: Record<string, unknown>[],
  columnDefs: ColumnDef[],
  opts: { json: boolean; table: boolean },
  command: string,
  meta?: { cached: boolean; count: number; location: string },
): void {
  if (opts.json) {
    writeJson({
      success: true,
      command,
      data: rows,
      meta: meta ? { ...meta, timestamp: new Date().toISOString() } : undefined,
    });
    return;
  }

  if (opts.table) {
    writeTable(rows, columnDefs);
    return;
  }

  // Default: TSV
  writeTsv(rows, columnDefs.map(c => c.key));
}

export function outputError(
  error: { code: string; message: string },
  opts: { json: boolean },
  command: string,
): void {
  if (opts.json) {
    writeJson({ success: false, command, data: null, error });
  }
  process.stderr.write(`${error.message}\n`);
}

// --- Common column formatters ---

export const columnFormatters = {
  volume: (val: unknown) => formatNumber(val as number | null),
  cpc: (val: unknown) => formatCurrency(val as number | null),
  difficulty: (val: unknown) => val != null ? String(Math.round(val as number)) : '-',
  position: (val: unknown) => val != null ? `#${val}` : '-',
  percent: (val: unknown) => val != null ? `${(val as number).toFixed(1)}%` : '-',
};
