#!/usr/bin/env bash
# Generate skill index files for progressive disclosure
# Tier 1: skill-index.md (names only)
# Tier 2: skill-descriptions.md (names + descriptions)

set -euo pipefail

CLAUDE_DIR="${HOME}/.claude"
OUTPUT_INDEX="${CLAUDE_DIR}/skill-index.md"
OUTPUT_DESCRIPTIONS="${CLAUDE_DIR}/skill-descriptions.md"

# Skill source directories (resolve symlinks)
GOLEM_POWERS=$(realpath "${CLAUDE_DIR}/commands/golem-powers" 2>/dev/null || echo "")
SUPERPOWERS="${CLAUDE_DIR}/plugins/cache/superpowers-marketplace/superpowers"

# Check if a skill name looks like a placeholder/template
is_placeholder_name() {
    local name="$1"
    # Filter out template placeholders
    [[ "$name" =~ ^\< ]] && return 0       # Starts with < (template placeholder)
    [[ "$name" =~ ^[A-Z] ]] && return 0    # Starts with uppercase (example names)
    [[ "$name" =~ \[.*\] ]] && return 0    # Contains brackets
    [[ "$name" =~ "when" ]] && return 0    # Contains "when" (template text)
    [[ "$name" =~ "skill-name" ]] && return 0  # Contains "skill-name" placeholder
    return 1
}

# Extract name and description from SKILL.md frontmatter
extract_skill_info() {
    local skill_file="$1"
    local name description frontmatter

    # Extract ONLY the first YAML frontmatter block (lines 1-20 max)
    if [[ -f "$skill_file" ]]; then
        # Strip CRLF to handle Windows line endings
        # Use awk to extract lines between first two ---
        frontmatter=$(head -20 "$skill_file" | tr -d '\r' | awk '
            /^---$/ { count++; if(count==2) exit; next }
            count==1 { print }
        ')

        name=$(echo "$frontmatter" | grep '^name:' | head -1 | sed 's/^name:[[:space:]]*//' | tr -d '"')
        description=$(echo "$frontmatter" | grep '^description:' | head -1 | sed 's/^description:[[:space:]]*//' | tr -d '"')

        # Skip placeholder names
        if [[ -n "$name" ]] && ! is_placeholder_name "$name"; then
            echo "${name}|${description:-No description}"
        fi
    fi
}

# Find all SKILL.md files in a directory and its subdirectories
find_skills() {
    local base_dir="$1"
    local namespace="$2"

    if [[ -n "$base_dir" && -d "$base_dir" ]]; then
        # Use -L to follow symlinks
        find -L "$base_dir" -name "SKILL.md" -type f 2>/dev/null | while read -r skill_file; do
            local info
            info=$(extract_skill_info "$skill_file")
            if [[ -n "$info" ]]; then
                local name="${info%%|*}"
                local desc="${info#*|}"
                echo "${namespace}:${name}|${desc}"
            fi
        done
    fi
}

# Main generation
main() {
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    echo "Generating skill indices..."

    # Collect all skills
    local skills=()

    # golem-powers skills
    while IFS= read -r line; do
        [[ -n "$line" ]] && skills+=("$line")
    done < <(find_skills "$GOLEM_POWERS" "golem-powers")

    # superpowers skills (find latest version)
    if [[ -d "$SUPERPOWERS" ]]; then
        local latest_version
        latest_version=$(ls -v "$SUPERPOWERS" 2>/dev/null | tail -1)
        if [[ -n "$latest_version" ]]; then
            while IFS= read -r line; do
                [[ -n "$line" ]] && skills+=("$line")
            done < <(find_skills "${SUPERPOWERS}/${latest_version}/skills" "superpowers")
        fi
    fi

    # Sort skills by namespace:name
    IFS=$'\n' sorted_skills=($(sort <<<"${skills[*]}")); unset IFS

    # === Generate Tier 1: skill-index.md (names only) ===
    {
        echo "# Available Skills"
        echo ""
        echo "> Auto-generated: ${timestamp}"
        echo "> Regenerate: ~/.claude/scripts/generate-skill-index.sh"
        echo ""
        echo "## Skills"
        echo ""

        local current_namespace=""
        for skill in "${sorted_skills[@]}"; do
            local full_name="${skill%%|*}"
            local namespace="${full_name%%:*}"
            local name="${full_name#*:}"

            if [[ "$namespace" != "$current_namespace" ]]; then
                echo ""
                echo "### ${namespace}"
                current_namespace="$namespace"
            fi
            echo "- /${namespace}:${name}"
        done
    } > "$OUTPUT_INDEX"

    echo "Created: $OUTPUT_INDEX"

    # === Generate Tier 2: skill-descriptions.md (names + descriptions) ===
    {
        echo "# Skill Descriptions"
        echo ""
        echo "> Auto-generated: ${timestamp}"
        echo "> Use Skill tool to load full skill content when needed."
        echo ""

        local current_namespace=""
        for skill in "${sorted_skills[@]}"; do
            local full_name="${skill%%|*}"
            local desc="${skill#*|}"
            local namespace="${full_name%%:*}"
            local name="${full_name#*:}"

            if [[ "$namespace" != "$current_namespace" ]]; then
                echo ""
                echo "## ${namespace}"
                echo ""
                current_namespace="$namespace"
            fi

            # Keep descriptions under 50 tokens (~200 chars)
            if [[ ${#desc} -gt 200 ]]; then
                desc="${desc:0:197}..."
            fi
            echo "- **/${namespace}:${name}**: ${desc}"
        done
    } > "$OUTPUT_DESCRIPTIONS"

    echo "Created: $OUTPUT_DESCRIPTIONS"

    # Summary
    echo ""
    echo "Summary:"
    echo "  Skills found: ${#sorted_skills[@]}"
    echo "  Tier 1 (names): $(wc -l < "$OUTPUT_INDEX" | tr -d ' ') lines"
    echo "  Tier 2 (descriptions): $(wc -l < "$OUTPUT_DESCRIPTIONS" | tr -d ' ') lines"
}

main "$@"
