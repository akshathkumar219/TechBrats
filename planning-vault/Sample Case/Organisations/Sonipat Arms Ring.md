---
type: organisation
entity_id: 01JBQ7X8K2M4S3
name: Sonipat Arms Ring
kind: gang
detected_by: leiden_cpm
resolution: 0.7
members: 9
first_seen: 2025-11-03
last_seen: 2026-08-27
human_edited: false
---

# Sonipat Arms Ring

> [!info] This is a machine-detected community, not a registered organisation
> Detected by the Leiden algorithm with the Constant Potts Model at resolution 0.7. The name is a label generated from the members' shared thana and the FIR sections involved — it is not a name anyone uses for themselves.

## Members (9)

| Person | Degree | Betweenness | Role in structure |
| :--- | :--- | :--- | :--- |
| [[Rehan Khan]] | 19 | 0.071 | highest degree — the hub |
| [[Vikram Singh]] | 14 | 0.183 | **highest betweenness — the bridge** |
| [[Sandeep Malik]] | 11 | 0.019 | dense internal connections only |
| [[Jaspreet Dhillon]] | 8 | 0.004 | periphery |

*…5 further members.*

## Structural Notes

- Community grew 6 → 9 members after the 2026-08 ingest ^[delta:run 0007]
- [[Vikram Singh]] has high betweenness with mid-range degree. In a covert network that pattern marks a broker, not a participant ^[graph:metrics]
- One member links this community to the Panipat cluster. Removing that single edge disconnects the two entirely ^[graph:query articulation_points]

## Why Leiden and not Louvain

Louvain has a mathematically proven resolution limit — it cannot detect communities whose internal edges fall below √(2M), so it merges distinct cells into one synthetic mega-syndicate. Leiden with CPM guarantees every detected community is internally connected. On this case, Louvain returned 2 communities; Leiden returned 3, and the third matches the planted ground truth.
