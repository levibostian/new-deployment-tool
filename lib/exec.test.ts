import { exec } from "./exec.ts";
import { DeployCommandInput } from "./steps/types/deploy.ts";
import {
  assertEquals,
} from "jsr:@std/assert@1";

const givenPluginInput: DeployCommandInput = {
  gitCurrentBranch: "main",
  gitRepoOwner: "owner",
  gitRepoName: "repo",
  gitCommitsSinceLastRelease: [],
  nextVersionName: "1.0.0",
  isDryRun: false,
}

Deno.test("given contextual input data, expect the executed command receives the input data", async () => { 
  const { exitCode, stdout } = await exec.run(`python3 -c "import os; print(open(os.getenv('DATA_FILE_PATH'), 'r').read());"`, givenPluginInput);

  assertEquals(exitCode, 0);
  assertEquals(stdout, JSON.stringify(givenPluginInput));
})

Deno.test("given command forgets or has a bug with outputting the data file, expect to get undefined for the output", async () => {
  const { output } = await exec.run(`echo 'foo'`, givenPluginInput);
  
  assertEquals(output, undefined);
})

Deno.test("given command writes output data to file, expect to get that data back", async () => {
  const { output } = await exec.run(`python3 -c 'import json, os; json.dump({"filesToCommit": ["foo.txt"]}, open(os.getenv("DATA_FILE_PATH"), "w"));'`, givenPluginInput);
  
  assertEquals(output, {
    filesToCommit: ["foo.txt"]
  });
})