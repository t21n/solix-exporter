export type Logger = Pick<typeof console, 'log' | 'debug' | 'warn' | 'error'>;

export function consoleLogger(verbose: boolean): Logger {
  return {
    log(...params: Parameters<typeof console.log>) {
      if (verbose) {
        console.log(`[${new Date().toISOString()}]`, ...params);
      }
    },
    debug(...params: Parameters<typeof console.warn>) {
      if (verbose) {
        console.debug(`[${new Date().toISOString()}]`, ...params);
      }
    },
    warn(...params: Parameters<typeof console.warn>) {
      if (verbose) {
        console.warn(`[${new Date().toISOString()}]`, ...params);
      }
    },
    error(...params: Parameters<typeof console.error>) {
      console.error(`[${new Date().toISOString()}]`, ...params);
    },
  };
}
