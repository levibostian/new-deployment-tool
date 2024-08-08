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
  let latestRelease: GitHubRelease | null = null;

  await api.getCommitsForBranch({
    owner,
    repo,
    branch,
    processCommits: async (commits) => {
      // Given a page of commits, we want to find the latest commit that has a tag associated with it and also a github release for that tag.

      console.log(`page of commits: ${JSON.stringify(commits)}`);

      for (const commit of commits) { 
        const releaseForTag = await api.getTagsWithGitHubReleases({
          owner,
          repo,
          processReleases: (githubReleases) => {            
            console.log(`githubReleases: ${JSON.stringify(githubReleases)}`);
            
            for (const release of githubReleases) {
              if (release.tag.commit.sha === commit.sha) {
                latestRelease = release;
              }
            }

            return latestRelease; 
          },
        });

        if (releaseForTag) { // found a release for the commit. This is the latest release for the branch.
          latestRelease = releaseForTag;
        }
      }

      const getNextPageOfCommits = latestRelease == null; // continue paging if we haven't found the latest release yet.

      console.log(`getNextPageOfCommits: ${getNextPageOfCommits}`);

      return getNextPageOfCommits;
    },
  });

  return latestRelease;
};

export const createGitHubRelease = async ({ api, owner, repo, tagName, commit }: { api: GitHubApi; owner: string; repo: string; tagName: string; commit: GitHubCommit }) => {
  await api.createGitHubRelease({owner, repo, tagName, commit})
}

