#!/usr/bin/env bash
set -euo pipefail
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
. "$HERE/lib.sh"

usage() {
  cat <<'EOF'
Usage:
  render_evidence.sh --manifest <tsv> [--api-tests <tsv>] [--base-url <url> --prefix <p>] [--out <file>]

manifest: <kind><TAB><path><TAB><caption>   kind: demo | diagram | file
api-tests:<request><TAB><status><TAB><passed>/<total><TAB><what it proves>
Without --base-url the comment names each file to attach by hand (MODE=manual).

Output: KEY=value lines, then the rendered comment. Exits: 0 ok · 1 usage/contract violation
EOF
}

CAPTION_MAX=120 DEMO_MAX=8 DIAGRAM_MAX=3 FILE_MAX=5 API_MAX=15

manifest='' api='' base_url='' prefix='' out=''
while [ $# -gt 0 ]; do
  case "$1" in
    --manifest) manifest=$2; shift ;;
    --api-tests) api=$2; shift ;;
    --base-url) base_url=${2%/}; shift ;;
    --prefix) prefix=$2; shift ;;
    --out) out=$2; shift ;;
    -h|--help) usage; exit 0 ;;
    *) ak_die "unknown option '$1'" ;;
  esac
  shift
done
[ -n "$manifest" ] || [ -n "$api" ] || ak_die "--manifest or --api-tests is required"
[ -z "$manifest" ] || [ -f "$manifest" ] || ak_die "--manifest '$manifest' does not exist"
[ -z "$api" ] || [ -f "$api" ] || ak_die "--api-tests '$api' does not exist"
[ -z "$base_url" ] || [ -n "$prefix" ] || ak_die "--base-url needs --prefix (UPLOAD_PREFIX from pr.sh upload)"

mode=manual; [ -z "$base_url" ] || mode=uploaded
out=${out:-"$(ak_workdir)/evidence-comment.md"}

clean_cell() { printf '%s' "$1" | sed 's/[][]//g; s/|/\\|/g; s/^[[:space:]]*//; s/[[:space:]]*$//'; }

demo=() diagram=() file=() names=' ' attach=()
if [ -n "$manifest" ]; then
  while IFS=$'\t' read -r kind path caption || [ -n "$kind" ]; do
    case "$kind" in ''|\#*) continue ;; esac
    [ -n "${path:-}" ] && [ -n "${caption:-}" ] || ak_die "manifest line needs <kind> TAB <path> TAB <caption>: '$kind'"
    [ -f "$path" ] || ak_die "manifest file '$path' does not exist"
    [ "${#caption}" -le "$CAPTION_MAX" ] || ak_die "caption over $CAPTION_MAX chars: '$caption'"
    name=$(ak_slug "$(basename "$path")")
    case "$names" in *" $name "*) ak_die "two manifest files are both named '$name'" ;; esac
    names="$names$name "
    entry="$name"$'\t'"$(clean_cell "$caption")"
    case "$kind" in
      demo) demo+=("$entry") ;;
      diagram) diagram+=("$entry") ;;
      file) file+=("$entry") ;;
      *) ak_die "unknown kind '$kind' — use demo, diagram or file" ;;
    esac
    attach+=("$name")
  done <"$manifest"
fi
[ "${#demo[@]}" -le "$DEMO_MAX" ] || ak_die "more than $DEMO_MAX demo items — merge clips; a reviewer watches the first few"
[ "${#diagram[@]}" -le "$DIAGRAM_MAX" ] || ak_die "more than $DIAGRAM_MAX diagrams — keep the flows a reviewer needs"
[ "${#file[@]}" -le "$FILE_MAX" ] || ak_die "more than $FILE_MAX files"

rows=() passed=0 total=0 failing=0
if [ -n "$api" ]; then
  while IFS=$'\t' read -r req status counts proves || [ -n "$req" ]; do
    case "$req" in ''|\#*) continue ;; esac
    [ -n "${status:-}" ] && [ -n "${counts:-}" ] && [ -n "${proves:-}" ] ||
      ak_die "api-tests line needs <request> TAB <status> TAB <passed>/<total> TAB <what it proves>: '$req'"
    [[ "$counts" =~ ^([0-9]+)/([0-9]+)$ ]] || ak_die "api-tests counts must be <passed>/<total>, got '$counts'"
    p=${BASH_REMATCH[1]} t=${BASH_REMATCH[2]}
    [ "$p" -le "$t" ] || ak_die "api-tests counts: passed > total in '$counts'"
    [ "${#proves}" -le "$CAPTION_MAX" ] || ak_die "api-tests 'what it proves' over $CAPTION_MAX chars: '$proves'"
    passed=$((passed + p)) total=$((total + t))
    glyph='✅'; [ "$p" -eq "$t" ] || { glyph='❌'; failing=$((failing + 1)); }
    rows+=("| \`$(clean_cell "$req")\` | $(clean_cell "$status") | $glyph $p/$t | $(clean_cell "$proves") |")
  done <"$api"
  [ "${#rows[@]}" -le "$API_MAX" ] || ak_die "more than $API_MAX api-tests rows — keep the requests that cover new behaviour"
fi
[ $(( ${#demo[@]} + ${#diagram[@]} + ${#file[@]} + ${#rows[@]} )) -gt 0 ] || ak_die "nothing to render: the manifest and api-tests files are empty"

is_image() { case "$1" in *.png|*.PNG|*.jpg|*.jpeg|*.gif|*.GIF|*.webp) return 0 ;; *) return 1 ;; esac; }

item() {
  local name=$1 caption=$2
  if [ "$mode" = manual ]; then
    printf '📎 _attach `%s` here_\n' "$name"
  elif is_image "$name"; then
    printf '![%s](%s/%s%s)\n' "$caption" "$base_url" "$prefix" "$name"
    printf '[open full size](%s/%s%s)\n' "$base_url" "$prefix" "$name"
  else
    printf '▶️ [%s](%s/%s%s)\n' "$name" "$base_url" "$prefix" "$name"
  fi
}

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')
sha=$(git rev-parse --short HEAD 2>/dev/null || echo '?')

{
  printf '## 🎬 Demo & evidence\n\n'
  printf '_Captured locally on `%s` @ `%s` — what this PR does, shown._\n' "$branch" "$sha"
  if [ "${#demo[@]}" -gt 0 ]; then
    printf '\n### Demo\n'
    i=0
    for e in "${demo[@]}"; do
      i=$((i + 1))
      printf '\n**%s. %s**\n\n' "$i" "${e#*$'\t'}"
      item "${e%%$'\t'*}" "${e#*$'\t'}"
    done
  fi
  if [ "${#diagram[@]}" -gt 0 ]; then
    printf '\n### Flow\n'
    for e in "${diagram[@]}"; do
      printf '\n**%s**\n\n' "${e#*$'\t'}"
      item "${e%%$'\t'*}" "${e#*$'\t'}"
    done
  fi
  if [ "${#rows[@]}" -gt 0 ]; then
    printf '\n### API test results\n\n'
    printf '| Request | Status | Assertions | What it proves |\n| :-- | :-- | :-- | :-- |\n'
    printf '%s\n' "${rows[@]}"
    if [ "$failing" -eq 0 ]; then
      printf '\n**%s/%s assertions passed.**\n' "$passed" "$total"
    else
      printf '\n**⚠️ %s/%s assertions passed — %s request(s) failing.**\n' "$passed" "$total" "$failing"
    fi
  fi
  if [ "${#file[@]}" -gt 0 ]; then
    printf '\n### Files\n\n'
    for e in "${file[@]}"; do
      if [ "$mode" = manual ]; then
        printf -- '- %s — 📎 _attach `%s`_\n' "${e#*$'\t'}" "${e%%$'\t'*}"
      else
        printf -- '- [%s](%s/%s%s)\n' "${e#*$'\t'}" "$base_url" "$prefix" "${e%%$'\t'*}"
      fi
    done
  fi
} >"$out"

ak_kv MODE "$mode"
ak_kv DEMO_ITEMS "${#demo[@]}"
ak_kv DIAGRAMS "${#diagram[@]}"
ak_kv FILES "${#file[@]}"
ak_kv API_REQUESTS "${#rows[@]}"
ak_kv API_ASSERTIONS "$passed/$total"
ak_kv API_FAILING "$failing"
[ "$mode" = uploaded ] || ak_kv ATTACH_FILES "$(IFS=,; printf '%s' "${attach[*]-}")"
ak_kv COMMENT_FILE "$out"
echo
cat "$out"
