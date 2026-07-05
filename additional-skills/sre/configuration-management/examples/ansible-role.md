---
type: example
title: "Ansible Role for Hardened Web Server"
---

# Ansible Role for Hardened Web Server

## Context
When provisioning web servers that must meet CIS benchmarks and organizational security standards. This role configures Nginx with TLS, disables unnecessary services, sets up firewall rules, and applies OS-level hardening—all idempotent and testable.

## Code/Template

```yaml
# roles/hardened-webserver/tasks/main.yml
---
- name: OS hardening
  ansible.builtin.import_tasks: os-hardening.yml
  tags: [hardening]

- name: Install and configure Nginx
  ansible.builtin.import_tasks: nginx.yml
  tags: [nginx]

- name: Configure firewall
  ansible.builtin.import_tasks: firewall.yml
  tags: [firewall]

- name: Configure audit logging
  ansible.builtin.import_tasks: auditd.yml
  tags: [audit]
```

```yaml
# roles/hardened-webserver/tasks/os-hardening.yml
---
- name: Update all packages
  ansible.builtin.apt:
    upgrade: safe
    update_cache: true
    cache_valid_time: 3600

- name: Remove unnecessary packages
  ansible.builtin.apt:
    name:
      - telnet
      - rsh-client
      - rsh-server
      - xinetd
      - tftp
    state: absent

- name: Disable unused filesystems
  ansible.builtin.copy:
    dest: /etc/modprobe.d/disable-filesystems.conf
    content: |
      install cramfs /bin/true
      install freevxfs /bin/true
      install jffs2 /bin/true
      install hfs /bin/true
      install hfsplus /bin/true
    mode: "0644"

- name: Set sysctl security parameters
  ansible.posix.sysctl:
    name: "{{ item.key }}"
    value: "{{ item.value }}"
    sysctl_set: true
    reload: true
  loop:
    - { key: "net.ipv4.conf.all.send_redirects", value: "0" }
    - { key: "net.ipv4.conf.default.accept_redirects", value: "0" }
    - { key: "net.ipv4.conf.all.accept_source_route", value: "0" }
    - { key: "net.ipv4.tcp_syncookies", value: "1" }
    - { key: "net.ipv4.icmp_echo_ignore_broadcasts", value: "1" }
    - { key: "kernel.randomize_va_space", value: "2" }
    - { key: "fs.suid_dumpable", value: "0" }

- name: Set secure permissions on sensitive files
  ansible.builtin.file:
    path: "{{ item }}"
    mode: "0600"
  loop:
    - /etc/shadow
    - /etc/gshadow
    - /boot/grub/grub.cfg

- name: Configure SSH hardening
  ansible.builtin.template:
    src: sshd_config.j2
    dest: /etc/ssh/sshd_config
    mode: "0600"
    validate: "sshd -t -f %s"
  notify: Restart sshd
```

```yaml
# roles/hardened-webserver/tasks/nginx.yml
---
- name: Install Nginx
  ansible.builtin.apt:
    name: nginx
    state: present

- name: Deploy Nginx main config
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    mode: "0644"
    validate: "nginx -t -c %s"
  notify: Reload nginx

- name: Deploy TLS configuration
  ansible.builtin.template:
    src: tls.conf.j2
    dest: /etc/nginx/conf.d/tls.conf
    mode: "0644"
  notify: Reload nginx

- name: Remove default site
  ansible.builtin.file:
    path: /etc/nginx/sites-enabled/default
    state: absent
  notify: Reload nginx

- name: Deploy security headers snippet
  ansible.builtin.copy:
    dest: /etc/nginx/snippets/security-headers.conf
    content: |
      add_header X-Frame-Options "SAMEORIGIN" always;
      add_header X-Content-Type-Options "nosniff" always;
      add_header X-XSS-Protection "1; mode=block" always;
      add_header Referrer-Policy "strict-origin-when-cross-origin" always;
      add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
      add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    mode: "0644"
  notify: Reload nginx
```

```yaml
# roles/hardened-webserver/tasks/firewall.yml
---
- name: Install UFW
  ansible.builtin.apt:
    name: ufw
    state: present

- name: Set default deny incoming
  community.general.ufw:
    direction: incoming
    default: deny

- name: Set default allow outgoing
  community.general.ufw:
    direction: outgoing
    default: allow

- name: Allow SSH from management network only
  community.general.ufw:
    rule: allow
    port: "22"
    proto: tcp
    from_ip: "{{ management_cidr }}"

- name: Allow HTTP/HTTPS
  community.general.ufw:
    rule: allow
    port: "{{ item }}"
    proto: tcp
  loop:
    - "80"
    - "443"

- name: Enable UFW
  community.general.ufw:
    state: enabled
```

```yaml
# roles/hardened-webserver/defaults/main.yml
---
nginx_worker_processes: auto
nginx_worker_connections: 1024
management_cidr: "10.0.0.0/8"
tls_protocols: "TLSv1.2 TLSv1.3"
tls_ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384"
ssh_allowed_users: ["deploy", "ansible"]
```

```yaml
# roles/hardened-webserver/handlers/main.yml
---
- name: Restart sshd
  ansible.builtin.systemd:
    name: sshd
    state: restarted

- name: Reload nginx
  ansible.builtin.systemd:
    name: nginx
    state: reloaded
```

## Key Points
- Always `validate` config files before deploying (nginx -t, sshd -t)—a bad config can lock you out or take down the service
- Restrict SSH to management CIDR only via firewall; defense in depth beyond just key-only auth
- Use handlers (not tasks) for service restarts so multiple config changes trigger only one reload
