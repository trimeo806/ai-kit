#!/usr/bin/env bash
set -euo pipefail
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
. "$HERE/lib.sh"

usage() {
  cat <<'EOF'
Usage:
  render_comment.sh --findings <file> [--tests passed|failed|still-running|not-run] [--reason <text>]
                    [--checks-url <url>] [--review-source <text>] [--signoff <text>]...
                    [--out <file>] [--max-blocking N] [--max-should N] [--max-nit N]

Findings file, one per line, TAB (or ' | ') separated: <severity> <file:line|-> <one sentence>
severity: security | blocking | should-fix | nit. Message max 140 chars. Empty file = clean review.
--signoff names an owner sign-off the PR still needs; it renders as blocked until given.
Verdict: security, blocking, sign-off or failed checks → Blocked; should-fix or unproven checks →
Needs attention; otherwise Safe to merge.
Exits: 0 ok · 1 usage or contract violation
EOF
}

MSG_MAX=140
max_blocking=3 max_should=4 max_nit=3
findings='' tests='' reason='' checks_url='' review_source='' out=''
signoffs=()

while [ $# -gt 0 ]; do
  case "$1" in
    --findings) findings=$2; shift ;;
    --tests) tests=$2; shift ;;
    --reason) reason=$2; shift ;;
    --checks-url) checks_url=$2; shift ;;
    --review-source) review_source=$2; shift ;;
    --out) out=$2; shift ;;
    --signoff) [ -n "${2:-}" ] || ak_die "--signoff needs a text"; signoffs+=("$2"); shift ;;
    --max-blocking) max_blocking=$2; shift ;;
    --max-should) max_should=$2; shift ;;
    --max-nit) max_nit=$2; shift ;;
    -h|--help) usage; exit 0 ;;
    *) ak_die "unknown option '$1'" ;;
  esac
  shift
done

[ -n "$findings" ] || ak_die "--findings <file> is required (an empty file means a clean review)"
[ -f "$findings" ] || ak_die "findings file '$findings' does not exist"
case "${tests:-}" in
  ''|passed|failed|still-running|not-run) ;;
  *) ak_die "--tests must be passed, failed, still-running or not-run (got '$tests')" ;;
esac

if [ -z "$out" ]; then out="$(ak_workdir)/comment.md"; fi

sec=() block=() should=() nit=()
lineno=0
while IFS= read -r raw || [ -n "$raw" ]; do
  lineno=$((lineno + 1))
  case "$raw" in ''|'#'*) continue ;; esac
  if printf '%s' "$raw" | grep -q "$(printf '\t')"; then
    IFS=$(printf '\t') read -r f_sev f_loc f_msg <<EOF
$raw
EOF
  else
    f_sev=${raw%%|*}; rest=${raw#*|}
    [ "$rest" != "$raw" ] || ak_die "findings line $lineno has no field separator (need TAB or ' | '): $raw"
    f_loc=${rest%%|*}; f_msg=${rest#*|}
    [ "$f_msg" != "$rest" ] || ak_die "findings line $lineno has only 2 fields, need 3: $raw"
  fi
  f_sev=$(printf '%s' "$f_sev" | sed 's/^[[:space:]-]*//; s/[[:space:]]*$//' | tr 'A-Z' 'a-z')
  f_loc=$(printf '%s' "$f_loc" | sed 's/^[[:space:]`]*//; s/[[:space:]`]*$//')
  f_msg=$(printf '%s' "$f_msg" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')

  [ -n "$f_msg" ] || ak_die "findings line $lineno has an empty message"
  [ "${#f_msg}" -le "$MSG_MAX" ] ||
    ak_die "findings line $lineno is ${#f_msg} chars, the limit is $MSG_MAX — say what breaks and when, not how to fix it: $f_msg"

  case "$f_sev" in
    security|sec)            sec+=("$f_loc"$'\t'"$f_msg") ;;
    blocking|blocker|block)  block+=("$f_loc"$'\t'"$f_msg") ;;
    should-fix|should|major) should+=("$f_loc"$'\t'"$f_msg") ;;
    nit|minor)               nit+=("$f_loc"$'\t'"$f_msg") ;;
    *) ak_die "findings line $lineno has unknown severity '$f_sev' (use security, blocking, should-fix or nit)" ;;
  esac
done <"$findings"

n_sec=${#sec[@]} n_block=${#block[@]} n_should=${#should[@]} n_nit=${#nit[@]}
n_total=$((n_sec + n_block + n_should + n_nit))
n_signoff=${#signoffs[@]}

if [ "$n_sec" -gt 0 ] || [ "$n_block" -gt 0 ] || [ "$n_signoff" -gt 0 ] || [ "$tests" = failed ]; then
  verdict='⛔ Blocked'
elif [ "$n_should" -gt 0 ] || { [ -n "$tests" ] && [ "$tests" != passed ]; }; then
  verdict='⚠️ Needs attention'
else
  verdict='✅ Safe to merge'
fi

plural() { [ "$1" = 1 ] && printf '%s' "$2" || printf '%s' "${3:-$2s}"; }

emit() {
  local glyph=$1 cap=$2 label=$3; shift 3
  local total=$# loc msg shown=0 rest_files=''
  for item in "$@"; do
    loc=${item%%$'\t'*}; msg=${item#*$'\t'}
    if [ "$cap" -ge 0 ] && [ "$shown" -ge "$cap" ]; then
      local base=${loc%%:*}; base=${base##*/}
      case ",$rest_files," in *",$base,"*) ;; *) rest_files="${rest_files:+$rest_files,}$base" ;; esac
      continue
    fi
    shown=$((shown + 1))
    if [ -z "$loc" ] || [ "$loc" = '-' ]; then
      printf -- '- %s %s\n' "$glyph" "$msg"
    else
      printf -- '- %s `%s` — %s\n' "$glyph" "$loc" "$msg"
    fi
  done
  local left=$((total - shown))
  if [ "$left" -gt 0 ]; then
    local files; files=$(printf '%s' "$rest_files" | cut -d, -f1-5 | sed 's/,/, /g')
    printf -- '- %s +%s more %s%s\n' "$glyph" "$left" "$(plural "$left" "$label")" "${files:+ — $files}"
  fi
}

{
  printf '## PR check — %s\n' "$verdict"

  if [ -n "$tests" ]; then
    printf '\n'
    case "$tests" in
      passed)        printf '**CI checks:** ✅ Passed%s\n' "${checks_url:+ — [details]($checks_url)}" ;;
      failed)        printf '**CI checks:** ❌ Failed%s\n' "${checks_url:+ — [details]($checks_url)}" ;;
      still-running) printf '**CI checks:** ⏳ Still running%s\n' "${checks_url:+ — [details]($checks_url)}" ;;
      not-run)       printf '**CI checks:** ⚠️ Not run%s\n' "${reason:+ — $reason}" ;;
    esac
  fi

  if [ "$n_signoff" -gt 0 ]; then
    printf '\n### Sign-off required before merge\n\n'
    for so in "${signoffs[@]}"; do printf -- '- %s\n' "$so"; done
  fi

  printf '\n'
  if [ "$n_total" -eq 0 ]; then
    printf '### Review — no issues found\n'
  else
    counts=''
    if [ "$n_sec" -gt 0 ];    then counts="🔒 $n_sec security"; fi
    if [ "$n_block" -gt 0 ];  then counts="${counts:+$counts · }🔴 $n_block $(plural "$n_block" blocker)"; fi
    if [ "$n_should" -gt 0 ]; then counts="${counts:+$counts · }🟡 $n_should should-fix"; fi
    if [ "$n_nit" -gt 0 ];    then counts="${counts:+$counts · }⚪ $n_nit $(plural "$n_nit" nit)"; fi
    printf '### Review — %s\n' "$counts"
  fi
  printf '\n'

  if [ "$n_sec" -gt 0 ]; then
    emit '🔒' -1 'security issue' "${sec[@]}"
  else
    printf -- '- 🔒 No security issues found in the changed files.\n'
  fi
  if [ "$n_block" -gt 0 ];  then emit '🔴' "$max_blocking" blocker "${block[@]}"; fi
  if [ "$n_should" -gt 0 ]; then emit '🟡' "$max_should" 'should-fix' "${should[@]}"; fi
  if [ "$n_nit" -gt 0 ];    then emit '⚪' "$max_nit" nit "${nit[@]}"; fi

  printf '\n_Reviewed with %s._\n' "${review_source:-ai-kit:review pr}"
} >"$out"

ak_kv COMMENT_FILE "$out"
ak_kv VERDICT "$verdict"
ak_kv N_SECURITY "$n_sec"
ak_kv N_BLOCKING "$n_block"
ak_kv N_SHOULD_FIX "$n_should"
ak_kv N_NIT "$n_nit"
ak_kv N_TOTAL "$n_total"
ak_kv N_SIGNOFF "$n_signoff"
ak_kv TESTS "${tests:-not-reported}"
echo "--- comment.md ---"
cat "$out"
