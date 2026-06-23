{{- define "toggl-pg-mirror.labels" -}}
app.kubernetes.io/name: toggl-pg-mirror
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}
