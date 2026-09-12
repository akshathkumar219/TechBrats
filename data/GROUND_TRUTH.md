# GROUND_TRUTH.md — Syndicate Investigation Ground Truth & Generation Contract

> **CONFIDENTIAL INVESTIGATIVE GROUND TRUTH**  
> This file defines the four planted evidentiary signals for the Haryana Police Syndicate Workbench prototype (`Case_01_Sonipat_Arms` and `Case_02_Rohtak_Hijack`).  
> **Mehul (`data/`)**: Generate all synthetic fixtures, 8 FIRs, 3 witness statements, ~25,000 CDR rows, and 2 tower dumps strictly against the specifications and invariants in this document. Do not deviate from entity identifiers, timestamps, or locators.

---

## 1. Summary of Planted Answers

| # | Evidentiary Signal | Key Entities / Identifiers | Primary Source File(s) | Locator(s) | Mechanism & Detection |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Proxy Kingpin** | **Vikram Singh** (`person_0031`)<br>MSISDN: `9812345678` | `00_Raw_Inputs/CDR/CDR_9812345678_Jan-Feb2026.csv`<br>`00_Raw_Inputs/FIR/FIR_0142_2026_Kharkhoda.pdf` | `row:48219`<br>`p:2 l:9` | High structural betweenness (#1) with modest call volume (~15th). Talks only to lieutenants. |
| **2** | **Alias Pair** | **Vikram Singh** ("Vicky") & **Gurpreet "Guri" Sandhu**<br>Shared IMEI: `869123456789012` | `00_Raw_Inputs/CDR/CDR_9812345678_Jan-Feb2026.csv` | `row:51204` | Two numbers never call each other; consecutive IMSI activation on one handset during 01/02–14/02/2026. |
| **3** | **Alibi Contradiction** | **Amit Malik** (`person_0039`)<br>MSISDN: `9812099881` | `00_Raw_Inputs/Statement/Statement_Amit_Malik.pdf`<br>`00_Raw_Inputs/TowerDump/TowerDump_HR-SNP-0147_2026-02-12.csv` | `p:1 l:14`<br>`row:1204` | Claims Panipat wedding presence on 12/02 21:00–23:00; tower dump registers active ping at Sonipat Toll Plaza at 21:18:30. |
| **4** | **Cross-Case Hit** | MSISDN: `9896011223` (Rehan Khan)<br>IMEI: `869123456789012` | `vaults/Case_01_Sonipat_Arms/02_Identifiers/`<br>`vaults/Case_02_Rohtak_Hijack/02_Identifiers/` | N/A (Vault Note Index) | Deterministic match across `02_Identifiers/` between Sonipat arms syndicate and Rohtak highway hijack case. |

---

## 2. Deep Dive: The Four Planted Answers

### 1. Proxy Kingpin — Vikram Singh (`person_0031`)

- **Entity Profile:**
  - **Canonical Name:** Vikram Singh
  - **Devanagari Surface:** विक्रम सिंह उर्फ विक्की (Vicky Kharkhoda)
  - **Role:** Accused (`role: accused` in note frontmatter)
  - **Gang:** Sonipat Arms & Extortion Syndicate
  - **Primary Identifier:** `9812345678` (Registered under forged ID at Kharkhoda)
  - **Subordinate Lieutenants:**
    - **Rehan Khan** (`person_0042`, Phone: `9896011223`) — Logistics, transport, safehouses.
    - **Balwinder Singh** (`person_0035`, Phone: `9812155443`) — Arms procurement, supplier liaison.
  - **Field Operatives / Hitmen:** Amit Malik, Suresh Shooter, Rohit Pehalwan.

- **Why Structurally Central:**
  - In the syndicate graph, Vikram Singh sits directly at the bottleneck between logistics (`Rehan Khan`) and weapons procurement (`Balwinder Singh`).
  - Removing Vikram Singh partitions the network graph into disconnected subgraphs. He possesses the **#1 Betweenness Centrality** score in network analysis.

- **Why Unremarkable on Call Volume:**
  - **Strict operational security (OPSEC):** Vikram Singh **never** communicates directly with field shooters, couriers, or local extortion collectors.
  - Out of ~25,000 total CDR rows in the case dataset, Vikram Singh\'s number `9812345678` appears in fewer than **85 calls** (~15th rank by raw degree).
  - Preceding the Kharkhoda arms seizure on 14/02/2026, he exchanges exactly **14 brief phone calls** across 72 hours (Feb 10–12, 2026) exclusively with Rehan Khan (`9896011223`), e.g., row `48219`:
    `9812345678 -> 9896011223 | 12/02/2026 21:14:02 | dur: 184s | cell: HR-SNP-0147`.
  - **Generation Rule for Mehul:** If a naive query sorts by `COUNT(*)`, Vikram Singh must be buried in the second page of results. If an analyst runs PageRank or Betweenness Centrality, he emerges as the kingpin.

---

### 2. Alias Pair — Vikram Singh & Gurpreet "Guri" Sandhu via Shared Handset IMEI

- **Entities Involved:**
  - **Identity 1:** Vikram Singh (alias "Vicky Kharkhoda", MSISDN `9812345678`, IMSI `404450112233441`).
  - **Identity 2:** Gurpreet "Guri" Sandhu (MSISDN `9812987654`, IMSI `404450998877662`).
- **Shared Identifier:**
  - **Handset IMEI:** `869123456789012` (Black OnePlus Nord CE used as a rotating burner).
- **Two-Week Window:**
  - Target Window: **01/02/2026 to 14/02/2026** (two weeks leading up to the recovery).
  - **Phase 1 (Vikram Singh):** IMSI `404450112233441` active in handset `869123456789012` from 01/02/2026 08:00:00 until 07/02/2026 19:45:00.
  - **Handset Handoff:** Handset transferred during meeting at Murthal dhaba on evening of 07/02/2026.
  - **Phase 2 (Gurpreet Sandhu):** IMSI `404450998877662` active in same handset `869123456789012` from 08/02/2026 10:15:00 through 14/02/2026 22:30:00.
- **The Invariant (Law 6 — Conservative Resolution):**
  - **Zero Direct Calls:** Phone `9812345678` and phone `9812987654` **must NEVER call or SMS each other**.
  - No shared surname or obvious phonetic similarity.
  - The IMEI swap chain (`869123456789012`) is the **sole deterministic bridge** linking Gurpreet Sandhu\'s Punjab arms pipeline to Vikram Singh\'s Sonipat gang.

---

### 3. Alibi Contradiction — Amit Malik Statement vs. Tower Dump

- **Suspect Profile:**
  - **Name:** Amit Malik (`person_0039`)
  - **Role:** Accused / Enforcer
  - **Mobile:** `9812099881` (IMSI `404450334455667`)
- **Document 1: The Alibi Statement (`DOC_STMT_002`)**
  - **File:** `00_Raw_Inputs/Statement/Statement_Amit_Malik.pdf`
  - **Record Details:** Statement under Section 180 BNSS recorded by Inspector Ramphal on 17/02/2026 at PS Sonipat Sadar.
  - **Content (at `p:1 l:14-19`):** Amit Malik claims under oath:
    > *"दिनांक 12/02/2026 को रात 8:00 बजे से 11:30 बजे तक मैं अपने चचेरे भाई की शादी में होटल ग्रैंड प्लाजा, GT Road, Panipat में उपस्थित था। मैं पूरे समय परिवार के साथ था और मैंने उस रात Sonipat या NH-44 की तरफ कोई यात्रा नहीं की।"*  
    > (Claims presence at Panipat wedding from 20:00 to 23:30 on 12/02/2026, >45 km away from Sonipat).
- **Document 2: The Physical Evidence (`DOC_TD_HR_SNP_0147`)**
  - **File:** `00_Raw_Inputs/TowerDump/TowerDump_HR-SNP-0147_2026-02-12.csv`
  - **Tower / Cell:** `HR-SNP-0147` (Sector 14 / Sonipat Toll Plaza on NH-44).
  - **Ping Row `1204`:**
    - `MSISDN: 9812099881`
    - `Call Date Time: 12/02/2026 21:18:30`
    - `Duration: 74s`
    - `Call Type: MOC`
    - `Cell ID: HR-SNP-0147`
  - **Co-location:** Rehan Khan\'s phone (`9896011223`) latches onto the identical cell `HR-SNP-0147` at `21:14:02` (row 1198), proving co-location of Malik and Khan at Sonipat Toll Plaza during the arms transit window.
- **The Contradiction:**
  - Physical impossibility between stated Panipat presence and verified cell latch at Sonipat Toll Plaza at `21:18:30` on 12/02/2026. Surfaced by the Contradiction Detector agent.

---

### 4. Cross-Case Identifier Hit — Sonipat Syndicate & Rohtak Hijack

- **The Bridging Identifiers:**
  1. **Primary Identifier:** Mobile MSISDN `9896011223` (Rehan Khan, Logistics Coordinator).
  2. **Secondary Identifier:** Handset IMEI `869123456789012` (Burner handset).
- **Case 1: Main Case (`Case_01_Sonipat_Arms`)**
  - Folder: `vaults/Case_01_Sonipat_Arms/`
  - Note: `01_People/Rehan Khan.md` and `02_Identifiers/9896011223.md`
  - Context: Rehan Khan operates as Vikram Singh\'s trusted transporter moving country-made .32 pistols into Sonipat.
- **Case 2: Secondary Case (`Case_02_Rohtak_Hijack`)**
  - Folder: `vaults/Case_02_Rohtak_Hijack/`
  - Note: `01_People/Suresh Goel.md` and `02_Identifiers/9896011223.md`
  - Context: FIR 0089/2026 PS Rohtak Urban involves the armed hijack of a cash/consignment vehicle. Phone `9896011223` appears in CDR records as receiving 3 incoming calls from accused Suresh Goel immediately prior to the hijack.
- **The Invariant & Detection:**
  - **Deterministic zero-LLM hit:** Detected simply by matching filename/frontmatter values inside `02_Identifiers/` across case roots.
  - Endpoint: `GET /api/crosscase/hits` returns the match instantly.

---

## 3. Dataset Generation Targets for Mehul (`MEH-T01`–`MEH-T03`)

1. **Volume Specifications:**
   - **Gangs:** 3 distinct gangs (Sonipat Arms Ring, Rohtak Highway Gang, Panipat Logistics Cell) + 1 cross-gang bridge node.
   - **People:** ~40 entity notes in `01_People/`.
   - **Identifiers:** ~60 notes in `02_Identifiers/` (MSISDNs, IMEIs, vehicles).
   - **FIRs:** 8 notes modeled on `data/TEMPLATE_FIR.md`.
   - **Witness Statements:** 3 notes (one containing the Amit Malik alibi).
   - **Tower Dumps:** 2 CSV files (`HR-SNP-0147` at Sonipat Toll Plaza, `HR-SNP-0089` at Kharkhoda).
   - **CDR Rows:** ~25,000 rows generated via `data/generate_cdr.py`.
2. **Noise Rules:**
   - Include civilian numbers, local business calls, food deliveries, and routine family calls.
   - High volume must belong to noisy peripheral callers (e.g. extortion callers making 200+ calls), ensuring Vikram Singh remains ranked ~15th by volume.
3. **Format Contract:**
   - Note Frontmatter: Strict adherence to `CASE_MODEL.md §4`.
   - Citations: Strict `^[source_doc locator]` format (e.g. `^[DOC_FIR_0142 p:2 l:9]`, `^[DOC_CDR_9812345678 row:48219]`).
