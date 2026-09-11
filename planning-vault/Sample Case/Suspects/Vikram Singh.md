---
type: suspect
entity_id: 01JBQ7X8K2M4P9
canonical_name: Vikram Singh
aliases: [Vicky, विक्रम सिंह, विक्की, Vikram s/o Ramesh]
thana: Kharkhoda
status: active
risk_flags: [armed, repeat_offender]
communities: [Sonipat_Arms_Ring]
degree: 14
pagerank: 0.0412
betweenness: 0.183
first_seen: 2025-11-03
last_seen: 2026-08-27
generated_by: syndicatebrain/0.1.0
model: qwen3.5:9b-instruct-q4_K_M
generated_at: 2026-09-11T09:14:22+05:30
human_edited: false
---

# Vikram Singh

## Summary

Named as accused in 3 FIRs across Sonipat district between Nov 2025 and Aug 2026 ^[FIR_0142_2025_Sonipat.pdf p:1 l:8]. Holds the **highest betweenness centrality (0.183) in this network** despite only the 6th-highest degree — he connects clusters that have no other path between them ^[graph:metrics 2026-09-11]. Has used four distinct MSISDNs across two IMEIs since Feb 2026 ^[CDR_9812345678.csv rows:1-24891].

> [!note] Read this correctly
> Betweenness is a structural measurement, not an accusation. It says he is a bridge in this data. It does not say he is a leader.

## Identity & Aliases

| Form | Source |
| :--- | :--- |
| विक्रम सिंह | FIR 0142/2025, complainant statement ^[FIR_0142_2025_Sonipat.pdf p:2 l:4] |
| Vikram Singh s/o Ramesh | FIR 0311/2026 accused list ^[FIR_0311_2026_Kharkhoda.pdf p:1 l:11] |
| विक्की / Vicky | Witness statement, "विक्रम सिंह उर्फ विक्की" ^[STMT_0311_witness2.pdf p:1 l:6] |

**Resolution basis:** merged with record `01JBQ7X8K2M4Q1` on shared MSISDN 9812345678 and identical father's name within the same thana. Combined score 0.94, auto-merged, reversible ^[resolution:decision 4471].

## Verified Connections

- Called [[Rehan Khan]] 31 times between 12–19 Feb 2026, all between 23:00 and 04:00 ^[CDR_9812345678.csv rows:4182-4213]
- Co-accused with [[Rehan Khan]] and [[Sandeep Malik]] in FIR 0311/2026 ^[FIR_0311_2026_Kharkhoda.pdf p:1 l:11-13]
- Registered owner of vehicle HR26AB1234 ^[RC_HR26AB1234.pdf p:1 l:3]
- Phone [[9812345678]] pinged [[Tower HR-SNP-0147]] 14 times in the 6 hours before the [[2026-02-14 Kharkhoda Seizure]] ^[CDR_9812345678.csv rows:4190-4203]
- Never called [[Sandeep Malik]] or [[Jaspreet Dhillon]] directly — every path to them runs through [[Rehan Khan]] ^[graph:query shortest_path]

## Timeline

| Date | Event | Source |
| :--- | :--- | :--- |
| 2025-11-03 | First appearance — FIR 0142/2025 | ^[FIR_0142_2025_Sonipat.pdf p:1 l:8] |
| 2026-02-12 | Call burst with [[Rehan Khan]] begins | ^[CDR_9812345678.csv row:4182] |
| 2026-02-14 | [[2026-02-14 Kharkhoda Seizure]] | ^[FIR_0311_2026_Kharkhoda.pdf p:1] |
| 2026-02-19 | Call burst ends abruptly | ^[CDR_9812345678.csv row:4213] |
| 2026-02-20 | IMEI 359... switches to a new IMSI | ^[CDR_9812345678.csv row:4401] |
| 2026-08-27 | Last recorded activity | ^[CDR_9812345678.csv row:24891] |

## Contradictions

*None detected for this entity.*

## Open Questions

- The call burst stops within 24 hours of the seizure and the handset changes SIM the next day. Tower dump for HR-SNP-0147 on 20 Feb has not been requested.
- No verified link to [[Jaspreet Dhillon]] despite both appearing in the same Leiden community.

## Sources

1. `FIR_0142_2025_Sonipat.pdf` — SHA-256 `a3f2…9c1e`
2. `FIR_0311_2026_Kharkhoda.pdf` — SHA-256 `7b19…4dd0`
3. `CDR_9812345678_Jan-Aug2026.csv` — SHA-256 `c081…2f45`
4. `STMT_0311_witness2.pdf` — SHA-256 `e552…08a7`
