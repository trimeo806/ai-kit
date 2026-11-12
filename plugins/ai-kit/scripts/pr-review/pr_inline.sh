#!/usr/bin/env bash
set -euo pipefail
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
. "$HERE/lib.sh"

usage() {
  cat <<'EOF'
Usage:
  pr_inline.sh info <pr-url | pr-id>
  pr_inline.sh post <pr-url | pr-id> --file <drafts.json> [--reviewer <name>] [--dry-run]

Works on any open PR from its URL (GitHub, GitLab, Bitbucket Cloud, Azure DevOps); never checks
out, fetches into or pushes the author's branch. A bare id needs to run inside the repo.
drafts.json: {"commit": "<sha>", "inline": [{"id","path","line"|"from_line","content"}],
              "general": [{"id","content"}]}
post refuses when the PR is not open, its head moved past the drafts' commit, or an anchor is
not on a line of the PR diff. Drafts already on the PR with the same text are skipped.
Exits: 0 ok · 1 usage / bad anchors · 2 prerequisite missing · 6 PR moved or not open
EOF
}

cmd=${1:-}; shift || true
case "$cmd" in
  -h|--help|'') usage; [ -n "$cmd" ] && exit 0 || exit "$AK_E_USAGE" ;;
  info|post) ;;
  *) usage; ak_die "unknown subcommand '$cmd'" ;;
esac
ref=${1:-}; shift || true
[ -n "$ref" ] || ak_die "usage: pr_inline.sh $cmd <pr-url | pr-id>"
py=$(ak_py)

in_repo=0
git rev-parse --git-dir >/dev/null 2>&1 && in_repo=1

host='' hostname='' repo='' pr_id=''
case "$ref" in
  http*://*)
    hostname=$(printf '%s' "$ref" | sed -E 's#^[a-z]+://##; s#/.*##')
    path=$(printf '%s' "$ref" | sed -E 's#^[a-z]+://[^/]+/##; s#[?\#].*##')
    case "$path" in
      */-/merge_requests/*) host=gitlab; repo=${path%%/-/merge_requests/*}; pr_id=${path##*/-/merge_requests/} ;;
      */pull-requests/*) host=bitbucket; repo=${path%%/pull-requests/*}; pr_id=${path##*/pull-requests/} ;;
      */pullrequest/*) host=azure-devops; repo=${path%%/pullrequest/*}; pr_id=${path##*/pullrequest/} ;;
      */pull/*) host=github; repo=${path%%/pull/*}; pr_id=${path##*/pull/} ;;
      *) ak_die "'$ref' is not a recognised PR or merge request URL" ;;
    esac
    pr_id=${pr_id%%/*}
    AK_REMOTE_HOSTNAME=$hostname
    ;;
  *[!0-9]*) ak_die "'$ref' is neither a PR URL nor a PR id" ;;
  *)
    [ "$in_repo" -eq 1 ] || ak_die "a bare PR id needs to run inside the repo — pass the PR URL instead" "$AK_E_PREREQ"
    AK_WS_FILE=$(ak_workspace_file)
    ak_parse_remote "$(git remote get-url origin)"
    host=${AI_KIT_VCS_HOST:-$(ak_ws vcs.host)}
    [ -n "$host" ] || host=$(ak_host_from_url "$(git remote get-url origin)")
    hostname=$AK_REMOTE_HOSTNAME repo=$AK_REPO_PATH pr_id=$ref
    ;;
esac
case "$pr_id" in ''|*[!0-9]*) ak_die "could not read a PR id out of '$ref'" ;; esac

case "$host" in
  github) ak_need gh "Install the GitHub CLI and run gh auth login."
          case "$hostname" in *github.com) hostname=github.com ;; esac ;;
  gitlab) ak_need glab "Install the GitLab CLI and run glab auth login." ;;
  azure-devops) ak_need az "Install the Azure CLI with the azure-devops extension and run az login."
                ak_az_parts "$repo"
                [ "$in_repo" -eq 1 ] || ak_die "Azure DevOps PRs are diffed from the local clone — run this inside the repo" "$AK_E_PREREQ" ;;
  bitbucket) ak_need curl ;;
  *) ak_die "unsupported VCS host '$host'" "$AK_E_PREREQ" ;;
esac

slug=$(ak_slug "$host-$repo-$pr_id")
if [ "$in_repo" -eq 1 ]; then
  wd="$(git rev-parse --absolute-git-dir)/pr-review/pr-$pr_id"
else
  wd="${TMPDIR:-/tmp}/pr-review-$slug"
fi
mkdir -p "$wd"

enc_repo=$(ak_urlencode "$repo")
bb_pr="$AK_BB_API/repositories/$repo/pullrequests/$pr_id"
gh_api() { gh api --hostname "$hostname" "$@"; }
gl_api() { glab api --hostname "$hostname" "$@"; }
az_threads() {
  local method=$1; shift
  az devops invoke --area git --resource pullRequestThreads --org "$AK_AZ_ORG" \
    --route-parameters project="$AK_AZ_PROJECT" repositoryId="$AK_AZ_REPO" pullRequestId="$pr_id" \
    --http-method "$method" --api-version 7.1 -o json "$@"
}

raw="$wd/pr-raw.json"
case "$host" in
  github) gh_api "repos/$repo/pulls/$pr_id" >"$raw" ;;
  gitlab) gl_api "projects/$enc_repo/merge_requests/$pr_id" >"$raw" ;;
  azure-devops) az repos pr show --id "$pr_id" --org "$AK_AZ_ORG" -o json >"$raw" ;;
  bitbucket) ak_bb_get "$bb_pr" "$raw" ;;
esac

az_base=''
[ "$host" != azure-devops ] || az_base="$AK_AZ_ORG/$AK_AZ_PROJECT/_git/$AK_AZ_REPO"
"$py" - "$host" "$raw" "$wd/pr.json" "$ref" "$az_base" "$pr_id" <<'PY'
import json, sys
host, raw_f, out_f, ref, az_base, pr_id = sys.argv[1:7]
r = json.load(open(raw_f, encoding="utf-8"))
def g(d, *ks):
    for k in ks:
        d = d.get(k) if isinstance(d, dict) else None
    return d
if host == "github":
    state = "MERGED" if r.get("merged_at") else ("OPEN" if r.get("state") == "open" else "CLOSED")
    n = dict(url=r.get("html_url"), title=r.get("title"), description=r.get("body") or "", state=state,
             source_branch=g(r, "head", "ref"), source_commit=g(r, "head", "sha"),
             target_branch=g(r, "base", "ref"), target_commit=g(r, "base", "sha"), author=g(r, "user", "login"))
elif host == "gitlab":
    state = {"opened": "OPEN", "merged": "MERGED"}.get(r.get("state"), "CLOSED")
    n = dict(url=r.get("web_url"), title=r.get("title"), description=r.get("description") or "", state=state,
             source_branch=r.get("source_branch"), source_commit=r.get("sha"),
             target_branch=r.get("target_branch"), target_commit=g(r, "diff_refs", "base_sha"),
             author=g(r, "author", "username"), diff_refs=r.get("diff_refs") or {})
elif host == "azure-devops":
    state = {"active": "OPEN", "completed": "MERGED"}.get(r.get("status"), "CLOSED")
    strip = lambda s: (s or "").replace("refs/heads/", "", 1)
    n = dict(url=f"{az_base}/pullrequest/{pr_id}", title=r.get("title"), description=r.get("description") or "",
             state=state, source_branch=strip(r.get("sourceRefName")),
             source_commit=g(r, "lastMergeSourceCommit", "commitId"), target_branch=strip(r.get("targetRefName")),
             target_commit=g(r, "lastMergeTargetCommit", "commitId"), author=g(r, "createdBy", "displayName"))
else:
    n = dict(url=g(r, "links", "html", "href") or ref, title=r.get("title"), description=r.get("description") or "",
             state=r.get("state"), source_branch=g(r, "source", "branch", "name"),
             source_commit=g(r, "source", "commit", "hash"), target_branch=g(r, "destination", "branch", "name"),
             target_commit=g(r, "destination", "commit", "hash"), author=g(r, "author", "display_name"))
n.update(host=host, id=pr_id)
json.dump(n, open(out_f, "w", encoding="utf-8"), indent=1)
PY

pr="$wd/pr.json"
ak_kv VCS_HOST "$host"
ak_kv PR_ID "$pr_id"
ak_kv REPO "$repo"
ak_kv PR_URL "$(ak_json_get "$pr" url)"
ak_kv STATE "$(ak_json_get "$pr" state)"
ak_kv SOURCE_BRANCH "$(ak_json_get "$pr" source_branch)"
ak_kv SOURCE_COMMIT "$(ak_json_get "$pr" source_commit)"
ak_kv TARGET_BRANCH "$(ak_json_get "$pr" target_branch)"
ak_kv TARGET_COMMIT "$(ak_json_get "$pr" target_commit)"
ak_kv AUTHOR "$(ak_json_get "$pr" author)"
ak_kv WORKDIR "$wd"

[ "$cmd" = post ] || exit 0

file='' dry=0 reviewer=''
while [ $# -gt 0 ]; do
  case "$1" in
    --file) file=$2; shift ;;
    --reviewer) reviewer=$2; shift ;;
    --dry-run) dry=1 ;;
    *) ak_die "unknown option '$1'" ;;
  esac
  shift
done
[ -n "$file" ] && [ -f "$file" ] || ak_die "--file must point to an existing drafts JSON file"

diff="$wd/pr.diff" existing="$wd/comments-existing.json"
case "$host" in
  github)
    gh_api -H 'Accept: application/vnd.github.v3.diff' "repos/$repo/pulls/$pr_id" >"$diff"
    { gh_api --paginate "repos/$repo/pulls/$pr_id/comments"; gh_api --paginate "repos/$repo/issues/$pr_id/comments"; } >"$existing" ;;
  gitlab)
    glab mr diff "$pr_id" --raw -R "$hostname/$repo" >"$diff"
    gl_api --paginate "projects/$enc_repo/merge_requests/$pr_id/notes?per_page=100" >"$existing" ;;
  azure-devops)
    src=$(ak_json_get "$pr" source_branch) tgt=$(ak_json_get "$pr" target_branch) head=$(ak_json_get "$pr" source_commit)
    git fetch --quiet origin "refs/heads/$src" "refs/heads/$tgt:refs/remotes/origin/$tgt"
    git diff "$(git merge-base "origin/$tgt" "$head")" "$head" >"$diff"
    az_threads GET >"$existing" ;;
  bitbucket)
    ak_bb_get "$bb_pr/diff" "$diff"
    : >"$existing"
    next="$bb_pr/comments?pagelen=100" page=0
    while [ -n "$next" ]; do
      page=$((page + 1))
      ak_bb_get "$next" "$wd/comments-$page.json"
      cat "$wd/comments-$page.json" >>"$existing"
      next=$(ak_json_get "$wd/comments-$page.json" next)
    done ;;
esac

payloads="$wd/inline-payloads.jsonl"
rc=0
"$py" - "$host" "$file" "$pr" "$diff" "$existing" "$payloads" "$reviewer" <<'PY' >"$wd/plan.env" || rc=$?
import json, re, sys
host, drafts_f, pr_f, diff_f, existing_f, out_f, reviewer = sys.argv[1:8]
drafts = json.load(open(drafts_f, encoding="utf-8"))
pr = json.load(open(pr_f, encoding="utf-8"))

def kv(k, v): print(f"{k}={v}")

def stream(path):
    text = open(path, encoding="utf-8").read()
    dec, i, out = json.JSONDecoder(), 0, []
    while True:
        while i < len(text) and text[i].isspace():
            i += 1
        if i >= len(text):
            return out
        v, i = dec.raw_decode(text, i)
        out.append(v)

head = pr.get("source_commit") or ""
want = str(drafts.get("commit") or "")
kv("PR_HEAD", head)
if pr.get("state") != "OPEN":
    kv("REFUSED", f"pr-state-{pr.get('state')}"); sys.exit(6)
if not want or not head or not (head.startswith(want) or want.startswith(head)):
    kv("REFUSED", "commit-moved"); kv("DRAFT_COMMIT", want or "missing"); sys.exit(6)

new_lines, old_lines, ctx_old, old_path_of = {}, {}, {}, {}
path_old = path_new = None
o = n = 0
for line in open(diff_f, encoding="utf-8", errors="replace").read().splitlines():
    if line.startswith("diff --git "):
        path_old = path_new = None
        continue
    if line.startswith("--- "):
        p = line[4:].split("\t")[0]
        path_old = None if p == "/dev/null" else re.sub(r"^a/", "", p)
        continue
    if line.startswith("+++ "):
        p = line[4:].split("\t")[0]
        path_new = None if p == "/dev/null" else re.sub(r"^b/", "", p)
        if path_new:
            old_path_of[path_new] = path_old or path_new
        continue
    m = re.match(r"^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@", line)
    if m:
        o, n = int(m.group(1)), int(m.group(2))
        continue
    if path_old is None and path_new is None:
        continue
    if line.startswith("+"):
        new_lines.setdefault(path_new, set()).add(n); n += 1
    elif line.startswith("-"):
        old_lines.setdefault(path_old, set()).add(o); o += 1
    elif line.startswith(" ") or line == "":
        new_lines.setdefault(path_new, set()).add(n)
        old_lines.setdefault(path_old, set()).add(o)
        ctx_old[(path_new, n)] = o
        o += 1; n += 1

def bare(raw):
    return re.sub(r"\n+_Review by [^\n]*_\s*$", "", (raw or "").strip()).strip()

existing = set()
for page in stream(existing_f) if open(existing_f, encoding="utf-8").read().strip() else []:
    items = page.get("values", page.get("value", [])) if isinstance(page, dict) else page
    for c in items:
        if host == "github":
            if c.get("path"):
                side_line = c.get("line") or c.get("original_line")
                to, frm = (None, side_line) if c.get("side") == "LEFT" else (side_line, None)
                existing.add((c["path"], to, frm, bare(c.get("body"))))
            else:
                existing.add((None, None, None, bare(c.get("body"))))
        elif host == "gitlab":
            if c.get("system"):
                continue
            pos = c.get("position") or {}
            if pos:
                to = pos.get("new_line"); frm = None if to else pos.get("old_line")
                existing.add((pos.get("new_path"), to, frm, bare(c.get("body"))))
            else:
                existing.add((None, None, None, bare(c.get("body"))))
        elif host == "azure-devops":
            ctx = c.get("threadContext") or {}
            first = (c.get("comments") or [{}])[0]
            if ctx.get("filePath"):
                to = (ctx.get("rightFileStart") or {}).get("line")
                frm = None if to else (ctx.get("leftFileStart") or {}).get("line")
                existing.add((ctx["filePath"].lstrip("/"), to, frm, bare(first.get("content"))))
            else:
                existing.add((None, None, None, bare(first.get("content"))))
        else:
            if c.get("deleted"):
                continue
            i = c.get("inline") or {}
            raw = (c.get("content") or {}).get("raw", "")
            existing.add((i.get("path"), i.get("to"), i.get("from"), bare(raw)))

def inline_body(path, to, frm, text):
    if host == "github":
        return {"body": text, "commit_id": head, "path": path,
                "line": to if to is not None else frm, "side": "RIGHT" if to is not None else "LEFT"}
    if host == "gitlab":
        refs = pr.get("diff_refs") or {}
        pos = {"position_type": "text", "base_sha": refs.get("base_sha"), "start_sha": refs.get("start_sha"),
               "head_sha": refs.get("head_sha"), "new_path": path, "old_path": old_path_of.get(path, path)}
        if to is not None:
            pos["new_line"] = to
            if (path, to) in ctx_old:
                pos["old_line"] = ctx_old[(path, to)]
        else:
            pos["old_line"] = frm
        return {"body": text, "position": pos}
    if host == "azure-devops":
        side = "rightFile" if to is not None else "leftFile"
        ln = to if to is not None else frm
        return {"comments": [{"parentCommentId": 0, "content": text, "commentType": 1}], "status": 1,
                "threadContext": {"filePath": "/" + path, side + "Start": {"line": ln, "offset": 1},
                                  side + "End": {"line": ln, "offset": 1}}}
    inline = {"path": path, "to": to} if to is not None else {"path": path, "from": frm}
    return {"content": {"raw": text}, "inline": inline}

def general_body(text):
    if host in ("github", "gitlab"):
        return {"body": text}
    if host == "azure-devops":
        return {"comments": [{"parentCommentId": 0, "content": text, "commentType": 1}], "status": 1}
    return {"content": {"raw": text}}

footer = f"\n\n_Review by {reviewer}_" if reviewer else ""
bad, todo, skipped = [], [], 0
for d in drafts.get("inline", []):
    path, to, frm = d.get("path"), d.get("line"), d.get("from_line")
    label = d.get("id") or f"{path}:{to or frm}"
    if not path or not d.get("content") or (to is None) == (frm is None):
        bad.append(f"{label}(needs path, content and exactly one of line/from_line)"); continue
    ok = to in new_lines.get(path, ()) if to is not None else frm in old_lines.get(path, ())
    if not ok:
        bad.append(f"{label}@{path}:{to if to is not None else 'from ' + str(frm)}"); continue
    text = d["content"].strip() + footer
    if (path, to, frm, bare(text)) in existing:
        skipped += 1; continue
    todo.append({"id": label, "kind": "inline", "body": inline_body(path, to, frm, text)})
for d in drafts.get("general", []):
    label = d.get("id") or "general"
    if not d.get("content"):
        bad.append(f"{label}(empty content)"); continue
    text = d["content"].strip() + footer
    if (None, None, None, bare(text)) in existing:
        skipped += 1; continue
    todo.append({"id": label, "kind": "general", "body": general_body(text)})

kv("TO_POST", len(todo))
kv("SKIPPED_DUPLICATE", skipped)
kv("BAD_ANCHORS", ",".join(bad))
if bad:
    sys.exit(1)
with open(out_f, "w", encoding="utf-8") as out:
    for t in todo:
        out.write(json.dumps(t) + "\n")
PY
cat "$wd/plan.env"
case "$rc" in
  0) ;;
  6) ak_die "not posting: the PR is not open or its head moved past the drafts' commit — re-anchor the drafts on PR_HEAD and confirm again" "$AK_E_ASK" ;;
  1) ak_die "not posting: anchors not on a line of the PR diff (BAD_ANCHORS) — move them to a changed line or into general" ;;
  *) ak_die "validating the drafts failed (python exit $rc)" ;;
esac
ak_kv PAYLOAD_FILE "$payloads"

if [ "$dry" -eq 1 ]; then ak_kv DRY_RUN yes; exit 0; fi

post_one() {
  local kind=$1 body=$2 resp=$3
  case "$host" in
    github)
      if [ "$kind" = inline ]; then gh_api -X POST --input "$body" "repos/$repo/pulls/$pr_id/comments" >"$resp"
      else gh_api -X POST --input "$body" "repos/$repo/issues/$pr_id/comments" >"$resp"; fi ;;
    gitlab)
      if [ "$kind" = inline ]; then gl_api --method POST --header 'Content-Type: application/json' --input "$body" "projects/$enc_repo/merge_requests/$pr_id/discussions" >"$resp"
      else gl_api --method POST --header 'Content-Type: application/json' --input "$body" "projects/$enc_repo/merge_requests/$pr_id/notes" >"$resp"; fi ;;
    azure-devops) az_threads POST --in-file "$body" >"$resp" ;;
    bitbucket)
      local code
      code=$(ak_bb -o "$resp" -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
        --data-binary @"$body" "$bb_pr/comments") || return 1
      case "$code" in 200|201) ;; *) return 1 ;; esac ;;
  esac
}

posted_f="$wd/inline-posted.tsv"
: >"$posted_f"
posted=0
while IFS= read -r row; do
  [ -n "$row" ] || continue
  id=$(printf '%s' "$row" | "$py" -c 'import json,sys; print(json.load(sys.stdin)["id"])')
  kind=$(printf '%s' "$row" | "$py" -c 'import json,sys; print(json.load(sys.stdin)["kind"])')
  printf '%s' "$row" | "$py" -c 'import json,sys; print(json.dumps(json.load(sys.stdin)["body"]))' >"$wd/one.json"
  if ! post_one "$kind" "$wd/one.json" "$wd/one-response.json"; then
    ak_kv POSTED "$posted"
    ak_kv FAILED_AT "$id"
    ak_kv POSTED_FILE "$posted_f"
    head -c 600 "$wd/one-response.json" >&2 2>/dev/null; echo >&2
    ak_die "posting '$id' failed after $posted comment(s) — re-run post: what landed is skipped as a duplicate"
  fi
  printf '%s\t%s\n' "$id" "$(ak_json_get "$wd/one-response.json" id)" >>"$posted_f"
  posted=$((posted + 1))
done <"$payloads"
ak_kv POSTED "$posted"
ak_kv POSTED_FILE "$posted_f"
