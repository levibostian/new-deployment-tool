import {
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from "jsr:@std/assert@1";
import { afterEach, beforeEach, describe, it } from "jsr:@std/testing@1/bdd";
import { mockSession, resolvesNext, restore, stub, Stub } from "jsr:@std/testing@1/mock";
import { GitHubApi, GitHubApiImpl } from "./github-api.ts";
import { getLatestReleaseForBranch } from "./github.ts";

//let session: () => void;

describe("getLatestReleaseForBranch", () => {
   afterEach(() => {
    restore()
//     //session();
   });

  it("should return null, given no commits for branch", async () => {
    //session = mockSession(async () => {
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

      //restore()
    //});

    //session()
  });

  it("should return null, given no github releases", async () => {
    //session = mockSession(async () => {
      stub(GitHubApiImpl, "getCommitsForBranch", (args) => {
        args.processCommits([{ sha: "sha", commit: { message: "" } }]);
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

      //restore()
    //});

    //session()
  });

  it("should return null, given no matching github release for branch", async () => {
    //session = mockSession(async () => {
      let getCommitsReturnResults = [
        [{ sha: "commit-A", commit: { message: "" } }],
        [{ sha: "commit-B", commit: { message: "" } }],
      ];

      let getReleasesStub: Stub | undefined; 

      stub(GitHubApiImpl, "getCommitsForBranch", async(args) => {
        // Keep looping until "false" is returned from processCommits to indicate that we do not want to process more pages of commits.
        while (true) {
          getReleasesStub?.restore()
          getReleasesStub = stub(GitHubApiImpl, "getTagsWithGitHubReleases", async(args) => {
            return args.processReleases([{ tag: { name: "", commit: { sha: "commit-C" }}, name: "", created_at: "" }]);
          });

          const shouldGetAnotherPage = await args.processCommits(getCommitsReturnResults.shift()!)

          // Since we never found a matching release for the commits, we should expect to get another page of commits.
          assertEquals(shouldGetAnotherPage, true);

          // Expect to not need to get another page of commits if we have found the latest release.
          if (getCommitsReturnResults.length === 0) {
            break
          }
        }

        return Promise.resolve()
      })
      
      assertEquals(
        await getLatestReleaseForBranch({
          api: GitHubApiImpl,
          owner: "owner",
          repo: "repo",
          branch: "branch",
        }),        
        null,
      );

      //restore()
    //});

    //session()
  });

  it("should return the latest release, given a matching github release for branch", async () => {
    //session = mockSession(async () => {
      // Test with multiple pages of commits to test it works as expected.

      let getCommitsReturnResults = [
        [{ sha: "commit-A", commit: { message: "" } }],
        [{ sha: "commit-B", commit: { message: "" } }],
      ];

      let getReleasesStub: Stub | undefined; 

      stub(GitHubApiImpl, "getCommitsForBranch", async(args) => {
        // Keep looping until "false" is returned from processCommits to indicate that we do not want to process more pages of commits.
        while (true) {
          getReleasesStub?.restore();
          getReleasesStub = stub(GitHubApiImpl, "getTagsWithGitHubReleases", async(args) => {
            return args.processReleases([{ tag: { name: "", commit: { sha: "commit-B" }}, name: "", created_at: "" }]);
          });

          const shouldGetAnotherPage = await args.processCommits(getCommitsReturnResults.shift()!)

          // Expect to not need to get another page of commits if we have found the latest release.
          if (getCommitsReturnResults.length === 0) {
            assertEquals(shouldGetAnotherPage, false);
          } else {
            assertEquals(shouldGetAnotherPage, true);
          }

          if (!shouldGetAnotherPage) {            
            break 
          }
        }

        return Promise.resolve()
      })
      
      assertEquals(
        await getLatestReleaseForBranch({
          api: GitHubApiImpl,
          owner: "owner",
          repo: "repo",
          branch: "branch",
        }),        
        { tag: { name: "", commit: { sha: "commit-B" }}, name: "", created_at: "" },
      );

      //restore()
//    });

  //  session()
  })
});
