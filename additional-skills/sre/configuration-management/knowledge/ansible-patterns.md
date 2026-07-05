---
type: fact
title: "Ansible Patterns"
---

# Ansible Patterns

## Playbook Structure

```yaml
# site.yml -- top-level orchestration
- name: Configure web tier
  hosts: web_servers
  become: true
  serial: "25%"
  pre_tasks:
    - name: Verify connectivity
      ansible.builtin.ping:
  roles:
    - role: common
      tags: [base]
    - role: nginx
      tags: [web]
    - role: app_deploy
      tags: [deploy]
  post_tasks:
    - name: Verify service health
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}:{{ app_port }}/health"
        status_code: 200
```

## Role Layout

```
roles/nginx/
  defaults/main.yml      # lowest precedence variables
  vars/main.yml          # role-internal variables
  tasks/main.yml         # task entry point
  handlers/main.yml      # service restart handlers
  templates/nginx.conf.j2
  files/                 # static files
  meta/main.yml          # dependencies, galaxy metadata
  molecule/default/      # test scenarios
```

## Collections

Use fully qualified collection names (FQCN) for all modules:

```yaml
- name: Install packages
  ansible.builtin.apt:
    name: "{{ packages }}"
    state: present
    update_cache: true
    cache_valid_time: 3600
```

Pin collection versions in `requirements.yml`:

```yaml
collections:
  - name: community.general
    version: "9.1.0"
  - name: ansible.posix
    version: "2.0.0"
```

## Vault

Encrypt sensitive variables per environment:

```bash
ansible-vault encrypt_string 'supersecret' --name 'db_password'
ansible-vault encrypt group_vars/production/vault.yml
```

Reference pattern -- keep vault vars prefixed:

```yaml
# group_vars/production/vault.yml (encrypted)
vault_db_password: !vault |
  $ANSIBLE_VAULT;1.1;AES256
  ...

# group_vars/production/vars.yml (plain)
db_password: "{{ vault_db_password }}"
```

## Variable Precedence (use deliberately)

1. Extra vars (-e) -- highest, use for CI overrides
2. Task vars / block vars
3. Role vars (vars/main.yml)
4. Host vars
5. Group vars (child > parent)
6. Role defaults -- lowest, always overridable

## Inventory Patterns

```ini
[web_servers]
web-[01:04].prod.internal

[db_servers]
db-01.prod.internal ansible_host=10.0.1.10

[production:children]
web_servers
db_servers

[production:vars]
env=production
```

Dynamic inventory for cloud (AWS, GCP, Azure) via inventory plugins:

```yaml
# inventory/aws_ec2.yml
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1
filters:
  tag:Environment: production
keyed_groups:
  - key: tags.Role
    prefix: role
```

## Handler Patterns

```yaml
handlers:
  - name: Restart nginx
    ansible.builtin.systemd:
      name: nginx
      state: restarted
      daemon_reload: true
    listen: "restart web server"

  - name: Reload nginx
    ansible.builtin.systemd:
      name: nginx
      state: reloaded
    listen: "reload web server"
```

## Testing with Molecule

```yaml
# molecule/default/molecule.yml
driver:
  name: docker
platforms:
  - name: instance
    image: ubuntu:24.04
    privileged: true
provisioner:
  name: ansible
verifier:
  name: ansible
```

## Anti-patterns to Avoid

- `shell:` when `ansible.builtin.*` module exists
- `ignore_errors: true` without `failed_when` refinement
- Untagged tasks in shared roles
- Variables defined in playbook that belong in group_vars
- Missing `become` leading to permission issues caught late
