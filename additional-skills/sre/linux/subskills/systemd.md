---
type: subskill
title: "Linux systemd"
---

# Linux systemd

Unit files, dependencies, sandboxing, and timer-based scheduling.

## When to Load
- Writing or debugging systemd service units
- Configuring service dependencies and ordering
- Applying security sandboxing to services
- Replacing cron with systemd timers

## Key Concepts

**Unit types:** .service (daemons), .timer (scheduling), .socket (activation), .mount, .target (grouping).

**Service types:** simple (default, main process), exec (after exec succeeds), forking (traditional daemons), oneshot (run-to-completion), notify (sd_notify ready).

**Dependencies:**
- `Wants=` soft dependency (starts but doesn't fail if dep fails)
- `Requires=` hard dependency (fails if dep fails)
- `After=` ordering (wait for dep to start)
- `BindsTo=` lifecycle binding (stops when dep stops)

**Sandboxing:** restrict filesystem, network, syscalls, and capabilities per service.

## Patterns

**Production service unit:**
```ini
[Unit]
Description=API Server
After=network-online.target postgresql.service
Wants=network-online.target
Requires=postgresql.service

[Service]
Type=notify
User=appuser
Group=appuser
WorkingDirectory=/opt/app
ExecStart=/opt/app/bin/server
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
RestartSec=5
WatchdogSec=30

Environment=NODE_ENV=production
EnvironmentFile=-/opt/app/.env

# Sandboxing
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
NoNewPrivileges=true
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
ReadWritePaths=/opt/app/data /var/log/app

[Install]
WantedBy=multi-user.target
```

**Timer (replaces cron):**
```ini
[Unit]
Description=Daily backup timer

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

**Socket activation:**
```ini
[Socket]
ListenStream=8080
Accept=no
ReusePort=true

[Install]
WantedBy=sockets.target
```

## Gotchas
- `Type=simple` assumes process is ready immediately -- use `notify` for apps that need startup time
- `Restart=always` without `RestartSec` can cause restart loops that saturate the system
- `EnvironmentFile=-/path` (dash prefix) means don't fail if file is missing
- `ProtectSystem=strict` makes entire filesystem read-only except explicitly allowed paths
- Timer `Persistent=true` runs missed executions on boot -- can cause thundering herd
- `systemctl enable` creates symlinks; `systemctl start` runs immediately -- they're independent

## Verification
- `systemctl status <unit>` for current state and recent logs
- `systemd-analyze security <unit>` for sandbox scoring (0-10, lower is more secure)
- `journalctl -u <unit> -f` for live logs
- `systemctl list-timers` for next/last timer execution
- `systemd-analyze blame` for boot time per unit
- `systemd-analyze verify <unit-file>` for syntax errors
