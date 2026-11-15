/** Report an error caught by a React error boundary (window.onerror never sees those). */
export function reportClientError(error: unknown) {
  const sentry = (window as Window & { Sentry?: { captureException(e: unknown): void } }).Sentry;
  sentry?.captureException(error);
}
