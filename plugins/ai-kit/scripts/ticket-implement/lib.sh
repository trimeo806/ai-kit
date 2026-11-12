#!/usr/bin/env bash
. "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/../pr-review/lib.sh"

TI_E_USAGE=1 TI_E_PREREQ=2 TI_E_DIRTY=3 TI_E_NOPLAN=4
TI_E_PLAN_INVALID=5 TI_E_ASK=6 TI_E_COMMIT_TYPES=7

ti_die() { ak_die "$@"; }
ti_kv() { ak_kv "$@"; }

ti_join() {
  local out
  out=$(sed '/^[[:space:]]*$/d' | sort -u | tr '\n' ',' | sed 's/,$//') || out=''
  printf '%s' "$out"
}

ti_md_section() {
  awk -v want="$2" '
    /^```/ { fence = !fence; if (inside) print; next }
    !fence && /^## / {
      if (inside) exit
      if ($0 ~ want) { inside = 1; next }
    }
    inside { print }
  ' "$1" 2>/dev/null || true
}

ti_md_has_section() {
  awk -v want="$2" '
    /^```/ { fence = !fence; next }
    !fence && /^## / && $0 ~ want { found = 1; exit }
    END { exit(found ? 0 : 1) }
  ' "$1" 2>/dev/null
}

ti_repo_root() {
  git rev-parse --show-toplevel 2>/dev/null || ti_die "not inside a git repository" "$TI_E_PREREQ"
}

ti_load_rules() {
  AK_WS_FILE=${AK_WS_FILE:-$(ak_workspace_file)}
  AK_WS_ROOT=''
  [ -z "$AK_WS_FILE" ] || AK_WS_ROOT=$(dirname "$(dirname "$AK_WS_FILE")")
  AK_KEY_PATTERN=$(ak_ws tracker.keyPattern)
  AK_DOCS_DIR=$(ak_ws docsDir)
  AK_DOCS_DIR=${AK_DOCS_DIR:-docs}
  TI_BRANCH_PATTERN=$(ak_ws vcs.branchPattern)
}

ti_base_branch() {
  local b=${AI_KIT_TARGET_BRANCH:-}
  [ -n "$b" ] || b=$(ak_ws vcs.defaultBranch)
  [ -n "$b" ] || b=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##') || b=''
  if [ -n "$b" ]; then printf '%s' "$b"; return 0; fi
  for b in main master; do
    if git show-ref --verify --quiet "refs/remotes/origin/$b" || git show-ref --verify --quiet "refs/heads/$b"; then
      printf '%s' "$b"; return 0
    fi
  done
  printf ''
}
