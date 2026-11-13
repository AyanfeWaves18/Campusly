import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

Sentry.init({
  dsn,
  // Only report from the live site, and only once a DSN is set
  enabled: import.meta.env.PROD && !!dsn,
  environment: import.meta.env.MODE,
  // Never send IP addresses, cookies or other personal details automatically
  sendDefaultPii: false,
  // Errors only: no performance tracing and no screen recordings
  tracesSampleRate: 0,
  // Noise that isn't a bug in Campusly (this also saves your free monthly allowance)
  ignoreErrors: [
    "ResizeObserver loop",
    "Failed to fetch",
    "Load failed",
    "NetworkError",
    "AbortError",
    "Non-Error promise rejection captured",
  ],
  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-extension:\/\//i,
  ],
  beforeBreadcrumb(b) {
    // Breadcrumbs of requests and console output can contain names, ids and messages
    if (["console", "fetch", "xhr"].includes(b.category)) return null;
    return b;
  },
  beforeSend(event) {
    // Cut everything after "?" or "#" from addresses: reset links and invite codes live there
    const clean = (u) => (typeof u === "string" ? u.split(/[?#]/)[0] : u);
    if (event.request) {
      event.request.url = clean(event.request.url);
      delete event.request.cookies;
      delete event.request.headers;
      delete event.request.query_string;
    }
    if (Array.isArray(event.breadcrumbs)) {
      event.breadcrumbs.forEach((b) => {
        if (!b.data) return;
        if (b.data.to) b.data.to = clean(b.data.to);
        if (b.data.from) b.data.from = clean(b.data.from);
        if (b.data.url) b.data.url = clean(b.data.url);
      });
    }
    return event;
  },
});