#!/usr/bin/env bash
set -euo pipefail

# systemd Service Security Auditor
# Analyzes all running services or a specific service for security posture

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

THRESHOLD="${THRESHOLD:-5.0}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-text}"

usage() {
    echo "Usage: $0 [OPTIONS] [SERVICE...]"
    echo ""
    echo "Options:"
    echo "  -t, --threshold SCORE  Fail if any service scores above this (default: 5.0)"
    echo "  -a, --all              Audit all loaded services"
    echo "  -j, --json             Output in JSON format"
    echo "  -q, --quiet            Only show services above threshold"
    echo "  -h, --help             Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 nginx.service"
    echo "  $0 --all --threshold 3.0"
    echo "  $0 -a -j > audit-report.json"
}

audit_service() {
    local service="$1"
    local quiet="${2:-false}"

    local output
    output=$(systemd-analyze security "$service" 2>/dev/null) || {
        echo "  [SKIP] Cannot analyze $service" >&2
        return 0
    }

    local score
    score=$(echo "$output" | grep -oP 'Overall exposure level.*\K[0-9]+\.[0-9]+' || echo "10.0")

    local status
    if (( $(echo "$score < 2.0" | bc -l) )); then
        status="${GREEN}HARDENED${NC}"
    elif (( $(echo "$score < 5.0" | bc -l) )); then
        status="${BLUE}OK${NC}"
    elif (( $(echo "$score < 7.0" | bc -l) )); then
        status="${YELLOW}EXPOSED${NC}"
    else
        status="${RED}UNSAFE${NC}"
    fi

    if [[ "$quiet" == "true" ]] && (( $(echo "$score <= $THRESHOLD" | bc -l) )); then
        return 0
    fi

    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        local missing_directives
        missing_directives=$(echo "$output" | grep -c "^.*UNSAFE\|^.*EXPOSED" || echo "0")
        printf '{"service":"%s","score":%s,"missing_directives":%s}' \
            "$service" "$score" "$missing_directives"
    else
        printf "  %-40s Score: %4s  [%b]\n" "$service" "$score" "$status"
    fi

    if (( $(echo "$score > $THRESHOLD" | bc -l) )); then
        return 1
    fi
    return 0
}

suggest_fixes() {
    local service="$1"
    echo ""
    echo "  Suggested hardening for $service:"
    echo "  ──────────────────────────────────"

    local output
    output=$(systemd-analyze security "$service" 2>/dev/null) || return 0

    if echo "$output" | grep -q "ProtectSystem.*UNSAFE\|ProtectSystem.*EXPOSED"; then
        echo "  + ProtectSystem=strict"
        echo "  + ReadWritePaths=/var/lib/${service%.service}"
    fi
    if echo "$output" | grep -q "PrivateTmp.*UNSAFE\|PrivateTmp.*EXPOSED"; then
        echo "  + PrivateTmp=true"
    fi
    if echo "$output" | grep -q "PrivateDevices.*UNSAFE\|PrivateDevices.*EXPOSED"; then
        echo "  + PrivateDevices=true"
    fi
    if echo "$output" | grep -q "ProtectKernelTunables.*UNSAFE\|ProtectKernelTunables.*EXPOSED"; then
        echo "  + ProtectKernelTunables=true"
    fi
    if echo "$output" | grep -q "ProtectKernelModules.*UNSAFE\|ProtectKernelModules.*EXPOSED"; then
        echo "  + ProtectKernelModules=true"
    fi
    if echo "$output" | grep -q "NoNewPrivileges.*UNSAFE\|NoNewPrivileges.*EXPOSED"; then
        echo "  + NoNewPrivileges=true"
    fi
    if echo "$output" | grep -q "ProtectHome.*UNSAFE\|ProtectHome.*EXPOSED"; then
        echo "  + ProtectHome=true"
    fi
    if echo "$output" | grep -q "RestrictNamespaces.*UNSAFE\|RestrictNamespaces.*EXPOSED"; then
        echo "  + RestrictNamespaces=true"
    fi
    if echo "$output" | grep -q "SystemCallFilter.*UNSAFE\|SystemCallFilter.*EXPOSED"; then
        echo "  + SystemCallFilter=@system-service"
    fi
    echo ""
}

main() {
    local services=()
    local all=false
    local quiet=false
    local show_fixes=true

    while [[ $# -gt 0 ]]; do
        case "$1" in
            -t|--threshold) THRESHOLD="$2"; shift 2 ;;
            -a|--all) all=true; shift ;;
            -j|--json) OUTPUT_FORMAT="json"; show_fixes=false; shift ;;
            -q|--quiet) quiet=true; shift ;;
            -h|--help) usage; exit 0 ;;
            *) services+=("$1"); shift ;;
        esac
    done

    if [[ "$all" == "true" ]]; then
        mapfile -t services < <(systemctl list-units --type=service --state=running --no-legend | awk '{print $1}')
    fi

    if [[ ${#services[@]} -eq 0 ]]; then
        echo "Error: No services specified. Use -a for all or provide service names." >&2
        usage
        exit 1
    fi

    local failed=0
    local total=0
    local passed=0

    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        echo '{"threshold":'"$THRESHOLD"',"services":['
        local first=true
    else
        echo ""
        echo "  systemd Security Audit (threshold: $THRESHOLD)"
        echo "  ════════════════════════════════════════════════"
        echo ""
    fi

    for service in "${services[@]}"; do
        total=$((total + 1))

        if [[ "$OUTPUT_FORMAT" == "json" ]]; then
            [[ "$first" == "true" ]] || echo ","
            first=false
        fi

        if audit_service "$service" "$quiet"; then
            passed=$((passed + 1))
        else
            failed=$((failed + 1))
            if [[ "$show_fixes" == "true" ]]; then
                suggest_fixes "$service"
            fi
        fi
    done

    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        echo '],"summary":{"total":'"$total"',"passed":'"$passed"',"failed":'"$failed"'}}'
    else
        echo ""
        echo "  ────────────────────────────────────────────────"
        printf "  Total: %d  Passed: ${GREEN}%d${NC}  Failed: ${RED}%d${NC}\n" "$total" "$passed" "$failed"
        echo ""
    fi

    if [[ $failed -gt 0 ]]; then
        exit 1
    fi
}

main "$@"
