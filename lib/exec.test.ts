import { exec } from "./exec.ts";
import { DeployCommandInput } from "./steps/step-input-types/deploy.ts";
import {
  assertEquals,
} from "jsr:@std/assert@1";

Deno.test("given contextual input data, expect the executed command receives the input data", async () => {
  const givenPluginInput: DeployCommandInput = {
    gitCurrentBranch: "main",
    gitRepoOwner: "owner",
    gitRepoName: "repo",
    gitCommitsSinceLastRelease: [],
    nextVersionName: "1.0.0",
    isDryRun: false,
  }
  
  const { exitCode, stdout } = await exec.run(`python3 -c "import os; print(open(os.getenv('DATA_FILE_PATH'), 'r').read());"`, givenPluginInput);

  assertEquals(exitCode, 0);
  assertEquals(stdout, JSON.stringify(givenPluginInput));
})