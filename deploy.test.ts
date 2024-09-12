import { assertEquals } from "jsr:@std/assert@1";
import { afterEach, describe, it } from "jsr:@std/testing@1/bdd";
import { restore, stub } from "jsr:@std/testing@1/mock";
import {
  GetLatestReleaseStep,
  GetLatestReleaseStepImpl,
} from "./lib/steps/get-latest-release.ts";
import { run } from "./deploy.ts";
import {
  GitHubApiImpl,
  GitHubCommit,
  GitHubRelease,
} from "./lib/github-api.ts";
import { GitHubCommitFake, GitHubReleaseFake } from "./lib/github-api.test.ts";
import {
  GetCommitsSinceLatestReleaseStep,
  GetCommitsSinceLatestReleaseStepImpl,
} from "./lib/steps/get-commits-since-latest-release.ts";
import {
  DetermineNextReleaseStep,
  DetermineNextReleaseStepImpl,
} from "./lib/steps/determine-next-release.ts";
import {
  CreateNewReleaseStep,
  CreateNewReleaseStepImpl,
} from "./lib/steps/create-new-release.ts";
import { DeployStep, DeployStepImpl } from "./lib/steps/deploy.ts";
import { exec } from "./lib/exec.ts";
import { git } from "./lib/git.ts";

describe("run the tool", () => {
  afterEach(() => {
    restore();
  });

  it("given new commit created during deployment, expect create release from new commit", async () => {
    const givenLatestCommitOnBranch = new GitHubCommitFake({
      message: "feat: trigger a release",
      sha: "trigger-release",
    });
    const givenCreatedCommitDuringDeploy = new GitHubCommitFake({
      message: "chore: commit created during deploy",
      sha: "commit-created-during-deploy",
    });

    const { createNewReleaseStepMock } = await setupTestEnvironmentAndRun({
      commitsSinceLatestRelease: [givenLatestCommitOnBranch],
      gitCommitCreatedDuringDeploy: givenCreatedCommitDuringDeploy,
      nextReleaseVersion: "1.0.0",
    });

    assertEquals(
      createNewReleaseStepMock.calls[0].args[0].commit.sha,
      givenCreatedCommitDuringDeploy.sha,
    );
  });

  it("given no new commits created during deployment, expect create release from latest commit found on github", async () => {
    const givenLatestCommitOnBranch = new GitHubCommitFake({
      message: "feat: trigger a release",
      sha: "trigger-release",
    });

    const { createNewReleaseStepMock } = await setupTestEnvironmentAndRun({
      commitsSinceLatestRelease: [givenLatestCommitOnBranch],
      gitCommitCreatedDuringDeploy: undefined,
      nextReleaseVersion: "1.0.0",
    });

    assertEquals(
      createNewReleaseStepMock.calls[0].args[0].commit.sha,
      givenLatestCommitOnBranch.sha,
    );
  });

  it("given no commits created since last deployment, expect to not run a new deployment", async () => {
    const { determineNextReleaseStepMock } = await setupTestEnvironmentAndRun({
      commitsSinceLatestRelease: [],
    });

    // Exit early, before running the next step after getting list of commits since last deployment
    assertEquals(determineNextReleaseStepMock.calls.length, 0);
  });

  it("given no commits trigger a release, expect to not run a new deployment", async () => {
    const { deployStepMock } = await setupTestEnvironmentAndRun({
      commitsSinceLatestRelease: [new GitHubCommitFake()],
      nextReleaseVersion: undefined,
    });

    // Exit early, before running the next step after getting list of commits since last deployment
    assertEquals(deployStepMock.calls.length, 0);
  });
});

const setupTestEnvironmentAndRun = async ({
  latestRelease,
  commitsSinceLatestRelease,
  nextReleaseVersion,
  gitCommitCreatedDuringDeploy,
}: {
  latestRelease?: GitHubRelease;
  commitsSinceLatestRelease?: GitHubCommit[];
  nextReleaseVersion?: string;
  gitCommitCreatedDuringDeploy?: GitHubCommit;
}) => {
  Deno.env.set("GITHUB_REF", "refs/heads/main");
  Deno.env.set("GITHUB_REPOSITORY", "levibostian/new-deployment-tool");
  Deno.env.set("DRY_RUN", "false");

  const getLatestReleaseStep = new GetLatestReleaseStepImpl(GitHubApiImpl);
  const getLatestReleaseStepMock = stub(
    getLatestReleaseStep,
    "getLatestReleaseForBranch",
    async () => {
      return latestRelease || GitHubReleaseFake;
    },
  );

  const getCommitsSinceLatestReleaseStep =
    new GetCommitsSinceLatestReleaseStepImpl(GitHubApiImpl);
  const getCommitsSinceLatestReleaseStepMock = stub(
    getCommitsSinceLatestReleaseStep,
    "getAllCommitsSinceGivenCommit",
    async () => {
      return commitsSinceLatestRelease || [];
    },
  );

  const determineNextReleaseStep = new DetermineNextReleaseStepImpl();
  const determineNextReleaseStepMock = stub(
    determineNextReleaseStep,
    "getNextReleaseVersion",
    async () => {
      return nextReleaseVersion || null;
    },
  );

  const deployStep = new DeployStepImpl(exec, git);
  const deployStepMock = stub(deployStep, "runDeploymentCommands", async () => {
    return gitCommitCreatedDuringDeploy || null;
  });

  const createNewReleaseStep = new CreateNewReleaseStepImpl(GitHubApiImpl);
  const createNewReleaseStepMock = stub(
    createNewReleaseStep,
    "createNewRelease",
    async () => {
      return;
    },
  );

  await run({
    getLatestReleaseStep,
    getCommitsSinceLatestReleaseStep,
    determineNextReleaseStep,
    deployStep,
    createNewReleaseStep,
  });

  return {
    getLatestReleaseStepMock,
    getCommitsSinceLatestReleaseStepMock,
    determineNextReleaseStepMock,
    deployStepMock,
    createNewReleaseStepMock,
  };
};
