import { getLastGitHubRelease } from "./github.ts";
import * as git from "./git.ts";

const currentBranch = await git.getCurrentBranchName();

console.log(`current git branch ${currentBranch}`)

// example value for GITHUB_REPOSITORY: "denoland/deno"
const [owner, repo] = Deno.env.get("GITHUB_REPOSITORY")!.split("/"); 

console.log(await getLastGitHubRelease(owner, repo, currentBranch))

