import * as log from './log.ts'

interface GitHubRelease { 
  tag: {
    name: string,
    commit: {
      sha: string
    }
  },
  name: string,
  created_at: string
}

export interface GitHubCommit {
  sha: string,
  commit: {
    message: string
  }
}

// Get a list of github releases. 
// The github rest api does not return the git tag (and commit sha) for a release. You would need to also call the tags endpoint and match the tag name to the release name (painful). 
// But I found you can use the github graphql api to get this information in 1 call.
export const getTagsWithGitHubReleases = async <T>({ owner, repo, processReleases }: { owner: string; repo: string; processReleases: (data: GitHubRelease[]) => T | null }) => {
  // Gets list of tags that also have a github release made for it. 
  // If a tag does not have a release, it will not be returned. 
  // Sorted by latest release first.
  // Paging enabled. 
  const graphqlQuery = `
query($owner: String!, $repo: String!, $endCursor: String) {
  repository(owner: $owner, name: $repo) {
    releases(first: 100, after: $endCursor, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        name # name of github release 
        createdAt # "2024-06-06T04:26:30Z"
        isDraft # true if release is a draft
        tag {
          name # tag name 
          target {
            ... on Commit {
              oid # commit sha hash
            }
          }
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
}
`

  return await githubGraphqlRequestPaging<{
    repository: {
      releases: {
        nodes: {
          name: string,
          createdAt: string,
          isDraft: boolean,
          tag: {
            name: string,
            target: {
              oid: string
            }
          }
        }[],
        pageInfo: {
          endCursor: string,
          hasNextPage: boolean
        }
      }
    }
  }, T>(graphqlQuery, {owner, repo}, (response) => {    
    const releases: GitHubRelease[] = response.repository.releases.nodes
      .filter(release => !release.isDraft) // only look at releases that are not drafts
      .map(release => {
        return {
          tag: {
            name: release.tag.name,
            commit: {
              sha: release.tag.target.oid
            }
          },
          name: release.name,
          created_at: release.createdAt
        }
      })

    return processReleases(releases);
  });
}

export const getCommitsForBranch = async <T>({ owner, repo, branch, processCommits }: { owner: string; repo: string; branch: string, processCommits: (data: GitHubCommit[]) => T | null }) => {
  return await githubApiRequestPaging<GitHubCommit[], T>(`https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&per_page=100`, processCommits);
}

export const createGitHubRelease = async ({ owner, repo, tagName, commit }: { owner: string; repo: string; tagName: string; commit: GitHubCommit }) => {
  await githubApiRequest(`https://api.github.com/repos/${owner}/${repo}/releases`, 'POST', {
    tag_name: tagName,
    target_commitish: commit.sha,
    name: tagName,
    body: '',
    draft: false,
    prerelease: false
  });
}

// Make a GitHub Rest API request.
const githubApiRequest = async<T>(url: string, method: 'GET' | 'POST' = 'GET', body: object | undefined = undefined) => {
  const headers = {
    'Authorization': `Bearer ${Deno.env.get("INPUT_GITHUB_TOKEN")}`, 
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  log.debug(`GitHub API request: ${method}:${url}, headers: ${JSON.stringify(headers)}, body: ${JSON.stringify(body)}`);

  const response = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });

  if (!response.ok) {
    throw new Error(`Failed to call github API endpoint: ${url}, given error: ${response.statusText}`);
  }

  const responseJsonBody: T = await response.json();  

  return {
      status: response.status,
      body: responseJsonBody,
      headers: response.headers
  };
}

// Make a GitHub Rest API request that supports paging. Takes in a function that gets called for each page of results.
// In that function, return a result or null. If null is returned, the function will continue to get the next page of results.
async function githubApiRequestPaging<RESPONSE, RETURN>(
  initialUrl: string,
  processResponse: (data: RESPONSE) => RETURN | null
): Promise<RETURN | null> {
  let url = initialUrl 
  let returnValue: RETURN | null = null;
  
  while (true) {
    const response = await githubApiRequest<RESPONSE>(url);    

    returnValue = processResponse(response.body)
    if (returnValue !== null) {      
      break;
    }

    // for propagation, add nextLink to responseJsonBody. It's the URL that should be used in the next HTTP request to get the next page of results.
    const linkHeader = response.headers.get('Link')?.match(/<(.*?)>; rel="next"/);
    const nextPageUrl = linkHeader ? linkHeader[1] : undefined;

    if (!nextPageUrl) {
      break;
    }

    url = nextPageUrl
  }

  return returnValue;
}

/*

  // Make a GitHub GraphQL API request.

  Example: 
  // const QUERY = `
  // query($owner: String!, $name: String!) {
  //   repository(owner: $owner, name: $name) {
  //     releases(first: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
  //       nodes {
  //         name
  //         createdAt
  //         tag {
  //           name
  //           target {
  //             ... on Commit {
  //               oid
  //             }
  //           }
  //         }
  //       }
  //     }
  //   }
  // }
  // `; 
  // const variables = {
  //   owner: 'REPO_OWNER', // Replace with the repository owner
  //   name: 'REPO_NAME'    // Replace with the repository name
  // };
*/
const githubGraphqlRequest = async<T>(query: string, variables: object) => {  
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get("INPUT_GITHUB_TOKEN")}`, 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to call github graphql api. Given error: ${response.statusText}`);
  }

  const responseJsonBody: T = await response.json();  

  return {
      status: response.status,
      body: responseJsonBody,
      headers: response.headers
  };
}

// Make a GitHub GraphQL API request that supports paging. Takes in a function that gets called for each page of results.
// Assumptions when using this function:
// 1. Query must contain a pageInfo object: 
// pageInfo {
//  endCursor
//  hasNextPage
// }
// 2. Query contains a variable called endCursor that is used to page through results.
// See: https://docs.github.com/en/graphql/guides/using-pagination-in-the-graphql-api to learn more about these assumptions.
async function githubGraphqlRequestPaging<RESPONSE, RETURN>(
  query: string,
  variables: { [key: string]: string },
  processResponse: (data: RESPONSE) => RETURN | null
): Promise<RETURN | null> {
  let returnValue: RETURN | null = null;

  // deno-lint-ignore no-explicit-any
  function findPageInfo(obj: any): {hasNextPage: boolean, endCursor: string} {
    for (const key in obj) {
      if (key === 'pageInfo') {
        return obj[key] as {hasNextPage: boolean, endCursor: string};
      }
  
      const result = findPageInfo(obj[key]);
      if (result !== null) {
        return result;
      }
    }

    throw new Error('pageInfo object not found in response. Did you forget to add pageInfo to your graphql query?');    
  }
  
  while (true) {
    const response = await githubGraphqlRequest<RESPONSE>(query, variables);

    returnValue = processResponse(response.body)
    if (returnValue !== null) {      
      break;
    }

    const pageInfo = findPageInfo(response.body);

    if (!pageInfo.hasNextPage) {
      break;
    }

    variables['endCursor'] = pageInfo.endCursor
  }

  return returnValue;
}

