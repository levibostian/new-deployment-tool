import { getLastGitHubRelease, getAllCommitsSinceGivenCommit, createGitHubRelease } from "./lib/github.ts";
import * as git from "./lib/git.ts";
import {getNextReleaseVersion} from './analyze-commits.ts'
import * as log from "./lib/log.ts";

log.notice(`Welcome to new-deployment-tool! 🚀`);
log.message(`This tool will help you to deploy your project. To learn how it works, read all of the logs that I will print out for you.`);
log.message(`If you want more information besides the logs, you can optionally view the documentation to learn more about the tool: https://github.com/levibostian/new-deployment-tool/`)
log.message(`Ok, let's get started!`)
log.message(`--------------------------------`)

const currentBranch = await git.getCurrentBranchName();
log.debug(`name of current git branch: ${currentBranch}`);

// example value for GITHUB_REPOSITORY: "denoland/deno"
const githubRepositoryFromEnvironment = Deno.env.get("GITHUB_REPOSITORY")!;
const [owner, repo] = githubRepositoryFromEnvironment.split("/");
log.debug(`github repository executing in: ${githubRepositoryFromEnvironment}. owner: ${owner}, repo: ${repo}`);

log.notice(`Looking for the last release that was created on the current git branch: ${currentBranch}...`);
const lastRelease = await getLastGitHubRelease({ owner, repo, branch: currentBranch });
log.debug(`Last release found on github releases: ${lastRelease}`);

if (lastRelease === null) {
  log.message(`Looks like the branch ${currentBranch} has never been released before. This might be the first release!`);
} else {
  log.message(`Looks like the last release on the branch ${currentBranch} was: ${lastRelease.tagName}`);
}

log.notice(`Retrieving all git commits that have been created since the last release...`);
const listOfCommits = await getAllCommitsSinceGivenCommit({ owner, repo, branch: currentBranch, lastTagSha: lastRelease?.commitSha });
if (listOfCommits.length === 0) {
  log.warning(`No commits have been created since the last release. This means that there is no new code to deploy. I'll quit now.`);
  Deno.exit(0);  
}
const newestCommit = listOfCommits[0];
log.debug(`Newest commit found: ${newestCommit}`);
log.debug(`Oldest commit found: ${listOfCommits[listOfCommits.length - 1]}`);

log.notice(`Analyzing each commit one-by-one to determine the next release version...`);
const nextReleaseVersion = await getNextReleaseVersion({ commits: listOfCommits, lastReleaseVersion: lastRelease?.tagName });

if (nextReleaseVersion === undefined) {
  log.warning(`After analyzing all commits, no version bump is required. This means that there is no new code to deploy. I'll quit now.`);  
  Deno.exit(0);
}
log.message(`After analyzing all commits, I have determined the next release version will be: ${nextReleaseVersion}`);

log.notice(`Creating a new release on GitHub for the new version...`);
await createGitHubRelease({ owner, repo, tagName: nextReleaseVersion, commit: newestCommit });