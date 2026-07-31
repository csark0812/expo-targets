/** Debounce window for watch events before rebuild/restart. */
export const DEFAULT_DEBOUNCE_MS = 250;

/** Max consecutive crash or rebuild-fail cycles before giving up. */
export const DEFAULT_MAX_FAILURES = 5;

/** Backoff base (ms) between crash restarts: base * 2^n, capped. */
export const DEFAULT_BACKOFF_BASE_MS = 200;

export const DEFAULT_BACKOFF_CAP_MS = 5_000;

/** After this many ms without a crash, reset the failure counter. */
export const DEFAULT_STABLE_WINDOW_MS = 10_000;

export const DEFAULT_IGNORES = [
  "**/node_modules/**",
  "**/.git/**",
  "**/build/**",
  "**/dist/**",
];
