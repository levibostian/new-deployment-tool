import { Exec } from "../exec.ts";
import { GitHubCommit } from "../github-api.ts";
import * as log from "../log.ts";
import { DeployCommandInput } from "./types/deploy.ts";
import { Git } from "../git.ts";

/**
 * Run the deployment commands that the user has provided in the github action workflow yaml file.
 *
 * This is the opportunity for the user to run any commands they need to deploy their project.
 * The main parts of this step:
 * 1. Run the commands the user has provided. Exit early if any fail.
 * 2. Provide data to the command and parse data that the command sends back to us.
 * 3. Add any files that the user has specified to git. We add and create a commit for them.
 * User may need to modify metadata of their project before deploying. Creating a git commit may be required to do that.
 * The tool performs all of the git operations (add, commit, push) for the user. Why?...
 * 1. The tool needs to have control over the git commit created so it can create the git tag pointing to that commit.
 * 2. Convenience for the user. No need for them to run all of these commands themselves. Including setting the author. They may forget something.
 * 3. If the user is running multiple commands for deployment, there is a chance that multiple commands create commits. That just makes this tool more complex.
 */
export interface DeployStep {
  runDeploymentCommands({ dryRun, input }: {
    dryRun: boolean;
    input: DeployCommandInput;
  }): Promise<GitHubCommit | null>;
}

export class DeployStepImpl implements DeployStep {
  constructor(private exec: Exec, private git: Git) {}

  async runDeploymentCommands({ dryRun, input }: {
    dryRun: boolean;
    input: DeployCommandInput;
  }): Promise<GitHubCommit | null> {
    log.notice(`🚀 Deploying the new version, ${input.nextVersionName}...`);

    // You can provide a list of commands in the github action workflow yaml file where the separator is a new line.
    // with:
    //   deploy_commands: |
    //     echo 'hello world'
    //     echo 'hello world'
    const deployCommands = Deno.env.get("INPUT_DEPLOY_COMMANDS")?.split("\n") ??
      [];
    for (const command of deployCommands) {
      log.message(`Running deployment command: ${command}...`);

      const { exitCode, output } = await this.exec.run({ command, input });

      if (exitCode !== 0) {
        log.error(
          `Deploy command, ${command}, failed with error code ${exitCode}.`,
        );
        log.error(
          `I will stop the deployment process now. Review the logs to see if this is an issue you need to fix before you retry the deployment again. Otherwise, simply retry running the deployment again later.`,
        );

        throw new Error(
          `Deploy command, ${command}, failed with error code ${exitCode}.`,
        );
      }

      for (const file of output?.filesToCommit ?? []) {
        log.message(`Adding file to git: ${file}`);
        await this.git.add({ exec: this.exec, filePath: file });
      }
    }

    const gitCommitCreated = await this.git.commit({
      exec: this.exec,
      message: `Deploy version ${input.nextVersionName}`,
      dryRun,
    });
    await this.git.push({
      exec: this.exec,
      branch: input.gitCurrentBranch,
      dryRun,
    });

    return gitCommitCreated;
  }
}
