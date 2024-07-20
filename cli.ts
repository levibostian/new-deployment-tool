import { getLastGitHubRelease } from "./github.ts";

console.log(await getLastGitHubRelease("levibostian", "wendy-ios", "latest"))

