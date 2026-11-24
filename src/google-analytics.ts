import { readPluginConfig } from "./plugin-config";
import { sanitizePath, sanitizeUrl } from "./sanitize";

const GOOGLE_ANALYTICS_SCRIPT_ID = "care-google-analytics-script";
const MAX_CONFIG_WAIT_MS = 10_000;
const CONFIG_POLL_INTERVAL_MS = 100;
const MEASUREMENT_ID = /^G-[A-Z0-9]+$/;

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

const PRIVACY_SETTINGS = {
  send_page_view: false,
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
} as const;

let lastPath: string | undefined;

/**
 * Record a page view for the sanitized URL. The page title is the route
 * shape, not `document.title`, because a title can carry a patient's name.
 *
 * GA4 ignores `gtag("set", { page_location })` once the tag is configured,
 * so the fields go on the page_view itself, and `config` is re-applied so
 * that any later event on this page reports the same sanitized URL.
 */
function trackPage(gtag: Gtag, measurementId: string): void {
  const path = sanitizePath(location.pathname);
  if (path === lastPath) return; // query-only changes are not new pages
  const page = {
    page_location: location.origin + path,
    page_referrer: lastPath
      ? location.origin + lastPath
      : sanitizeUrl(document.referrer),
    page_title: path,
  };
  lastPath = path;

  gtag("config", measurementId, { ...PRIVACY_SETTINGS, ...page });
  gtag("event", "page_view", { ...page, send_to: measurementId });
}

function watchRouteChanges(onChange: () => void): void {
  for (const method of ["pushState", "replaceState"] as const) {
    const original = history[method].bind(history);
    history[method] = (...args: Parameters<History["pushState"]>) => {
      original(...args);
      onChange();
    };
  }
  window.addEventListener("popstate", onChange);
}

function initializeAnalytics(measurementId: string): void {
  if (document.getElementById(GOOGLE_ANALYTICS_SCRIPT_ID)) return;

  window.dataLayer = window.dataLayer ?? [];
  const gtag: Gtag =
    window.gtag ??
    function gtag() {
      // gtag.js expects the `arguments` object itself, not an array.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
  window.gtag = gtag;

  gtag("js", new Date());
  trackPage(gtag, measurementId);

  const script = document.createElement("script");
  script.id = GOOGLE_ANALYTICS_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  watchRouteChanges(() => trackPage(gtag, measurementId));
}

function initializeWhenConfigured(startedAt = Date.now()): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const measurementId = readPluginConfig("GOOGLE_ANALYTICS_MEASUREMENT_ID");
  if (measurementId) {
    if (MEASUREMENT_ID.test(measurementId)) {
      initializeAnalytics(measurementId);
    } else {
      console.warn(
        `CARE Google Analytics plugin: "${measurementId}" is not a GA4 measurement ID (G-XXXXXXX).`,
      );
    }
    return;
  }

  if (Date.now() - startedAt < MAX_CONFIG_WAIT_MS) {
    window.setTimeout(
      () => initializeWhenConfigured(startedAt),
      CONFIG_POLL_INTERVAL_MS,
    );
    return;
  }

  console.warn(
    "CARE Google Analytics plugin is enabled without meta.config.GOOGLE_ANALYTICS_MEASUREMENT_ID.",
  );
}

initializeWhenConfigured();
