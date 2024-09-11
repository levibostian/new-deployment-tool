import { assertEquals } from "jsr:@std/assert@1";
import { afterEach, describe, it } from "jsr:@std/testing@1/bdd";
import { restore, stub } from "jsr:@std/testing@1/mock";
import { GitHubApiImpl } from "../github-api.ts";
import { GetCommitsSinceLatestReleaseStepImpl } from "./get-commits-since-latest-release.ts";
import { GitHubReleaseFake } from "../github-api.test.ts";

describe("getAllCommitsSinceGivenCommit", () => {
  afterEach(() => {
    restore();
  });

  it("given no commits, expect empty array", async () => {
    stub(GitHubApiImpl, "getCommitsForBranch", async (args) => {
      args.processCommits([]);
    });

    assertEquals(
      await new GetCommitsSinceLatestReleaseStepImpl(GitHubApiImpl)
        .getAllCommitsSinceGivenCommit({
          owner: "owner",
          repo: "repo",
          branch: "branch",
          latestRelease: GitHubReleaseFake,
        }),
      [],
    );
  });

  it("given multiple pages of commits, expect get expected set of commits", async () => {
    const givenLastTagSha = "sha-E";

    stub(GitHubApiImpl, "getCommitsForBranch", async (args) => {
      let returnResult = await args.processCommits([
        { sha: "sha-A", message: "", date: new Date(6) },
        { sha: "sha-B", message: "", date: new Date(5) },
        { sha: "sha-C", message: "", date: new Date(4) },
      ]);

      assertEquals(returnResult, true); // expect continue paging

      returnResult = await args.processCommits([
        { sha: "sha-D", message: "", date: new Date(3) },
        { sha: "sha-E", message: "", date: new Date(2) },
        { sha: "sha-F", message: "", date: new Date(1) },
      ]);

      assertEquals(returnResult, false); // Since we return the last tag sha, we expect to stop paging.
    });

    assertEquals(
      await new GetCommitsSinceLatestReleaseStepImpl(GitHubApiImpl)
        .getAllCommitsSinceGivenCommit({
          owner: "owner",
          repo: "repo",
          branch: "branch",
          latestRelease: {
            ...GitHubReleaseFake,
            tag: { name: "", commit: { sha: givenLastTagSha } },
          },
        }),
      [
        { sha: "sha-A", message: "", date: new Date(6) },
        { sha: "sha-B", message: "", date: new Date(5) },
        { sha: "sha-C", message: "", date: new Date(4) },
        { sha: "sha-D", message: "", date: new Date(3) },
      ],
    );
  });
});
