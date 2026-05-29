import { describe, expect, it } from "vitest";
import {
  deepMergeJson,
  ensureCodexHooksEnabled,
  mergeAgentsDocument,
  mergeHooksJson,
  stripSentinelBlock,
} from "../src/lib/merge";

describe("mergeAgentsDocument", () => {
  it("wraps source in sentinels when target missing", () => {
    const out = mergeAgentsDocument(null, "# AGENTS.md\nhello\n");
    expect(out).toContain("hello");
    expect(out).toContain("<!-- ai-kit:begin -->");
    expect(out).toContain("<!-- ai-kit:end -->");
  });

  it("appends sentinel block to existing doc without one", () => {
    const existing = "# my project\n\nKeep me.\n";
    const out = mergeAgentsDocument(existing, "# AGENTS.md\nkit body\n");
    expect(out).toContain("Keep me.");
    expect(out).toContain("<!-- ai-kit:begin -->");
    expect(out).toContain("kit body");
    expect(out).toContain("<!-- ai-kit:end -->");
  });

  it("replaces existing sentinel block, preserving content outside", () => {
    const existing =
      "# my project\n\n## ai-kit base\n<!-- ai-kit:begin -->\nOLD\n<!-- ai-kit:end -->\n\nAfter section.\n";
    const out = mergeAgentsDocument(existing, "# AGENTS.md\nNEW BODY\n");
    expect(out).not.toContain("OLD");
    expect(out).toContain("NEW BODY");
    expect(out).toContain("After section.");
  });
});

describe("stripSentinelBlock", () => {
  it("removes ai-kit block but keeps surrounding text", () => {
    const cur =
      "# my project\n\n## ai-kit base\n<!-- ai-kit:begin -->\nBODY\n<!-- ai-kit:end -->\n\nKeep me.\n";
    const out = stripSentinelBlock(cur);
    expect(out).not.toContain("BODY");
    expect(out).not.toContain("ai-kit");
    expect(out).toContain("Keep me.");
    expect(out).toContain("# my project");
  });
});

describe("mergeHooksJson", () => {
  it("dedupes by matcher|cmd signature", () => {
    const source = JSON.stringify({
      hooks: {
        PreToolUse: [{ matcher: "Bash", hooks: [{ command: "x" }] }],
      },
    });
    const existing = JSON.stringify({
      hooks: {
        PreToolUse: [
          { matcher: "Bash", hooks: [{ command: "x" }] },
          { matcher: "Bash", hooks: [{ command: "y" }] },
        ],
      },
    });
    const merged = JSON.parse(mergeHooksJson(existing, source));
    expect(merged.hooks.PreToolUse).toHaveLength(2);
    const sigs = merged.hooks.PreToolUse.map(
      (e: { matcher: string; hooks: { command: string }[] }) =>
        `${e.matcher}|${e.hooks.map((h) => h.command).join(";")}`,
    );
    expect(sigs).toContain("Bash|x");
    expect(sigs).toContain("Bash|y");
  });

  it("uses source content when existing is null", () => {
    const source = JSON.stringify({ hooks: { PreToolUse: [{ matcher: "X", hooks: [] }] } });
    const out = JSON.parse(mergeHooksJson(null, source));
    expect(out.hooks.PreToolUse).toHaveLength(1);
  });
});

describe("ensureCodexHooksEnabled", () => {
  it("adds [features] when missing", () => {
    const out = ensureCodexHooksEnabled("model = \"gpt-5\"\n");
    expect(out).toContain("[features]");
    expect(out).toContain("codex_hooks = true");
  });

  it("inserts key when [features] section exists without it", () => {
    const out = ensureCodexHooksEnabled("[features]\nfoo = true\n");
    expect(out).toMatch(/\[features\]\ncodex_hooks = true\nfoo = true/);
  });

  it("replaces existing codex_hooks value", () => {
    const out = ensureCodexHooksEnabled("[features]\ncodex_hooks = false\n");
    expect(out).toContain("codex_hooks = true");
    expect(out).not.toContain("codex_hooks = false");
  });
});

describe("deepMergeJson", () => {
  it("recursively merges objects; existing scalar wins, missing keys from each side added", () => {
    const existing = JSON.stringify({ a: { b: 1, c: 2 }, x: 9 });
    const source = JSON.stringify({ a: { b: 99, d: 4 }, y: 7 });
    const merged = JSON.parse(deepMergeJson(existing, source));
    expect(merged.a).toEqual({ b: 1, c: 2, d: 4 });
    expect(merged.x).toBe(9);
    expect(merged.y).toBe(7);
  });

  it("dedupes scalar arrays", () => {
    const merged = JSON.parse(
      deepMergeJson(JSON.stringify({ arr: ["a", "b"] }), JSON.stringify({ arr: ["b", "c"] })),
    );
    expect(merged.arr).toEqual(["b", "c", "a"]);
  });

  it("returns source when existing is null", () => {
    const out = deepMergeJson(null, JSON.stringify({ a: 1 }));
    expect(JSON.parse(out)).toEqual({ a: 1 });
  });
});
