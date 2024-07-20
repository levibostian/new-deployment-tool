

export const getLatestTagForBranch = async ({ owner, repo, branch }: { owner: string; repo: string; branch: string }) => {
  const response = await githubApiRequest<{ 
    draft: boolean,
    target_commitish: string,
    tag_name: string
  }[]>(`https://api.github.com/repos/${owner}/${repo}/releases`);
  
  const releases = response.responseJsonBody.filter(release => !release.draft).filter(release => release.target_commitish === branch);
  
  if (releases.length === 0) {
    return null;
  }
  
  return releases[0].tag_name;
}

export const getLastGitHubRelease = async ({ owner, repo, branch }: { owner: string; repo: string; branch: string }) => {
  const tagName: string | null = await getLatestTagForBranch({ owner, repo, branch });

  if (tagName === null) {
    return null;
  }

  const response = await githubApiRequest<{
    object: {
      sha: string;
    }    
  }>(`https://api.github.com/repos/${owner}/${repo}/git/refs/tags/${tagName}`);

  const commitSha = response.responseJsonBody.object.sha;

  return {
    tagName,
    commitSha  
  };
}

export const getAllCommitsSinceGivenCommit = async({ owner, repo, branch, lastTagSha }: { owner: string; repo: string; branch: string, lastTagSha: string }) => {
  let commits: {
    sha: string,
    message: string, 
  }[] = [];  
  let hasNextPage = true;
  let url = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&since=${lastTagSha}`;

  while (hasNextPage) {        
    const response = await githubApiRequest<{
      sha: string,
      commit: {
        message: string
      }      
    }[]>(url);    

    for (const commit of response.responseJsonBody) {
      commits = commits.concat({
        sha: commit.sha,
        message: commit.commit.message
      });
    }    

    if (!response.nextPageUrl) {
      hasNextPage = false;
    } else {      
      url = response.nextPageUrl;
    }
  }

  return commits;
}

const githubApiRequest = async<T>(url: string): Promise<{ responseJsonBody: T, nextPageUrl: string | undefined }> => {
  const headers = {
    'Authorization': `Bearer ${Deno.env.get("GITHUB_TOKEN")}`,
    'Accept': 'application/vnd.github.v3+json',
  };

  const response = await fetch(url, { headers })

  if (!response.ok) {
    throw new Error(`Failed to call github API endpoint: ${url}, given error: ${response.statusText}`);
  }

  const responseJsonBody: T = await response.json();  

  // for propagation, add nextLink to responseJsonBody. It's the URL that should be used in the next HTTP request to get the next page of results.
  const linkHeader = response.headers.get('Link')?.match(/<(.*?)>; rel="next"/);
  const nextPageUrl = linkHeader ? linkHeader[1] : undefined;

  return {
    responseJsonBody,
    nextPageUrl
  };
}
