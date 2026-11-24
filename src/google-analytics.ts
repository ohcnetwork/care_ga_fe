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

let lastPath: string | undefined;

/**
 * Point every later event at the sanitized URL, then record a page view.
 * The page title is the route shape, not `document.title`, because a title
 * can carry a patient's name.
 */
function trackPage(gtag: Gtag): void {
  const path = sanitizePath(location.pathname);
  if (path === lastPath) return; // query-only changes are not new pages
  const referrer = lastPath
    ? location.origin + lastPath
    : sanitizeUrl(document.referrer);
  lastPath = path;

  gtag("set", {
    page_location: location.origin + path,
    page_referrer: referrer,
    page_title: path,
  });
  gtag("event", "page_view");
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
  gtag("config", measurementId, {
    send_page_view: false,
    page_location: location.origin + sanitizePath(location.pathname),
    page_referrer: sanitizeUrl(document.referrer),
    page_title: sanitizePath(location.pathname),
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const script = document.createElement("script");
  script.id = GOOGLE_ANALYTICS_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  trackPage(gtag);
  watchRouteChanges(() => trackPage(gtag));
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
