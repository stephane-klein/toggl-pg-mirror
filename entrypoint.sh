#!/bin/sh

set -e

COMMAND=${1:-""}

case "$COMMAND" in
    migrate)
        node src/migrate.js
        ;;
    seed)
        node src/migrate.js
        node src/seed.js
        ;;
    start-api-sync|"")
        node src/migrate.js
        node src/cli.js start-api-sync
        ;;
    *)
        if command -v "$1" > /dev/null 2>&1; then
            exec "$@"
        else
            exec node src/cli.js "$@"
        fi
        ;;
esac