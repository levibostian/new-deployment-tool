export class SemanticVersion {
  major: number;
  minor: number;
  patch: number;

  constructor(versionString: string) {
    const parts = versionString.split(".");

    if (parts.length !== 3) {
      throw new Error(`Invalid version string: ${versionString}`);
    }

    if (parts.some((part) => isNaN(parseInt(part)))) {
      throw new Error(`Invalid version string: ${versionString}`);
    }

    this.major = parseInt(parts[0]);
    this.minor = parseInt(parts[1]);
    this.patch = parseInt(parts[2]);
  }

  bumpMajor(): string {
    return `${this.major + 1}.0.0`;
  }

  bumpMinor(): string {
    return `${this.major}.${this.minor + 1}.0`;
  }

  bumpPatch(): string {
    return `${this.major}.${this.minor}.${this.patch + 1}`;
  }
}
