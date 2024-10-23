import { assertEquals } from "jsr:@std/assert@1";
import { afterEach, describe, it } from "jsr:@std/testing@1/bdd";
import { restore, stub } from "jsr:@std/testing@1/mock";
import { assertSnapshot } from "jsr:@std/testing@1/snapshot";
import { GetLatestReleaseStep } from "./lib/steps/get-latest-release.ts";
import { run } from "./deploy.ts";
import { GitHubCommit, GitHubRelease } from "./lib/github-api.ts";
import { GitHubCommitFake, GitHubReleaseFake } from "./lib/github-api.test.ts";
import {
  GetCommitsSinceLatestReleaseStep,
} from "./lib/steps/get-commits-since-latest-release.ts";
import {
  DetermineNextReleaseStep,
} from "./lib/steps/determine-next-release.ts";
import { CreateNewReleaseStep } from "./lib/steps/create-new-release.ts";
import { DeployStep } from "./lib/steps/deploy.ts";
import { getLogMock } from "./lib/log.test.ts";
import { GitHubActions } from "./lib/github-actions.ts";

describe("run the tool in different scenarios", () => {
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

describe("test github actions output", () => {
  it("should set new release version output when a new release is created", async () => {
    const { githubActionsSetOutputMock } = await setupTestEnvironmentAndRun({
      commitsSinceLatestRelease: [new GitHubCommitFake({
        message: "feat: trigger a release",
        sha: "trigger-release",
      })],
      nextReleaseVersion: "1.0.0",
    });

    assertEquals(
      githubActionsSetOutputMock.calls[0].args[0].key,
      "new_release_version"      
    );
    assertEquals(
      githubActionsSetOutputMock.calls[0].args[0].value,
      "1.0.0"
    );
  })
  it("should not set new release version output when no new release is created", async () => {
    const { githubActionsSetOutputMock } = await setupTestEnvironmentAndRun({
      commitsSinceLatestRelease: [],
      nextReleaseVersion: "1.0.0",
    });

    assertEquals(
      githubActionsSetOutputMock.calls.length,
      0
    );
  })
})

describe("user facing logs", () => {
  it("given no commits will trigger a release, expect logs to easily communicate that to the user", async (t) => {
    const { logMock } = await setupTestEnvironmentAndRun({
      commitsSinceLatestRelease: [new GitHubCommitFake()],
      nextReleaseVersion: undefined,
    });

    await assertSnapshot(t, logMock.getLogs({includeDebugLogs: false}));
  })

  it("given no commits created since last deployment, expect logs to easily communicate that to the user", async (t) => {
    const { logMock } = await setupTestEnvironmentAndRun({
      commitsSinceLatestRelease: [],
    });

    await assertSnapshot(t, logMock.getLogs({includeDebugLogs: false}));
  })

  it("given new commit created during deployment, expect logs to easily communicate that to the user", async (t) => {
    const givenLatestCommitOnBranch = new GitHubCommitFake({
      message: "feat: trigger a release",
      sha: "trigger-release",
    });
    const givenCreatedCommitDuringDeploy = new GitHubCommitFake({
      message: "chore: commit created during deploy",
      sha: "commit-created-during-deploy",
    });

    const { logMock } = await setupTestEnvironmentAndRun({
      commitsSinceLatestRelease: [givenLatestCommitOnBranch],
      gitCommitCreatedDuringDeploy: givenCreatedCommitDuringDeploy,
      nextReleaseVersion: "1.0.0",
    });

    await assertSnapshot(t, logMock.getLogs({includeDebugLogs: false}));
  })

  it("given no new commits created during deployment, expect logs to easily communicate that to the user", async (t) => {
    const givenLatestCommitOnBranch = new GitHubCommitFake({
      message: "feat: trigger a release",
      sha: "trigger-release",
    });

    const { logMock } = await setupTestEnvironmentAndRun({
      commitsSinceLatestRelease: [givenLatestCommitOnBranch],
      gitCommitCreatedDuringDeploy: undefined,
      nextReleaseVersion: "1.0.0",
    });

    await assertSnapshot(t, logMock.getLogs({includeDebugLogs: false}));
  })
})

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

  const getLatestReleaseStep = {} as GetLatestReleaseStep;
  const getLatestReleaseStepMock = stub(
    getLatestReleaseStep,
    "getLatestReleaseForBranch",
    async () => {
      return latestRelease || GitHubReleaseFake;
    },
  );

  const getCommitsSinceLatestReleaseStep =
    {} as GetCommitsSinceLatestReleaseStep;
  const getCommitsSinceLatestReleaseStepMock = stub(
    getCommitsSinceLatestReleaseStep,
    "getAllCommitsSinceGivenCommit",
    async () => {
      return commitsSinceLatestRelease || [];
    },
  );

  const determineNextReleaseStep = {} as DetermineNextReleaseStep;
  const determineNextReleaseStepMock = stub(
    determineNextReleaseStep,
    "getNextReleaseVersion",
    async () => {
      return nextReleaseVersion || null;
    },
  );

  const deployStep = {} as DeployStep;
  const deployStepMock = stub(deployStep, "runDeploymentCommands", async () => {
    return gitCommitCreatedDuringDeploy || null;
  });

  const createNewReleaseStep = {} as CreateNewReleaseStep;
  const createNewReleaseStepMock = stub(
    createNewReleaseStep,
    "createNewRelease",
    async () => {
      return;
    },
  );

  const logMock = getLogMock();
  
  const githubActions = {} as GitHubActions
  const githubActionsGetDetermineNextReleaseStepConfigMock = stub(
    githubActions,
    "getDetermineNextReleaseStepConfig",
    () => {
      return undefined;
    },
  );
  const githubActionsSetOutputMock = stub(
    githubActions,
    "setOutput",
    () => {
      return;
    },
  );

  await run({
    getLatestReleaseStep,
    getCommitsSinceLatestReleaseStep,
    determineNextReleaseStep,
    deployStep,
    createNewReleaseStep,
    log: logMock,
    githubActions,
  });

  return {
    getLatestReleaseStepMock,
    getCommitsSinceLatestReleaseStepMock,
    determineNextReleaseStepMock,
    deployStepMock,
    createNewReleaseStepMock,
    logMock,
    githubActionsGetDetermineNextReleaseStepConfigMock,
    githubActionsSetOutputMock,
  };
};
