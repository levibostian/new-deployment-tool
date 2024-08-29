import {
  assertEquals,
} from "jsr:@std/assert@1";
import { afterEach, describe, it } from "jsr:@std/testing@1/bdd";
import {
  restore,
  stub,
} from "jsr:@std/testing@1/mock";
import { GitHubApiImpl } from "./github-api.ts";
import { getLatestReleaseForBranch, getAllCommitsSinceGivenCommit } from "./github.ts";

describe("getLatestReleaseForBranch", () => {
  afterEach(() => {
    restore();
  });

  it("should return null, given no commits for branch", async () => {
    stub(GitHubApiImpl, "getTagsWithGitHubReleases", (args) => {
      args.processReleases([])
      return Promise.resolve()
    })

    stub(GitHubApiImpl, "getCommitsForBranch", (args) => {
      args.processCommits([]);
      return Promise.resolve();
    });

    assertEquals(
      await getLatestReleaseForBranch({
        api: GitHubApiImpl,
        owner: "owner",
        repo: "repo",
        branch: "branch",
      }),
      null,
    );
  });

  it("should return null, given no github releases", async () => {
    stub(GitHubApiImpl, "getCommitsForBranch", (args) => {
      args.processCommits([{ sha: "sha", message: "", date: new Date() }]);
      return Promise.resolve();
    });

    stub(GitHubApiImpl, "getTagsWithGitHubReleases", (args) => {
      args.processReleases([]);
      return Promise.resolve();
    });

    assertEquals(
      await getLatestReleaseForBranch({
        api: GitHubApiImpl,
        owner: "owner",
        repo: "repo",
        branch: "branch",
      }),
      null,
    );
  });

  it("should return null, given no matching github release for branch", async () => {
    // Test with multiple pages of commits to test it works as expected.
    let getCommitsReturnResults = [
      [{ sha: "commit-A", message: "", date: new Date() }],
      [{ sha: "commit-B", message: "", date: new Date() }]
    ];

    stub(
      GitHubApiImpl,
      "getTagsWithGitHubReleases",
      async (args) => {
        args.processReleases([{
          tag: { name: "", commit: { sha: "commit-C" } },
          name: "",
          created_at: new Date(),
        }]);
      },
    );


    stub(GitHubApiImpl, "getCommitsForBranch", async (args) => {
      // Keep looping until "false" is returned from processCommits to indicate that we do not want to process more pages of commits.
      while (true) {
        const shouldGetAnotherPage = await args.processCommits(
          getCommitsReturnResults.shift()!,
        );

        // Since we never found a matching release for the commits, we should expect to get another page of commits.
        assertEquals(shouldGetAnotherPage, true);

        // Expect to not need to get another page of commits if we have found the latest release.
        if (getCommitsReturnResults.length === 0) {
          break;
        }
      }

      return Promise.resolve();
    });

    assertEquals(
      await getLatestReleaseForBranch({
        api: GitHubApiImpl,
        owner: "owner",
        repo: "repo",
        branch: "branch",
      }),
      null,
    );
  });

  it("should return the latest release, given a matching github release for branch", async () => {
    // Test with multiple pages of commits to test it works as expected.
    // Also, have multiple commits with matching tags. Make sure that even if there are multiple matches, we return the *newest* tag. 
    let getCommitsReturnResults = [
      [
        { sha: "commit-4", message: "", date: new Date(4) }, // The first page of results we don't want a matching tag to test that the code asks for another page. 
        { sha: "commit-3", message: "", date: new Date(3) } 
      ],
      [
        { sha: "commit-2", message: "", date: new Date(2) },// This commit has a matching tag. 
        { sha: "commit-1", message: "", date: new Date(1) } // this commit has a matching tag
      ],
    ];

    stub(
      GitHubApiImpl,
      "getTagsWithGitHubReleases",
      async (args) => {
        args.processReleases([
          {
            tag: { name: "", commit: { sha: "commit-2" } },
            name: "",
            created_at: new Date(2),
          },
          {
            tag: { name: "", commit: { sha: "commit-1" } },
            name: "",
            created_at: new Date(1),
          },
        ]);
      },
    );

    stub(GitHubApiImpl, "getCommitsForBranch", async (args) => {
      // Keep looping until "false" is returned from processCommits to indicate that we do not want to process more pages of commits.
      while (true) {
        const shouldGetAnotherPage = await args.processCommits(
          getCommitsReturnResults.shift()!,
        );

        // Expect to not need to get another page of commits if we have found the latest release.
        if (getCommitsReturnResults.length === 0) {
          assertEquals(shouldGetAnotherPage, false);
        } else {
          assertEquals(shouldGetAnotherPage, true);
        }

        if (!shouldGetAnotherPage) {
          break;
        }
      }

      return Promise.resolve();
    });

    assertEquals(
      await getLatestReleaseForBranch({
        api: GitHubApiImpl,
        owner: "owner",
        repo: "repo",
        branch: "branch",
      }),
      {
        tag: { name: "", commit: { sha: "commit-2" } },
        name: "",
        created_at: new Date(2), 
      },
    );
  });
});

describe("getAllCommitsSinceGivenCommit", () => {
  afterEach(() => {
    restore();
  });

  it("given no commits, expect empty array", async() => {
    stub(GitHubApiImpl, "getCommitsForBranch", async (args) => {
      args.processCommits([]);
    })

    assertEquals(
      await getAllCommitsSinceGivenCommit({
        api: GitHubApiImpl,
        owner: "owner",
        repo: "repo",
        branch: "branch",
        lastTagSha: "sha",
      }),
      [],
    );
  })

  it("given multiple pages of commits, expect get expected set of commits", async() => {
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
    })

    assertEquals(
      await getAllCommitsSinceGivenCommit({
        api: GitHubApiImpl,
        owner: "owner",
        repo: "repo",
        branch: "branch",
        lastTagSha: givenLastTagSha,
      }),
      [
        { sha: "sha-A", message: "", date: new Date(6) },
        { sha: "sha-B", message: "", date: new Date(5) },
        { sha: "sha-C", message: "", date: new Date(4) },
        { sha: "sha-D", message: "", date: new Date(3) },
      ],
    );
  })
})
