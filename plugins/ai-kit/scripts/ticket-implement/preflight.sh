#!/usr/bin/env bash
set -euo pipefail
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
. "$HERE/lib.sh"

usage() {
  cat <<'TXT'
Usage: preflight.sh [<plan-file>|<TICKET-KEY>] [--no-fetch] [--exclude-plan]
Finds and validates the plan, resolves git state, derives the branch and PR title, parses steps.
Plan lookup: the given path; else <workspace>/<docsDir>/<KEY>/plan.md for the given key or the
key in the current branch; else <repo>/<KEY>.md.
Exits: 0 ready · 2 prerequisite · 3 dirty worktree · 4 no plan · 5 plan invalid · 6 ask the user
TXT
}

arg='' do_fetch=1 do_exclude=0
while [ $# -gt 0 ]; do
  case "$1" in
    --no-fetch) do_fetch=0 ;;
    --exclude-plan) do_exclude=1 ;;
    -h|--help) usage; exit 0 ;;
    -*) ti_die "unknown option '$1'" ;;
    *) arg="$1" ;;
  esac
  shift
done

ak_need git
root=$(ti_repo_root)
cd "$root"
ti_load_rules

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || printf 'HEAD')
if [ "$branch" = "HEAD" ]; then
  ti_kv GIT_STATE detached
  ti_die "detached HEAD — check out a branch first" "$TI_E_PREREQ"
fi
[ "$do_fetch" -eq 0 ] || git fetch origin --quiet 2>/dev/null || true

base=$(ti_base_branch)
[ -n "$base" ] || ti_die "cannot determine the base branch — set vcs.defaultBranch in .ai-kit/workspace.json" "$TI_E_PREREQ"
ti_kv BASE_BRANCH "$base"
ti_kv CURRENT_BRANCH "$branch"

plan_for_key() {
  local k=$1 c
  for c in ${AK_WS_ROOT:+"$AK_WS_ROOT/$AK_DOCS_DIR/$k/plan.md"} "$root/$AK_DOCS_DIR/$k/plan.md" "$root/$k.md"; do
    if [ -f "$c" ]; then printf '%s' "$c"; return 0; fi
  done
}

plan='' ticket='' source=''
if [ -n "$arg" ]; then
  if [ -f "$arg" ]; then
    plan=$(cd "$(dirname "$arg")" && pwd)/$(basename "$arg"); source=arg
  else
    ticket=$(ak_ticket_from "$arg")
    [ -n "$ticket" ] || ticket=$arg
    plan=$(plan_for_key "$ticket"); source=arg
  fi
fi
if [ -z "$plan" ] && [ -z "$arg" ]; then
  ticket=$(ak_ticket_from "$branch")
  if [ -n "$ticket" ]; then plan=$(plan_for_key "$ticket"); source=branch; fi
fi

if [ -z "$plan" ] || [ ! -f "$plan" ]; then
  ti_kv PLAN_FOUND no
  ti_die "no plan file found. Run /ai-kit:plan <KEY> first — this step executes a plan, it does not author one" "$TI_E_NOPLAN"
fi
if [ -z "$ticket" ]; then
  ticket=$(ak_ticket_from "$plan")
  [ -n "$ticket" ] || ticket=$(basename "$(dirname "$plan")")
fi
ti_kv PLAN_FOUND yes
ti_kv PLAN_FILE "$plan"
ti_kv PLAN_SOURCE "$source"
ti_kv TICKET_ID "$ticket"

missing=''
for want in '^## Steps' '^## Files to change' '^## Verification' '^## Acceptance criteria'; do
  ti_md_has_section "$plan" "$want" ||
    missing="${missing:+$missing,}$(printf '%s' "$want" | sed 's/^\^## //')"
done
ti_kv SECTIONS_MISSING "$missing"
ti_md_has_section "$plan" '^## Reuse map' && ti_kv REUSE_MAP present || ti_kv REUSE_MAP absent
ti_md_has_section "$plan" '^## Implementation log' && ti_kv LOG_PRESENT yes || ti_kv LOG_PRESENT no

steps=$(ti_md_section "$plan" '^## Steps' |
        grep -E '^[[:space:]]{0,1}([0-9]+\.|[-*])[[:space:]]+' |
        sed -E 's/^[[:space:]]*([0-9]+\.|[-*])[[:space:]]+//' || true)
step_count=$(printf '%s' "$steps" | grep -c . || true)
ti_kv STEP_COUNT "${step_count:-0}"

[ -z "$missing" ] ||
  ti_die "plan is missing required section(s): $missing — go back to /ai-kit:plan" "$TI_E_PLAN_INVALID"

paths=$(ti_md_section "$plan" '^## Files to change' |
        grep -oE '`[^`]+`' | tr -d '`' | grep -E '/|\.[A-Za-z0-9]+$' | grep -v '[[:space:]]' | sort -u || true)
total=0 exist=0 gone=''
while IFS= read -r p; do
  [ -n "$p" ] || continue
  total=$((total + 1))
  if [ -e "$root/$p" ]; then exist=$((exist + 1)); else gone="${gone:+$gone,}$p"; fi
done <<TXT
$paths
TXT
ti_kv FILES_RESOLVED "$exist/$total"
ti_kv FILES_MISSING "$gone"

title_line=$(head -20 "$plan" | grep -m1 '^# ' || true)
slug=$(printf '%s' "$title_line" | sed -E 's/^#[[:space:]]*//' | awk -F'—' '{ print (NF>1 ? $2 : $1) }' |
       sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' | tr '[:upper:]' '[:lower:]' |
       sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//')
if [ "${#slug}" -gt 40 ]; then
  slug=$(printf '%s' "$slug" | cut -c1-40 | sed -E 's/-[^-]*$//; s/-+$//')
fi
[ -n "$slug" ] || slug=$(printf '%s' "$ticket" | tr '[:upper:]' '[:lower:]')
ti_kv SLUG "$slug"
pattern=${TI_BRANCH_PATTERN:-'<KEY>/<slug>'}
new_branch=$(printf '%s' "$pattern" | sed "s#<KEY>#$ticket#g; s#<slug>#$slug#g")
ti_kv BRANCH_PATTERN "$pattern"
ti_kv BRANCH "$new_branch"
ti_kv PR_TITLE "$ticket $(printf '%s' "$slug" | sed -E 's/[-_]+/ /g')"

git show-ref --verify --quiet "refs/heads/$new_branch" && ti_kv BRANCH_EXISTS_LOCAL yes || ti_kv BRANCH_EXISTS_LOCAL no
git show-ref --verify --quiet "refs/remotes/origin/$new_branch" && ti_kv BRANCH_EXISTS_REMOTE yes || ti_kv BRANCH_EXISTS_REMOTE no
git show-ref --verify --quiet "refs/heads/$ticket" && ti_kv REF_CONFLICT yes || ti_kv REF_CONFLICT no
ti_kv TICKET_BRANCHES "$(git branch -a --list "*$ticket*" --format='%(refname:short)' 2>/dev/null | ti_join)"

if [ "$branch" = "$base" ]; then
  ti_kv GIT_STATE fresh
elif [ "$(ak_ticket_from "$branch")" = "$ticket" ]; then
  ti_kv GIT_STATE resume
else
  ti_kv GIT_STATE other-ticket
fi
ti_kv BASE_BEHIND "$(git rev-list --count "HEAD..origin/$base" 2>/dev/null || echo 0)"

rel_plan=${plan#"$root"/}
dirty=$(git status --porcelain)
if [ -z "$dirty" ]; then
  ti_kv DIRTY no; ti_kv DIRTY_ONLY_PLAN no
else
  ti_kv DIRTY yes
  other=$(printf '%s\n' "$dirty" | grep -v -- "$rel_plan" || true)
  [ -n "$other" ] && ti_kv DIRTY_ONLY_PLAN no || ti_kv DIRTY_ONLY_PLAN yes
fi

if [ "$rel_plan" = "$plan" ]; then
  ti_kv PLAN_FILE_IGNORED outside-repo
elif git check-ignore -q "$rel_plan" 2>/dev/null; then
  ti_kv PLAN_FILE_IGNORED yes
elif git ls-files --error-unmatch "$rel_plan" >/dev/null 2>&1; then
  ti_kv PLAN_FILE_IGNORED tracked
else
  ti_kv PLAN_FILE_IGNORED no
  if [ "$do_exclude" -eq 1 ]; then
    printf '%s\n' "$rel_plan" >>"$(git rev-parse --absolute-git-dir)/info/exclude"
    ti_kv PLAN_FILE_EXCLUDED applied
  fi
fi

typed=$(git log -20 --format='%s' 2>/dev/null |
        grep -ciE '^(feat|feature|fix|bugfix|hotfix|refactor|perf|chore|docs|test|build|ci)' || true)
[ "${typed:-0}" -ge 5 ] && ti_kv TEAM_COMMIT_CONVENTION conventional || ti_kv TEAM_COMMIT_CONVENTION other

ti_kv PREFLIGHT ready
printf -- '--- steps ---\n'
printf '%s\n' "$steps" | grep -n . || true

if [ "$(git status --porcelain | grep -v -- "$rel_plan" | grep -c . || true)" -gt 0 ]; then
  git status --short | head -20 >&2
  ti_die "uncommitted changes outside the plan file — commit, stash or fold them into this step before continuing" "$TI_E_DIRTY"
fi
