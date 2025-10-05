// Neo4j Schema Definition for Space Biology Knowledge Graph
// This file defines constraints, indexes, and the data model for the KG

// =============================================================================
// CONSTRAINTS - Ensure uniqueness and data integrity
// =============================================================================

// Research Core Nodes
CREATE CONSTRAINT paper_pmcid IF NOT EXISTS
FOR (p:Paper) REQUIRE p.pmcid IS UNIQUE;

CREATE CONSTRAINT experiment_id IF NOT EXISTS
FOR (e:Experiment) REQUIRE e.experiment_id IS UNIQUE;

CREATE CONSTRAINT finding_uuid IF NOT EXISTS
FOR (f:Finding) REQUIRE f.uuid IS UNIQUE;

CREATE CONSTRAINT assay_id IF NOT EXISTS
FOR (a:Assay) REQUIRE a.id IS UNIQUE;

CREATE CONSTRAINT duration_id IF NOT EXISTS
FOR (d:Duration) REQUIRE d.id IS UNIQUE;

// Biological Context Nodes
CREATE CONSTRAINT organism_obo_id IF NOT EXISTS
FOR (o:Organism) REQUIRE o.obo_id IS UNIQUE;

CREATE CONSTRAINT tissue_obo_id IF NOT EXISTS
FOR (t:Tissue) REQUIRE t.obo_id IS UNIQUE;

CREATE CONSTRAINT cell_type_obo_id IF NOT EXISTS
FOR (ct:CellType) REQUIRE ct.obo_id IS UNIQUE;

CREATE CONSTRAINT phenotype_obo_id IF NOT EXISTS
FOR (ph:Phenotype) REQUIRE ph.obo_id IS UNIQUE;

// Exposure & Platform Nodes
CREATE CONSTRAINT exposure_id IF NOT EXISTS
FOR (ex:Exposure) REQUIRE ex.id IS UNIQUE;

CREATE CONSTRAINT microgravity_model_id IF NOT EXISTS
FOR (mm:MicrogravityModel) REQUIRE mm.id IS UNIQUE;

CREATE CONSTRAINT radiation_type_id IF NOT EXISTS
FOR (rt:RadiationType) REQUIRE rt.id IS UNIQUE;

CREATE CONSTRAINT platform_id IF NOT EXISTS
FOR (pl:Platform) REQUIRE pl.id IS UNIQUE;

CREATE CONSTRAINT mission_id IF NOT EXISTS
FOR (m:Mission) REQUIRE m.id IS UNIQUE;

// External Context Nodes
CREATE CONSTRAINT news_item_url IF NOT EXISTS
FOR (n:NewsItem) REQUIRE n.source_url IS UNIQUE;

CREATE CONSTRAINT explainer_url IF NOT EXISTS
FOR (e:Explainer) REQUIRE e.source_url IS UNIQUE;

CREATE CONSTRAINT newsletter_url IF NOT EXISTS
FOR (nl:NewsletterIssue) REQUIRE nl.source_url IS UNIQUE;

CREATE CONSTRAINT library_record_url IF NOT EXISTS
FOR (lr:LibraryRecord) REQUIRE lr.source_url IS UNIQUE;

// Stretch: Additional Nodes
CREATE CONSTRAINT gene_id IF NOT EXISTS
FOR (g:Gene) REQUIRE g.id IS UNIQUE;

CREATE CONSTRAINT pathway_id IF NOT EXISTS
FOR (pw:Pathway) REQUIRE pw.id IS UNIQUE;

CREATE CONSTRAINT countermeasure_id IF NOT EXISTS
FOR (cm:Countermeasure) REQUIRE cm.id IS UNIQUE;

CREATE CONSTRAINT osdr_dataset_id IF NOT EXISTS
FOR (od:OSDR_Dataset) REQUIRE od.dataset_id IS UNIQUE;

CREATE CONSTRAINT taskbook_grant_id IF NOT EXISTS
FOR (tb:TaskBook_Grant) REQUIRE tb.grant_id IS UNIQUE;

// =============================================================================
// INDEXES - Improve query performance
// =============================================================================

// Research Core Indexes
CREATE INDEX paper_doi IF NOT EXISTS FOR (p:Paper) ON (p.doi);
CREATE INDEX paper_title IF NOT EXISTS FOR (p:Paper) ON (p.title);
CREATE INDEX paper_year IF NOT EXISTS FOR (p:Paper) ON (p.year);
CREATE INDEX finding_direction IF NOT EXISTS FOR (f:Finding) ON (f.direction);
CREATE INDEX finding_evidence_strength IF NOT EXISTS FOR (f:Finding) ON (f.evidence_strength);

// Biological Context Indexes
CREATE INDEX organism_label IF NOT EXISTS FOR (o:Organism) ON (o.label);
CREATE INDEX tissue_label IF NOT EXISTS FOR (t:Tissue) ON (t.label);
CREATE INDEX cell_type_label IF NOT EXISTS FOR (ct:CellType) ON (ct.label);
CREATE INDEX phenotype_label IF NOT EXISTS FOR (ph:Phenotype) ON (ph.label);

// Exposure & Platform Indexes
CREATE INDEX exposure_type IF NOT EXISTS FOR (ex:Exposure) ON (ex.type);
CREATE INDEX platform_name IF NOT EXISTS FOR (pl:Platform) ON (pl.name);
CREATE INDEX mission_name IF NOT EXISTS FOR (m:Mission) ON (m.name);

// External Context Indexes
CREATE INDEX news_published_at IF NOT EXISTS FOR (n:NewsItem) ON (n.published_at);
CREATE INDEX explainer_published_at IF NOT EXISTS FOR (e:Explainer) ON (e.published_at);
CREATE INDEX newsletter_published_at IF NOT EXISTS FOR (nl:NewsletterIssue) ON (nl.published_at);
CREATE INDEX library_record_published_at IF NOT EXISTS FOR (lr:LibraryRecord) ON (lr.published_at);

// Temporal Indexes
CREATE INDEX paper_first_seen IF NOT EXISTS FOR (p:Paper) ON (p.first_seen);
CREATE INDEX paper_last_seen IF NOT EXISTS FOR (p:Paper) ON (p.last_seen);

// Full-text search indexes (for advanced queries)
CREATE FULLTEXT INDEX paper_fulltext IF NOT EXISTS
FOR (p:Paper) ON EACH [p.title, p.abstract];

CREATE FULLTEXT INDEX finding_fulltext IF NOT EXISTS
FOR (f:Finding) ON EACH [f.phenotype_text, f.qualifiers];

CREATE FULLTEXT INDEX external_fulltext IF NOT EXISTS
FOR (n:NewsItem|e:Explainer|nl:NewsletterIssue|lr:LibraryRecord)
ON EACH [n.title, n.summary, e.title, e.summary, nl.title, nl.summary, lr.title, lr.summary];

// =============================================================================
// METADATA & GOVERNANCE
// =============================================================================

// All nodes should have these common properties:
// - source_type: Type of source (paper, external, etc.)
// - label: Human-readable label
// - first_seen: ISO timestamp when first added
// - last_seen: ISO timestamp when last seen/updated
// - synonyms: Array of alternative labels/names

// For ontology-based nodes (Organism, Tissue, CellType, Phenotype):
// - obo_id: Canonical ontology identifier (e.g., NCBITaxon:10090, Uberon:0002371)
// - source_obo: Ontology source (NCBITaxon, Uberon, PATO, HPO, GO, CHEBI)

// All relationships should have:
// - provenance: Source section/URL where extracted
// - extraction_confidence: Confidence score (0-1)
// - text_span_start: Character offset start (if available)
// - text_span_end: Character offset end (if available)
// - created_at: ISO timestamp when relationship created

// =============================================================================
// NOTES
// =============================================================================

// Deduplication strategy:
// - Nodes are deduplicated by their unique constraint field (pmcid, obo_id, URL, etc.)
// - Use MERGE instead of CREATE to ensure idempotency
// - Update last_seen timestamp on each load
// - Maintain source_count to track how many sources reference this node

// Metrics to track after each load:
// - Total node count by label
// - Total relationship count by type
// - Coverage statistics (% of papers with findings, etc.)
// - Average evidence strength
// - Top organisms, tissues, phenotypes by frequency
