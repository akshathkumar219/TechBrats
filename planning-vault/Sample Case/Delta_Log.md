# Delta Log

> Append-only. One section per ingest run. Written by Agent A4 from a diff computed in code.

---

## 2026-09-11 · Ingest Run 0007

**Sources:** `CDR_9876543210_Jan-Aug2026.csv`, `FIR_0311_2026_Kharkhoda.pdf`, `STMT_0311_accused.pdf`

### New Entities (3)
- [[Rehan Khan]] — named as accused in FIR 0311/2026 ^[FIR_0311_2026_Kharkhoda.pdf p:1 l:12]
- [[Sandeep Malik]] — named as accused in FIR 0311/2026 ^[FIR_0311_2026_Kharkhoda.pdf p:1 l:13]
- [[Tower HR-SNP-0147]] — first appearance in CDR ^[CDR_9876543210.csv row:8994]

### New Connections (7)
- [[Vikram Singh]] ↔ [[Rehan Khan]] — 31 calls, 12–19 Feb 2026 ^[CDR_9812345678.csv rows:4182-4213]
- [[Rehan Khan]] → [[Tower HR-SNP-0147]] — ping 21:14, 14 Feb ^[CDR_9876543210.csv row:9012]
- [[Vikram Singh]] ↔ [[Sandeep Malik]] — co-accused, FIR 0311/2026 ^[FIR_0311_2026_Kharkhoda.pdf p:1 l:11-13]
- *…4 further connections*

### Entities Merged (1)
- `01JBQ7X8K2M4Q1` merged into [[Vikram Singh]] — shared MSISDN 9812345678, identical father's name, same thana. Score 0.94, auto-merged ^[resolution:decision 4471]

### Structural Changes
- [[Sonipat Arms Ring]] grew 6 → 9 members (Leiden/CPM, resolution 0.7)
- [[Vikram Singh]] betweenness 0.11 → **0.183** — now the highest bridge in this network
- A new articulation point appeared: removing one edge now disconnects the Panipat cluster entirely

### Contradictions Detected (1)
- [[Rehan Khan]] stated he was in Panipat on 14 Feb ^[STMT_0311_accused.pdf p:2 l:19], but 9876543210 pinged [[Tower HR-SNP-0147]] (Kharkhoda, ~55 km away) at 21:14 the same evening ^[CDR_9876543210.csv row:9012]. Classified **HARD** — a 33-minute gap between the two tower pings makes both locations physically impossible.

### Suggested Next Actions
- Request tower dump for HR-SNP-0147, 20 Feb 2026 — [[Vikram Singh]]'s handset changed SIM the day after contact ceased
- Seek records for the period 20 Feb – 01 Mar 2026; the case file has a gap there for both principal handsets
- Verify the vehicle RC for HR26AB1234 against the RTO record — currently sourced from a single document

---
