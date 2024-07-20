import { GitCommit } from './type.ts';

export const versionBumpForCommitBasedOnConventionalCommit = (commit: GitCommit): 'patch' | 'major' | 'minor' | undefined => {
  const message = commit.message;

  if (/.*!:.*/.test(message)) {
      return 'major';
    } else if (message.startsWith('feat:')) {
      return 'minor';
    } else if (message.startsWith('fix:')) {
      return 'patch';
    }

  return undefined;
}
