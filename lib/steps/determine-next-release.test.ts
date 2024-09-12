import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { GitHubCommit } from "../github-api.ts";
import { DetermineNextReleaseStepImpl } from "./determine-next-release.ts";
import { GitHubReleaseFake } from "../github-api.test.ts";

Deno.test("getNextReleaseVersion initializes version correctly", async () => {
  const commits: GitHubCommit[] = [{
    sha: "",
    message: "feat: initial commit",
    date: new Date(),
  }];
  const result = await new DetermineNextReleaseStepImpl().getNextReleaseVersion({
    commits,
    latestRelease: null,
  });
  assertEquals(result, "1.0.0");
});

Deno.test("getNextReleaseVersion bumps major version correctly", async () => {
  const commits: GitHubCommit[] = [{
    sha: "",
    message: "feat!: add new authentication system",
    date: new Date(),
  }];
  const result = await new DetermineNextReleaseStepImpl().getNextReleaseVersion({
    commits,
    latestRelease: {...GitHubReleaseFake, tag: {...GitHubReleaseFake.tag, name: "1.2.3"}},
  });
  assertEquals(result, "2.0.0");
});

Deno.test("getNextReleaseVersion bumps minor version correctly", async () => {
  const commits: GitHubCommit[] = [{
    sha: "",
    message: "feat: add user profile page",
    date: new Date(),
  }];
  const result = await new DetermineNextReleaseStepImpl().getNextReleaseVersion({
    commits,
    latestRelease: {...GitHubReleaseFake, tag: {...GitHubReleaseFake.tag, name: "1.2.3"}},
  });
  assertEquals(result, "1.3.0");
});

Deno.test("getNextReleaseVersion bumps patch version correctly", async () => {
  const commits: GitHubCommit[] = [{
    sha: "",
    message: "fix: fix login bug",
    date: new Date(),
  }];
  const result = await new DetermineNextReleaseStepImpl().getNextReleaseVersion({
    commits,
    latestRelease: {...GitHubReleaseFake, tag: {...GitHubReleaseFake.tag, name: "1.2.3"}},
  });
  assertEquals(result, "1.2.4");
});

Deno.test("getNextReleaseVersion does not bump version without commits", async () => {
  const commits: GitHubCommit[] = [];
  const result = await new DetermineNextReleaseStepImpl().getNextReleaseVersion({
    commits,
    latestRelease: {...GitHubReleaseFake, tag: {...GitHubReleaseFake.tag, name: "1.2.3"}},
  });
  assertEquals(result, null);
});

Deno.test("getNextReleaseVersion handles multiple commits with different bumps", async () => {
  const commits: GitHubCommit[] = [
    { sha: "", message: "fix: fix login bug", date: new Date() },
    { sha: "", message: "feat: add user profile page", date: new Date() },
    { sha: "", message: "feat!: change API endpoints", date: new Date() },
  ];
  const result = await new DetermineNextReleaseStepImpl().getNextReleaseVersion({
    commits,
    latestRelease: {...GitHubReleaseFake, tag: {...GitHubReleaseFake.tag, name: "1.2.3"}},
  });
  assertEquals(result, "2.0.0");
});
