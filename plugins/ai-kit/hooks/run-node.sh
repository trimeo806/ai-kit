#!/bin/sh

first_existing() {
  for candidate in "$@"; do
    if [ -n "$candidate" ] && [ -f "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

newest_match() {
  ls -1d "$@" 2>/dev/null | sort -V 2>/dev/null | tail -n 1
}

to_unix_path() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -u "$1" 2>/dev/null || printf '%s\n' "$1"
  else
    printf '%s\n' "$1"
  fi
}

windows_registry_path_node() {
  command -v powershell.exe >/dev/null 2>&1 || return 1
  entries=$(powershell.exe -NoProfile -NonInteractive -Command "[Environment]::GetEnvironmentVariable('Path','User') + ';' + [Environment]::GetEnvironmentVariable('Path','Machine')" 2>/dev/null | tr -d '\r')
  [ -n "$entries" ] || return 1
  old_ifs=$IFS
  IFS=';'
  for entry in $entries; do
    [ -n "$entry" ] || continue
    unix_entry=$(to_unix_path "$entry")
    if [ -f "$unix_entry/node.exe" ]; then
      IFS=$old_ifs
      printf '%s\n' "$unix_entry/node.exe"
      return 0
    fi
  done
  IFS=$old_ifs
  return 1
}

find_node() {
  if [ -n "$AI_KIT_NODE" ] && [ -f "$AI_KIT_NODE" ]; then
    printf '%s\n' "$AI_KIT_NODE"
    return 0
  fi

  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi

  appdata=$(to_unix_path "${APPDATA:-$HOME/AppData/Roaming}")
  localappdata=$(to_unix_path "${LOCALAPPDATA:-$HOME/AppData/Local}")
  programfiles=$(to_unix_path "${PROGRAMFILES:-/c/Program Files}")
  fnm_dir=$(to_unix_path "${FNM_DIR:-$appdata/fnm}")

  found=$(newest_match \
    "$fnm_dir"/node-versions/*/installation/node.exe \
    "$fnm_dir"/node-versions/*/installation/bin/node \
    "$HOME"/.local/share/fnm/node-versions/*/installation/bin/node \
    "$HOME"/.fnm/node-versions/*/installation/bin/node \
    "$HOME"/.nvm/versions/node/*/bin/node \
    "$appdata"/nvm/*/node.exe)
  [ -n "$found" ] && { printf '%s\n' "$found"; return 0; }

  first_existing \
    "$localappdata/Volta/bin/node.exe" \
    "$HOME/.volta/bin/node" \
    "$programfiles/nodejs/node.exe" \
    "/c/Program Files/nodejs/node.exe" \
    "/c/Program Files (x86)/nodejs/node.exe" \
    "$localappdata/Programs/nodejs/node.exe" \
    "/opt/homebrew/bin/node" \
    "/usr/local/bin/node" \
    "/usr/bin/node" && return 0

  windows_registry_path_node
}

cache_file="$HOME/.ai-kit/node-path"

node_bin=""
if [ -z "$AI_KIT_NODE" ] && ! command -v node >/dev/null 2>&1 && [ -r "$cache_file" ]; then
  node_bin=$(head -n 1 "$cache_file" 2>/dev/null | tr -d '\r')
  [ -f "$node_bin" ] || node_bin=""
fi

if [ -z "$node_bin" ]; then
  node_bin=$(find_node)
  if [ -n "$node_bin" ] && ! command -v node >/dev/null 2>&1; then
    mkdir -p "$HOME/.ai-kit" 2>/dev/null && printf '%s\n' "$node_bin" > "$cache_file" 2>/dev/null
  fi
fi

if [ -z "$node_bin" ]; then
  echo "ai-kit: node was not found, so this hook did not run. Install Node.js, or set AI_KIT_NODE to the node executable." >&2
  exit 0
fi

exec "$node_bin" "$@"
