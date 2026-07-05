# Idempotency and Convergent Configuration

## Core Principle

An operation is idempotent when applying it multiple times produces the same result as applying it once. In configuration management, this means:

- First run: system moves from current state to desired state
- Second run: system is already in desired state, no changes made
- Result: deterministic, predictable infrastructure

## Convergent State Model

```
Current State --[CM tool]--> Desired State
     |                            |
     v                            v
  Drift detected         Already converged
     |                            |
     v                            v
  Remediate              Report "0 changes"
```

## Idempotent Task Patterns

### Package Management
```yaml
# Idempotent: declares desired state
- ansible.builtin.apt:
    name: nginx
    state: present

# NOT idempotent: runs every time
- ansible.builtin.shell: apt-get install -y nginx
```

### File Management
```yaml
# Idempotent: only writes if content differs
- ansible.builtin.template:
    src: config.j2
    dest: /etc/app/config.yml
    mode: "0644"
    owner: app
```

### Service Management
```yaml
# Idempotent: ensures state, doesn't restart every run
- ansible.builtin.systemd:
    name: nginx
    state: started
    enabled: true
```

## Drift Detection Strategies

### Scheduled Dry-Run

Run CM in check/noop mode on a schedule to detect drift without fixing it:

```bash
# Ansible
ansible-playbook site.yml --check --diff

# Puppet
puppet agent --test --noop

# Chef
chef-client --why-run
```

### State Comparison

Compare actual system state against declared configuration:

1. **File checksums** -- detect manual edits to managed files
2. **Package versions** -- detect manual installs or upgrades
3. **Service status** -- detect manual stops or restarts
4. **User/group changes** -- detect privilege modifications

### Drift Metrics

Track and alert on:
- Number of resources changed per run (should be 0 in steady state)
- Time since last successful convergence
- Resources that flip-flop between states (oscillation)

## Common Idempotency Violations

| Pattern | Problem | Fix |
|---------|---------|-----|
| `shell: echo >> file` | Appends on every run | Use `lineinfile` or template |
| `command: useradd` | Fails if user exists | Use `user` module with `state: present` |
| `shell: curl \| bash` | Re-runs installer | Use package module or `creates:` arg |
| Timestamp in config | File changes every run | Use static values or facts |
| Random values | Different each run | Generate once, store in vault |

## Testing Idempotency

```yaml
# Molecule converge + idempotence test
# molecule/default/converge.yml runs twice
# Second run must report 0 "changed" tasks

# In CI pipeline:
- name: Run playbook
  command: ansible-playbook site.yml
  register: first_run

- name: Run playbook again (idempotence check)
  command: ansible-playbook site.yml
  register: second_run
  failed_when: second_run.stdout | regex_search('changed=[1-9]')
```

## Drift Remediation Approaches

1. **Auto-remediate** -- CM agent runs on schedule, fixes drift automatically
2. **Alert-and-review** -- detect drift, notify team, manual review before fix
3. **Immutable infrastructure** -- never fix drift, replace the instance entirely

Choose based on risk tolerance and change management requirements.

## Convergence Guarantees

- **Strong convergence**: single run always reaches desired state
- **Eventual convergence**: multiple runs may be needed (dependency ordering)
- **Non-convergent**: oscillation between states (indicates design bug)

Ensure dependency ordering is explicit (`require`, `notify`, `meta/main.yml` deps) to achieve strong convergence in a single pass.
