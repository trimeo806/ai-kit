/**
 * Merge primitives ported from scripts/install-codex-kit.ps1.
 *
 * - mergeAgentsDocument: sentinel-block merge for AGENTS.md
 * - mergeHooksJson: dedupe hook entries by (matcher, commands) signature
 * - ensureCodexHooksEnabled: enforce [features].codex_hooks = true in TOML
 * - stripSentinelBlock: inverse of mergeAgentsDocument for uninstall
 */

const SENTINEL_BEGIN = "<!-- tri-ai-kit:begin -->";
const SENTINEL_END = "<!-- tri-ai-kit:end -->";

export function mergeAgentsDocument(existing: string | null, source: string): string {
  const sourceBody = source.replace(/^#\s+AGENTS\.md\s*$/m, "").trim();
  const section = ["## tri-ai-kit base", SENTINEL_BEGIN, sourceBody, SENTINEL_END].join("\n");
  if (existing == null) {
    return `${section}\n`;
  }
  const beginIdx = existing.indexOf(SENTINEL_BEGIN);
  const endIdx = existing.indexOf(SENTINEL_END);
  if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
    const replacement = `${SENTINEL_BEGIN}\n${sourceBody}\n${SENTINEL_END}`;
    const updated =
      existing.slice(0, beginIdx) +
      replacement +
      existing.slice(endIdx + SENTINEL_END.length);
    return ensureTrailingNewline(updated);
  }
  let merged = existing.replace(/\s+$/, "");
  if (merged.length > 0) merged += "\n\n";
  merged += section + "\n";
  return merged;
}

export function stripSentinelBlock(existing: string): string {
  const beginIdx = existing.indexOf(SENTINEL_BEGIN);
  const endIdx = existing.indexOf(SENTINEL_END);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) return existing;
  const blockStart = findHeadingStart(existing, beginIdx);
  const afterEnd = endIdx + SENTINEL_END.length;
  const trimmedTail = existing.slice(afterEnd).replace(/^\s*\n/, "");
  return existing.slice(0, blockStart).replace(/\s+$/, "") + (trimmedTail ? "\n\n" + trimmedTail : "\n");
}

function findHeadingStart(text: string, sentinelIdx: number): number {
  const heading = "## tri-ai-kit base";
  const candidate = text.lastIndexOf(heading, sentinelIdx);
  if (candidate === -1) return sentinelIdx;
  return candidate;
}

interface HookCommand {
  command?: string;
  [k: string]: unknown;
}
interface HookEntry {
  matcher?: string;
  hooks?: HookCommand[];
  [k: string]: unknown;
}
interface HooksDoc {
  hooks?: Record<string, HookEntry[]>;
  [k: string]: unknown;
}

export function mergeHooksJson(existingContent: string | null, sourceContent: string): string {
  const source = JSON.parse(sourceContent) as HooksDoc;
  if (!existingContent) return JSON.stringify(source, null, 2);
  const existing = JSON.parse(existingContent) as HooksDoc;
  if (!source.hooks) return existingContent;
  if (!existing.hooks) return JSON.stringify(source, null, 2);

  const mergedHooks: Record<string, HookEntry[]> = {};
  const events = new Set<string>([
    ...Object.keys(source.hooks),
    ...Object.keys(existing.hooks),
  ]);
  for (const event of events) {
    const src = source.hooks[event] ?? [];
    const ext = existing.hooks[event] ?? [];
    const seen = new Set<string>();
    const out: HookEntry[] = [];
    for (const e of src) {
      const sig = hookSignature(e);
      if (!seen.has(sig)) {
        seen.add(sig);
        out.push(e);
      }
    }
    for (const e of ext) {
      const sig = hookSignature(e);
      if (!seen.has(sig)) {
        seen.add(sig);
        out.push(e);
      }
    }
    mergedHooks[event] = out;
  }
  const merged: HooksDoc = { ...source, hooks: mergedHooks };
  return JSON.stringify(merged, null, 2) + "\n";
}

function hookSignature(entry: HookEntry): string {
  const matcher = entry?.matcher ?? "";
  const cmds = Array.isArray(entry?.hooks)
    ? entry.hooks.map((h) => (h && typeof h.command === "string" ? h.command : "")).filter(Boolean)
    : [];
  return `${matcher}|${cmds.join(";")}`;
}

export function ensureCodexHooksEnabled(toml: string): string {
  const normalized = toml.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  let featuresStart = -1;
  let featuresEnd = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^\[.*\]$/.test(trimmed)) {
      if (trimmed === "[features]") {
        featuresStart = i;
        continue;
      }
      if (featuresStart >= 0 && i > featuresStart) {
        featuresEnd = i;
        break;
      }
    }
  }
  if (featuresStart >= 0) {
    for (let i = featuresStart + 1; i < featuresEnd; i++) {
      if (/^\s*codex_hooks\s*=/.test(lines[i])) {
        lines[i] = "codex_hooks = true";
        return ensureTrailingNewline(lines.join("\n"));
      }
    }
    lines.splice(featuresStart + 1, 0, "codex_hooks = true");
    return ensureTrailingNewline(lines.join("\n"));
  }
  let out = normalized;
  if (out.trim().length > 0 && !out.endsWith("\n")) out += "\n";
  out += "\n[features]\ncodex_hooks = true\n";
  return out;
}

export function deepMergeJson(existing: string | null, source: string): string {
  if (!existing) return source;
  let ex: unknown;
  let src: unknown;
  try {
    ex = JSON.parse(existing);
    src = JSON.parse(source);
  } catch {
    return source;
  }
  const merged = mergeJsonValue(src, ex);
  return JSON.stringify(merged, null, 2) + "\n";
}

function mergeJsonValue(sourceVal: unknown, existingVal: unknown): unknown {
  if (sourceVal == null) return existingVal;
  if (existingVal == null) return sourceVal;
  if (isPlainObject(sourceVal) && isPlainObject(existingVal)) {
    const merged: Record<string, unknown> = {};
    for (const k of Object.keys(sourceVal)) merged[k] = (sourceVal as Record<string, unknown>)[k];
    for (const k of Object.keys(existingVal)) {
      if (k in merged) {
        merged[k] = mergeJsonValue(merged[k], (existingVal as Record<string, unknown>)[k]);
      } else {
        merged[k] = (existingVal as Record<string, unknown>)[k];
      }
    }
    return merged;
  }
  if (Array.isArray(sourceVal) && Array.isArray(existingVal)) {
    const allScalar = [...sourceVal, ...existingVal].every(isScalar);
    if (allScalar) {
      const seen = new Set<string>();
      const out: unknown[] = [];
      for (const item of [...sourceVal, ...existingVal]) {
        const key = item === null ? "<null>" : String(item);
        if (!seen.has(key)) {
          seen.add(key);
          out.push(item);
        }
      }
      return out;
    }
    return existingVal;
  }
  return existingVal;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isScalar(v: unknown): boolean {
  return v === null || ["string", "number", "boolean"].includes(typeof v);
}

function ensureTrailingNewline(s: string): string {
  return s.endsWith("\n") ? s : s + "\n";
}
