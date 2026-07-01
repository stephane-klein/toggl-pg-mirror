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
    serve|"")
        node src/migrate.js
        exec node /app/build/index.js
        ;;
    *)
        if command -v "$1" > /dev/null 2>&1; then
            exec "$@"
        else
            exec node src/cli.js "$@"
        fi
        ;;
esac