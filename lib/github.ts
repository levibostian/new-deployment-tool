import * as githubApi from './github-api.ts'

// Given a branch, find the latest release for that branch. 
export const getLatestReleaseForBranch = async ({ owner, repo, branch }: { owner: string; repo: string; branch: string }) => {
  return await githubApi.getCommitsForBranch({owner, repo, branch, processCommits: async(commits) => {
    // Given a page of commits, we want to find the latest commit that has a tag associated with it and also a github release for that tag. 

    for (const commit of commits) {
      const releaseForTag = await githubApi.getTagsWithGitHubReleases({owner, repo, processReleases: (githubReleases) => {
        return githubReleases.find(release => release.tag.commit.sha === commit.sha) || null;
      }});

      if (releaseForTag) { // found a release for the commit. This is the latest release for the branch.
        return releaseForTag
      }
    }
  }});
}

export const getAllCommitsSinceGivenCommit = async ({ owner, repo, branch, lastTagSha }: { owner: string; repo: string; branch: string; lastTagSha: string | undefined }) => {
  const allCommits: githubApi.GitHubCommit[] = [];

  await githubApi.getCommitsForBranch({owner, repo, branch, processCommits: (commits) => {
    for (const commit of commits) {
      if (commit.sha === lastTagSha) {
        return allCommits;
      } 

      allCommits.push(commit);
    }
    
    return null // continue paging 
  }});

  return allCommits;
}

export const createGitHubRelease = async ({ owner, repo, tagName, commit }: { owner: string; repo: string; tagName: string; commit: githubApi.GitHubCommit }) => {
  await githubApi.createGitHubRelease({owner, repo, tagName, commit})
}

