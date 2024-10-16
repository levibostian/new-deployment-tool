import { GitHubCommit, GitHubRelease } from "../github-api.ts";
import * as semver from "jsr:@std/semver";
import { versionBumpForCommitBasedOnConventionalCommit } from "../conventional-commits.ts";
import * as log from "../log.ts";
import { GetNextReleaseVersionEnvironment } from "../types/environment.ts";

export interface DetermineNextReleaseStepConfig {
  branches?: {
    branch_name?: string;
    prerelease?: boolean;
    version_suffix?: string;
  }[];
}

export interface DetermineNextReleaseStep {
  getNextReleaseVersion({ config, environment, commits, latestRelease }: {
    config?: DetermineNextReleaseStepConfig; 
    environment: GetNextReleaseVersionEnvironment;
    commits: GitHubCommit[];
    latestRelease: GitHubRelease | null;
  }): Promise<string | null>;
}

export class DetermineNextReleaseStepImpl implements DetermineNextReleaseStep {
  async getNextReleaseVersion({ config, environment, commits, latestRelease }: {
    config?: DetermineNextReleaseStepConfig;
    environment: GetNextReleaseVersionEnvironment;
    commits: GitHubCommit[];
    latestRelease: GitHubRelease | null;
  }): Promise<string | null> {
    // First, parse all commits to determine the version bump for each commit.
    const versionBumpsForEachCommit = commits.map((commit) => {
      log.message(
        `Analyzing commit: ${commit.message} to determine if it should trigger a new release.`,
      );

      const versionBumpForCommit =
        versionBumpForCommitBasedOnConventionalCommit(
          commit,
        );
      log.message(`The release type for the commit is ${versionBumpForCommit}`);
      return versionBumpForCommit;
    }).filter((versionBump) =>
      versionBump !== undefined
    ) as ("patch" | "major" | "minor")[];

    // If none of the commits indicate a release should be made, exit early. 
    if (versionBumpsForEachCommit.length === 0) {
      return null;
    }

    const lastReleaseVersion = latestRelease?.tag.name;
    const isNextReleasePrerelease = config?.branches?.find((branch) => branch.branch_name === environment.gitCurrentBranch)?.prerelease;
    const prereleaseVersionSuffix = config?.branches?.find((branch) => branch.branch_name === environment.gitCurrentBranch)?.version_suffix || environment.gitCurrentBranch;

    // If there was not a last release version, then this is the first release. Return a version to start with.
    if (!lastReleaseVersion) {
      if (isNextReleasePrerelease) return `1.0.0-${prereleaseVersionSuffix}.1`;
      else return "1.0.0";
    }
    
    const lastReleaseSemanticVersion = semver.tryParse(lastReleaseVersion);
    if (!lastReleaseSemanticVersion) {
      throw new Error(`The last release version, ${lastReleaseVersion}, is not a valid semantic version (https://semver.org/). I can only determine the next release version if the latest release is a valid semantic version. Push a new valid version and try again.`);
    }

    // Common code to get the next semantic version for a given bump type.
    // Code is heavily inspired by semantic-release's implementation to get the next version.     
    // https://github.com/semantic-release/semantic-release/blob/45bf9d601591bf7649926e54a9459c643136b485/lib/get-next-version.js
    // the unit tests for this file is the best reference to understand this code. 
    const getNextSemanticVersionForBump = (bump: "major" | "minor" | "patch") => {      
      if (isNextReleasePrerelease) {
        const isLatestReleaseSameSuffix = lastReleaseSemanticVersion.prerelease && lastReleaseSemanticVersion.prerelease.length > 0 && lastReleaseSemanticVersion.prerelease[0] === prereleaseVersionSuffix;

        // If there is the same suffix, we have 2 use cases to handle. 
        // 1. Given 1.1.0-beta.2 and bump is minor or patch, we should increment the prerelease version to 1.1.0-beta.3
        // 2. Given 1.1.0-beta.2 and bump is major, we should increment the major version to 2.0.0-beta.1
        if (isLatestReleaseSameSuffix) {
          // Generate both of these use cases and return the greater version which resolves the conflict.
          const version1 = semver.increment(lastReleaseSemanticVersion, "prerelease") 
          const version2 = semver.parse(`${semver.format(semver.increment(lastReleaseSemanticVersion, bump))}-${prereleaseVersionSuffix}.1`);
  
          return semver.format(semver.greaterThan(version1, version2) ? version1 : version2)
        } else {
          // if the suffix changes, we perform the version bump, add new suffix, and reset the prerelease version to 1.
          return `${semver.format(semver.increment(lastReleaseSemanticVersion, bump))}-${prereleaseVersionSuffix}.1`
        }
      } else {
        return semver.format(semver.increment(lastReleaseSemanticVersion, bump));
      }
    }

    // return the next release version based on the type of bump indicated by the commits. Prioritize major, then minor, then patch.
    if (versionBumpsForEachCommit.includes("major")) {
      return getNextSemanticVersionForBump("major");
    } else if (versionBumpsForEachCommit.includes("minor")) {
      return getNextSemanticVersionForBump("minor");
    } else if (versionBumpsForEachCommit.includes("patch")) {
      return getNextSemanticVersionForBump("patch");
    }

    return null;
  }
}
