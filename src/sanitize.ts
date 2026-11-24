// CARE URLs carry patient, encounter and facility IDs, and search params can
// hold patient names or phone numbers. Google Analytics must never receive
// them, so every URL is reduced to its route shape before it is sent.

const UUID =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
// Path segments that are long numbers or opaque tokens, such as an
// identifier or a phone number typed into a route.
const OPAQUE_SEGMENT = /^(?=.*\d)[A-Za-z0-9_-]{6,}$/;

/** `/facility/<uuid>/patient/<uuid>?q=x` → `/facility/:id/patient/:id` */
export function sanitizePath(pathname: string): string {
  const path = pathname
    .replace(UUID, ":id")
    .split("/")
    .map((segment) => (OPAQUE_SEGMENT.test(segment) ? ":id" : segment))
    .join("/");
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

/** Keep the origin, replace the path with its route shape, drop query and hash. */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.origin + sanitizePath(parsed.pathname);
  } catch {
    return "";
  }
}
