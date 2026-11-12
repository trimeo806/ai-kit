#!/usr/bin/env bash
set -euo pipefail
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
. "$HERE/lib.sh"

usage() {
  cat <<'EOF'
Usage:
  pr.sh create --title <text> --body-file <file> [--target <branch>] [--reviewers a,b] [--no-push] [--dry-run]
  pr.sh conflicts <pr-id>
  pr.sh comment <pr-id> --file <markdown-file> [--dry-run]
  pr.sh add-reviewers <pr-id> --reviewers <a,b>
  pr.sh checks <pr-id> [--wait] [--timeout 420] [--interval 15]
  pr.sh upload <file>... [--dry-run]

Dispatches on vcs.host from .ai-kit/workspace.json (or AI_KIT_VCS_HOST, or the origin URL):
github → gh · gitlab → glab · azure-devops → az · bitbucket → REST with BITBUCKET_TOKEN.
create reuses an open PR from this branch to the target and never writes to it.
Exits: 0 ok · 2 prerequisite · 5 host reports a conflict · 7 checks still running · 9 not available
EOF
}

cmd=${1:-}; shift || true
case "$cmd" in
  -h|--help|'') usage; [ -n "$cmd" ] && exit 0 || exit "$AK_E_USAGE" ;;
esac

ak_load_context
wd=$(ak_workdir)
py=$(ak_py)
host=$AK_HOST
ak_kv VCS_HOST "$host"

need_host_cli() {
  case "$host" in
    github) ak_need gh "Install the GitHub CLI and run gh auth login." ;;
    gitlab) ak_need glab "Install the GitLab CLI and run glab auth login." ;;
    azure-devops) ak_need az "Install the Azure CLI with the azure-devops extension and run az login."; ak_az_parts "$AK_REPO_PATH" ;;
    bitbucket) ak_need curl ;;
    *) ak_die "no supported VCS host ('$host'). Set vcs.host in .ai-kit/workspace.json, or open the PR by hand with the rendered title and body." "$AK_E_PREREQ" ;;
  esac
}

bb_repo="$AK_BB_API/repositories/$AK_REPO_PATH"

az_threads() {
  local method=$1 pr_id=$2; shift 2
  az devops invoke --area git --resource pullRequestThreads --org "$AK_AZ_ORG" \
    --route-parameters project="$AK_AZ_PROJECT" repositoryId="$AK_AZ_REPO" pullRequestId="$pr_id" \
    --http-method "$method" --api-version 7.1 -o json "$@"
}

first_field() { "$py" - "$1" "$2" <<'PY'
import json, sys
try:
    d = json.load(open(sys.argv[1], encoding="utf-8"))
except Exception:
    sys.exit(0)
if isinstance(d, dict) and "values" in d:
    d = d["values"]
if isinstance(d, dict) and "value" in d and isinstance(d["value"], list):
    d = d["value"]
if isinstance(d, list):
    d = d[0] if d else {}
cur = d
for k in sys.argv[2].split("."):
    cur = cur.get(k) if isinstance(cur, dict) else None
if cur is not None:
    print(cur)
PY
}

case "$cmd" in

create)
  title='' body_file='' target='' push=1 dry=0 reviewers=''
  while [ $# -gt 0 ]; do
    case "$1" in
      --title) title=$2; shift ;;
      --body-file) body_file=$2; shift ;;
      --target) target=$2; shift ;;
      --reviewers) reviewers=$2; shift ;;
      --no-push) push=0 ;;
      --dry-run) dry=1; push=0 ;;
      *) ak_die "unknown option '$1'" ;;
    esac
    shift
  done
  [ -n "$title" ] || ak_die "--title is required"
  [ -n "$body_file" ] && [ -f "$body_file" ] || ak_die "--body-file must point to an existing file"
  target=${target:-$AK_TARGET_BRANCH}
  src=$AK_SOURCE_BRANCH

  if [ "$dry" -eq 1 ]; then
    ak_kv DRY_RUN yes
    ak_kv SOURCE_BRANCH "$src"
    ak_kv TARGET_BRANCH "$target"
    ak_kv TITLE "$title"
    ak_kv REVIEWERS "$reviewers"
    exit 0
  fi
  need_host_cli

  if [ "$push" -eq 1 ]; then git push -u origin HEAD >&2; ak_kv PUSHED yes; else ak_kv PUSHED skipped; fi

  existing="$wd/pr-existing.json" created="$wd/pr-create-response.json"
  pr_id='' pr_url='' state=''
  case "$host" in
    github)
      gh pr list --head "$src" --base "$target" --state open --json number,url --limit 1 >"$existing" ||
        ak_die "could not look up an open PR for this branch — not creating one blind"
      pr_id=$(first_field "$existing" number)
      if [ -n "$pr_id" ]; then
        state=existing; pr_url=$(first_field "$existing" url)
      else
        args=(--title "$title" --body-file "$body_file" --base "$target" --head "$src")
        [ -z "$reviewers" ] || args+=(--reviewer "$reviewers")
        pr_url=$(gh pr create "${args[@]}" | tail -1)
        gh pr view "$pr_url" --json number,url >"$created"
        pr_id=$(first_field "$created" number); state=created
      fi ;;
    gitlab)
      glab api "projects/:id/merge_requests?state=opened&source_branch=$(ak_urlencode "$src")&target_branch=$(ak_urlencode "$target")" >"$existing" ||
        ak_die "could not look up an open merge request for this branch — not creating one blind"
      pr_id=$(first_field "$existing" iid)
      if [ -n "$pr_id" ]; then
        state=existing; pr_url=$(first_field "$existing" web_url)
      else
        payload="$wd/pr-create.json"
        "$py" - "$src" "$target" "$title" "$body_file" >"$payload" <<'PY'
import json, sys
src, tgt, title, body = sys.argv[1:5]
print(json.dumps({"source_branch": src, "target_branch": tgt, "title": title,
                  "description": open(body, encoding="utf-8").read(), "remove_source_branch": True}))
PY
        glab api --method POST --header 'Content-Type: application/json' --input "$payload" \
          projects/:id/merge_requests >"$created"
        pr_id=$(first_field "$created" iid); pr_url=$(first_field "$created" web_url); state=created
      fi ;;
    azure-devops)
      az repos pr list --source-branch "$src" --target-branch "$target" --status active -o json >"$existing" ||
        ak_die "could not look up an open pull request for this branch — not creating one blind"
      pr_id=$(first_field "$existing" pullRequestId)
      if [ -n "$pr_id" ]; then
        state=existing
      else
        args=(--source-branch "$src" --target-branch "$target" --title "$title" --description "$(cat "$body_file")" -o json)
        if [ -n "$reviewers" ]; then IFS=, read -r -a rv <<<"$reviewers"; args+=(--reviewers "${rv[@]}"); fi
        az repos pr create "${args[@]}" >"$created"
        pr_id=$(first_field "$created" pullRequestId); state=created
      fi
      pr_url="$AK_AZ_ORG/$AK_AZ_PROJECT/_git/$AK_AZ_REPO/pullrequest/$pr_id" ;;
    bitbucket)
      code=$(ak_bb -o "$existing" -w '%{http_code}' --get \
        --data-urlencode "q=source.branch.name=\"$src\" AND destination.branch.name=\"$target\" AND state=\"OPEN\"" \
        "$bb_repo/pullrequests") || ak_die "could not ask Bitbucket for an open PR on this branch — not creating one blind"
      [ "$code" = 200 ] || { head -c 600 "$existing" >&2; echo >&2; ak_die "the open-PR lookup failed (HTTP $code) — not creating one blind, since a create would overwrite an open PR" "$AK_E_PREREQ"; }
      pr_id=$(first_field "$existing" id)
      if [ -n "$pr_id" ]; then
        state=existing; pr_url=$(first_field "$existing" links.html.href)
      else
        payload="$wd/pr-create.json"
        "$py" - "$src" "$target" "$title" "$body_file" "$reviewers" >"$payload" <<'PY'
import json, sys
src, tgt, title, body, rv = sys.argv[1:6]
p = {"title": title, "description": open(body, encoding="utf-8").read(),
     "source": {"branch": {"name": src}}, "destination": {"branch": {"name": tgt}},
     "close_source_branch": True}
r = [x.strip() for x in rv.split(",") if x.strip()]
if r:
    p["reviewers"] = [{"uuid": x} if x.startswith("{") else {"account_id": x} for x in r]
print(json.dumps(p))
PY
        code=$(ak_bb -o "$created" -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
          --data-binary @"$payload" "$bb_repo/pullrequests")
        case "$code" in
          200|201) ;;
          401|403) head -c 600 "$created" >&2; echo >&2; ak_die "Bitbucket rejected the create ($code): the token needs pullrequest:write" "$AK_E_PREREQ" ;;
          *) head -c 600 "$created" >&2; echo >&2; ak_die "could not create the PR (HTTP $code)" ;;
        esac
        pr_id=$(first_field "$created" id); pr_url=$(first_field "$created" links.html.href); state=created
      fi ;;
  esac
  [ -n "$pr_id" ] || ak_die "the PR was created or found but its id could not be read (see $wd)"
  ak_kv PR_STATE "$state"
  ak_kv PR_ID "$pr_id"
  ak_kv PR_URL "$pr_url"
  ak_kv SOURCE_BRANCH "$src"
  ak_kv TARGET_BRANCH "$target"
  ;;

conflicts)
  pr_id=${1:-}; [ -n "$pr_id" ] || ak_die "usage: pr.sh conflicts <pr-id>"
  need_host_cli
  f="$wd/pr-merge-state.json" status=unknown
  case "$host" in
    github)
      gh pr view "$pr_id" --json mergeable >"$f"
      case "$(ak_json_get "$f" mergeable)" in CONFLICTING) status=conflict ;; MERGEABLE) status=none ;; esac ;;
    gitlab)
      glab api "projects/:id/merge_requests/$pr_id" >"$f"
      case "$(ak_json_get "$f" has_conflicts)" in true) status=conflict ;; false) status=none ;; esac ;;
    azure-devops)
      az repos pr show --id "$pr_id" -o json >"$f"
      case "$(ak_json_get "$f" mergeStatus)" in conflicts) status=conflict ;; succeeded) status=none ;; esac ;;
    bitbucket)
      ak_bb_get "$bb_repo/pullrequests/$pr_id/diffstat?pagelen=100" "$f"
      if [ "$(ak_count_matches '"status":[[:space:]]*"merge conflict"' "$f")" -gt 0 ]; then status=conflict; else status=none; fi ;;
  esac
  ak_kv CONFLICT "$status"
  [ "$status" != conflict ] ||
    ak_die "the host reports PR $pr_id as conflicted. Resolve it on the branch, push, then re-run — do not review or comment." "$AK_E_CONFLICT"
  ;;

comment)
  pr_id=${1:-}; shift || true
  file='' dry=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --file) file=$2; shift ;;
      --dry-run) dry=1 ;;
      *) ak_die "unknown option '$1'" ;;
    esac
    shift
  done
  [ -n "$pr_id" ] || ak_die "usage: pr.sh comment <pr-id> --file <markdown-file>"
  [ -n "$file" ] && [ -f "$file" ] || ak_die "--file must point to an existing markdown file"
  if [ "$dry" -eq 1 ]; then ak_kv DRY_RUN yes; ak_kv COMMENT_FILE "$file"; exit 0; fi
  need_host_cli
  resp="$wd/comment-response.json"
  case "$host" in
    github) gh pr comment "$pr_id" --body-file "$file" >"$resp" ;;
    gitlab)
      payload="$wd/comment.json"
      printf '{"body": %s}' "$(ak_json_string_from_file "$file")" >"$payload"
      glab api --method POST --header 'Content-Type: application/json' --input "$payload" \
        "projects/:id/merge_requests/$pr_id/notes" >"$resp" ;;
    azure-devops)
      payload="$wd/comment.json"
      printf '{"comments": [{"parentCommentId": 0, "content": %s, "commentType": 1}], "status": 1}' \
        "$(ak_json_string_from_file "$file")" >"$payload"
      az_threads POST "$pr_id" --in-file "$payload" >"$resp" ;;
    bitbucket)
      payload="$wd/comment.json"
      printf '{"content": {"raw": %s}}' "$(ak_json_string_from_file "$file")" >"$payload"
      code=$(ak_bb -o "$resp" -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
        --data-binary @"$payload" "$bb_repo/pullrequests/$pr_id/comments")
      case "$code" in 200|201) ;; *) head -c 600 "$resp" >&2; echo >&2; ak_die "posting the comment failed (HTTP $code)" ;; esac ;;
  esac
  ak_kv COMMENT_POSTED yes
  ;;

add-reviewers)
  pr_id=${1:-}; shift || true
  wanted=${AI_KIT_REVIEWERS:-}
  while [ $# -gt 0 ]; do
    case "$1" in
      --reviewers) wanted=$2; shift ;;
      *) ak_die "unknown option '$1'" ;;
    esac
    shift
  done
  [ -n "$pr_id" ] || ak_die "usage: pr.sh add-reviewers <pr-id> --reviewers <a,b>"
  if [ -z "$wanted" ]; then
    ak_kv REVIEWERS_ADDED 0
    ak_warn "no reviewers given — name them in the Git & PR section of the project rules"
    exit 0
  fi
  need_host_cli
  case "$host" in
    github) gh pr edit "$pr_id" --add-reviewer "$wanted" >&2 ;;
    gitlab) glab mr update "$pr_id" --reviewer "$(printf '%s' "$wanted" | sed 's/[^,][^,]*/+&/g')" >&2 ;;
    azure-devops) IFS=, read -r -a rv <<<"$wanted"; az repos pr reviewer add --id "$pr_id" --reviewers "${rv[@]}" -o none ;;
    bitbucket)
      current="$wd/pr-current.json" payload="$wd/pr-reviewers.json"
      ak_bb_get "$bb_repo/pullrequests/$pr_id" "$current"
      added=$("$py" - "$current" "$wanted" "$payload" <<'PY'
import json, sys
pr = json.load(open(sys.argv[1], encoding="utf-8"))
author = pr.get("author") or {}
skip = {author.get("uuid"), author.get("account_id")} - {None}
have = [{"uuid": r["uuid"]} for r in pr.get("reviewers", []) if r.get("uuid")]
seen = {r["uuid"] for r in have} | {r.get("account_id") for r in pr.get("reviewers", [])}
added = 0
for who in [x.strip() for x in sys.argv[2].split(",") if x.strip()]:
    if who in skip or who in seen:
        continue
    seen.add(who)
    have.append({"uuid": who} if who.startswith("{") else {"account_id": who})
    added += 1
json.dump({"title": pr.get("title") or "", "description": pr.get("description") or "",
           "reviewers": have}, open(sys.argv[3], "w", encoding="utf-8"))
print(added)
PY
)
      if [ "$added" != 0 ]; then
        code=$(ak_bb -o "$wd/pr-reviewers-response.json" -w '%{http_code}' -X PUT \
          -H 'Content-Type: application/json' --data-binary @"$payload" "$bb_repo/pullrequests/$pr_id")
        case "$code" in 200|201) ;; *) ak_die "adding reviewers failed (HTTP $code)" ;; esac
      fi ;;
  esac
  ak_kv REVIEWERS_REQUESTED "$wanted"
  ;;

checks)
  pr_id=${1:-}; shift || true
  wait=0 timeout=420 interval=15
  while [ $# -gt 0 ]; do
    case "$1" in
      --wait) wait=1 ;;
      --timeout) timeout=$2; shift ;;
      --interval) interval=$2; shift ;;
      *) ak_die "unknown option '$1'" ;;
    esac
    shift
  done
  [ -n "$pr_id" ] || ak_die "usage: pr.sh checks <pr-id> [--wait]"
  need_host_cli
  f="$wd/checks.json"
  fetch() {
    case "$host" in
      github) gh pr checks "$pr_id" --json name,bucket,link >"$f" 2>/dev/null || [ -s "$f" ] || echo '[]' >"$f" ;;
      gitlab) glab api "projects/:id/merge_requests/$pr_id/pipelines" >"$f" ;;
      azure-devops) az repos pr policy list --id "$pr_id" -o json >"$f" ;;
      bitbucket) ak_bb_get "$bb_repo/pullrequests/$pr_id/statuses?pagelen=100" "$f" ;;
    esac
  }
  classify() { "$py" - "$host" "$f" <<'PY'
import json, sys
host, f = sys.argv[1:3]
try:
    d = json.load(open(f, encoding="utf-8"))
except Exception:
    d = []
states, url = [], ""
if host == "github":
    for c in d:
        states.append({"pass": "passed", "skipping": "passed", "fail": "failed", "cancel": "failed"}.get(c.get("bucket"), "running"))
        url = url or c.get("link", "")
elif host == "gitlab":
    if d:
        s = d[0].get("status", "")
        states.append({"success": "passed", "skipped": "passed", "failed": "failed", "canceled": "failed"}.get(s, "running"))
        url = d[0].get("web_url", "")
elif host == "azure-devops":
    for p in d:
        if ((p.get("configuration") or {}).get("type") or {}).get("displayName") != "Build":
            continue
        s = p.get("status", "")
        states.append({"approved": "passed", "notApplicable": "passed", "rejected": "failed", "broken": "failed"}.get(s, "running"))
elif host == "bitbucket":
    for s in d.get("values", []):
        states.append({"SUCCESSFUL": "passed", "FAILED": "failed", "STOPPED": "failed"}.get(s.get("state"), "running"))
        url = url or s.get("url", "")
if not states:
    print("TESTS=not-run"); print("REASON=no CI checks reported on the PR")
elif "failed" in states:
    print("TESTS=failed")
elif "running" in states:
    print("TESTS=still-running")
else:
    print("TESTS=passed")
print(f"CHECKS_TOTAL={len(states)}")
print(f"CHECKS_URL={url}")
PY
  }
  start=$(date +%s)
  while :; do
    fetch
    result=$(classify)
    case "$result" in *TESTS=still-running*) ;; *) break ;; esac
    [ "$wait" -eq 1 ] && [ $(( $(date +%s) - start + interval )) -le "$timeout" ] || break
    sleep "$interval"
  done
  printf '%s\n' "$result"
  case "$result" in
    *TESTS=still-running*) exit "$AK_E_RUNNING" ;;
    *TESTS=not-run*) exit "$AK_E_NOTESTS" ;;
  esac
  ;;

upload)
  files=() dry=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --dry-run) dry=1 ;;
      -*) ak_die "unknown option '$1'" ;;
      *) files+=("$1") ;;
    esac
    shift
  done
  [ "${#files[@]}" -gt 0 ] || ak_die "usage: pr.sh upload <file>... [--dry-run]"
  [ "$host" = bitbucket ] ||
    ak_die "uploading evidence is only scripted for Bitbucket Downloads; on $host attach the files to the PR comment by hand" "$AK_E_NOTESTS"
  prefix="pr-evidence_$(ak_slug "$AK_SOURCE_BRANCH")_"
  base="https://bitbucket.org/$AK_REPO_PATH/downloads"
  seen=' '
  for f in "${files[@]}"; do
    [ -f "$f" ] || ak_die "upload: '$f' does not exist"
    case "$f" in *\;*|*\"*|*,*) ak_die "upload: '$f' has ; , or \" in its path — rename it first" ;; esac
    n=$(ak_slug "$(basename "$f")")
    case "$seen" in *" $n "*) ak_die "upload: two files are both named '$n'" ;; esac
    seen="$seen$n "
  done
  ak_kv UPLOAD_PREFIX "$prefix"
  ak_kv DOWNLOADS_BASE "$base"
  if [ "$dry" -eq 1 ]; then ak_kv DRY_RUN yes; exit 0; fi
  resp="$wd/upload-response.json" count=0
  for f in "${files[@]}"; do
    name="$prefix$(ak_slug "$(basename "$f")")"
    code=$(ak_bb -o "$resp" -w '%{http_code}' -X POST -F "files=@$f;filename=$name" "$bb_repo/downloads") || code=000
    case "$code" in
      200|201) count=$((count + 1)); ak_kv UPLOADED "$base/$name" ;;
      *) ak_kv UPLOADED_COUNT "$count"; ak_kv UPLOAD_FAILED "$f"
         ak_die "upload of '$f' failed (HTTP $code): the token needs repository:write and Downloads must be enabled. Attach the files by hand." "$AK_E_NOTESTS" ;;
    esac
  done
  ak_kv UPLOADED_COUNT "$count"
  ;;

*) usage; ak_die "unknown subcommand '$cmd'" ;;
esac
