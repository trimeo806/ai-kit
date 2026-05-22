import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { emptyManifest, hashContent, hashFile, readManifest, writeManifest } from "../src/lib/manifest";

describe("manifest", () => {
  it("round-trips empty manifest", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "manifest-"));
    const m = emptyManifest();
    m.sha = "abc";
    m.ref = "main";
    m.targets["claude"] = {
      sha: "abc",
      ref: "main",
      installedAt: new Date().toISOString(),
      files: [{ path: ".claude/agents/x.md", hash: "sha256:deadbeef", managed: "file" }],
    };
    await writeManifest(dir, m);
    const got = await readManifest(dir);
    expect(got).not.toBeNull();
    expect(got!.targets.claude.files[0].path).toBe(".claude/agents/x.md");
  });

  it("hashes content reproducibly", () => {
    expect(hashContent("hello")).toBe(hashContent("hello"));
    expect(hashContent("hello")).not.toBe(hashContent("world"));
  });

  it("returns null for missing file hash", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "manifest-"));
    expect(await hashFile(path.join(dir, "nope"))).toBeNull();
    const p = path.join(dir, "file.txt");
    await writeFile(p, "abc");
    const h = await hashFile(p);
    expect(h).toMatch(/^sha256:/);
  });
});
