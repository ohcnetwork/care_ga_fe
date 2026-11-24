interface PlugConfigMeta {
  url?: string;
  name?: string;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

declare global {
  interface Window {
    __CARE_PLUGIN_RUNTIME__?: { meta?: Record<string, PlugConfigMeta> };
  }
}

const PLUGIN_ALIASES = ["care_ga_fe", "care-ga-fe"];

function readFrom(entry: PlugConfigMeta | undefined, key: string) {
  const value = entry?.config?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function readPluginConfig(key: string): string | undefined {
  const meta = window.__CARE_PLUGIN_RUNTIME__?.meta;
  if (!meta) return undefined;

  for (const alias of PLUGIN_ALIASES) {
    const found =
      readFrom(meta[alias], key) ??
      readFrom(
        Object.values(meta).find((entry) => entry?.name === alias),
        key,
      );
    if (found) return found;
  }

  return undefined;
}
