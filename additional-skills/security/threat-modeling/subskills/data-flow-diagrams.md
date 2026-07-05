---
type: subskill
title: "Data Flow Diagrams"
---

# Data Flow Diagrams

## Core Concepts
- DFDs map how data moves between processes, data stores, external entities, and trust boundaries
- Levels: L0 (context diagram), L1 (major subsystems), L2 (detailed component interactions)
- Trust boundaries mark where data crosses privilege domains (network, process, auth context)
- Every data flow crossing a trust boundary is a potential attack surface
- DFDs are the foundation for systematic threat identification (STRIDE per element)

## Key Practices
- Start at L0 with the system as a single process, showing all external entities and their flows
- Label every flow with data type, protocol, and whether it's authenticated/encrypted
- Explicitly draw trust boundaries: internet/DMZ, DMZ/internal, service/database, user/admin
- Decompose L0 into L1 only for areas with significant complexity or high-value data
- Version DFDs alongside architecture docs; update when topology changes

## Common Mistakes
- Omitting internal service-to-service flows (assuming internal network is trusted)
- Drawing DFDs without trust boundaries, reducing them to architecture diagrams
- Creating overly detailed L2 diagrams before completing L0/L1 coverage

## When to Apply
- Starting threat modeling for a new system or feature
- Onboarding security reviewers who need to understand data movement
- Assessing impact of architecture changes on existing threat model
