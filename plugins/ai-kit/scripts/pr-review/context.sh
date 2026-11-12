#!/usr/bin/env bash
set -euo pipefail
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
PLUGIN_ROOT=$(cd -- "$HERE/../.." && pwd)
. "$HERE/lib.sh"

case "${1:-}" in
  -h|--help) echo "Usage: context.sh — prints repo, host and branch facts as KEY=value; read-only"; exit 0 ;;
  '') ;;
  *) ak_die "unknown option '$1'" ;;
esac

ak_load_context
root=$(ak_repo_root)

ak_kv PLUGIN_ROOT "$PLUGIN_ROOT"
ak_kv REPO_ROOT "$root"
ak_kv WORKSPACE_FILE "$AK_WS_FILE"
ak_kv WORKSPACE_ROOT "$AK_WS_ROOT"
ak_kv DOCS_DIR "$AK_DOCS_DIR"
ak_kv KEY_PATTERN "$AK_KEY_PATTERN"
ak_kv VCS_HOST "$AK_HOST"
ak_kv VCS_HOST_FROM "$AK_HOST_FROM"
ak_kv VCS_CLI "$AK_CLI"
ak_kv REMOTE_HOSTNAME "$AK_REMOTE_HOSTNAME"
ak_kv REPO_PATH "$AK_REPO_PATH"
ak_kv SOURCE_BRANCH "$AK_SOURCE_BRANCH"
ak_kv TARGET_BRANCH "$AK_TARGET_BRANCH"
ak_kv TARGET_FROM "$AK_TARGET_FROM"
ak_kv TICKET "$(ak_ticket_from "$AK_SOURCE_BRANCH")"

cli_ok=no
case "$AK_HOST" in
  github) command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1 && cli_ok=yes ;;
  gitlab) command -v glab >/dev/null 2>&1 && glab auth status >/dev/null 2>&1 && cli_ok=yes ;;
  azure-devops) command -v az >/dev/null 2>&1 && az account show >/dev/null 2>&1 && cli_ok=yes ;;
  bitbucket) [ -n "${BITBUCKET_TOKEN:-}" ] && command -v curl >/dev/null 2>&1 && cli_ok=yes ;;
esac
ak_kv HOST_AUTH "$cli_ok"

ak_kv OWNER_NAME "$(git config user.name 2>/dev/null || true)"
ak_kv DIRTY_POLICY "$AK_DIRTY_POLICY"
n_tracked=$(git diff --name-only --no-renames HEAD 2>/dev/null | grep -c . || true)
n_untracked=$(git ls-files --others --exclude-standard 2>/dev/null | grep -c . || true)
ak_kv DIRTY_TRACKED "${n_tracked:-0}"
ak_kv DIRTY_UNTRACKED "${n_untracked:-0}"
if [ "${n_tracked:-0}" -gt 0 ] || [ "${n_untracked:-0}" -gt 0 ]; then ak_kv WORKTREE dirty; else ak_kv WORKTREE clean; fi

template=''
for p in .github/pull_request_template.md .github/PULL_REQUEST_TEMPLATE.md docs/pull_request_template.md \
         pull_request_template.md .gitlab/merge_request_templates/Default.md .azuredevops/pull_request_template.md; do
  if [ -f "$root/$p" ]; then template=$p; break; fi
done
ak_kv PR_TEMPLATE "$template"

guidelines=''
for p in CODE_REVIEW.md docs/code-review.md .github/code-review.md REVIEW.md; do
  if [ -f "$root/$p" ]; then guidelines=$p; break; fi
done
ak_kv REVIEW_GUIDELINES "$guidelines"
