import { run } from "./deploy.ts";
import { GitHubApiImpl } from "./lib/github-api.ts";
import { CreateNewReleaseStepImpl } from "./lib/steps/create-new-release.ts";
import { DetermineNextReleaseStepImpl } from "./lib/steps/determine-next-release.ts";
import { GetCommitsSinceLatestReleaseStepImpl } from "./lib/steps/get-commits-since-latest-release.ts";
import { GetLatestReleaseStepImpl } from "./lib/steps/get-latest-release.ts";

/*
This file is the entrypoint for running the tool.
This file has no automated tests written for it. Keep the size of this file small with no logic.
*/

const githubApi = GitHubApiImpl;

await run({
  getLatestReleaseStep: new GetLatestReleaseStepImpl(githubApi),
  getCommitsSinceLatestReleaseStep: new GetCommitsSinceLatestReleaseStepImpl(githubApi),
  determineNextReleaseStep: new DetermineNextReleaseStepImpl(),
  createNewReleaseStep: new CreateNewReleaseStepImpl(githubApi),
});
