#!/usr/bin/env bash
set -euo pipefail
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
. "$HERE/lib.sh"

base=''
while [ $# -gt 0 ]; do
  case "$1" in
    --base) base=${2:-}; shift ;;
    -h|--help) printf 'Usage: done_check.sh [--base <branch>]\nWhole-branch pass: accretion, test-integrity scan, commit-type consistency.\nExits: 0 clean · 2 prerequisite · 7 commit types inconsistent\n'; exit 0 ;;
    *) ti_die "unknown option '$1'" ;;
  esac
  shift
done

ak_need git
cd "$(ti_repo_root)"
ti_load_rules
[ -n "$base" ] || base=$(ti_base_branch)
[ -n "$base" ] || ti_die "cannot determine the base branch — pass --base" "$TI_E_PREREQ"

ref="origin/$base"
git show-ref --verify --quiet "refs/remotes/$ref" || ref=$base
ti_kv BASE_BRANCH "$base"

commits=$(git rev-list --count "$ref..HEAD" 2>/dev/null || echo 0)
ti_kv COMMITS "$commits"
[ "$commits" -gt 0 ] || ti_die "no commits ahead of $ref — nothing to check" "$TI_E_PREREQ"

stat=$(git diff "$ref...HEAD" --shortstat 2>/dev/null || true)
ti_kv DIFF_SHORTSTAT "$(printf '%s' "$stat" | sed -E 's/^[[:space:]]+//')"
ti_kv FILES_CHANGED "$(git diff "$ref...HEAD" --name-only 2>/dev/null | grep -c . || true)"

accreted=$(git log "$ref..HEAD" --name-only --format= 2>/dev/null |
           sed '/^[[:space:]]*$/d' | sort | uniq -d || true)
ti_kv ACCRETED_FILES "$(printf '%s' "$accreted" | ti_join)"
ti_kv ACCRETED_COUNT "$(printf '%s' "$accreted" | grep -c . || true)"

added=$(git diff "$ref...HEAD" -- '*spec*' '*test*' '*Test*' 2>/dev/null | grep -E '^\+' | grep -v '^+++' || true)
count_added() { printf '%s\n' "$added" | grep -cE "$1" || true; }
ti_kv SKIP_ONLY_ADDED "$(count_added '(\.skip|\.only|\bxit\b|\bxdescribe\b|test\.todo|@Disabled|@Ignore|pytest\.mark\.skip|t\.Skip\()')"
ti_kv SUPPRESSION_ADDED "$(count_added '(@ts-expect-error|@ts-ignore|eslint-disable|# *noqa|# *type: *ignore|@SuppressWarnings|//nolint)')"
ti_kv ANY_CAST_ADDED "$(count_added 'as any|: any\b')"
ti_kv LOOSE_ASSERT_ADDED "$(count_added 'expect\.anything\(\)|expect\.any\(|toBeTruthy\(\)|toBeDefined\(\)|assertNotNull\(|assert [a-z_]+ is not None$')"

prod_added=$(git diff "$ref...HEAD" -- . ':(exclude)*spec*' ':(exclude)*test*' ':(exclude)*Test*' ':(exclude)*.md' 2>/dev/null |
             grep -E '^\+' | grep -v '^+++' || true)
ti_kv DEBUG_LEFTOVERS "$(printf '%s\n' "$prod_added" | grep -cE 'console\.(log|debug)|debugger|System\.out\.println|printStackTrace\(|\bpdb\.set_trace|breakpoint\(\)|fmt\.Println\(' || true)"
ti_kv TICKET_IN_COMMENTS "$(printf '%s\n' "$prod_added" | grep -E '^\+[[:space:]]*(//|\*|#)' | grep -cE "$(ak_key_regex)" || true)"

types=$(git log "$ref..HEAD" --format='%s' 2>/dev/null |
        grep -oiE '^(feat|feature|fix|bugfix|hotfix|refactor|perf|chore|docs|test|build|ci)' |
        tr 'A-Z' 'a-z' || true)
distinct=$(printf '%s' "$types" | sed '/^$/d' | sort -u | tr '\n' ',' | sed 's/,$//')
picked=$(printf '%s' "$types" | sed '/^$/d' | head -1)
n_distinct=$(printf '%s' "$types" | sed '/^$/d' | sort -u | grep -c . || true)
ti_kv COMMIT_TYPES "$distinct"
ti_kv PR_KIND_WOULD_BE "$picked"

[ -z "$(git status --porcelain)" ] && ti_kv WORKTREE clean || ti_kv WORKTREE dirty
if git rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1; then
  ti_kv UNPUSHED "$(git log '@{u}..HEAD' --oneline | grep -c . || true)"
else
  ti_kv UNPUSHED "$commits"
fi

printf -- '--- touched by >1 commit ---\n'
printf '%s\n' "$accreted" | grep . || printf '(none — no accretion on this branch)\n'

if [ "${n_distinct:-0}" -gt 1 ]; then
  ti_die "commits use $n_distinct different types ($distinct); pr-submit labels the PR '$picked' because git log is newest-first. Make every commit on the branch use the branch's type." "$TI_E_COMMIT_TYPES"
fi
ti_kv DONE_CHECK clean
