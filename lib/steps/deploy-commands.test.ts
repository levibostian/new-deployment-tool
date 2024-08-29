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

describe("deployCommands", () => {
  afterEach(() => {
    restore();
  });

  it("given list of deploy commands, expect to execute them all", async () => {
    stub(exec, "run", async (args) => {
      return 0
    });

    const commands = [
      "echo 'hello world'",
      "echo 'hello world'",
      "echo 'hello world'"
    ];

    Deno.env.set("INPUT_DEPLOY_COMMANDS", commands.join("\n"));
    
    assertEquals(await runDeploymentCommands({ nextReleaseVersion: "1.0.0", exec }), true);
  });
});