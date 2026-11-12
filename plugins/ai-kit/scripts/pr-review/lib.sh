#!/usr/bin/env bash

AK_E_USAGE=1 AK_E_PREREQ=2 AK_E_DIRTY=3 AK_E_NOTHING=4
AK_E_CONFLICT=5 AK_E_ASK=6 AK_E_RUNNING=7 AK_E_NOTESTS=9

ak_die() { local code="${2:-$AK_E_USAGE}"; printf 'ERROR: %s\n' "$1" >&2; exit "$code"; }
ak_warn() { printf 'WARN: %s\n' "$1" >&2; }
ak_kv() { printf '%s=%s\n' "$1" "${2-}"; }

ak_need() {
  command -v "$1" >/dev/null 2>&1 ||
    ak_die "'$1' is required but not on PATH.${2:+ $2}" "$AK_E_PREREQ"
}

ak_py() {
  command -v python3 2>/dev/null || command -v python 2>/dev/null ||
    ak_die "python3 is required but not on PATH" "$AK_E_PREREQ"
}

ak_json_get() {
  local file="$1" path="$2"
  [ -f "$file" ] || return 0
  "$(ak_py)" - "$file" "$path" <<'PY'
import json, sys
try:
    cur = json.load(open(sys.argv[1], encoding="utf-8"))
except Exception:
    sys.exit(0)
for key in sys.argv[2].split('.'):
    if isinstance(cur, dict) and key in cur:
        cur = cur[key]
    elif isinstance(cur, list) and key.isdigit() and int(key) < len(cur):
        cur = cur[int(key)]
    else:
        sys.exit(0)
if isinstance(cur, list):
    print(','.join(str(x) for x in cur))
elif isinstance(cur, bool):
    print('true' if cur else 'false')
elif cur is not None:
    print(cur)
PY
}

ak_json_string_from_file() {
  "$(ak_py)" -c 'import json,sys; print(json.dumps(open(sys.argv[1], encoding="utf-8").read()))' "$1"
}

ak_json_str() { "$(ak_py)" -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$1"; }

ak_count_matches() {
  local n
  n=$(grep -oE "$1" "$2" 2>/dev/null | wc -l | tr -d '[:space:]') || n=0
  printf '%s' "${n:-0}"
}

ak_conflict_files() {
  local out
  out=$(grep -E '^CONFLICT' |
        sed -E 's/.*Merge conflict in //; s/^CONFLICT \([^)]*\): *//' |
        sort -u | tr '\n' ',' | sed 's/,$//') || out=''
  printf '%s' "$out"
}

ak_comma_list() {
  local file="$1" max="${2:-10}" total head_n
  [ -s "$file" ] || return 0
  total=$(wc -l <"$file" | tr -d '[:space:]')
  head_n=$(head -"$max" "$file" | tr '\n' ',' | sed 's/,$//')
  if [ "${total:-0}" -gt "$max" ]; then
    printf '%s,+%s more' "$head_n" "$((total - max))"
  else
    printf '%s' "$head_n"
  fi
}

ak_common_lines() { LC_ALL=C comm -12 "$1" "$2"; }

ak_slug() { printf '%s' "$1" | LC_ALL=C sed 's/[^A-Za-z0-9._-]/-/g'; }

ak_dirty_policy_ok() { case "$1" in auto|allow|block) return 0 ;; *) return 1 ;; esac; }

ak_repo_root() {
  git rev-parse --show-toplevel 2>/dev/null ||
    ak_die "not inside a git repository" "$AK_E_PREREQ"
}

ak_workspace_file() {
  local p
  p=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
  while :; do
    if [ -f "$p/.ai-kit/workspace.json" ]; then printf '%s\n' "$p/.ai-kit/workspace.json"; return 0; fi
    [ "$p" != "$(dirname "$p")" ] || return 0
    p=$(dirname "$p")
  done
}

ak_ws() {
  [ -n "${AK_WS_FILE:-}" ] || return 0
  ak_json_get "$AK_WS_FILE" "$1"
}

ak_host_from_url() {
  case "$1" in
    *github*) printf 'github' ;;
    *gitlab*) printf 'gitlab' ;;
    *bitbucket.org*) printf 'bitbucket' ;;
    *dev.azure.com*|*visualstudio.com*) printf 'azure-devops' ;;
    *) printf 'other' ;;
  esac
}

ak_parse_remote() {
  local url="$1" rest
  rest=$(printf '%s' "$url" | sed -E 's#^[a-z0-9+]+://##; s#^[^@/]*@##')
  AK_REMOTE_HOSTNAME=$(printf '%s' "$rest" | sed -E 's#[:/].*##')
  AK_REPO_PATH=$(printf '%s' "$rest" | sed -E 's#^[^:/]+[:/]+##; s#^[0-9]+/##; s#/+$##; s#\.git$##')
  [ -n "$AK_REPO_PATH" ] || ak_die "cannot parse the repository path out of origin URL '$url'" "$AK_E_PREREQ"
}

ak_key_regex() {
  local p
  p=${AK_KEY_PATTERN:-'[A-Z][A-Z0-9]+-[0-9]+'}
  printf '%s' "$p" | sed 's/\\d/[0-9]/g; s/\\w/[A-Za-z0-9_]/g'
}

ak_ticket_from() {
  local re k; re=$(ak_key_regex)
  k=$(printf '%s' "$1" | grep -oE "$re" | head -1 || true)
  [ -n "$k" ] || k=$(printf '%s' "$1" | tr 'a-z' 'A-Z' | grep -oE "$re" | head -1 || true)
  printf '%s' "$k"
}

ak_load_context() {
  ak_need git
  AK_WS_FILE=${AK_WS_FILE:-$(ak_workspace_file)}
  AK_WS_ROOT=''
  [ -z "$AK_WS_FILE" ] || AK_WS_ROOT=$(dirname "$(dirname "$AK_WS_FILE")")

  local url; url=$(git remote get-url origin 2>/dev/null) ||
    ak_die "no 'origin' remote in this repository" "$AK_E_PREREQ"
  ak_parse_remote "$url"

  AK_HOST=${AI_KIT_VCS_HOST:-$(ak_ws vcs.host)}
  AK_HOST_FROM=workspace
  if [ -n "${AI_KIT_VCS_HOST:-}" ]; then AK_HOST_FROM=env; fi
  if [ -z "$AK_HOST" ]; then AK_HOST=$(ak_host_from_url "$url"); AK_HOST_FROM=remote-url; fi
  AK_CLI=${AI_KIT_VCS_CLI:-$(ak_ws vcs.cli)}
  if [ -z "$AK_CLI" ]; then
    case "$AK_HOST" in
      github) AK_CLI=gh ;; gitlab) AK_CLI=glab ;; azure-devops) AK_CLI=az ;; *) AK_CLI=none ;;
    esac
  fi

  AK_KEY_PATTERN=$(ak_ws tracker.keyPattern)
  AK_DOCS_DIR=$(ak_ws docsDir)
  AK_DOCS_DIR=${AK_DOCS_DIR:-docs}

  AK_SOURCE_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  [ "$AK_SOURCE_BRANCH" != "HEAD" ] ||
    ak_die "detached HEAD — check out a branch first" "$AK_E_PREREQ"

  if [ -n "${AI_KIT_TARGET_BRANCH:-}" ]; then
    AK_TARGET_BRANCH=$AI_KIT_TARGET_BRANCH; AK_TARGET_FROM=env
  else
    AK_TARGET_BRANCH=$(ak_ws vcs.defaultBranch); AK_TARGET_FROM=workspace
    if [ -z "$AK_TARGET_BRANCH" ]; then
      AK_TARGET_BRANCH=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')
      AK_TARGET_FROM=repo-default
    fi
    if [ -z "$AK_TARGET_BRANCH" ]; then
      if git show-ref --verify --quiet refs/remotes/origin/main; then AK_TARGET_BRANCH=main
      elif git show-ref --verify --quiet refs/remotes/origin/master; then AK_TARGET_BRANCH=master
      else ak_die "cannot determine the target branch — set vcs.defaultBranch in .ai-kit/workspace.json or AI_KIT_TARGET_BRANCH" "$AK_E_PREREQ"
      fi
      AK_TARGET_FROM=guess
    fi
  fi

  AK_DIRTY_POLICY=${AI_KIT_DIRTY:-auto}
  ak_dirty_policy_ok "$AK_DIRTY_POLICY" ||
    ak_die "AI_KIT_DIRTY must be auto, allow or block (got '$AK_DIRTY_POLICY')" "$AK_E_USAGE"
}

ak_workdir() {
  local d; d="$(git rev-parse --absolute-git-dir)/pr-review"
  mkdir -p "$d"; printf '%s\n' "$d"
}

ak_az_parts() {
  local p="$1"
  case "$AK_REMOTE_HOSTNAME" in
    *visualstudio.com)
      AK_AZ_ORG="https://$AK_REMOTE_HOSTNAME"
      AK_AZ_PROJECT=$(printf '%s' "$p" | sed -E 's#/_git/.*##; s#^DefaultCollection/##')
      AK_AZ_REPO=${p##*/} ;;
    *)
      p=$(printf '%s' "$p" | sed -E 's#^v3/##; s#/_git/#/#')
      AK_AZ_ORG="https://dev.azure.com/${p%%/*}"
      p=${p#*/}
      AK_AZ_PROJECT=${p%%/*}
      AK_AZ_REPO=${p##*/} ;;
  esac
}

AK_BB_API=https://api.bitbucket.org/2.0

ak_bb() {
  ak_need curl
  [ -n "${BITBUCKET_TOKEN:-}" ] ||
    ak_die "Bitbucket needs BITBUCKET_TOKEN (and BITBUCKET_USER for a personal API token) in the environment" "$AK_E_PREREQ"
  local xtrace=0
  case "$-" in *x*) xtrace=1; set +x ;; esac
  local cfg; cfg=$(mktemp "${TMPDIR:-/tmp}/ak-cfg.XXXXXX")
  chmod 600 "$cfg"
  if [ -n "${BITBUCKET_USER:-}" ]; then
    printf 'user = "%s:%s"\nsilent\nshow-error\n' "$BITBUCKET_USER" "$BITBUCKET_TOKEN" >"$cfg"
  else
    printf 'header = "Authorization: Bearer %s"\nsilent\nshow-error\n' "$BITBUCKET_TOKEN" >"$cfg"
  fi
  [ "$xtrace" -eq 0 ] || set -x
  local rc=0
  curl -K "$cfg" "$@" || rc=$?
  rm -f "$cfg"
  return $rc
}

ak_bb_get() {
  local code
  code=$(ak_bb -L -o "$2" -w '%{http_code}' "$1") || ak_die "could not reach Bitbucket for $1"
  if [ "$code" != 200 ]; then
    head -c 600 "$2" >&2; echo >&2
    case "$code" in
      401|403) ak_die "Bitbucket rejected the read ($code) — the token cannot see this repository or lacks pullrequest scope" "$AK_E_PREREQ" ;;
      *) ak_die "reading $1 failed (HTTP $code)" ;;
    esac
  fi
}

ak_urlencode() { "$(ak_py)" -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"; }
