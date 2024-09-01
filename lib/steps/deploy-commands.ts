import { Exec } from "../exec.ts";
import * as log from "../log.ts";
import { DeployCommandInput } from "./types/deploy.ts";

export const runDeploymentCommands = async({input, exec}: {
  input: DeployCommandInput;
  exec: Exec
}): Promise<boolean> => {
  log.notice(`🚀 Deploying the new version, ${input.nextVersionName}...`);

  // You can provide a list of commands in the github action workflow yaml file where the separator is a new line.
  // with:
  //   deploy_commands: |
  //     echo 'hello world'
  //     echo 'hello world'
  const deployCommands = Deno.env.get("INPUT_DEPLOY_COMMANDS")?.split("\n") ?? [];
  for (const command of deployCommands) {
    log.message(`Running deployment command: ${command}...`);

    const { exitCode } = await exec.run(command, input);

    if (exitCode !== 0) {
      log.error(`Deploy command, ${command}, failed with error code ${exitCode}.`);
      log.error(`I will stop the deployment process now. Review the logs to see if this is an issue you need to fix before you retry the deployment again. Otherwise, simply retry running the deployment again later.`);
      return false;
    }
  }

  return true 
}