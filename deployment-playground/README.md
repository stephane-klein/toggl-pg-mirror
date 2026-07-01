# Deployment Playground

Local playground for testing the application in a production-like environment.

## Setup

```bash
$ podman compose build
$ podman compose run --rm app seed
$ podman compose up -d app
```

## Logs

```bash
$ podman compose logs -f app
{"level":30,"time":1782215830031,"pid":2,"hostname":"7b58ecbf5e23","msg":"Attempting to connect to postgres://xxxxx:5432/postgres"}
{"level":30,"time":1782215830061,"pid":2,"hostname":"7b58ecbf5e23","msg":"Migrations done"}
{"level":30,"time":1782215830254,"pid":14,"hostname":"7b58ecbf5e23","pollIntervalSeconds":600,"msg":"Sync daemon starting"}
{"level":30,"time":1782215830255,"pid":14,"hostname":"7b58ecbf5e23","pollIntervalSeconds":600,"msg":"Sync daemon started"}
...
```

```bash
$ mise enter-in-app
root@d2e3718b1537:/app# toggl-pg-mirror csv-import /toggl-export-data/Toggl_time_entries_2023-01-01_to_2023-12-31.csv
{"level":30,"time":1782217464288,"pid":35,"hostname":"d2e3718b1537","deleted":0,"inserted":11297,"dateRange":{"min":"2023-05-09T10:57:58.000Z","max":"2023-12-31T22:11:45.000Z"},"msg":"CSV import completed"}
root@d2e3718b1537:/app# toggl-pg-mirror csv-import /toggl-export-data/Toggl_time_entries_2023-01-01_to_2023-12-31.csv
{"level":30,"time":1782217476068,"pid":47,"hostname":"d2e3718b1537","deleted":11297,"inserted":11297,"dateRange":{"min":"2023-05-09T10:57:58.000Z","max":"2023-12-31T22:11:45.000Z"},"msg":"CSV import completed"}
```

```bash
$ mise enter-in-pg
psql (18.4 (Debian 18.4-1.pgdg13+1))
Type "help" for help.

postgres=# \dt memex.*
                  List of tables
 Schema |         Name         | Type  |  Owner
--------+----------------------+-------+----------
 memex  | migrations           | table | postgres
 memex  | time_entries         | table | postgres
 memex  | time_entry_audit_log | table | postgres
(3 rows)

postgres=# select count(*) from memex.time_entries;
 count
-------
 11916
(1 row)
```

## Tear down

```bash
$ podman compose down -v
```
