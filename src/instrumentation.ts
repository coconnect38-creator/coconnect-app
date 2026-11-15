import type { Instrumentation } from "next";

/**
 * Server-side error reporting. Off unless SENTRY_DSN is set. Browser errors are
 * reported through Sentry's lazy loader script (see components/layout/sentry-loader.tsx)
 * so the SDK costs nothing in the page bundle until an error happens.
 */
const dsn = process.env.SENTRY_DSN;

export async function register() {
  if (!dsn) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: 0,
    // Never ship request bodies, cookies or auth headers: they carry phone numbers and sessions.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpBodies: [],
      httpHeaders: { request: { deny: ["cookie", "authorization", "x-forwarded-for"] }, response: false },
    },
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        if (event.request.headers) {
          delete event.request.headers.cookie;
          delete event.request.headers.authorization;
        }
      }
      return event;
    },
  });
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!dsn) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
};
