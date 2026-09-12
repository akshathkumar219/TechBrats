import sys
import shutil
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.oxml import parse_xml

# Always start from fresh backup
shutil.copyfile('SIH2026-IDEA-Presentation-Backup.pptx', 'SIH2026-IDEA-Presentation-Format.pptx')
prs = Presentation('SIH2026-IDEA-Presentation-Format.pptx')

# Professional Palette matching SIH Branding
NAVY = RGBColor(31, 73, 125)     # Deep Navy #1F497D
BLACK = RGBColor(10, 10, 10)     # Off-Black #0A0A0A
SIH_BLUE = RGBColor(0, 112, 192) # SIH Accent Blue #0070C0
DARK_TEAL = RGBColor(15, 95, 130)

def set_no_bullet(p):
    pPr = p._p.get_or_add_pPr()
    # Remove existing bullet definitions if any
    for child in list(pPr):
        if child.tag.endswith(('buChar', 'buAutoNum', 'buBlip', 'buClr', 'buSzPct', 'buSzPts', 'buFont')):
            pPr.remove(child)
    buNone = parse_xml('<a:buNone xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>')
    pPr.append(buNone)

# -------------------------------------------------------------
# SLIDE 1: Title Page
# -------------------------------------------------------------
slide1 = prs.slides[0]
for shp in slide1.shapes:
    if shp.name == "TextBox 9":
        tf = shp.text_frame
        tf.clear()
        tf.margin_left = Inches(0.1)
        tf.margin_right = Inches(0.1)
        tf.margin_top = Inches(0.05)
        tf.margin_bottom = Inches(0.05)
        
        items = [
            ("Problem Statement ID –", "SIH26189"),
            ("Problem Statement Title –", "AI-Powered Criminal Network Analysis System"),
            ("Theme –", "Security & Law Enforcement / Smart Automation"),
            ("PS Category –", "Software"),
            ("Team ID –", "[Insert Registered Team ID]"),
            ("Team Name –", "[Insert Registered Team Name]")
        ]
        
        for idx, (label, val) in enumerate(items):
            p = tf.add_paragraph() if idx > 0 else tf.paragraphs[0]
            set_no_bullet(p)
            p.space_after = Pt(12)
            p.line_spacing = 1.15
            
            r1 = p.add_run()
            r1.text = label + " "
            r1.font.name = "Arial"
            r1.font.size = Pt(20)
            r1.font.bold = True
            r1.font.color.rgb = BLACK
            
            r2 = p.add_run()
            r2.text = val
            r2.font.name = "Arial"
            r2.font.size = Pt(19)
            r2.font.bold = False
            r2.font.color.rgb = NAVY

# -------------------------------------------------------------
# Helper for Content Slides (Slides 2 to 6)
# -------------------------------------------------------------
def setup_content_box(shp, top_in=1.50, left_in=0.67, width_in=12.0, height_in=5.2):
    shp.top = Inches(top_in)
    shp.left = Inches(left_in)
    shp.width = Inches(width_in)
    shp.height = Inches(height_in)
    tf = shp.text_frame
    tf.word_wrap = True
    tf.clear()
    tf.margin_left = Inches(0.1)
    tf.margin_right = Inches(0.1)
    tf.margin_top = Inches(0.05)
    tf.margin_bottom = Inches(0.05)
    return tf

def add_section(tf, header_text, bullets, is_first=False):
    # Section Header (No bullet, clean bold title)
    p_head = tf.add_paragraph() if not is_first else tf.paragraphs[0]
    set_no_bullet(p_head)
    p_head.space_after = Pt(3)
    p_head.space_before = Pt(8) if not is_first else Pt(0)
    p_head.line_spacing = 1.1
    
    r_h = p_head.add_run()
    r_h.text = header_text
    r_h.font.name = "Arial"
    r_h.font.size = Pt(18)
    r_h.font.bold = True
    r_h.font.color.rgb = SIH_BLUE
    
    # Bullet Items
    for b_title, b_desc in bullets:
        p_b = tf.add_paragraph()
        set_no_bullet(p_b)
        p_b.space_after = Pt(3)
        p_b.line_spacing = 1.12
        
        r_bullet = p_b.add_run()
        r_bullet.text = "• "
        r_bullet.font.name = "Arial"
        r_bullet.font.size = Pt(15)
        r_bullet.font.bold = True
        r_bullet.font.color.rgb = NAVY
        
        if b_title:
            r_t = p_b.add_run()
            r_t.text = b_title + ": "
            r_t.font.name = "Arial"
            r_t.font.size = Pt(15)
            r_t.font.bold = True
            r_t.font.color.rgb = NAVY
            
        r_d = p_b.add_run()
        r_d.text = b_desc
        r_d.font.name = "Arial"
        r_d.font.size = Pt(14)
        r_d.font.bold = False
        r_d.font.color.rgb = BLACK

# -------------------------------------------------------------
# SLIDE 2: Idea Title & Proposed Solution
# -------------------------------------------------------------
slide2 = prs.slides[1]
for shp in slide2.shapes:
    if shp.name == "Title 1":
        shp.left = Inches(1.85)
        shp.top = Inches(0.20)
        shp.width = Inches(8.8)
        shp.height = Inches(0.95)
        tf = shp.text_frame
        tf.clear()
        p = tf.paragraphs[0]
        set_no_bullet(p)
        p.alignment = PP_ALIGN.CENTER
        r = p.add_run()
        r.text = "IDEA: SyndicateBrain"
        r.font.name = "Times New Roman"
        r.font.size = Pt(34)
        r.font.bold = True
        r.font.color.rgb = BLACK
        
    elif shp.name == "TextBox 8":
        tf = setup_content_box(shp, top_in=1.45, left_in=0.67, width_in=12.0, height_in=5.2)
        add_section(tf, "Proposed Solution (Air-Gapped Investigation Workbench)", [
            ("Dual-Vault Architecture", "Strictly isolates raw immutable evidence (01_Evidence_Inbox) from auto-curated AI dossiers (02_AI_Brain), preserving chain of custody."),
            ("Dynamic Delta Changelog", "As new daily logs or CDRs are added, autonomous AI documents newly forged links, alibi conflicts, and leads in Delta_Log.md.")
        ], is_first=True)
        add_section(tf, "How It Addresses the Problem", [
            ("Unified Criminal Graph", "Integrates unstructured multilingual FIRs, massive CDR dumps, and tower records into an interactive knowledge graph with [[wiki-links]]."),
            ("Uncovering Hidden Kingpins", "Graph centrality algorithms expose covert organizers, middlemen, and couriers who never communicate directly with foot soldiers.")
        ])
        add_section(tf, "Innovation and Uniqueness", [
            ("100% Air-Gapped & Offline", "Zero cloud dependency; runs securely on local police laptops with zero data leakage."),
            ("Source-Grounded Zero-Hallucination", "Every link and narrative cites the exact FIR page, CDR timestamp, or detective log.")
        ])

# -------------------------------------------------------------
# SLIDE 3: Technical Approach
# -------------------------------------------------------------
slide3 = prs.slides[2]
for shp in slide3.shapes:
    if shp.name == "Title 1":
        shp.left = Inches(1.85)
        shp.top = Inches(0.20)
        shp.width = Inches(8.8)
        shp.height = Inches(0.95)
        tf = shp.text_frame
        p = tf.paragraphs[0]
        set_no_bullet(p)
        p.alignment = PP_ALIGN.CENTER
    elif shp.name == "TextBox 8":
        tf = setup_content_box(shp, top_in=1.45, left_in=0.67, width_in=12.0, height_in=5.2)
        add_section(tf, "Technologies to be Used (100% Offline Desktop Stack)", [
            ("Desktop Shell & UI", "Tauri (Rust + React/TypeScript) + Tailwind CSS (Lightweight 15MB app, 10x faster than web servers)."),
            ("Graph Visualization", "Cytoscape.js & React-Force-Graph-2D (Interactive Obsidian-style physics graph with gang community clustering)."),
            ("Embedded Data Engine", "SQLite + KùzuDB / NetworkX (Zero-server, embedded graph and relational database inside the case vault)."),
            ("Graph ML & Link Prediction", "PyTorch Geometric (PyG) for Graph Autoencoders (predicting covert links) & Louvain community detection."),
            ("Local AI & NLP Runtime", "Local Ollama / Llama.cpp (Qwen 2.5 7B / 3B Q4) + RapidFuzz (C++ Levenshtein) + Double Metaphone.")
        ], is_first=True)
        add_section(tf, "Methodology & Implementation Process", [
            ("1. Ingestion & Pre-Filter", "Fast deterministic DuckDB pre-processor filters 50,000+ raw CDR rows into high-risk anomalies before AI ingestion."),
            ("2. Entity Disambiguation", "Phonetic + vector embeddings resolve colloquial Indian aliases ('Vicky' vs 'Vikram Singh') into unified Master UIDs."),
            ("3. Multi-Agent Orchestration", "Extractor, Link Analyst, and Synthesis agents update suspect cards and generate the morning Delta Briefing.")
        ])

# -------------------------------------------------------------
# SLIDE 4: Feasibility and Viability
# -------------------------------------------------------------
slide4 = prs.slides[3]
for shp in slide4.shapes:
    if shp.name == "Title 1":
        shp.left = Inches(1.85)
        shp.top = Inches(0.20)
        shp.width = Inches(8.8)
        shp.height = Inches(0.95)
        tf = shp.text_frame
        p = tf.paragraphs[0]
        set_no_bullet(p)
        p.alignment = PP_ALIGN.CENTER
    elif shp.name == "TextBox 8":
        tf = setup_content_box(shp, top_in=1.45, left_in=0.67, width_in=12.0, height_in=5.2)
        add_section(tf, "Analysis of Feasibility", [
            ("Zero Cloud Cost & Infrastructure", "Runs locally on standard police laptops (8GB–16GB RAM); zero recurring cloud fees, API costs, or server daemons."),
            ("Single Executable Deployment", "Packaged as a standalone offline installer (.dmg / .exe) ready for field interrogation rooms.")
        ], is_first=True)
        add_section(tf, "Potential Challenges and Risks", [
            ("Data Noise & Scale", "Massive CDR logs with millions of routine calls create visual clutter and processing bottlenecks."),
            ("Regional Phonetic Variations", "Indian suspect names have inconsistent spellings across regional language FIRs."),
            ("Legal Scrutiny & Hallucination", "Courts reject AI conjecture; evidence must maintain 100% verified provenance.")
        ])
        add_section(tf, "Strategies for Overcoming Challenges", [
            ("Deterministic Noise Reduction", "DuckDB filters background calls, feeding only high-risk anomalies and tower rendezvous to the graph."),
            ("Hybrid Record Linkage", "Double Metaphone phonetic matching combined with contextual text embeddings resolves regional alias variations."),
            ("Strict Provenance Sandbox", "Read-only OS filesystem permissions lock raw evidence; Graph-RAG enforces line-level citations.")
        ])

# -------------------------------------------------------------
# SLIDE 5: Impact and Benefits
# -------------------------------------------------------------
slide5 = prs.slides[4]
for shp in slide5.shapes:
    if shp.name == "Title 1":
        shp.left = Inches(1.85)
        shp.top = Inches(0.20)
        shp.width = Inches(8.8)
        shp.height = Inches(0.95)
        tf = shp.text_frame
        p = tf.paragraphs[0]
        set_no_bullet(p)
        p.alignment = PP_ALIGN.CENTER
    elif shp.name == "TextBox 8":
        tf = setup_content_box(shp, top_in=1.45, left_in=0.67, width_in=12.0, height_in=5.2)
        add_section(tf, "Potential Impact on Target Audience", [
            ("Target Stakeholders", "State Police Departments, CID, Crime Branch, Anti-Terror Squads (ATS), NIA, and Cybercrime Units."),
            ("Investigation Velocity", "Reduces complex syndicate mapping from 3–4 weeks of manual Excel cross-checking to under 5 minutes."),
            ("Preventing Intelligence Loss", "Preserves persistent institutional case memory across frequent officer transfers.")
        ], is_first=True)
        add_section(tf, "Social, Economic & National Security Benefits", [
            ("Operational Breakthrough", "Autonomous 'Daily Delta Briefings' keep Senior Officers informed of newly uncovered suspect links every morning."),
            ("Court-Admissible Dossiers", "One-click export of structured prosecution dossiers with complete timestamped evidence trails."),
            ("100% Data Sovereignty", "Classified police intelligence never leaves the police intranet or air-gapped forensic hardware."),
            ("Substantial Cost Savings", "Eliminates commercial intelligence software license costs, saving police departments lakhs annually.")
        ])

# -------------------------------------------------------------
# SLIDE 6: Research and References
# -------------------------------------------------------------
slide6 = prs.slides[5]
for shp in slide6.shapes:
    if shp.name == "Title 1":
        shp.left = Inches(1.85)
        shp.top = Inches(0.20)
        shp.width = Inches(8.8)
        shp.height = Inches(0.95)
        tf = shp.text_frame
        p = tf.paragraphs[0]
        set_no_bullet(p)
        p.alignment = PP_ALIGN.CENTER
    elif shp.name == "TextBox 8":
        tf = setup_content_box(shp, top_in=1.45, left_in=0.67, width_in=12.0, height_in=5.2)
        add_section(tf, "Algorithmic & Academic Research Foundations", [
            ("Community Detection", "Blondel, V. D., et al. (2008). 'Fast unfolding of communities in large networks (Louvain Method)' - J. Stat. Mech."),
            ("Graph Neural Networks", "Kipf, T. N., & Welling, M. (2016). 'Variational Graph Auto-Encoders (GAE)' - NIPS Workshop on Graph ML."),
            ("Entity Disambiguation", "Christen, P. (2012). 'Data Matching: Concepts and Techniques for Record Linkage & Duplicate Detection' - Springer."),
            ("Graph-RAG Architecture", "Edge, D., et al. (2024). 'From Local to Global: A Graph RAG Approach to Query-Focused Summarization' - Microsoft Research.")
        ], is_first=True)
        add_section(tf, "Government Standards & Framework References", [
            ("Police Record Guidelines", "Crime and Criminal Tracking Network & Systems (CCTNS) Data Standards, Ministry of Home Affairs (MHA)."),
            ("Telecommunications Standards", "Department of Telecommunications (DoT) CDR & Cell Tower Dump Data Specifications."),
            ("Open Source Technologies", "PyTorch Geometric (PyG), RapidFuzz C++ Library, Tauri Desktop Shell, Ollama Local Model Runtime.")
        ])

# Save populated presentation
prs.save('SIH2026-IDEA-Presentation-Format.pptx')
print("Successfully re-populated SIH2026-IDEA-Presentation-Format.pptx with polished layout")
