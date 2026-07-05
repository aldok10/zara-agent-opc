#!/usr/bin/env bash
set -euo pipefail

# Drift Detection Script
# Checks ArgoCD Application sync status and reports out-of-sync applications.
# Requires: argocd CLI authenticated, or kubectl access to ArgoCD namespace.

ARGOCD_NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-table}"
ALERT_ON_DEGRADED="${ALERT_ON_DEGRADED:-true}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Options:
  -n, --namespace   ArgoCD namespace (default: argocd)
  -f, --format      Output format: table, json, csv (default: table)
  -s, --server      ArgoCD server URL (uses CLI config if unset)
  -p, --project     Filter by ArgoCD project
  --slack-webhook   Slack webhook URL for alerts
  -h, --help        Show this help

Examples:
  $(basename "$0")
  $(basename "$0") --format json --project platform
  $(basename "$0") --slack-webhook https://hooks.slack.com/services/XXX
EOF
}

SLACK_WEBHOOK=""
PROJECT_FILTER=""
ARGOCD_SERVER=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -n|--namespace) ARGOCD_NAMESPACE="$2"; shift 2 ;;
    -f|--format) OUTPUT_FORMAT="$2"; shift 2 ;;
    -s|--server) ARGOCD_SERVER="$2"; shift 2 ;;
    -p|--project) PROJECT_FILTER="$2"; shift 2 ;;
    --slack-webhook) SLACK_WEBHOOK="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 1 ;;
  esac
done

check_dependencies() {
  local missing=()
  for cmd in kubectl jq; do
    if ! command -v "$cmd" &>/dev/null; then
      missing+=("$cmd")
    fi
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "ERROR: Missing required tools: ${missing[*]}" >&2
    exit 1
  fi
}

get_applications() {
  local selector=""
  if [[ -n "$PROJECT_FILTER" ]]; then
    selector="-l argocd.argoproj.io/project=$PROJECT_FILTER"
  fi

  kubectl get applications -n "$ARGOCD_NAMESPACE" $selector -o json 2>/dev/null
}

analyze_sync_status() {
  local apps_json="$1"

  echo "$apps_json" | jq -r '
    .items[] | {
      name: .metadata.name,
      project: .spec.project,
      sync_status: .status.sync.status,
      health_status: .status.health.status,
      revision: (.status.sync.revision // "unknown")[0:8],
      last_synced: (.status.operationState.finishedAt // "never"),
      message: (.status.conditions // [] | map(.message) | join("; "))
    }
  '
}

format_table() {
  local data="$1"
  printf "%-35s %-12s %-12s %-10s %-20s\n" "APPLICATION" "SYNC" "HEALTH" "REVISION" "LAST_SYNCED"
  printf "%-35s %-12s %-12s %-10s %-20s\n" "-----------" "----" "------" "--------" "-----------"

  echo "$data" | jq -r '
    [.name, .sync_status, .health_status, .revision, .last_synced] | @tsv
  ' | while IFS=$'\t' read -r name sync health rev synced; do
    printf "%-35s %-12s %-12s %-10s %-20s\n" "$name" "$sync" "$health" "$rev" "$synced"
  done
}

format_json() {
  local data="$1"
  echo "$data" | jq -s '.'
}

format_csv() {
  local data="$1"
  echo "application,sync_status,health_status,revision,last_synced,message"
  echo "$data" | jq -r '[.name, .sync_status, .health_status, .revision, .last_synced, .message] | @csv'
}

get_out_of_sync() {
  local data="$1"
  echo "$data" | jq 'select(.sync_status != "Synced" or .health_status == "Degraded" or .health_status == "Missing")'
}

send_slack_alert() {
  local out_of_sync="$1"
  local count
  count=$(echo "$out_of_sync" | jq -s 'length')

  if [[ "$count" -eq 0 ]]; then
    return
  fi

  local app_list
  app_list=$(echo "$out_of_sync" | jq -r '"- *" + .name + "*: sync=" + .sync_status + " health=" + .health_status' | head -20)

  local payload
  payload=$(jq -n \
    --arg text ":warning: *GitOps Drift Detected* -- $count application(s) out of sync" \
    --arg apps "$app_list" \
    '{
      blocks: [
        { type: "header", text: { type: "plain_text", text: "GitOps Drift Detected" } },
        { type: "section", text: { type: "mrkdwn", text: ($text + "\n\n" + $apps) } }
      ]
    }')

  curl -s -X POST -H "Content-Type: application/json" -d "$payload" "$SLACK_WEBHOOK" >/dev/null
  echo "Slack alert sent for $count out-of-sync application(s)."
}

main() {
  check_dependencies

  local apps_json
  apps_json=$(get_applications)

  if [[ -z "$apps_json" ]] || [[ "$(echo "$apps_json" | jq '.items | length')" -eq 0 ]]; then
    echo "No ArgoCD applications found in namespace: $ARGOCD_NAMESPACE"
    exit 0
  fi

  local analyzed
  analyzed=$(analyze_sync_status "$apps_json")

  case "$OUTPUT_FORMAT" in
    table) format_table "$analyzed" ;;
    json)  format_json "$analyzed" ;;
    csv)   format_csv "$analyzed" ;;
    *)     echo "Unknown format: $OUTPUT_FORMAT"; exit 1 ;;
  esac

  local out_of_sync
  out_of_sync=$(get_out_of_sync "$analyzed")
  local drift_count
  drift_count=$(echo "$out_of_sync" | jq -s 'length')

  echo ""
  if [[ "$drift_count" -gt 0 ]]; then
    echo "WARNING: $drift_count application(s) out of sync or degraded."
    if [[ -n "$SLACK_WEBHOOK" ]]; then
      send_slack_alert "$out_of_sync"
    fi
    exit 2
  else
    echo "All applications are in sync and healthy."
    exit 0
  fi
}

main
