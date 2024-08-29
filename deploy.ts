import {
  createGitHubRelease,
  getAllCommitsSinceGivenCommit,
  getLatestReleaseForBranch,
} from "./lib/github.ts";
import { getNextReleaseVersion } from "./analyze-commits.ts";
import * as log from "./lib/log.ts";
import { GitHubApiImpl, GitHubApi } from "./lib/github-api.ts";
import { exec } from "./lib/exec.ts";
import { runDeploymentCommands } from "./lib/steps/deploy-commands.ts";

log.notice(`Welcome to new-deployment-tool! 🚀`);
log.message(
  `This tool will help you to deploy your project. To learn how it works, read all of the logs that I will print out for you.`,
);
log.message(
  `If you want more information besides the logs, you can optionally view the documentation to learn more about the tool: https://github.com/levibostian/new-deployment-tool/`,
);
log.message(`Ok, let's get started!`);
log.message(`--------------------------------`);

const githubRef = Deno.env.get("GITHUB_REF")!;
log.debug(`GITHUB_REF: ${githubRef}`);
const currentBranch = githubRef.replace("refs/heads/", "");
log.debug(`name of current git branch: ${currentBranch}`);
const isDryRunMode = Deno.env.get("DRY_RUN") === "true"; 
if (isDryRunMode) {
  log.warning(
    `Dry run mode is enabled. This means that I will not actually deploy anything. I will only print out what I would do if I were to deploy.`,
  );
}

// example value for GITHUB_REPOSITORY: "denoland/deno"
const githubRepositoryFromEnvironment = Deno.env.get("GITHUB_REPOSITORY")!;
const [owner, repo] = githubRepositoryFromEnvironment.split("/");
log.debug(
  `github repository executing in: ${githubRepositoryFromEnvironment}. owner: ${owner}, repo: ${repo}`,
);

log.notice(
  `🔍 Looking for the last release that was created on the current git branch: ${currentBranch}...`,
);

const api: GitHubApi = GitHubApiImpl

const lastRelease = await getLatestReleaseForBranch({
  api,
  owner,
  repo,
  branch: currentBranch,
});
log.debug(`Last release found on github releases: ${lastRelease?.tag.name}`);

if (!lastRelease) {
  log.message(
    `Looks like the branch ${currentBranch} has never been released before. This might be the first release!`,
  );
} else {
  log.message(
    `Looks like the last release on the branch ${currentBranch} was: ${lastRelease.tag.name}`,
  );
}

log.notice(
  `📜 Retrieving all git commits that have been created since the last release...`,
);
const listOfCommits = await getAllCommitsSinceGivenCommit({
  api,
  owner,
  repo,
  branch: currentBranch,
  lastTagSha: lastRelease?.tag.commit.sha,
});
if (listOfCommits.length === 0) {
  log.warning(
    `No commits have been created since the last release. This means that there is no new code to deploy. I'll quit now.`,
  );
  Deno.exit(0);
}
const newestCommit = listOfCommits[0];
log.debug(`Newest commit found: ${JSON.stringify(newestCommit)}`);
log.debug(
  `Oldest commit found: ${
    JSON.stringify(listOfCommits[listOfCommits.length - 1])
  }`,
);

log.notice(
  `📊 Analyzing each commit one-by-one to determine the next release version...`,
);
const nextReleaseVersion = await getNextReleaseVersion({
  commits: listOfCommits,
  lastReleaseVersion: lastRelease?.tag.name,
});

if (nextReleaseVersion === undefined) {
  log.warning(
    `After analyzing all commits, no version bump is required. This means that there is no new code to deploy. I'll quit now.`,
  );
  Deno.exit(0);
}
log.message(
  `After analyzing all commits, I have determined the next release version will be: ${nextReleaseVersion}`,
);

const didDeployCommandsSucceed = await runDeploymentCommands({nextReleaseVersion, exec});
if (!didDeployCommandsSucceed) {
  Deno.exit(1);
}

log.notice(`✏️ Creating a new release on GitHub for the new version, ${nextReleaseVersion}...`);
if (isDryRunMode) {
  log.warning(
    `Dry run mode is enabled. I would have created a new release on GitHub with the new version: ${nextReleaseVersion}`,
  );
  Deno.exit(0);
}
await createGitHubRelease({
  api,
  owner,
  repo,
  tagName: nextReleaseVersion,
  commit: newestCommit,
});

log.notice(`New release created on GitHub! 🎉 https://github.com/${owner}/${repo}/releases/${nextReleaseVersion}`);
