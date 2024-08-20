import {
  assertEquals,
} from "jsr:@std/assert@1";
import { afterEach, beforeEach, describe, it } from "jsr:@std/testing@1/bdd";
import { GitHubApiImpl, GitHubCommit, GitHubRelease } from "./github-api.ts";

/**
 * The tests in this file are meant to be like a playground and not true automated tests. 
 * These functions are setup so you can quickly call functions against real github repositories. Great during development. 
 * 
 * The tests will run as long as the environment variable INPUT_GITHUB_TOKEN is set.
 */

const assertTokenSet = (): boolean => {
  try { // because we may not have permission to access environment variables, wrap in try/catch to make CI config setup easier. 
    if (!Deno.env.get("INPUT_GITHUB_TOKEN")) {
      console.log("GitHub token not set (environment variable INPUT_GITHUB_TOKEN). Going to skip running test.")
      return false 
    } else {
      return true 
    }
  } catch {
    return false 
  }
}

describe("getTagsWithGitHubReleases", () => {
  it("should return sorted list of tags that are also releases", async () => {
    if (!assertTokenSet()) return 

    let allReleases: GitHubRelease[] = []

    await GitHubApiImpl.getTagsWithGitHubReleases({
      owner: "swiftlang",
      repo: "swift",
      processReleases: async(releases) => {
        allReleases = allReleases.concat(releases)
        return true // continue paging 
      },
      numberOfResults: 10 // test that paging works. Expect to receive the combined result of all pages. 
    })

    for (const release of allReleases) {
      console.log("Expect to see list of releases, not list of tags. Expect to be sorted")
      console.log(`GitHub release: ${JSON.stringify(release, null, 2)}`)
    }
  });
})

describe("getCommitsForBranch", () => {
  it("should return sorted list of commits", async () => {
    if (!assertTokenSet()) return 

    let allCommits: GitHubCommit[] = []

    await GitHubApiImpl.getCommitsForBranch({
      owner: "levibostian",
      repo: "Wendy-iOS",
      branch: "main",
      processCommits: async(commits) => {
        allCommits = allCommits.concat(commits)
        return true // continue paging 
      }
    })

    console.log("Expect to see list of commits. Expect to be sorted")
    console.log(`number of commits: ${allCommits.length}`)
    for (const commit of allCommits) {
      console.log(`GitHub commit: ${JSON.stringify(commit, null, 2)}`)
    }
  });
})
