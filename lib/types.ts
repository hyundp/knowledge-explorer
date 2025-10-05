// Ontology term interface
export interface OntologyTerm {
  id: string;
  label: string;
  source_obo: "PATO" | "UBERON" | "NCBITaxon" | "HPO" | "GO" | "CHEBI" | "OBI";
}

// Paper interfaces
export interface Paper {
  pmcid: string;
  title: string;
  authors: string[];
  year: string;
  journal: string;
  doi: string;
  sections: {
    abstract: string;
    methods?: string;
    results?: string;
    discussion?: string;
    conclusion?: string;
  };
  provenance: {
    source_type: "jats" | "html" | "pdf";
    fetched_at: string;
    url: string;
  };
}

// Finding interfaces
export interface Finding {
  finding_id: string;
  pmcid: string;
  phenotype: OntologyTerm;
  direction: "increase" | "decrease" | "no_change";
  magnitude: {
    value: number;
    unit: string;
    method: string;
  } | null;
  p_value: number | null;
  tissue: OntologyTerm | null;
  organism: OntologyTerm;
  exposure: {
    type: "microgravity" | "radiation" | "analog";
    model: string | null;
    radiation_type: string | null;
  };
  duration: {
    value: number;
    unit: "days" | "weeks" | "months";
  };
  assay: OntologyTerm;
  sample_size: number;
  evidence_strength: number;
  provenance: {
    section: "results" | "discussion" | "conclusion";
    text_span: string;
  };
}

// Knowledge Graph interfaces
export interface KGNode {
  id: string;
  label: string;
  type: "Paper" | "Organism" | "Tissue" | "CellType" | "Phenotype" | "Exposure" | "Platform" | "Mission" | "Assay" | "Finding";
  properties: Record<string, string | number | boolean | null>;
}

export interface KGEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, string | number | boolean | null>;
}

export interface KGGraph {
  nodes: KGNode[];
  edges: KGEdge[];
}

// Gap Analysis interfaces
export interface GapCell {
  organism: string;
  tissue: string;
  exposure: string;
  duration: string;
  study_count: number;
  avg_evidence_strength: number;
  pmcids: string[];
}

export interface GapAnalysis {
  cells: GapCell[];
  metadata: {
    total_cells: number;
    coverage: number;
  };
}

// Consensus interfaces
export interface EffectSize {
  pmcid: string;
  title: string;
  year: string;
  direction: "increase" | "decrease" | "no_change";
  magnitude: number;
  ci_lower: number;
  ci_upper: number;
  p_value: number;
  sample_size: number;
}

export interface Consensus {
  phenotype: string;
  phenotype_id: string;
  total_studies: number;
  agreement_score: number;
  consensus_direction: "increase" | "decrease" | "no_change" | "mixed";
  effect_sizes: EffectSize[];
  outliers: string[];
  statistics: {
    mean_effect: number;
    median_effect: number;
    std_dev: number;
  };
}

// Search & RAG interfaces
export interface SearchCitation {
  pmcid: string;
  title: string;
  section: string;
  quote: string;
  relevance_score: number;
}

export interface SearchResult {
  query: string;
  answer: string;
  citations: SearchCitation[];
}

// External context interfaces
export interface ExternalContent {
  type: "news" | "explainer" | "newsletter" | "library_record";
  source_url: string;
  title: string;
  summary: string;
  published_at: string;
  authors: string[];
  tags: string[];
  body_text: string;
  referenced_urls: string[];
  provenance: {
    parser_path: string;
    fetched_at: string;
  };
}

// Manager Dashboard interfaces
export interface CoverageTile {
  priority: string;
  domain: string;
  coverage: number;
  trend: "↑" | "→" | "↓";
  studyCount: number;
  pmcids: string[];
}

export interface CoveragePriorityMap {
  tiles: CoverageTile[];
  priorities: string[];
  domains: string[];
  metadata: {
    totalCoverage: number;
    avgCoverage: number;
  };
}

export interface GapROI {
  id: string;
  title: string;
  organism: string;
  tissue: string;
  exposure: string;
  impact: number;
  feasibility: number;
  cost: number;
  urgency: "High" | "Medium" | "Low";
  roi: number;
  rationale: string;
  pmcids: string[];
}

export interface GapROIResponse {
  gaps: GapROI[];
  metadata: {
    totalGaps: number;
    avgROI: number;
    highPriorityCount: number;
  };
}

export interface RedundancyCluster {
  id: string;
  studies: {
    pmcid: string;
    title: string;
    year: string;
  }[];
  similarity: number;
  description: string;
  organism: string;
  tissue: string;
  exposure: string;
  suggestion: "merge" | "differentiate";
}

export interface RedundancyResponse {
  clusters: RedundancyCluster[];
  metadata: {
    totalClusters: number;
    redundancyIndex: number;
  };
}

export interface PortfolioItem {
  gapId: string;
  title: string;
  cost: number;
  roi: number;
  priority: string;
}

export interface PortfolioSolution {
  selectedGaps: PortfolioItem[];
  totalCost: number;
  totalROI: number;
  coverageLift: number;
  riskReduction: number;
  optimizationStatus: "optimal" | "near-optimal" | "greedy";
}

export interface DecisionDossier {
  gap: GapROI;
  rationale: string;
  citations: {
    pmcid: string;
    title: string;
    year: string;
    relevantSpan: string;
  }[];
  expectedOutcomes: string[];
  risks: string[];
  requiredResources: {
    duration: string;
    hardware: string;
    team: string;
    estimatedCost: number;
  };
}

// Portfolio Manager interfaces
export interface PortfolioPaper {
  pmcid: string;
  title: string;
  year: string;
  journal: string;
  authors: string[];
  abstract?: string;
  impact?: number;
  importance?: number;
  budget?: number;
  roi?: number;
  inPortfolio: boolean;
}

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  papers: {
    [pmcid: string]: {
      impact: number;
      risk: number;
      budget: number;
    }
  };
  totalBudget: number;
  avgROI: number;
  createdAt: string;
  lastUpdated: string;
}

export interface PortfoliosData {
  portfolios: Portfolio[];
}
