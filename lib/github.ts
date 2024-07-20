

export const getLatestTagForBranch = async ({ owner, repo, branch }: { owner: string; repo: string; branch: string }) => {
  const releases: [
    { 
      draft: boolean,
      target_commitish: string,
      tag_name: string
    }
  ] = await githubApiRequest(`/repos/${owner}/${repo}/releases`);
  
  const nonDraftReleases = releases.filter(release => !release.draft);
  const branchReleases = nonDraftReleases.filter(release => release.target_commitish === branch);
  
  if (branchReleases.length === 0) {
    return null;
  }
  
  return branchReleases[0].tag_name;
}

export const getLastGitHubRelease = async ({ owner, repo, branch }: { owner: string; repo: string; branch: string }) => {
  const tagName = await getLatestTagForBranch({ owner, repo, branch });

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
