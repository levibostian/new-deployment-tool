import { GitHubCommit } from "../../github-api.ts";

export interface DeployCommandInput {  
  gitCurrentBranch: string;
  gitRepoOwner: string;
  gitRepoName: string;
  gitCommitsSinceLastRelease: GitHubCommit[];
  nextVersionName: string;
  isDryRun: boolean;
}