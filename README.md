# care_ga_fe

A CARE frontend plugin that loads Google Analytics 4 when CARE loads the plugin manifest.

The measurement ID is supplied through `PlugConfig.meta.config` at runtime, so one build can be used across deployments without rebuilding.

## Configure CARE

Create or edit the frontend plugin under **Admin > Apps** in CARE.

Use `care_ga_fe` as the slug and configure the metadata as follows:

```json
{
  "url": "https://care-ga.example.com/assets/remoteEntry.js",
  "name": "care_ga_fe",
  "config": {
    "GOOGLE_ANALYTICS_MEASUREMENT_ID": "G-XXXXXXXXXX"
  }
}
```

Replace the URL and `G-XXXXXXXXXX` with values for the target deployment. If the measurement ID is missing, the plugin does not load Google Analytics and prints a warning after the startup timeout.

## Local development

```sh
npm install
npm start
```

This runs the federation build watcher and preview server. The local remote is available at:

```text
http://localhost:10124/assets/remoteEntry.js
```

Register this CARE metadata for local development:

```json
{
  "url": "http://localhost:10124/assets/remoteEntry.js",
  "name": "care_ga_fe",
  "config": {
    "GOOGLE_ANALYTICS_MEASUREMENT_ID": "G-XXXXXXXXXX"
  }
}
```

Reload CARE after changing the configured measurement ID or rebuilding the plugin.

## Build and validation

```sh
npm run typecheck
npm run build
```

The production federation entry point is emitted to `dist/assets/remoteEntry.js`.

## Behavior

- Reads `GOOGLE_ANALYTICS_MEASUREMENT_ID` from `window.__CARE_PLUGIN_RUNTIME__`.
- Retries startup for up to 10 seconds while CARE publishes plugin metadata.
- Injects Google Analytics once per page load.
- Initializes Google Analytics with IP anonymization enabled.
- Does not contain a fallback measurement ID.
