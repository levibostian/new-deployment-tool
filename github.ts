

export const getLatestTagForBranch = async (owner: string, repo: string, branch: string) => {
  const releases: [
    { 
      draft: boolean,  // if the release is a draft
      target_commitish: string, // the branch the release was created from
      tag_name: string // the name of the tag. Not the name of the release (which can be different)
    }
  ] = await githubApiRequest(`/repos/${owner}/${repo}/releases`)
  
    const nonDraftReleases = releases.filter(release => !release.draft);
    const branchReleases = nonDraftReleases.filter(release => release.target_commitish === branch);
  
    if (branchReleases.length === 0) {
      return null; // No releases found for the branch
    }
  
    // Assuming the releases are sorted in reverse chronological order
    // If not, you would need to sort them based on the `created_at` or `published_at` timestamp
    return branchReleases[0].tag_name;
  }

export const getLastGitHubRelease = async (owner: string, repo: string, branch: string) => {
  const tagName = await getLatestTagForBranch(owner, repo, branch);

  const response: {
    object: {
      sha: string;
    }    
  } = await githubApiRequest(`/repos/${owner}/${repo}/git/refs/tags/${tagName}`);

  const commitSha = response.object.sha;  

  return {
    tagName,
    commitSha  
  };
}

const githubApiRequest = async (path: string) => {
  const headers = {
    'Authorization': `Bearer ${Deno.env.get("GITHUB_TOKEN")}`
  };

  return await fetch(`https://api.github.com${path}`, { headers }).then(response => response.json());
}
