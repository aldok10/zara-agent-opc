#!/usr/bin/env bash
# ============================================================================
# bump-version.sh — Semantic version bump + changelog generator
#
# Reads conventional commits since the latest tag, determines the next
# semver version, updates version.json, generates CHANGELOG.md, and tags.
#
# Usage:
#   scripts/bump-version.sh                    # auto-detect, push tag
#   scripts/bump-version.sh --dry-run          # preview only, no changes
#   scripts/bump-version.sh --token <pat>      # use PAT instead of default
#   scripts/bump-version.sh --branch develop   # different base branch
#
# Dependencies: bash 4+, git, python3
# Works in: GitLab CI, GitHub Actions, local dev
# ============================================================================
set -euo pipefail

# ---- Config ----
VERSION_FILE="version.json"
CHANGELOG_FILE="CHANGELOG.md"
REMOTE="origin"
DEFAULT_BRANCH="main"
DRY_RUN=false
GIT_PUSH_TOKEN=""

# ---- Parse args ----
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run) DRY_RUN=true; shift ;;
    --token)   GIT_PUSH_TOKEN="$2"; shift 2 ;;
    --remote)  REMOTE="$2"; shift 2 ;;
    --branch)  DEFAULT_BRANCH="$2"; shift 2 ;;
    --help|-h) 
      echo "Usage: $0 [--dry-run] [--token <pat>] [--remote <name>] [--branch <name>]"
      exit 0 ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

# ---- Helpers ----
log()  { echo "  • $*"; }
warn() { echo "  ⚠ $*"; }
die()  { echo "  ✘ $*"; exit 1; }

# ---- Pre-flight ----
echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Zara Release — Version Bump       ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Verify we're in a git repo
git rev-parse --git-dir >/dev/null 2>&1 || die "Not a git repository"

# Verify we're on the target branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "$DEFAULT_BRANCH" ]; then
  # In CI, we're usually on detached HEAD. Skip branch check if CI env is set.
  if [ -z "${CI:-}" ]; then
    warn "On '$CURRENT_BRANCH', not '$DEFAULT_BRANCH'. Run from '$DEFAULT_BRANCH' or set --branch."
    exit 0
  fi
fi

# Fetch everything so tags and remote refs are available
log "Fetching tags from $REMOTE..."
git fetch --tags "$REMOTE" 2>/dev/null || warn "Could not fetch tags (continuing)"

# ---- Get current version ----
if [ -f "$VERSION_FILE" ]; then
  CURRENT_VERSION=$(python3 -c "
import json
with open('$VERSION_FILE') as f:
    d = json.load(f)
print(d['version'])
" 2>/dev/null) || CURRENT_VERSION="0.1.0"
else
  CURRENT_VERSION="0.1.0"
  warn "No $VERSION_FILE found — defaulting to $CURRENT_VERSION"
fi
log "Current version (from $VERSION_FILE): v$CURRENT_VERSION"

# ---- Find latest tag ----
LATEST_TAG=$(git tag --sort=-v:refname | head -1)
BASE_TAG=""

if [ -z "$LATEST_TAG" ]; then
  log "No tags found — using v$CURRENT_VERSION as base"
  LATEST_TAG="v$CURRENT_VERSION"
  BASE_TAG=""
else
  log "Latest tag: $LATEST_TAG"
  BASE_TAG="$LATEST_TAG"
fi

# ---- Collect commits since last tag ----
if [ -z "$BASE_TAG" ]; then
  COMMITS=$(git log --oneline --no-decorate HEAD 2>/dev/null | head -300)
else
  # Verify tag exists or we'll get an error
  if git rev-parse "$BASE_TAG" >/dev/null 2>&1; then
    COMMITS=$(git log --oneline --no-decorate "${BASE_TAG}..HEAD" 2>/dev/null)
  else
    COMMITS=$(git log --oneline --no-decorate HEAD 2>/dev/null | head -300)
  fi
fi

if [ -z "$COMMITS" ]; then
  log "No new commits since $LATEST_TAG. Nothing to release."
  exit 0
fi

echo ""
echo "── Commits to release ──"
echo "$COMMITS"
echo "────────────────────────"
echo ""

# ---- Determine bump type from conventional commits ----
MAJOR=false
MINOR=false
PATCH=false

while IFS= read -r line; do
  # Strip commit SHA (7-40 hex chars followed by space)
  msg=$(echo "$line" | sed 's/^[0-9a-f]\{7,40\} //')

  # Check for breaking changes: "BREAKING CHANGE:" in body or "!:" in subject
  if echo "$msg" | grep -qiE '^BREAKING CHANGE|!:' || echo "$msg" | grep -qiE 'BREAKING CHANGE'; then
    MAJOR=true
  elif echo "$msg" | grep -qiE '^feat[(:]'; then
    MINOR=true
  elif echo "$msg" | grep -qiE '^fix[(:]'; then
    PATCH=true
  elif echo "$msg" | grep -qiE '^perf[(:]'; then
    PATCH=true
  else
    # chore, docs, refactor, test, ci, style, build, etc. → patch
    PATCH=true
  fi
done <<< "$COMMITS"

# ---- Calculate new version ----
IFS='.' read -ra PARTS <<< "$CURRENT_VERSION"
MAJOR_VER="${PARTS[0]:-0}"
MINOR_VER="${PARTS[1]:-1}"
PATCH_VER="${PARTS[2]:-0}"

# Strip leading zeros for arithmetic
MAJOR_VER=$((10#$MAJOR_VER))
MINOR_VER=$((10#$MINOR_VER))
PATCH_VER=$((10#$PATCH_VER))

if [ "$MAJOR" = true ]; then
  MAJOR_VER=$((MAJOR_VER + 1))
  MINOR_VER=0
  PATCH_VER=0
  BUMP="major"
elif [ "$MINOR" = true ]; then
  MINOR_VER=$((MINOR_VER + 1))
  PATCH_VER=0
  BUMP="minor"
else
  PATCH_VER=$((PATCH_VER + 1))
  BUMP="patch"
fi

NEW_VERSION="${MAJOR_VER}.${MINOR_VER}.${PATCH_VER}"
NEW_TAG="v${NEW_VERSION}"

log "Bump type:   $BUMP"
log "New version: $NEW_VERSION"
log "New tag:     $NEW_TAG"

# Check if tag already exists (idempotent: exit clean if already released)
if git rev-parse "$NEW_TAG" >/dev/null 2>&1; then
  log "Tag $NEW_TAG already exists. Already released — skipping."
  exit 0
fi

# ---- Categorize commits for changelog ----
BREAKING=""
FEATURES=""
FIXES=""
CHORES=""
DOCS=""
REFACTORS=""
OTHERS=""

while IFS= read -r line; do
  sha=$(echo "$line" | awk '{print $1}' | head -c 7)
  msg=$(echo "$line" | sed 's/^[0-9a-f]\{7,40\} //')
  entry="- ${msg} (${sha})"

  if echo "$msg" | grep -qiE 'BREAKING CHANGE'; then
    BREAKING="${BREAKING}${entry}\n"
  elif echo "$msg" | grep -qiE '^feat[(:]'; then
    FEATURES="${FEATURES}${entry}\n"
  elif echo "$msg" | grep -qiE '^fix[(:]'; then
    FIXES="${FIXES}${entry}\n"
  elif echo "$msg" | grep -qiE '^docs[(:]'; then
    DOCS="${DOCS}${entry}\n"
  elif echo "$msg" | grep -qiE '^refactor[(:]|^perf[(:]'; then
    REFACTORS="${REFACTORS}${entry}\n"
  elif echo "$msg" | grep -qiE '^chore[(:]|^ci[(:]|^test[(:]|^style[(:]|^build[(:]'; then
    CHORES="${CHORES}${entry}\n"
  else
    OTHERS="${OTHERS}${entry}\n"
  fi
done <<< "$COMMITS"

# ---- Build changelog section ----
DATE=$(date +%Y-%m-%d)
CHANGELOG_SECTION="## [${NEW_VERSION}] - ${DATE}\n"

append_section() {
  local title="$1" content="$2"
  if [ -n "$content" ]; then
    CHANGELOG_SECTION="${CHANGELOG_SECTION}\n### ${title}\n${content}"
  fi
}

append_section "Breaking Changes" "$BREAKING"
append_section "Added" "$FEATURES"
append_section "Fixed" "$FIXES"
append_section "Changed" "$REFACTORS"
append_section "Documentation" "$DOCS"
append_section "Maintenance" "$CHORES"

if [ -n "$OTHERS" ]; then
  append_section "Other" "$OTHERS"
fi

# ---- Dry-run? ----
if [ "$DRY_RUN" = true ]; then
  echo ""
  log "═══ DRY-RUN MODE ═══"
  log "Would bump:   $CURRENT_VERSION → $NEW_VERSION"
  log "Would tag:    $NEW_TAG"
  log "Would update: $VERSION_FILE, $CHANGELOG_FILE"
  echo ""
  echo "── Changelog section to add ──"
  echo -e "$CHANGELOG_SECTION"
  echo "──────────────────────────────"
  echo ""
  exit 0
fi

# ---- Apply changes ----

# 1. Update version.json
log "Updating $VERSION_FILE..."
python3 -c "
import json
with open('$VERSION_FILE', 'r') as f:
    d = json.load(f)
d['version'] = '$NEW_VERSION'
d['updated'] = '$DATE'
with open('$VERSION_FILE', 'w') as f:
    json.dump(d, f, indent=2)
    f.write('\n')
"

# 2. Update CHANGELOG.md
log "Updating $CHANGELOG_FILE..."
if [ ! -f "$CHANGELOG_FILE" ]; then
  # Create new changelog
  cat > "$CHANGELOG_FILE" << EOF
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

$(echo -e "$CHANGELOG_SECTION")
EOF
else
  # Prepend new section after the header
  HEADER=$(sed '/^## /q' "$CHANGELOG_FILE")
  REST=$(sed '1,/^## /d' "$CHANGELOG_FILE")
  printf "%s\n\n%s\n\n%s" "$HEADER" "$(echo -e "$CHANGELOG_SECTION")" "$REST" > "$CHANGELOG_FILE"
fi

log "$VERSION_FILE: $CURRENT_VERSION → $NEW_VERSION ✓"
log "$CHANGELOG_FILE: section added ✓"

# ---- Git commit & tag ----
log "Committing version bump..."
git add "$VERSION_FILE" "$CHANGELOG_FILE"
git commit -m "chore(release): bump to $NEW_VERSION

Auto-generated by bump-version.sh

${BUMP}: version bump from ${CURRENT_VERSION} to ${NEW_VERSION}"

log "Tagging $NEW_TAG..."
git tag -a "$NEW_TAG" -m "Release ${NEW_TAG}"

# ---- Push ----
REMOTE_URL=""
if [ -n "$GIT_PUSH_TOKEN" ]; then
  # Inject token into remote URL for auth
  ORIGIN_URL=$(git remote get-url "$REMOTE" 2>/dev/null || echo "")
  # Strip protocol and any existing auth to get bare host/path
  BARE_URL=$(echo "$ORIGIN_URL" | sed -E 's|https?://([^@]+@)?||')
  if echo "$BARE_URL" | grep -q "gitlab.com"; then
    REMOTE_URL="https://oauth2:${GIT_PUSH_TOKEN}@${BARE_URL}"
  elif echo "$BARE_URL" | grep -q "github.com"; then
    REMOTE_URL="https://x-access-token:${GIT_PUSH_TOKEN}@${BARE_URL}"
  else
    REMOTE_URL="$ORIGIN_URL"
  fi
fi

if [ -n "$REMOTE_URL" ]; then
  log "Pushing to $REMOTE using token auth..."
  git push "$REMOTE_URL" "HEAD:refs/heads/$DEFAULT_BRANCH" --follow-tags 2>&1 || die "Push failed — check token permissions"
else
  log "Pushing to $REMOTE..."
  git push "$REMOTE" "HEAD:refs/heads/$DEFAULT_BRANCH" --follow-tags 2>&1 || die "Push failed — run manually: git push $REMOTE $DEFAULT_BRANCH --follow-tags"
fi

echo ""
log "═══ Release complete: $NEW_TAG ═══"
echo ""
