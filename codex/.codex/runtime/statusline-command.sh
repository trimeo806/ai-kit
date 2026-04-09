#!/usr/bin/env bash
# Codex status line — Developer preset
input=$(cat)

user=$(whoami)
host=$(hostname -s)
dir=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // ""')
short_dir=$(echo "$dir" | sed "s|$HOME|~|")

model=$(echo "$input" | jq -r '.model.display_name // "Claude"')

ctx_remaining=$(echo "$input" | jq -r '.context_window.remaining_percentage // empty')

# Git branch (skip locks to stay fast)
branch=""
if git -C "$dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch=$(git -C "$dir" -c core.hooksPath=/dev/null symbolic-ref --short HEAD 2>/dev/null || git -C "$dir" rev-parse --short HEAD 2>/dev/null)
fi

# Build the line
line=$(printf "\033[0;36m%s@%s\033[0m \033[0;33m%s\033[0m" "$user" "$host" "$short_dir")

if [ -n "$branch" ]; then
  line="$line $(printf "\033[0;35m[%s]\033[0m" "$branch")"
fi

line="$line $(printf "\033[0;37m|\033[0m") $(printf "\033[0;32m%s\033[0m" "$model")"

if [ -n "$ctx_remaining" ]; then
  line="$line $(printf "\033[0;37m|\033[0m") $(printf "\033[0;33m%s%% ctx\033[0m" "$ctx_remaining")"
fi

printf "%s" "$line"
