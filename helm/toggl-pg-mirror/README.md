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
# 1. Create the namespace and Toggl API token
$ kubectl create namespace toggl-pg-mirror
$ kubectl create secret generic toggl-api-token \
  -n toggl-pg-mirror \
  --from-literal=token=YOUR_TOGGL_API_TOKEN

# 2. Install or upgrade (via helmfile)
$ helmfile apply
```

## Configuration

See [`values.yaml`](./values.yaml).

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
