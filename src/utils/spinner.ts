// Minimal status logger - no colors, no spinners.
// Writes to stderr so stdout stays clean for TSV/JSON.

export class Spinner {
  start(_message: string): void {}
  update(_message: string): void {}

  succeed(message: string): void {
    process.stderr.write(`${message}\n`);
  }

  fail(message: string): void {
    process.stderr.write(`${message}\n`);
  }

  stop(): void {}
}

export function createSpinner(): Spinner {
  return new Spinner();
}
