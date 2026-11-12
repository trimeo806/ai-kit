#!/usr/bin/env bash
set -euo pipefail
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
. "$HERE/lib.sh"

usage() {
  cat <<'EOF'
Usage:
  draft_pr.sh [--title <text>]
  draft_pr.sh --what <file> [--requirement <file> | --why <text>] [--notes <file>] [--title <text>]

--requirement  max 3 bullets x 120 chars: the business need, in the user's terms
--what         max 5 bullets x 120 chars: behavioural changes in this repo (rendered as Solution)
--why          max 240 chars: fallback when there is no requirement; excludes --requirement
--notes        optional, max 3 bullets x 120 chars: where a reviewer should look first
Without --what it renders a REPLACE ME scaffold, never for a real PR.
Writes <git-dir>/pr-review/pr-title.txt and pr-body.md. Exits: 0 ok · 1 usage or budget violation
EOF
}

BULLET_MAX=120 WHAT_MAX=5 NOTES_MAX=3 REQ_MAX=3 WHY_MAX=240

title='' what_file='' why='' notes_file='' req_file=''
while [ $# -gt 0 ]; do
  case "$1" in
    --title) title=$2; shift ;;
    --what) what_file=$2; shift ;;
    --why) why=$2; shift ;;
    --notes) notes_file=$2; shift ;;
    --requirement) req_file=$2; shift ;;
    -h|--help) usage; exit 0 ;;
    *) ak_die "unknown option '$1'" ;;
  esac
  shift
done

ak_load_context
wd=$(ak_workdir)
tgt=$AK_TARGET_BRANCH
range="origin/$tgt..HEAD"

read_bullets() {
  local file=$1 cap=$2 label=$3 n=0 line
  [ -f "$file" ] || ak_die "--$label file '$file' does not exist"
  while IFS= read -r line || [ -n "$line" ]; do
    line=$(printf '%s' "$line" | sed 's/^[[:space:]]*[-*][[:space:]]*//; s/^[[:space:]]*//; s/[[:space:]]*$//')
    [ -n "$line" ] || continue
    n=$((n + 1))
    [ "$n" -le "$cap" ] || ak_die "--$label has more than $cap bullets — merge or drop the rest"
    [ "${#line}" -le "$BULLET_MAX" ] || ak_die "--$label bullet $n is ${#line} chars, the limit is $BULLET_MAX: $line"
    printf -- '- %s\n' "$line"
  done <"$file"
  [ "$n" -gt 0 ] || ak_die "--$label file is empty"
}

ticket=$(ak_ticket_from "$AK_SOURCE_BRANCH")

n_commits=$(git rev-list --count "$range")
if [ -z "$title" ]; then
  if [ "$n_commits" = "1" ]; then
    title=$(git log -1 --format='%s')
  else
    rest=$(printf '%s' "$AK_SOURCE_BRANCH" | sed -E 's#^[^/]+/##')
    if [ -n "$ticket" ]; then
      rest=$("$(ak_py)" -c 'import re,sys; print(re.sub(re.escape(sys.argv[2]), "", sys.argv[1], count=1, flags=re.I).lstrip("-_/"))' "$rest" "$ticket")
      title="$ticket $(printf '%s' "$rest" | sed -E 's/[-_]+/ /g')"
    else
      title=$(printf '%s' "$rest" | sed -E 's/[-_]+/ /g')
    fi
    title=$(printf '%s' "$title" | sed 's/[[:space:]]*$//')
  fi
fi

kind=$(git log --format='%s' "$range" |
       grep -oiE '^(feat|feature|fix|bugfix|hotfix|refactor|perf|chore|docs|test|build|ci)' |
       head -1 | tr 'A-Z' 'a-z' || true)
if [ -z "$kind" ]; then
  case "$AK_SOURCE_BRANCH" in
    feature/*|feat/*) kind=feat ;;
    fix/*|bugfix/*|hotfix/*) kind=fix ;;
    refactor/*) kind=refactor ;;
    chore/*) kind=chore ;;
    docs/*) kind=docs ;;
  esac
fi
case "$kind" in feature) kind=feat ;; bugfix|hotfix) kind=fix ;; esac

shortstat=$(git diff --merge-base "origin/$tgt" HEAD --shortstat || true)
n_files=$(printf '%s' "$shortstat" | grep -oE '[0-9]+ file' | grep -oE '[0-9]+' || echo 0)
n_ins=$(printf '%s' "$shortstat" | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo 0)
n_del=$(printf '%s' "$shortstat" | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo 0)
meta=''
if [ -n "$ticket" ]; then meta="**$ticket**"; fi
if [ -n "$kind" ]; then meta="${meta:+$meta · }$kind"; fi
if [ "${n_files:-0}" = 1 ]; then files_word=file; else files_word=files; fi
meta="${meta:+$meta · }${n_files:-0} $files_word · +${n_ins:-0}/−${n_del:-0}"

mode=final
if [ -n "$what_file" ]; then
  what=$(read_bullets "$what_file" "$WHAT_MAX" what)
else
  mode=scaffold
  what='- REPLACE ME: one behavioural change per bullet, in the reviewer'"'"'s terms.'
fi
if [ -n "$why" ]; then
  why=$(printf '%s' "$why" | tr '\n' ' ' | sed 's/  */ /g; s/^ //; s/ $//')
  [ "${#why}" -le "$WHY_MAX" ] || ak_die "--why is ${#why} chars, the limit is $WHY_MAX"
fi
notes=''
if [ -n "$notes_file" ]; then notes=$(read_bullets "$notes_file" "$NOTES_MAX" notes); fi
requirement=''
if [ -n "$req_file" ]; then
  [ -z "$why" ] || ak_die "--requirement and --why both given — pick one"
  requirement=$(read_bullets "$req_file" "$REQ_MAX" requirement)
fi

printf '%s' "$title" >"$wd/pr-title.txt"
{
  printf '%s\n\n' "$meta"
  if [ -n "$requirement" ]; then printf '### Business requirement\n\n%s\n\n' "$requirement"; fi
  if [ -n "$why" ]; then printf '### Why\n\n%s\n\n' "$why"; fi
  printf '### Solution\n\n%s\n' "$what"
  if [ -n "$notes" ]; then printf '\n### Reviewer notes\n\n%s\n' "$notes"; fi
} >"$wd/pr-body.md"

ak_kv TITLE_FILE "$wd/pr-title.txt"
ak_kv BODY_FILE "$wd/pr-body.md"
ak_kv TITLE "$title"
ak_kv MODE "$mode"
ak_kv META "$meta"
ak_kv TICKET "$ticket"
ak_kv KIND "$kind"
ak_kv FILES_CHANGED "${n_files:-0}"
ak_kv COMMITS "$n_commits"
ak_kv SOURCE_BRANCH "$AK_SOURCE_BRANCH"
ak_kv TARGET_BRANCH "$tgt"
echo "--- pr-body.md ---"
cat "$wd/pr-body.md"
