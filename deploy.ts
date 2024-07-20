import { getLastGitHubRelease } from "./lib/github.ts";
import * as git from "./lib/git.ts";

const currentBranch = await git.getCurrentBranchName();

console.log(`current git branch ${currentBranch}`)

// example value for GITHUB_REPOSITORY: "denoland/deno"
const [owner, repo] = Deno.env.get("GITHUB_REPOSITORY")!.split("/"); 

const lastRelease = await getLastGitHubRelease({ owner, repo, branch: currentBranch });

if (lastRelease === null) {
  console.log(`No releases found for branch ${currentBranch}`);
  Deno.exit(1);
}

console.log(`Last release: ${lastRelease.tagName}`);