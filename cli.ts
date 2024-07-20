import { getLastGitHubRelease } from "./github.ts";
import * as git from "./git.ts";

console.log(`current git branch ${await git.getCurrentBranchName()}`)

console.log(await getLastGitHubRelease("levibostian", "wendy-ios", "latest"))

