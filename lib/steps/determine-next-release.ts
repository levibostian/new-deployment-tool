import { GitHubCommit, GitHubRelease } from "../github-api.ts";
import { SemanticVersion } from "../semantic-version.ts";
import { versionBumpForCommitBasedOnConventionalCommit } from "../conventional-commits.ts";
import * as log from "../log.ts";

export interface DetermineNextReleaseStep {
  getNextReleaseVersion({ commits, latestRelease }: {
    commits: GitHubCommit[];
    latestRelease: GitHubRelease | null;
  }): Promise<string | null>;
}

export class DetermineNextReleaseStepImpl implements DetermineNextReleaseStep {
  async getNextReleaseVersion({ commits, latestRelease }: {
    commits: GitHubCommit[];
    latestRelease: GitHubRelease | null;
  }): Promise<string | null> {
    const lastReleaseVersion = latestRelease?.tag.name;

    const lastReleaseSemanticVersion = new SemanticVersion(
      lastReleaseVersion || "0.0.0",
    );

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

    // If there was not a last release version and at least 1 of the commits indicates a release should be made, then return 1.0.0 as the first release version to be made in the software.
    if (!lastReleaseVersion && versionBumpsForEachCommit.length > 0) {
      return "1.0.0";
    }

    // return next version, with major being highest priority, then minor, then patch
    if (versionBumpsForEachCommit.includes("major")) {
      return lastReleaseSemanticVersion.bumpMajor();
    } else if (versionBumpsForEachCommit.includes("minor")) {
      return lastReleaseSemanticVersion.bumpMinor();
    } else if (versionBumpsForEachCommit.includes("patch")) {
      return lastReleaseSemanticVersion.bumpPatch();
    }

    return null;
  }
}
