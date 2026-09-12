import type { AnalysisResult } from './types'

export const DEFAULT_MOCK_ANALYSIS_RESULT: AnalysisResult = {
  case_id: 'Case_01_Sonipat_Arms',
  summary:
    'Analysis of 8 FIRs and CDR records identifies Vikram Singh as the proxy kingpin of the Sonipat arms syndicate, operating through lieutenants Rehan Khan and Balwinder Singh. ^[DOC_CDR_9812345678 row:48219] Cross-referencing tower pings refutes Amit Malik\'s stated wedding alibi and establishes co-location with Rehan Khan at Sonipat Toll Plaza. ^[DOC_TD_HR_SNP_0147 row:1204] An IMEI swap chain links Punjab procurement (Gurpreet Sandhu) directly to the Kharkhoda cell. ^[DOC_CDR_9812345678 row:51204]',
  new_connections: [
    {
      id: 'prop_0001',
      claim: 'Vikram Singh coordinated arms consignment with Rehan Khan',
      reason:
        '14 calls logged across 72 hours preceding Kharkhoda arms seizure between suspect phone and logistics coordinator',
      source_entity: 'Vikram Singh',
      target_entity: 'Rehan Khan',
      citation: {
        source_doc_id: 'DOC_CDR_9812345678',
        locator: 'row:48219',
        snippet:
          '9812345678 -> 9896011223 | 2026-02-12 21:14:02 | dur: 184s | cell: HR-SNP-0147',
      },
      confidence: 0.94,
      status: 'proposed',
      created_at: '2026-02-19T14:30:00+05:30',
    },
    {
      id: 'prop_0002',
      claim: 'Rehan Khan co-located with Amit Malik at Sonipat Toll Plaza',
      reason:
        'Simultaneous cell tower registration on Sector 14 cell HR-SNP-0147 within 4-minute window during transit',
      source_entity: 'Rehan Khan',
      target_entity: 'Amit Malik',
      citation: {
        source_doc_id: 'DOC_TD_HR_SNP_0147',
        locator: 'row:1204',
        snippet:
          'HR-SNP-0147 | 2026-02-12 21:18:30 | 9896011223 & 9812099881 concurrent',
      },
      confidence: 0.91,
      status: 'proposed',
      created_at: '2026-02-19T14:30:00+05:30',
    },
    {
      id: 'prop_0003',
      claim: 'Amit Malik linked to Balwinder Singh via vehicle HR-26-AB-1234',
      reason:
        'White Mahindra Scorpio registered to Balwinder sighted at Amit Malik hideout during surveillance',
      source_entity: 'Amit Malik',
      target_entity: 'Balwinder Singh',
      citation: {
        source_doc_id: 'DOC_FL_004',
        locator: 'p:1 l:18',
        snippet:
          'White Mahindra Scorpio HR-26-AB-1234 parked outside warehouse, Malik present',
      },
      confidence: 0.86,
      status: 'proposed',
      created_at: '2026-02-19T14:30:00+05:30',
    },
    {
      id: 'prop_0004',
      claim:
        'Gurpreet \'Guri\' Sandhu shared handset IMEI 869123456789012 with Vikram Singh',
      reason:
        'Consecutive IMSI activation on handset IMEI 869123456789012 within 14-day window',
      source_entity: 'Gurpreet Sandhu',
      target_entity: 'Vikram Singh',
      citation: {
        source_doc_id: 'DOC_CDR_9812345678',
        locator: 'row:51204',
        snippet:
          'IMEI 869123456789012 swap from IMSI 4044501... to 4044509... active Feb 1-14',
      },
      confidence: 0.89,
      status: 'proposed',
      created_at: '2026-02-19T14:30:00+05:30',
    },
    {
      id: 'prop_0005',
      claim:
        'Balwinder Singh procured munitions documented in Kharkhoda seizure FIR 0142/2026',
      reason:
        'Serial numbers and armorer markings match country-made .32 pistols seized at Kharkhoda checkpost',
      source_entity: 'Balwinder Singh',
      target_entity: 'FIR 0142/2026',
      citation: {
        source_doc_id: 'DOC_FIR_0142',
        locator: 'p:3 l:14',
        snippet:
          'Recovered 4 country-made .32 pistols marked \'BS-KHL\' from glovebox during naka inspection',
      },
      confidence: 0.92,
      status: 'proposed',
      created_at: '2026-02-19T14:30:00+05:30',
    },
  ],
  files_to_update: [
    {
      file_path: '01_People/Vikram Singh.md',
      note_id: 'person_0031',
      reason:
        'New burner handset IMEI linkage identified connecting to Gurpreet Sandhu',
      suggested_additions: [
        "Add alias 'Vicky Kharkhoda'",
        'Document shared handset IMEI 869123456789012 active Feb 1-14 2026',
        'Note coordination role with Balwinder Singh supply chain',
      ],
      citation: {
        source_doc_id: 'DOC_FIR_0142',
        locator: 'p:2 l:11',
      },
    },
    {
      file_path: '01_People/Rehan Khan.md',
      note_id: 'person_0042',
      reason:
        'Tower dump places Rehan Khan at Sonipat toll plaza during arms drop',
      suggested_additions: [
        'Update status to co-accused in arms transit',
        'Add location tag: Sonipat Toll Plaza (cell HR-SNP-0147)',
        'Log 14 calls with Vikram Singh',
      ],
      citation: {
        source_doc_id: 'DOC_TD_HR_SNP_0147',
        locator: 'row:1204',
      },
    },
  ],
  dropped_proposals_count: 1,
  analyzed_at: '2026-02-19T14:30:00+05:30',
}
