import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { afterEach, beforeEach, describe, it } from "jsr:@std/testing@1/bdd";
import {
  assertSpyCall,
  assertSpyCallArg,
  restore,
  stub,
} from "jsr:@std/testing@1/mock";
import { exec } from "../exec.ts";
import { runDeploymentCommands } from "./deploy-commands.ts";
import { DeployCommandInput } from "./types/deploy.ts";
import { git } from "../git.ts";

const givenPluginInput: DeployCommandInput = {
  gitCurrentBranch: "main",
  gitRepoOwner: "owner",
  gitRepoName: "repo",
  gitCommitsSinceLastRelease: [],
  nextVersionName: "1.0.0",
  isDryRun: false,
};

describe("run deploy commands", () => {
  afterEach(() => {
    restore();
  });

  it("given list of deploy commands, expect to execute them all", async () => {
    const runStub = stub(exec, "run", async (args) => {
      return {
        exitCode: 0,
        stdout: "success",
        output: undefined,
      };
    });
    stub(git, "commit", async (args) => {
      return {
        sha: "123",
        message: "success",
        date: new Date(),
      };
    });
    stub(git, "push", async (args) => {
      return;
    });

    const commands = [
      "echo 'hello world'",
      "echo 'hello world'",
      "echo 'hello world'",
    ];

    Deno.env.set("INPUT_DEPLOY_COMMANDS", commands.join("\n"));

    await runDeploymentCommands({
      dryRun: false,
      input: givenPluginInput,
      exec,
      git,
    });

    assertEquals(runStub.calls.length, 3);
  });

  it("should return false, given a deploy command fails", async () => {
    stub(exec, "run", async (args) => {
      return {
        exitCode: 1,
        stdout: "error",
        output: undefined,
      };
    });

    const commands = [
      "echo 'hello world'",
      "echo 'hello world'",
      "echo 'hello world'",
    ];

    Deno.env.set("INPUT_DEPLOY_COMMANDS", commands.join("\n"));

    assertRejects(async () => {
      await runDeploymentCommands({
        dryRun: false,
        input: givenPluginInput,
        exec,
        git,
      });
    });
  });

  it("should run normally and succeed, given no deploy commands", async () => {
    Deno.env.delete("INPUT_DEPLOY_COMMANDS");

    stub(git, "commit", async (args) => {
      return {
        sha: "123",
        message: "success",
        date: new Date(),
      };
    });
    stub(git, "push", async (args) => {
      return;
    });

    await runDeploymentCommands({
      dryRun: false,
      input: givenPluginInput,
      exec,
      git,
    });
  });
});

describe("git operations", () => {
  beforeEach(() => {
    Deno.env.delete("INPUT_DEPLOY_COMMANDS"); // deploy commands are not needed for these tests
  });

  afterEach(() => {
    restore();
  });

  it("should git add file that command returns", async () => {
    stub(exec, "run", async (args) => {
      return {
        exitCode: 0,
        stdout: "success",
        output: {
          filesToCommit: ["file1", "file2"],
        },
      };
    });
    const gitAddMock = stub(git, "add", async (args) => {
      return;
    });
    stub(git, "commit", async (args) => {
      return {
        sha: "123",
        message: "success",
        date: new Date(),
      };
    });
    stub(git, "push", async (args) => {
      return;
    });

    const commands = [
      "echo 'hello world'",
      "echo 'hello world'",
      "echo 'hello world'",
    ];

    Deno.env.set("INPUT_DEPLOY_COMMANDS", commands.join("\n"));

    await runDeploymentCommands({
      dryRun: false,
      input: givenPluginInput,
      exec,
      git,
    });

    assertSpyCall(gitAddMock, 0, {
      args: [{ exec, filePath: "file1" }],
    });
    assertSpyCall(gitAddMock, 1, {
      args: [{ exec, filePath: "file2" }],
    });
  });

  it("should pass dry-run mode to git commands depending on if enabled or not", async () => {
    const gitCommitMock = stub(git, "commit", async (args) => {
      return {
        sha: "123",
        message: "success",
        date: new Date(),
      };
    });
    const gitPushMock = stub(git, "push", async (args) => {
      return;
    });

    // First, test when dry-run mode enabled
    await runDeploymentCommands({
      dryRun: true,
      input: givenPluginInput,
      exec,
      git,
    });

    assertSpyCall(gitCommitMock, 0, {
      args: [{ exec, message: `Deploy version 1.0.0`, dryRun: true }],
    });
    assertSpyCall(gitPushMock, 0, {
      args: [{ exec, branch: "main", dryRun: true }],
    });

    // Next, test when dry-run mode disabled
    await runDeploymentCommands({
      dryRun: false,
      input: givenPluginInput,
      exec,
      git,
    });

    assertSpyCall(gitCommitMock, 1, {
      args: [{ exec, message: `Deploy version 1.0.0`, dryRun: false }],
    });
    assertSpyCall(gitPushMock, 1, {
      args: [{ exec, branch: "main", dryRun: false }],
    });
  });
});

describe("function return values", () => {
  afterEach(() => {
    restore();
  });

  it("should return git commit created, if new commit made", async () => {
    const givenCommitCreated = {
      sha: "123",
      message: "success",
      date: new Date(),
    };

    stub(exec, "run", async (args) => {
      return {
        exitCode: 0,
        stdout: "success",
        output: undefined,
      };
    });
    stub(git, "commit", async (args) => {
      return givenCommitCreated;
    });
    stub(git, "push", async (args) => {
      return;
    });

    const commands = [
      "echo 'hello world'",
    ];

    Deno.env.set("INPUT_DEPLOY_COMMANDS", commands.join("\n"));

    assertEquals(
      await runDeploymentCommands({
        dryRun: false,
        input: givenPluginInput,
        exec,
        git,
      }),
      {
        gitCommitCreated: givenCommitCreated,
      },
    );
  });

  it("should not return git commit if command fails", async () => {
    stub(exec, "run", async (args) => {
      return {
        exitCode: 1,
        stdout: "error",
        output: undefined,
      };
    });

    const commands = [
      "echo 'hello world'",
    ];

    Deno.env.set("INPUT_DEPLOY_COMMANDS", commands.join("\n"));

    assertRejects(async () => {
      assertEquals(
        await runDeploymentCommands({
          dryRun: false,
          input: givenPluginInput,
          exec,
          git,
        }),
        {
          gitCommitCreated: undefined,
        },
      );
    });
  });
});
