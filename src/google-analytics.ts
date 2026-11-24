import { readPluginConfig } from "./plugin-config";

const GOOGLE_ANALYTICS_SCRIPT_ID = "care-google-analytics-script";
const MAX_CONFIG_WAIT_MS = 10_000;
const CONFIG_POLL_INTERVAL_MS = 100;

type GtagArguments = [string, ...unknown[]];

declare global {
  interface Window {
    dataLayer?: GtagArguments[];
    gtag?: (...args: GtagArguments) => void;
  }
}

function initializeGoogleAnalytics(measurementId: string): void {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    document.getElementById(GOOGLE_ANALYTICS_SCRIPT_ID)
  ) {
    return;
  }

  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    ((...args: GtagArguments) => {
      window.dataLayer?.push(args);
    });

  const script = document.createElement("script");
  script.id = GOOGLE_ANALYTICS_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    anonymize_ip: true,
  });
}

function initializeWhenConfigured(startedAt = Date.now()): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const measurementId = readPluginConfig(
    "GOOGLE_ANALYTICS_MEASUREMENT_ID",
  );
  if (measurementId) {
    initializeGoogleAnalytics(measurementId);
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
