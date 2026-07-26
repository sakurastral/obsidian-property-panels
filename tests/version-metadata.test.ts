import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface PackageMetadata { version: string }
interface PackageLockMetadata extends PackageMetadata { packages: { "": PackageMetadata } }
interface ManifestMetadata { version: string; minAppVersion: string }

const readJson = <T>(path: string): T => JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8")) as T;

describe("release metadata", () => {
  it("keeps package, manifest, and versions metadata in sync", () => {
    const packageJson = readJson<PackageMetadata>("package.json");
    const packageLock = readJson<PackageLockMetadata>("package-lock.json");
    const manifest = readJson<ManifestMetadata>("manifest.json");
    const versions = readJson<Record<string, string>>("versions.json");

    expect(packageLock.version).toBe(packageJson.version);
    expect(packageLock.packages[""].version).toBe(packageJson.version);
    expect(manifest.version).toBe(packageJson.version);
    expect(versions[packageJson.version]).toBe(manifest.minAppVersion);
  });
});
