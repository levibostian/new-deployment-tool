import { DetermineNextReleaseStepConfig } from "./steps/determine-next-release.ts";

export interface GitHubActions {
  getDetermineNextReleaseStepConfig(): DetermineNextReleaseStepConfig | undefined;
}

export class GitHubActionsImpl implements GitHubActions {
  getDetermineNextReleaseStepConfig(): DetermineNextReleaseStepConfig | undefined {
    const githubActionInputKey = "analyze_commits_config";

    const determineNextReleaseStepConfig = Deno.env.get(`INPUT_${githubActionInputKey.toUpperCase()}`);
    if (!determineNextReleaseStepConfig) {
      return undefined;
    }

    try {
      // Because every property in the config is optional, if JSON.parse results in an object that is not a DetermineNextReleaseStepConfig, it's ok.
      return JSON.parse(determineNextReleaseStepConfig);
    } catch (error) {
      throw new Error(`When trying to parse the GitHub Actions input value for ${githubActionInputKey}, I encountered an error: ${error}`);
    }
  }
}