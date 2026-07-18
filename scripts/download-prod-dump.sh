#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/../"

NAMESPACE="memex"
CLUSTER="memex-cluster"
DB_NAME="app"
DATE=$(date +%Y-%m-%d_%H%M)
OUTPUT_DIR="dumps/prod"
OUTPUT_FILE="${OUTPUT_DIR}/${DATE}-memex.dump"

if ! command -v kubectl &>/dev/null; then
    echo "Error: kubectl not found in PATH"
    exit 1
fi

if ! kubectl cluster-info --request-timeout=5s &>/dev/null; then
    echo "Error: cannot reach Kubernetes cluster"
    exit 1
fi

if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
    echo "Error: namespace '$NAMESPACE' not found"
    exit 1
fi

if ! kubectl -n "$NAMESPACE" get cluster "$CLUSTER" &>/dev/null; then
    echo "Error: CNPG cluster '$CLUSTER' not found in namespace '$NAMESPACE'"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

PRIMARY_POD=$(kubectl -n "$NAMESPACE" get pods \
  -l "cnpg.io/cluster=${CLUSTER},role=primary" \
  -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)

if [ -z "$PRIMARY_POD" ]; then
    echo "Error: no primary pod found for cluster '$CLUSTER' in namespace '$NAMESPACE'"
    exit 1
fi

echo "Dumping database ${DB_NAME} from ${PRIMARY_POD}..."

if ! kubectl exec "$PRIMARY_POD" -n "$NAMESPACE" -c postgres \
  -- pg_dump -Fc --no-owner -d "$DB_NAME" > "$OUTPUT_FILE"; then
    rm -f "$OUTPUT_FILE"
    echo "Error: pg_dump failed"
    exit 1
fi

echo "Dump saved to: ${OUTPUT_FILE}"
ls -lh "$OUTPUT_FILE"
