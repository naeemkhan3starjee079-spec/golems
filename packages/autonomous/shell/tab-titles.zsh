#!/bin/zsh
# tab-titles.zsh — Sets terminal tab titles for repoClaude sessions
# Sourced from ~/.zshrc after repoClaude functions are defined
# Managed by: golems (packages/autonomous/shell/)
#
# How it works: Wraps each *Claude function to set the tab title before running.
# Uses OSC 2 escape sequence (universal: iTerm2, Terminal.app, Warp, WezTerm, Kitty, Zed)

# Registry of repo → emoji+name
typeset -A GOLEMS_TAB_TITLES=(
  [songClaude]="🎵 SongScript"
  [unionClaude]="⚡ Union"
  [domicaClaude]="🏠 Domica"
  [gitsClaude]="🜔 Golems"
)

# Wrap each function to set tab title + optional iTerm2 badge
_golems_wrap_tab_title() {
  local func_name="$1"
  local title="${GOLEMS_TAB_TITLES[$func_name]}"

  [[ -z "$title" ]] && return

  # Only wrap if the function exists
  if (( ${+functions[$func_name]} )); then
    eval "
      _golems_original_${func_name}() {
        $(functions[$func_name])
      }
      ${func_name}() {
        # Set tab title (OSC 2 — works everywhere)
        echo -ne \"\\e]2;${title}\\a\"
        # iTerm2 badge (bonus, ignored by other terminals)
        printf \"\\e]1337;SetBadgeFormat=%s\\a\" \"\$(echo -n '${title}' | base64)\"
        # Run the original function
        _golems_original_${func_name} \"\$@\"
        # Reset tab title on exit
        echo -ne \"\\e]2;Terminal\\a\"
      }
    "
  fi
}

# Apply wrappers
for _func in ${(k)GOLEMS_TAB_TITLES}; do
  _golems_wrap_tab_title "$_func"
done
unset _func
