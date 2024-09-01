import {
  assertEquals,
} from "jsr:@std/assert@1";
import { afterEach, describe, it } from "jsr:@std/testing@1/bdd";
import {
  restore,
  stub,
} from "jsr:@std/testing@1/mock";
import { exec } from "../exec.ts";
import { runDeploymentCommands } from "./deploy-commands.ts";
import { DeployCommandInput } from "./types/deploy.ts";

describe("deployCommands", () => {
  const givenPluginInput: DeployCommandInput = {
    gitCurrentBranch: "main",
    gitRepoOwner: "owner",
    gitRepoName: "repo",
    gitCommitsSinceLastRelease: [],
    nextVersionName: "1.0.0",
    isDryRun: false,
  }

  afterEach(() => {
    restore();
  });

  it("given list of deploy commands, expect to execute them all", async () => {
    stub(exec, "run", async (args) => {
      return {
        exitCode: 0,
        stdout: "success",
        output: undefined
      }
    });

    const commands = [
      "echo 'hello world'",
      "echo 'hello world'",
      "echo 'hello world'"
    ];

    Deno.env.set("INPUT_DEPLOY_COMMANDS", commands.join("\n"));
    
    assertEquals(await runDeploymentCommands({ input: givenPluginInput, exec }), true);
  });

  it("should return false, given a deploy command fails", async () => {
    stub(exec, "run", async (args) => {
      return {
        exitCode: 1,
        stdout: "error",
        output: undefined
      }
    });

    const commands = [
      "echo 'hello world'",
      "echo 'hello world'",
      "echo 'hello world'"
    ];

    Deno.env.set("INPUT_DEPLOY_COMMANDS", commands.join("\n"));
    
    assertEquals(await runDeploymentCommands({ input: givenPluginInput, exec }), false);
  })

  it("should return true, given no deploy commands", async () => {    
    Deno.env.delete("INPUT_DEPLOY_COMMANDS");

    assertEquals(await runDeploymentCommands({ input: givenPluginInput, exec }), true);
  })
});