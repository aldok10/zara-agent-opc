# References

## Ansible Documentation (8 refs)
- **Ansible Documentation** -- https://docs.ansible.com/ansible/latest/ -- Complete reference for Ansible automation
- **Ansible Playbook Guide** -- https://docs.ansible.com/ansible/latest/playbook_guide/ -- Playbook syntax, variables, handlers, roles
- **Ansible Module Index** -- https://docs.ansible.com/ansible/latest/collections/index.html -- All collection modules reference
- **Ansible Roles** -- https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html -- Reusable automation units
- **Ansible Galaxy** -- https://galaxy.ansible.com/ -- Community roles and collections
- **Ansible Vault** -- https://docs.ansible.com/ansible/latest/vault_guide/ -- Encrypting sensitive data in playbooks
- **Ansible Inventory** -- https://docs.ansible.com/ansible/latest/inventory_guide/ -- Host management and dynamic inventory
- **Ansible Best Practices** -- https://docs.ansible.com/ansible/latest/tips_tricks/ansible_tips_tricks.html -- Style guide and performance tips

## Idempotency & Patterns (5 refs)
- **Idempotent Playbooks** -- https://docs.ansible.com/ansible/latest/reference_appendices/glossary.html#term-Idempotency -- Ensuring repeatable, safe execution
- **Ansible Handlers** -- https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html -- Conditional task execution on changes
- **Ansible Check Mode** -- https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_checkmode.html -- Dry-run validation without changes
- **Ansible Diff Mode** -- https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html#cmdoption-ansible-playbook-D -- Showing configuration drift
- **Ansible Blocks** -- https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_blocks.html -- Error handling and rescue patterns

## HashiCorp Vault (7 refs)
- **Vault Documentation** -- https://developer.hashicorp.com/vault/docs -- Secrets management, encryption, and access control
- **Vault Secrets Engines** -- https://developer.hashicorp.com/vault/docs/secrets -- KV, PKI, database, cloud credential engines
- **Vault Auth Methods** -- https://developer.hashicorp.com/vault/docs/auth -- Kubernetes, OIDC, AppRole, AWS authentication
- **Vault Agent** -- https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent -- Auto-auth and secret caching sidecar
- **Vault Operator** -- https://developer.hashicorp.com/vault/docs/platform/k8s/vso -- Kubernetes-native Vault secret sync
- **Vault Dynamic Secrets** -- https://developer.hashicorp.com/vault/docs/secrets/databases -- On-demand credential generation with TTL
- **Vault Transit** -- https://developer.hashicorp.com/vault/docs/secrets/transit -- Encryption as a service

## Configuration Drift (5 refs)
- **Ansible Facts** -- https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_vars_facts.html -- System state gathering for drift detection
- **Terraform Drift Detection** -- https://developer.hashicorp.com/terraform/tutorials/state/drift-and-oci -- Detecting infrastructure drift
- **AWS Config Rules** -- https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config_develop-rules.html -- Configuration compliance monitoring
- **Chef InSpec** -- https://docs.chef.io/inspec/ -- Compliance as code testing framework
- **driftctl** -- https://docs.driftctl.com/ -- Infrastructure drift detection for Terraform

## Infrastructure Automation (5 refs)
- **cloud-init** -- https://cloudinit.readthedocs.io/ -- Multi-distribution instance initialization
- **Packer** -- https://developer.hashicorp.com/packer/docs -- Machine image building automation
- **Puppet** -- https://www.puppet.com/docs/puppet/latest/ -- Declarative configuration management
- **SaltStack** -- https://docs.saltproject.io/en/latest/ -- Event-driven automation and configuration
- **systemd-tmpfiles** -- https://www.freedesktop.org/software/systemd/man/latest/systemd-tmpfiles.html -- Declarative file and directory management

## Testing & Validation (5 refs)
- **Molecule** -- https://ansible.readthedocs.io/projects/molecule/ -- Testing framework for Ansible roles
- **ansible-lint** -- https://ansible.readthedocs.io/projects/lint/ -- Best practice and style checker for Ansible
- **Testinfra** -- https://testinfra.readthedocs.io/ -- Python-based infrastructure testing
- **ServerSpec** -- https://serverspec.org/ -- RSpec-based server testing framework
- **Goss** -- https://goss.rocks/ -- Quick and easy server validation

## Secret Management Patterns (4 refs)
- **SOPS** -- https://getsops.io/ -- Encrypted file editor supporting age, PGP, cloud KMS
- **External Secrets Operator** -- https://external-secrets.io/ -- Sync secrets from any vault into Kubernetes
- **AWS Secrets Manager** -- https://docs.aws.amazon.com/secretsmanager/latest/userguide/ -- Managed secret rotation and access
- **age encryption** -- https://age-encryption.org/ -- Simple, modern file encryption tool

## Ansible Ecosystem (4 refs)
- **AWX / Ansible Tower** -- https://ansible.readthedocs.io/projects/awx/ -- Web UI and REST API for Ansible
- **Ansible Navigator** -- https://ansible.readthedocs.io/projects/navigator/ -- TUI for running and developing Ansible
- **Ansible Execution Environments** -- https://ansible.readthedocs.io/en/latest/getting_started_ee/ -- Containerized automation runtimes
- **Event-Driven Ansible** -- https://ansible.readthedocs.io/projects/rulebook/ -- Reactive automation with rulebooks
