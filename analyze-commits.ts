import {GitCommit} from "./lib/type.ts";
import {SemanticVersion} from "./lib/semantic-version.ts";
import {versionBumpForCommitBasedOnConventionalCommit} from "./lib/conventional-commits.ts";

export const getNextReleaseVersion = async ({commits, lastReleaseVersion}: {commits: GitCommit[], lastReleaseVersion: string | undefined}): Promise<string | undefined> => {
  const lastReleaseSemanticVersion = new SemanticVersion(lastReleaseVersion || '0.0.0');  

  const versionBumpsForEachCommit = commits.map((commit) => versionBumpForCommitBasedOnConventionalCommit(commit)).filter((versionBump) => versionBump !== undefined) as ('patch' | 'major' | 'minor')[];

  // If there was not a last release version and at least 1 of the commits indicates a release should be made, then return 1.0.0 as the first release version to be made in the software. 
  if (!lastReleaseVersion && versionBumpsForEachCommit.length > 0) {
    return '1.0.0';
  }

  if (versionBumpsForEachCommit.includes('major')) {
    return lastReleaseSemanticVersion.bumpMajor();    
  } else if (versionBumpsForEachCommit.includes('minor')) {
    return lastReleaseSemanticVersion.bumpMinor();
  } else if (versionBumpsForEachCommit.includes('patch')) {
    return lastReleaseSemanticVersion.bumpPatch();    
  }
}

