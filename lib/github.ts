import { GitHubApi, GitHubCommit, GitHubRelease } from "./github-api.ts";

// Given a branch, find the latest release for that branch.
export const getLatestReleaseForBranch = async (
  { api, owner, repo, branch }: {
    api: GitHubApi;
    owner: string;
    repo: string;
    branch: string;
  },
): Promise<GitHubRelease | null> => {
  // the goal of this function is to find the latest release for a given branch. 
  // the github api does not provide an easy way to do this. you must get releases and commits separately and then compare them.
  //
  // both of these endpoints have paging and we also want to minimize the number of requests we make to github for rate limiting. 
  // 
  // the strategy here is a mix between performance and simplicity for maintenance of the code. 
  // First, get all releases for the repo. Even if we don't need to view them all, get them all otherwise we may need to implement some complex caching strategy. 
  // Next, page through commits for a branch and compare to all releases. 
  // We are assuming there are less releases than commits, which is what makes this performant. 

  let latestRelease: GitHubRelease | null = null;

  let githubReleases: GitHubRelease[] = [];

  await api.getTagsWithGitHubReleases({
    owner,
    repo,
    processReleases: async(releases) => {
      githubReleases = githubReleases.concat(releases);
      return true; // continue paging
    }
  });
  
  await api.getCommitsForBranch({
    owner,
    repo,
    branch,
    processCommits: async (commits) => {
      for (const githubRelease of githubReleases) {
        for (const commit of commits) {
          if (githubRelease.tag.commit.sha === commit.sha && !latestRelease) {
            latestRelease = githubRelease;
          }
        }
      }

      const getNextPage = latestRelease === null;

      return getNextPage
    }
  })

  return latestRelease;
};

export const getAllCommitsSinceGivenCommit = async({ api, owner, repo, branch, lastTagSha }: { api: GitHubApi, owner: string; repo: string; branch: string, lastTagSha: string | undefined }): Promise<GitHubCommit[]> => {
  let returnResult: GitHubCommit[] = [];

  await api.getCommitsForBranch({ owner, repo, branch, processCommits: async (commits) => {
    for (const commit of commits) {
      // We do not want to include the last tag commit in the list of commits. This may result in making a release from this commit which we do not want.
      if (commit.sha === lastTagSha) {
        return false; // stop paging when we reach the last tag commit
      }

      returnResult.push(commit)
    }

    return true // continue paging    
  }});
  
  // sort commits by date. first commit is the newest one
  returnResult.sort((a, b) => b.date.getTime() - a.date.getTime());

  return returnResult;
}

export const createGitHubRelease = async (
  { api, owner, repo, tagName, commit }: {
    api: GitHubApi;
    owner: string;
    repo: string;
    tagName: string;
    commit: GitHubCommit;
  },
) => {
  await api.createGitHubRelease({ owner, repo, tagName, commit });
};
