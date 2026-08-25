# toggl-pg-mirror Helm chart

Deploys the [toggl-pg-mirror](https://github.com/stephane-klein/toggl-pg-mirror)
service on Kubernetes — a daemon that mirrors Toggl time-tracking data into a
PostgreSQL database and keeps it in sync.

The container image is published on
[GitHub Container Registry](https://github.com/users/stephane-klein/packages/container/package/toggl-pg-mirror):
`ghcr.io/stephane-klein/toggl-pg-mirror`.

## Prerequisites

- **Kubernetes cluster** (tested on k3s)
- **Helm** 3.8+
- **CloudNativePG** cluster with database `memex` in namespace `memex`
  - The chart expects a secret named `memex-app` (standard CNPG app secret) in
    the `memex` namespace containing keys: `host`, `port`, `dbname`, `username`,
    `password`, `pgpass`
  - This secret is automatically created by the CloudNativePG operator
- **[External Secrets Operator](https://external-secrets.io/latest/)** (optional but recommended) — if `eso.enabled=true`,
  the chart creates a `ClusterSecretStore` and `ClusterExternalSecret` to
  automatically replicate the `memex-app` secret into the release namespace
- **Toggl API token** — must be created manually as a Kubernetes secret

## Quick start

```bash
# 1. Create the namespace and the application secret
$ kubectl create namespace toggl-pg-mirror
$ kubectl create secret generic toggl-pg-mirror \
  -n toggl-pg-mirror \
  --from-literal=toggl-token=YOUR_TOGGL_API_TOKEN \
  --from-literal=admin-token=$(openssl rand -hex 32) \
  --from-literal=smtp-password=YOUR_SMTP_PASSWORD \
  --from-literal=mcp-reader-postgres-password=$(openssl rand -hex 24)

# 2. Install or upgrade (via helmfile)
$ helmfile apply
```

## Configuration

See [`values.yaml`](./values.yaml).

All application secrets live in a single Kubernetes Secret (default name
`toggl-pg-mirror`) referenced by `existingSecret`. The secret holds keys,
configurable via `existingSecret.togglTokenKey`, `existingSecret.adminTokenKey`,
`existingSecret.smtpPassKey` and `existingSecret.mcpReaderPostgresPasswordKey`
(defaults: `toggl-token`, `admin-token`, `smtp-password`,
`mcp-reader-postgres-password`).

### MCP read-only server

The service exposes a read-only [MCP](https://modelcontextprotocol.io) server at
`/mcp/readonly` that lets an AI agent query the `time_entries` table over raw SQL
(see the `src/routes/(mcp)/mcp` page in the app). Access is read-only by design,
enforced both by HTTP authentication (a per-user MCP token) and by a dedicated
PostgreSQL role with `SELECT`-only privileges on `time_entries`.

At startup the app creates this reader role when the
`mcp-reader-postgres-password` key (default) of the application secret is set.
The role name defaults to `toggl_mcp_reader`, configurable via `mcp.readerRole`.
If the key is absent, the MCP read-only access is silently disabled. The app's
DB user must have permission to `CREATE ROLE` (the standard CNPG app user does).

### Admin token

The admin API (`/api/v1/admin/*`, e.g. user management and the
`send-test-mail` endpoint) is protected by a bearer token, read from the
`admin-token` key of the application secret. It must be **at least 32
characters** long.

### Managing users (idempotent GitOps)

After deploying the chart, provision or reconcile the set of users idempotently
through the admin API. This is the GitOps pattern: a configuration file declares
the desired users, and a runner applies it — create/update/delete in one atomic
`PUT /api/v1/admin/users/sync`, re-applicable without error and with a stable
final state.

Sync users against the deployed application:

```bash
$ curl -s -X PUT -H "Authorization: Bearer ${TOGGL_PG_MIRROR_ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    --data @api-payloads-examples/users-sync.json \
    https://toggl-pg-mirror.example.com/api/v1/admin/users/sync | jq
```

A ready-to-use payload lives in
[`api-payloads-examples/users-sync.json`](../../api-payloads-examples/users-sync.json)
at the repository root — see the [root README section](../../README.md) for the
idempotency details and the single-user `PUT /api/v1/admin/users` variant.


### SMTP / outgoing email

Configure SMTP to enable sending emails (e.g. the test email endpoint). The
password is read from the `smtp-password` key of the application secret:

```bash
$ helm upgrade --install toggl-pg-mirror oci://ghcr.io/stephane-klein/charts/toggl-pg-mirror \
    --namespace toggl-pg-mirror \
    --set smtp.host=smtp.example.com \
    --set smtp.port=587 \
    --set smtp.user=app@example.com \
    --set smtp.from=app@example.com \
    --set smtp.testTo=operator@example.com
```

## How it works

### PostgreSQL connection

The connection URL is built at pod startup from the `pgpass` field of the CNPG
secret (`host:port:dbname:username:password`). The chart uses a wrapper script
that parses this value and exports `TOGGL_PG_MIRROR_POSTGRES_URL`.

If [ESO](https://external-secrets.io/latest/) is enabled, the CNPG secret is automatically replicated from the
`memex` namespace into the release namespace. If disabled, you need to copy
the secret manually:

```bash
$ kubectl get secret memex-app -n memex -o yaml \
  | yq 'del(.metadata.namespace, .metadata.uid, .metadata.resourceVersion, .metadata.creationTimestamp)' \
  | kubectl apply -n toggl-pg-mirror -f -
```

## Helmfile deployment

Add this release to your `helmfile.yaml`:

```yaml
repositories:
  - name: cnpg
    url: https://cloudnative-pg.github.io/charts

releases:
  - name: memex
    namespace: memex
    createNamespace: true
    chart: cnpg/cluster
    version: 0.7.0
    values:
      - values/cnpg-memex.yaml

  - name: toggl-pg-mirror
    namespace: toggl-pg-mirror
    createNamespace: true
    chart: oci://ghcr.io/stephane-klein/charts/toggl-pg-mirror
    version: 0.1.0
```

Deploy with:

```bash
$ helmfile apply
```

## Upgrade

After updating the container image tag or chart values, re-run:

```bash
$ helmfile apply
```
