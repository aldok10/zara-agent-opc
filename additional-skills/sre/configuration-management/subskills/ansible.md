# Ansible

Playbooks, roles, collections, vault, and operational best practices.

## When to Load
- Writing or maintaining Ansible playbooks
- Structuring roles and collections
- Managing secrets with Ansible Vault
- Automating server configuration at scale

## Key Concepts

**Execution model:** agentless, push-based over SSH. Control node runs playbooks against inventory of managed hosts. Idempotent by design.

**Structure hierarchy:** Playbook -> Roles -> Tasks -> Modules. Collections package roles + modules for distribution.

**Inventory:** static (INI/YAML files) or dynamic (scripts/plugins that query cloud APIs).

**Ansible Vault:** encrypt sensitive data (passwords, keys, certificates) at rest. Decrypt at runtime with vault password.

## Patterns

**Role structure (best practice):**
```
roles/
  webserver/
    tasks/main.yml
    handlers/main.yml
    templates/nginx.conf.j2
    files/
    vars/main.yml
    defaults/main.yml
    meta/main.yml
```

**Playbook with roles:**
```yaml
---
- name: Configure web servers
  hosts: webservers
  become: true
  vars_files:
    - vars/secrets.yml

  pre_tasks:
    - name: Update apt cache
      ansible.builtin.apt:
        update_cache: true
        cache_valid_time: 3600

  roles:
    - role: common
    - role: webserver
      vars:
        nginx_worker_processes: auto
        nginx_worker_connections: 4096
    - role: monitoring
      tags: [monitoring]

  post_tasks:
    - name: Verify service health
      ansible.builtin.uri:
        url: "http://localhost/health"
        status_code: 200
      retries: 3
      delay: 5
```

**Dynamic inventory (AWS EC2):**
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
  - key: placement.availability_zone
    prefix: az
compose:
  ansible_host: private_ip_address
```

**Vault usage:**
```bash
# Encrypt a file
ansible-vault encrypt vars/secrets.yml

# Encrypt a single variable
ansible-vault encrypt_string 'supersecret' --name 'db_password'

# Run playbook with vault
ansible-playbook site.yml --ask-vault-pass
# Or with vault password file
ansible-playbook site.yml --vault-password-file=~/.vault_pass
```

## Gotchas
- `command` and `shell` modules are not idempotent by default -- use `creates`/`removes` args
- `become: true` at play level applies to all tasks -- scope it to tasks that need it
- Variable precedence is complex (22 levels) -- use `defaults/` for overridable, `vars/` for fixed
- Large inventories with `gather_facts: true` are slow -- disable or cache facts
- Handlers only run once regardless of how many tasks notify them
- Vault-encrypted files in git show as binary diffs -- consider encrypting only values

## Verification
- `ansible-playbook --check --diff site.yml` for dry run with change preview
- `ansible-lint` for playbook quality and best practice checking
- `ansible-inventory --graph` to visualize inventory structure
- `ansible all -m ping` to verify connectivity to all hosts
- Molecule for role testing: `molecule test`
- `ansible-playbook site.yml --tags=<tag>` to run specific subset
