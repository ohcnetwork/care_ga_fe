import assert from "node:assert/strict";
import { test } from "node:test";

import { sanitizePath, sanitizeUrl } from "../src/sanitize.ts";

test("replaces UUIDs with :id", () => {
  assert.equal(
    sanitizePath(
      "/facility/9bef54be-70b1-4210-adb5-37a0183ee5f9/locations/54c149b1-a1e4-4354-9a60-5b1325c9c975/service_requests",
    ),
    "/facility/:id/locations/:id/service_requests",
  );
});

test("replaces ID-like segments such as phone numbers", () => {
  assert.equal(sanitizePath("/patient/9876543210/home"), "/patient/:id/home");
});

test("keeps route words and the root path", () => {
  assert.equal(
    sanitizePath("/facility/x/encounters/patients/inpatient"),
    "/facility/x/encounters/patients/inpatient",
  );
  assert.equal(sanitizePath("/"), "/");
  assert.equal(sanitizePath("/login/"), "/login");
});

test("drops query strings and hashes from URLs", () => {
  assert.equal(
    sanitizeUrl(
      "https://care.example.com/facility/9bef54be-70b1-4210-adb5-37a0183ee5f9/patients?name=Jane%20Doe&phone=98765#notes",
    ),
    "https://care.example.com/facility/:id/patients",
  );
});

test("returns an empty string for an empty or invalid URL", () => {
  assert.equal(sanitizeUrl(""), "");
  assert.equal(sanitizeUrl("not a url"), "");
});
