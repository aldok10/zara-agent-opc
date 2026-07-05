---
type: fact
title: "Attack Trees"
---

# Attack Trees

Construction methodology for attack trees: AND/OR decomposition, annotations, and examples.

## What Are Attack Trees

Attack trees represent the steps an attacker takes to achieve a goal. The root node is the attacker's objective. Child nodes represent ways to achieve the parent node.

**Two node types:**
- **OR nodes** (default): attacker needs ANY child to succeed
- **AND nodes**: attacker needs ALL children to succeed

## Construction Process

### Step 1: Define the Root Goal
State the attacker's objective clearly and specifically:
- "Exfiltrate customer PII from production database"
- "Execute arbitrary code on production servers"
- "Compromise admin account"
- "Deny service to payment processing"

### Step 2: Decompose into Sub-Goals
Ask "How could an attacker achieve this?" repeatedly until you reach concrete, actionable leaf nodes.

### Step 3: Annotate Nodes
Each leaf node gets attributes:
- **Difficulty**: trivial / low / medium / high / expert
- **Cost**: $ / $$ / $$$ / $$$$
- **Detectability**: stealthy / detectable / obvious
- **Requires**: tools, access level, knowledge

### Step 4: Identify Cheapest Paths
Trace paths from root to leaves. The cheapest feasible path is the most likely attack vector.

## Example: Compromise Admin Account

```
[ROOT] Compromise Admin Account (OR)
├── [1] Steal Credentials (OR)
│   ├── [1.1] Phishing (OR)
│   │   ├── [1.1.1] Spear phish admin with fake login page
│   │   │   Difficulty: low, Detectable: medium
│   │   └── [1.1.2] MFA fatigue (push bombing)
│   │       Difficulty: low, Detectable: detectable
│   ├── [1.2] Credential Stuffing (OR)
│   │   ├── [1.2.1] Find admin email in breach databases
│   │   │   Difficulty: trivial, Detectable: stealthy
│   │   └── [1.2.2] Attempt reused passwords
│   │       Difficulty: trivial, Detectable: detectable
│   ├── [1.3] Session Hijacking (OR)
│   │   ├── [1.3.1] XSS to steal session cookie
│   │   │   Difficulty: medium, Detectable: stealthy
│   │   └── [1.3.2] Network sniffing (if not HTTPS)
│   │       Difficulty: low, Detectable: stealthy
│   └── [1.4] Keylogger/Malware on Admin Device
│       Difficulty: medium, Detectable: medium
│
├── [2] Bypass Authentication (OR)
│   ├── [2.1] Exploit auth vulnerability (OR)
│   │   ├── [2.1.1] JWT algorithm confusion
│   │   │   Difficulty: medium, Detectable: stealthy
│   │   └── [2.1.2] Authentication bypass bug
│   │       Difficulty: high, Detectable: stealthy
│   ├── [2.2] Password reset flow abuse
│   │   Difficulty: medium, Detectable: detectable
│   └── [2.3] Default/weak credentials
│       Difficulty: trivial, Detectable: obvious
│
├── [3] Escalate from Regular User (AND)
│   ├── [3.1] Obtain regular user account
│   │   Difficulty: trivial
│   ├── [3.2] Find privilege escalation path (OR)
│   │   ├── [3.2.1] IDOR to admin functions
│   │   │   Difficulty: low, Detectable: stealthy
│   │   ├── [3.2.2] Mass assignment (role field)
│   │   │   Difficulty: low, Detectable: stealthy
│   │   └── [3.2.3] GraphQL introspection reveals admin mutations
│   │       Difficulty: low, Detectable: stealthy
│   └── [3.3] Execute escalation
│       Difficulty: trivial (once path found)
│
└── [4] Social Engineering (OR)
    ├── [4.1] Convince support to reset password
    │   Difficulty: medium, Detectable: detectable
    └── [4.2] Physical access to unlocked workstation
        Difficulty: medium, Detectable: obvious
```

## Analysis of the Example

**Cheapest paths (most likely attacks):**
1. Path 1.2: Credential stuffing (trivial difficulty, but detectable)
2. Path 3: Privilege escalation (AND-node but all steps are trivial/low)
3. Path 1.1: Phishing (low difficulty, moderate detection)

**Mitigations by path:**
- Path 1.2: Enforce unique passwords, breach detection (HaveIBeenPwned), rate limiting
- Path 3: Server-side access control on all admin endpoints, no mass assignment
- Path 1.1: Passkeys/WebAuthn (phishing-resistant), security awareness training

## AND vs OR Analysis

### OR Node (default)
Attacker succeeds if ANY child succeeds. Defense must block ALL children.
```
Steal Session (OR)
├── XSS (block with CSP + output encoding)
├── Network sniffing (block with HTTPS + HSTS)
└── Cookie theft via malware (block with device trust)
```
To defend OR node: you need controls for every child.

### AND Node
Attacker must achieve ALL children. Defense can block ANY child.
```
Data Exfiltration (AND)
├── Gain database access (block with: network segmentation, strong auth)
├── Identify sensitive tables (block with: obfuscation, encryption)
└── Extract data past DLP (block with: DLP rules, egress filtering)
```
To defend AND node: blocking one child stops the entire path.

**Key insight:** Convert OR nodes to AND nodes where possible. Adding required steps (MFA, network segmentation, approval flows) transforms single-step attacks into multi-step ones.

## Quantitative Analysis

### DREAD Scoring (per leaf)

| Factor | 1 | 2 | 3 | 4 | 5 |
|--------|---|---|---|---|---|
| Damage | Minimal | Minor | Moderate | Major | Critical |
| Reproducibility | Difficult | Uncommon | Moderate | Easy | Always |
| Exploitability | Expert | Skilled | Moderate | Low skill | Trivial |
| Affected Users | Few | Some | Many | Most | All |
| Discoverability | Hidden | Obscure | Moderate | Obvious | Published |

### Cost-Benefit for Mitigations

For each path, compare:
- **Attack cost**: sum of attacker effort along path
- **Defense cost**: implementation cost of mitigation
- **Asset value**: what's protected

Prioritize mitigations where: defense cost << asset value AND attack cost is low.

## Template for New Attack Trees

```
System: [name]
Date: [date]
Author: [name]
Scope: [what's included/excluded]

Root Goal: [specific attacker objective]

Assumptions:
- [attacker type: external/insider/partner]
- [attacker capability: script kiddie/skilled/nation-state]
- [access starting point: internet/internal network/physical]

Tree:
[draw tree]

Analysis:
- Cheapest path: [path description]
- Most impactful path: [path description]
- Current weakest control: [what fails first]

Recommended Mitigations (priority ordered):
1. [mitigation] -- blocks path(s): [list]
2. [mitigation] -- blocks path(s): [list]
3. [mitigation] -- blocks path(s): [list]
```

## 2026 Context

- AI agents: attack trees must model tool-chain exploitation (agent calls tool with attacker-controlled input)
- Supply chain: include "compromise dependency" as a standard subtree
- Cloud multi-account: attack trees span accounts (pivot from dev to prod)
- Automated generation: tools like Threagile generate initial trees from architecture diagrams
- Living documents: attack trees updated automatically when architecture-as-code changes
- Purple team validation: red team tests cheapest paths, blue team validates detection on each node
