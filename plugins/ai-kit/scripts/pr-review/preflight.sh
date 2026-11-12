#!/usr/bin/env bash
set -euo pipefail
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
. "$HERE/lib.sh"

usage() {
  cat <<'EOF'
Usage: preflight.sh [--no-fetch] [--no-sync] [--dirty auto|allow|block]
Classifies local edits, checks the branch merges cleanly into the target, merges the target in
when behind, then writes the diff to review. Never commits, stashes or discards local work.
Exits: 0 ready · 3 uncommitted changes under --dirty block · 4 nothing to submit · 5 conflict
EOF
}

do_fetch=1 do_sync=1 dirty_flag=
while [ $# -gt 0 ]; do
  case "$1" in
    --no-fetch) do_fetch=0 ;;
    --no-sync) do_sync=0 ;;
    --dirty) shift; [ $# -gt 0 ] || ak_die "--dirty needs a value (auto|allow|block)"; dirty_flag=$1 ;;
    --dirty=*) dirty_flag=${1#--dirty=} ;;
    -h|--help) usage; exit 0 ;;
    *) ak_die "unknown option '$1'" ;;
  esac
  shift
done

ak_load_context
src=$AK_SOURCE_BRANCH tgt=$AK_TARGET_BRANCH
ak_kv SOURCE_BRANCH "$src"
ak_kv TARGET_BRANCH "$tgt"

policy=$AK_DIRTY_POLICY
if [ -n "$dirty_flag" ]; then
  ak_dirty_policy_ok "$dirty_flag" || ak_die "--dirty must be auto, allow or block (got '$dirty_flag')"
  policy=$dirty_flag
fi
ak_kv DIRTY_POLICY "$policy"

[ "$src" != "$tgt" ] ||
  ak_die "you are on '$src', which is the PR target branch — create a feature branch first" "$AK_E_NOTHING"

[ "$do_fetch" -eq 0 ] || git fetch origin --quiet
git show-ref --verify --quiet "refs/remotes/origin/$tgt" ||
  ak_die "origin/$tgt does not exist — check the target branch name" "$AK_E_PREREQ"

ahead=$(git rev-list --count "origin/$tgt..HEAD")
behind=$(git rev-list --count "HEAD..origin/$tgt")
ak_kv COMMITS_AHEAD "$ahead"
ak_kv COMMITS_BEHIND "$behind"
[ "$ahead" -gt 0 ] ||
  ak_die "no commits ahead of origin/$tgt — commit your work before submitting" "$AK_E_NOTHING"

wd=$(ak_workdir)
git diff --name-only --no-renames HEAD | LC_ALL=C sort -u >"$wd/dirty-tracked.txt"
git ls-files --others --exclude-standard | LC_ALL=C sort -u >"$wd/dirty-untracked.txt"
n_tracked=$(wc -l <"$wd/dirty-tracked.txt" | tr -d '[:space:]')
n_untracked=$(wc -l <"$wd/dirty-untracked.txt" | tr -d '[:space:]')
LC_ALL=C sort -u "$wd/dirty-tracked.txt" "$wd/dirty-untracked.txt" >"$wd/dirty-files.txt"

if [ "$behind" -gt 0 ]; then
  git diff --name-only --no-renames "HEAD...origin/$tgt" | LC_ALL=C sort -u >"$wd/incoming-files.txt"
else
  : >"$wd/incoming-files.txt"
fi
ak_common_lines "$wd/dirty-files.txt" "$wd/incoming-files.txt" >"$wd/dirty-overlap-sync.txt"
overlap_sync=$(ak_comma_list "$wd/dirty-overlap-sync.txt")

if [ ! -s "$wd/dirty-files.txt" ]; then
  ak_kv WORKTREE clean
  ak_kv DIRTY_TRACKED 0
  ak_kv DIRTY_UNTRACKED 0
  ak_kv DIRTY_FILES ""
  ak_kv DIRTY_OVERLAP_SYNC ""
  ak_kv DIRTY_ACTION none
else
  ak_kv WORKTREE dirty
  ak_kv DIRTY_TRACKED "$n_tracked"
  ak_kv DIRTY_UNTRACKED "$n_untracked"
  ak_kv DIRTY_FILES "$(ak_comma_list "$wd/dirty-files.txt")"
  ak_kv DIRTY_OVERLAP_SYNC "$overlap_sync"
  if [ "$policy" = block ]; then
    ak_kv DIRTY_ACTION blocked
    head -20 "$wd/dirty-files.txt" >&2
    ak_die "uncommitted changes present and the dirty policy is block. Nothing here commits, stashes or discards them. Re-run with --dirty auto to continue." "$AK_E_DIRTY"
  elif [ -n "$overlap_sync" ] && [ "$do_sync" -eq 1 ]; then
    ak_kv DIRTY_ACTION sync-skipped
  else
    ak_kv DIRTY_ACTION proceed
    ak_warn "$n_tracked modified + $n_untracked untracked file(s) stay uncommitted; they are not part of this PR"
  fi
fi

out=$(git merge-tree --write-tree "origin/$tgt" HEAD 2>&1) && rc=0 || rc=$?
if [ "$rc" -ne 0 ] && printf '%s' "$out" | grep -qiE 'usage:|unknown option'; then
  out=$(git merge-tree "$(git merge-base "origin/$tgt" HEAD)" "origin/$tgt" HEAD 2>&1) && rc=0 || rc=$?
fi
if [ "$rc" -ne 0 ] || printf '%s' "$out" | grep -qE '^CONFLICT|<<<<<<<'; then
  ak_kv CONFLICT local
  ak_kv CONFLICT_FILES "$(printf '%s\n' "$out" | ak_conflict_files)"
  printf '%s\n' "$out" | grep -E '^CONFLICT' >&2 || true
  ak_die "'$src' does not merge cleanly into '$tgt'. Resolve it first (git fetch origin && git merge origin/$tgt), then re-run. Do not push, open a PR, review or build." "$AK_E_CONFLICT"
fi
ak_kv CONFLICT none

if [ "$behind" -eq 0 ]; then
  ak_kv SYNC_MERGE not-needed
elif [ "$do_sync" -eq 0 ]; then
  ak_kv SYNC_MERGE skipped
  ak_warn "branch is $behind commit(s) behind origin/$tgt and --no-sync was given"
elif [ -n "$overlap_sync" ]; then
  ak_kv SYNC_MERGE skipped-dirty-overlap
  ak_warn "not merging origin/$tgt: uncommitted changes to $overlap_sync are in its way, so the review sees this branch without the target's latest $behind commit(s)"
else
  if git merge "origin/$tgt" --no-edit --quiet; then
    ak_kv SYNC_MERGE performed
  else
    if [ -e "$(git rev-parse --git-dir)/MERGE_HEAD" ]; then
      git merge --abort 2>/dev/null || true
      ak_die "merging origin/$tgt failed even though the pre-check passed (worktree restored). Merge manually and re-run." "$AK_E_CONFLICT"
    fi
    ak_die "git refused to merge origin/$tgt into the worktree (nothing was changed). Merge manually and re-run." "$AK_E_CONFLICT"
  fi
fi

diff_file="$wd/diff.patch"
stat_file="$wd/diffstat.txt"
git diff --merge-base "origin/$tgt" HEAD >"$diff_file"
git diff --merge-base "origin/$tgt" HEAD --stat >"$stat_file"
git diff --merge-base "origin/$tgt" HEAD --name-only >"$wd/changed-files.txt"

LC_ALL=C sort -u "$wd/changed-files.txt" >"$wd/changed-files.sorted.txt"
ak_common_lines "$wd/dirty-files.txt" "$wd/changed-files.sorted.txt" >"$wd/dirty-overlap-diff.txt"
ak_kv DIRTY_OVERLAP_DIFF "$(ak_comma_list "$wd/dirty-overlap-diff.txt")"

ak_kv DIFF_FILE "$diff_file"
ak_kv DIFFSTAT_FILE "$stat_file"
ak_kv CHANGED_FILES_LIST "$wd/changed-files.txt"
ak_kv FILES_CHANGED "$(wc -l <"$wd/changed-files.txt" | tr -d ' ')"
ak_kv DIFF_LINES "$(wc -l <"$diff_file" | tr -d ' ')"
ak_kv DIFF_SHA "$(git hash-object "$diff_file")"
ak_kv PREFLIGHT ready
echo "--- diffstat ---"
head -60 "$stat_file"
