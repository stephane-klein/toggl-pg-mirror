#!/bin/sh
export PUBLIC_GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
export PUBLIC_GIT_HASH="$(git rev-parse HEAD 2>/dev/null || echo '')"
export PUBLIC_GIT_DATE="$(git log -1 --format=%cd --date=short 2>/dev/null || echo '')"
export PUBLIC_BUILD_STAMP="$(date -u +%FT%TZ 2>/dev/null || echo '')"

REPO_RAW=$(jq -r '.repository // ""' package.json)
case "$REPO_RAW" in
    github:*)
        export PUBLIC_REPO_URL="https://github.com/${REPO_RAW#github:}"
        ;;
    *)
        export PUBLIC_REPO_URL=""
        ;;
esac

exec "$@"
