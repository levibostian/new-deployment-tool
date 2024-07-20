import {assertEquals} from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { versionBumpForCommitBasedOnConventionalCommit } from "./conventional-commits.ts";

Deno.test("versionBumpForCommit returns 'major' for breaking changes", () => {
  const commit = { sha: "", message: "refactor!: drop support for Node 6" };
  assertEquals(versionBumpForCommitBasedOnConventionalCommit(commit), 'major');
});

Deno.test("versionBumpForCommit returns 'minor' for new features", () => {
  const commit = { sha: "", message: "feat: add support for TypeScript" };
  assertEquals(versionBumpForCommitBasedOnConventionalCommit(commit), 'minor');
});

Deno.test("versionBumpForCommit returns 'patch' for fixes", () => {
  const commit = { sha: "", message: "fix: correct minor typos in code" };
  assertEquals(versionBumpForCommitBasedOnConventionalCommit(commit), 'patch');
});

Deno.test("versionBumpForCommit returns undefined for non-conventional commits", () => {
  const commit = { sha: "", message: "Update README.md" };
  assertEquals(versionBumpForCommitBasedOnConventionalCommit(commit), undefined);
});

Deno.test("versionBumpForCommit returns undefined for new features with uppercase 'FEAT:'", () => {
  const commit = { sha: "", message: "FEAT: implement dark mode" };
  assertEquals(versionBumpForCommitBasedOnConventionalCommit(commit), undefined);
});

Deno.test("versionBumpForCommit returns undefined for fixes with mixed case 'Fix:'", () => {
  const commit = { sha: "", message: "Fix: address performance issue in data processing" };
  assertEquals(versionBumpForCommitBasedOnConventionalCommit(commit), undefined);
});

Deno.test("versionBumpForCommit handles commits with no colon after type", () => {
  const commit = { sha: "", message: "feat implement a new search algorithm" };
  assertEquals(versionBumpForCommitBasedOnConventionalCommit(commit), undefined);
});

Deno.test("versionBumpForCommit undefined when fix is incorrect format", () => {
  const commit = { sha: "", message: "fix : incorrect user input validation" };
  assertEquals(versionBumpForCommitBasedOnConventionalCommit(commit), undefined);
});

// Order matters 

Deno.test("versionBumpForCommit returns 'major' for 'feat!:' indicating a breaking new feature", () => {
  const commit = { sha: "", message: "feat!: completely redesign UI" };
  assertEquals(versionBumpForCommitBasedOnConventionalCommit(commit), 'major');
});

Deno.test("versionBumpForCommit returns 'major' for 'fix!:' indicating a breaking fix", () => {
  const commit = { sha: "", message: "fix!: change database schema" };
  assertEquals(versionBumpForCommitBasedOnConventionalCommit(commit), 'major');
});