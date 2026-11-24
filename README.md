# care_ga_fe

A CARE frontend plugin that loads Google Analytics 4 when CARE loads the plugin manifest, without sending patient identifiers, names or search terms to Google.

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
npm test
npm run build
```

The production federation entry point is emitted to `dist/assets/remoteEntry.js`.

## Behavior

- Reads `GOOGLE_ANALYTICS_MEASUREMENT_ID` from `window.__CARE_PLUGIN_RUNTIME__`, retrying for up to 10 seconds while CARE publishes plugin metadata. A value that isn't a GA4 `G-` ID is ignored with a console warning.
- Injects Google Analytics once per page load. Does not contain a fallback measurement ID.
- Turns off the automatic page view and sends its own on each route change (`pushState`, `replaceState`, `popstate`). Changes to the query string alone don't count as a new page.
- Turns off Google signals and ad personalization, and sends no user ID, user name or role.

## What Google receives

CARE URLs contain patient, encounter and facility IDs, query strings can contain patient names or phone numbers, and page titles can contain a patient's name. Before anything is sent, the plugin reduces each page to its route shape:

| In the browser | Sent to Google Analytics |
| --- | --- |
| `/facility/9bef…/patient/1a2b…/encounter/3c4d…?tab=notes` | `/facility/:id/patient/:id/encounter/:id` |
| Page title `Jane Doe \| Care` | Page title `/facility/:id/patient/:id/encounter/:id` |
| Referrer with IDs and a query string | Referrer reduced the same way |

UUIDs, and path segments that look like IDs (6+ characters containing a digit), become `:id`. The query string and hash are dropped. `npm test` covers these rules.

## Required Google Analytics settings

The plugin controls only what it sends. GA4 can collect more on its own, so set these on the property before enabling the plugin:

1. **Admin → Data streams → (stream) → Enhanced measurement: off.** Its page-change, site-search and form-interaction events read the raw URL and form fields, which bypasses the sanitizing above.
2. **Admin → Data collection → Google signals: off.**
3. **Admin → Data retention: 2 months.**
4. **Admin → Data collection → Granular location and device data: off,** unless the deployment needs city-level location.
