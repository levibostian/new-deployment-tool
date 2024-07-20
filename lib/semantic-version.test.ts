import {assertEquals} from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import {assertThrows} from "https://deno.land/std@0.224.0/assert/assert_throws.ts";
import { SemanticVersion } from "./semantic-version.ts";

Deno.test("SemanticVersion initializes correctly", () => {
  const version = new SemanticVersion("1.2.3");
  assertEquals(version.major, 1);
  assertEquals(version.minor, 2);
  assertEquals(version.patch, 3);
});

Deno.test("SemanticVersion throws error on invalid version string", () => {
  assertThrows(() => new SemanticVersion("invalid.version.string"), Error, "Invalid version string: invalid.version.string");
});

Deno.test("SemanticVersion bumpMajor works correctly", () => {
  const version = new SemanticVersion("1.2.3");
  assertEquals(version.bumpMajor(), "2.0.0");
});

Deno.test("SemanticVersion bumpMinor works correctly", () => {
  const version = new SemanticVersion("1.2.3");
  assertEquals(version.bumpMinor(), "1.3.0");
});

Deno.test("SemanticVersion bumpPatch works correctly", () => {
  const version = new SemanticVersion("1.2.3");
  assertEquals(version.bumpPatch(), "1.2.4");
});

Deno.test("SemanticVersion throws error on empty version string", () => {
  assertThrows(() => new SemanticVersion(""), Error, "Invalid version string: ");
});

Deno.test("SemanticVersion throws error if version string has more than 3 parts", () => {
  assertThrows(() => new SemanticVersion("1.2.3.4"), Error, "Invalid version string: 1.2.3.4");
});

Deno.test("SemanticVersion throws error if version string has less than 3 parts", () => {
  assertThrows(() => new SemanticVersion("1.2"), Error, "Invalid version string: 1.2");
});
