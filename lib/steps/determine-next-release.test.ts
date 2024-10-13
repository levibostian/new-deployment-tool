import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { GitHubCommit, GitHubRelease } from "../github-api.ts";
import { DetermineNextReleaseStepImpl } from "./determine-next-release.ts";
import { GitHubReleaseFake } from "../github-api.test.ts";

const defaultEnvironment = {
  gitCurrentBranch: "main",
  lastRelease: null,
  gitCommitsSinceLastRelease: [],
  gitRepoOwner: "owner",
  gitRepoName: "repo",
  isDryRun: false,
};

Deno.test("given this is first release, not prerelease, expect default version", async () => {
  const commits: GitHubCommit[] = [{
    sha: "",
    message: "feat: initial commit",
    date: new Date(),
  }];
  const result = await new DetermineNextReleaseStepImpl().getNextReleaseVersion(
    {
      environment: defaultEnvironment,
      commits,
      latestRelease: null,
    },
  );
  assertEquals(result, "1.0.0");
});

Deno.test("given this is first release, prerelease, expect default prerelease version", async () => {
  const commits: GitHubCommit[] = [{
    sha: "",
    message: "feat: initial commit",
    date: new Date(),
  }];
  const result = await new DetermineNextReleaseStepImpl().getNextReleaseVersion(
    {
      config: {branches: [{branch_name: "beta", prerelease: true, version_suffix: "beta"}]},
      environment: { ...defaultEnvironment, gitCurrentBranch: "beta" },
      commits,
      latestRelease: null,
    },
  );
  assertEquals(result, "1.0.0-beta.1");
})

Deno.test("given introducing a breaking change, expect bumps major version", async () => {
  const commits: GitHubCommit[] = [{
    sha: "",
    message: "feat!: add new authentication system",
    date: new Date(),
  }];
  const result = await new DetermineNextReleaseStepImpl().getNextReleaseVersion(
    {
      environment: defaultEnvironment,
      commits,
      latestRelease: {
        ...GitHubReleaseFake,
        tag: { ...GitHubReleaseFake.tag, name: "1.2.3" },
      },
    },
  );
  assertEquals(result, "2.0.0");
});

Deno.test("given a feature commit, expect bumps minor version", async () => {
  const commits: GitHubCommit[] = [{
    sha: "",
    message: "feat: add new feature",
    date: new Date(),
  }];
  const result = await new DetermineNextReleaseStepImpl().getNextReleaseVersion(
    {
      environment: defaultEnvironment,
      commits,
      latestRelease: {
        ...GitHubReleaseFake,
        tag: { ...GitHubReleaseFake.tag, name: "1.2.3" },
      },
    },
  );
  assertEquals(result, "1.3.0");
});

Deno.test("given a fix commit, expect bumps patch version", async () => {
  const commits: GitHubCommit[] = [{
    sha: "",
    message: "fix: resolve issue with login",
    date: new Date(),
  }];
  const result = await new DetermineNextReleaseStepImpl().getNextReleaseVersion(
    {
      environment: defaultEnvironment,
      commits,
      latestRelease: {
        ...GitHubReleaseFake,
        tag: { ...GitHubReleaseFake.tag, name: "1.2.3" },
      },
    },
  );
  assertEquals(result, "1.2.4");
});

Deno.test("given a chore commit, expect no next version", async () => {
  const commits: GitHubCommit[] = [{
    sha: "",
    message: "chore: update dependencies",
    date: new Date(),
  }];
  const result = await new DetermineNextReleaseStepImpl().getNextReleaseVersion(
    {
      environment: defaultEnvironment,
      commits,
      latestRelease: {
        ...GitHubReleaseFake,
        tag: { ...GitHubReleaseFake.tag, name: "1.2.3" },
      },
    },
  );
  assertEquals(result, null);
});

Deno.test("given latest release is not prerelease and next release is prerelease, expect bump and add prerelease suffix", async () => {
  const commits: GitHubCommit[] = [{
    sha: "",
    message: "feat: add new feature",
    date: new Date(),
  }];
  const result = await new DetermineNextReleaseStepImpl().getNextReleaseVersion(
    {
      config: {branches: [{branch_name: "beta", prerelease: true, version_suffix: "beta"}]},
      environment: { ...defaultEnvironment, gitCurrentBranch: "beta" },
      commits,
      latestRelease: {
        ...GitHubReleaseFake,
        tag: { ...GitHubReleaseFake.tag, name: "1.2.3" },
      },
    },
  );
  assertEquals(result, "1.3.0-beta.1");
})

Deno.test("given latest release is prerelease, next release is prerelease, next release is major bump, expect next prerelease version with new major version", async () => {
  const commits: GitHubCommit[] = [{
    sha: "",
    message: "feat!: add new feature",
    date: new Date(),
  }];
  const result = await new DetermineNextReleaseStepImpl().getNextReleaseVersion(
    {
      config: {branches: [{branch_name: "beta", prerelease: true, version_suffix: "beta"}]},
      environment: { ...defaultEnvironment, gitCurrentBranch: "beta" },
      commits,
      latestRelease: {
        ...GitHubReleaseFake,
        tag: { ...GitHubReleaseFake.tag, name: "1.2.3-beta.1" },
      },
    },
  );
  assertEquals(result, "2.0.0-beta.1");
})

Deno.test("given latest version is prerelease and next release is prerelease, expect next prerelease version", async () => {
  const commits: GitHubCommit[] = [{
    sha: "",
    message: "feat: add new feature",
    date: new Date(),
  }];
  const result = await new DetermineNextReleaseStepImpl().getNextReleaseVersion(
    {
      config: {branches: [{branch_name: "beta", prerelease: true, version_suffix: "beta"}]},
      environment: { ...defaultEnvironment, gitCurrentBranch: "beta" },
      commits,
      latestRelease: {
        ...GitHubReleaseFake,
        tag: { ...GitHubReleaseFake.tag, name: "1.3.0-beta.1" },
      },
    },
  );
  assertEquals(result, "1.3.0-beta.2");
})

Deno.test("given latest version is prerelease and next release is not prerelease, expect next non-prelease version", async () => {
  const commits: GitHubCommit[] = [{
    sha: "",
    message: "feat: add new feature",
    date: new Date(),
  }];
  const result = await new DetermineNextReleaseStepImpl().getNextReleaseVersion(
    {
      config: {branches: [{branch_name: "beta", prerelease: true, version_suffix: "beta"}]},
      environment: { ...defaultEnvironment, gitCurrentBranch: "main" },
      commits,
      latestRelease: {
        ...GitHubReleaseFake,
        tag: { ...GitHubReleaseFake.tag, name: "1.3.0-beta.1" },
      },
    },
  );
  assertEquals(result, "1.3.0");
})

Deno.test("given latest version is prerelease and next release is prerelease but different suffix, expect next prerelease version with new suffix", async () => {
  const commits: GitHubCommit[] = [{
    sha: "",
    message: "feat: add new feature",
    date: new Date(),
  }];
  const result = await new DetermineNextReleaseStepImpl().getNextReleaseVersion(
    {
      config: {branches: [{branch_name: "beta", prerelease: true, version_suffix: "beta"}]},
      environment: { ...defaultEnvironment, gitCurrentBranch: "beta" },
      commits,
      latestRelease: {
        ...GitHubReleaseFake,
        tag: { ...GitHubReleaseFake.tag, name: "1.3.0-alpha.3" },
      },
    },
  );
  assertEquals(result, "1.3.0-beta.1");
})
