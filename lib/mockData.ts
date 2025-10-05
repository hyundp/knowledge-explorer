import type {
  Paper,
  Finding,
  OntologyTerm,
  GapAnalysis,
  GapCell,
  Consensus,
  EffectSize,
  KGGraph,
  KGNode,
  KGEdge,
  SearchResult,
  ExternalContent,
} from "./types";

// Mock ontology terms
const organisms: OntologyTerm[] = [
  { id: "NCBITaxon:10090", label: "Mus musculus", source_obo: "NCBITaxon" },
  { id: "NCBITaxon:10116", label: "Rattus norvegicus", source_obo: "NCBITaxon" },
  { id: "NCBITaxon:9606", label: "Homo sapiens", source_obo: "NCBITaxon" },
  { id: "NCBITaxon:7227", label: "Drosophila melanogaster", source_obo: "NCBITaxon" },
];

const tissues: OntologyTerm[] = [
  { id: "UBERON:0002371", label: "Bone marrow", source_obo: "UBERON" },
  { id: "UBERON:0001134", label: "Skeletal muscle tissue", source_obo: "UBERON" },
  { id: "UBERON:0000948", label: "Heart", source_obo: "UBERON" },
  { id: "UBERON:0002107", label: "Liver", source_obo: "UBERON" },
  { id: "UBERON:0002240", label: "Spinal cord", source_obo: "UBERON" },
  { id: "UBERON:0000955", label: "Brain", source_obo: "UBERON" },
  { id: "UBERON:0002113", label: "Kidney", source_obo: "UBERON" },
];

const phenotypes: OntologyTerm[] = [
  { id: "PATO:0001997", label: "Bone density decreased", source_obo: "PATO" },
  { id: "PATO:0001998", label: "Muscle mass decreased", source_obo: "PATO" },
  { id: "PATO:0001999", label: "Gene expression increased", source_obo: "PATO" },
  { id: "PATO:0002000", label: "Oxidative stress increased", source_obo: "PATO" },
  { id: "PATO:0002001", label: "Immune response decreased", source_obo: "PATO" },
  { id: "PATO:0002002", label: "DNA damage increased", source_obo: "PATO" },
];

const assays: OntologyTerm[] = [
  { id: "OBI:0000070", label: "RNA-seq", source_obo: "OBI" },
  { id: "OBI:0000071", label: "qPCR", source_obo: "OBI" },
  { id: "OBI:0000072", label: "Western blot", source_obo: "OBI" },
  { id: "OBI:0000073", label: "Microarray", source_obo: "OBI" },
];

// Helper functions
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate mock papers
export function generateMockPapers(count: number = 20): Paper[] {
  const papers: Paper[] = [];
  const journals = ["PLoS ONE", "Nature", "Science", "Cell", "PNAS", "Scientific Reports"];

  for (let i = 1; i <= count; i++) {
    const pmcid = `PMC${4000000 + i * 13787}`;
    papers.push({
      pmcid,
      title: `Effects of ${randomItem(["Microgravity", "Space Radiation", "Simulated Spaceflight"])} on ${randomItem(tissues).label} in ${randomItem(organisms).label}`,
      authors: [
        `Author ${String.fromCharCode(65 + (i % 26))}`,
        `Researcher ${String.fromCharCode(66 + (i % 26))}`,
        `Scientist ${String.fromCharCode(67 + (i % 26))}`,
      ],
      year: String(2014 + (i % 11)),
      journal: randomItem(journals),
      doi: `10.1371/journal.pone.${100000 + i}`,
      sections: {
        abstract: `This study investigates the effects of spaceflight conditions on biological systems. We observed significant changes in multiple biological markers.`,
        methods: `Samples were exposed to ${randomItem(["microgravity", "radiation", "simulated spaceflight"])} conditions for ${randomInt(7, 90)} days.`,
        results: `We found significant changes in ${randomItem(phenotypes).label} with p-value < 0.05.`,
        discussion: `Our findings suggest that spaceflight conditions have significant impacts on biological systems.`,
        conclusion: `These results contribute to our understanding of space biology and have implications for long-duration spaceflight.`,
      },
      provenance: {
        source_type: randomItem(["jats", "html", "pdf"] as const),
        fetched_at: new Date(2025, 9, randomInt(1, 30)).toISOString(),
        url: `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/`,
      },
    });
  }

  return papers;
}

// Generate mock findings
export function generateMockFindings(count: number = 50): Finding[] {
  const findings: Finding[] = [];
  const exposureTypes: Array<"microgravity" | "radiation" | "analog"> = ["microgravity", "radiation", "analog"];
  const directions: Array<"increase" | "decrease" | "no_change"> = ["increase", "decrease", "no_change"];

  for (let i = 1; i <= count; i++) {
    findings.push({
      finding_id: `f_${String(i).padStart(3, "0")}`,
      pmcid: `PMC${4000000 + randomInt(1, 20) * 13787}`,
      phenotype: randomItem(phenotypes),
      direction: randomItem(directions),
      magnitude: Math.random() > 0.2 ? {
        value: parseFloat((Math.random() * 5 + 0.5).toFixed(2)),
        unit: randomItem(["fold_change", "percent", "log2FC"]),
        method: randomItem(assays).label,
      } : null,
      p_value: Math.random() > 0.1 ? parseFloat((Math.random() * 0.05).toFixed(4)) : null,
      tissue: Math.random() > 0.1 ? randomItem(tissues) : null,
      organism: randomItem(organisms),
      exposure: {
        type: randomItem(exposureTypes),
        model: randomItem(["ISS", "Hindlimb Unloading", "Rotating Wall Vessel", "Parabolic Flight", null]),
        radiation_type: Math.random() > 0.7 ? randomItem(["GCR", "SPE", "Proton", null]) : null,
      },
      duration: {
        value: randomInt(7, 90),
        unit: randomItem(["days", "weeks", "months"] as Array<"days" | "weeks" | "months">),
      },
      assay: randomItem(assays),
      sample_size: randomInt(3, 20),
      evidence_strength: parseFloat((Math.random() * 0.4 + 0.6).toFixed(2)),
      provenance: {
        section: randomItem(["results", "discussion", "conclusion"] as Array<"results" | "discussion" | "conclusion">),
        text_span: `Significant changes were observed in the experimental group compared to controls.`,
      },
    });
  }

  return findings;
}

// Generate gap analysis data
export function generateGapAnalysis(): GapAnalysis {
  const cells: GapCell[] = [];
  const durations = ["7d", "14d", "30d", "60d", "90d"];
  const exposures = ["microgravity", "radiation", "analog"];

  organisms.forEach((organism) => {
    tissues.forEach((tissue) => {
      exposures.forEach((exposure) => {
        durations.forEach((duration) => {
          if (Math.random() > 0.3) {
            const studyCount = randomInt(1, 15);
            cells.push({
              organism: organism.label,
              tissue: tissue.label,
              exposure,
              duration,
              study_count: studyCount,
              avg_evidence_strength: parseFloat((Math.random() * 0.3 + 0.6).toFixed(2)),
              pmcids: Array.from({ length: studyCount }, (_, i) =>
                `PMC${4000000 + randomInt(1, 50) * 13787}`
              ),
            });
          }
        });
      });
    });
  });

  return {
    cells,
    metadata: {
      total_cells: organisms.length * tissues.length * exposures.length * durations.length,
      coverage: cells.length / (organisms.length * tissues.length * exposures.length * durations.length),
    },
  };
}

// Generate consensus data
export function generateConsensusData(phenotypeId: string = "PATO:0001997"): Consensus {
  const phenotype = phenotypes.find((p) => p.id === phenotypeId) || phenotypes[0];
  const effectSizes: EffectSize[] = [];
  const studyCount = randomInt(15, 30);

  for (let i = 1; i <= studyCount; i++) {
    const magnitude = parseFloat((Math.random() * 4 - 2).toFixed(2));
    effectSizes.push({
      pmcid: `PMC${4000000 + i * 13787}`,
      title: `Study ${i} on ${phenotype.label}`,
      year: String(2014 + (i % 11)),
      direction: magnitude > 0 ? "increase" : magnitude < 0 ? "decrease" : "no_change",
      magnitude,
      ci_lower: magnitude - Math.random() * 0.5,
      ci_upper: magnitude + Math.random() * 0.5,
      p_value: parseFloat((Math.random() * 0.05).toFixed(4)),
      sample_size: randomInt(3, 20),
    });
  }

  const magnitudes = effectSizes.map((e) => e.magnitude);
  const meanEffect = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
  const sortedMags = [...magnitudes].sort((a, b) => a - b);
  const medianEffect = sortedMags[Math.floor(sortedMags.length / 2)];
  const variance = magnitudes.reduce((a, b) => a + Math.pow(b - meanEffect, 2), 0) / magnitudes.length;
  const stdDev = Math.sqrt(variance);

  const consensusDirection = meanEffect > 0.5 ? "increase" : meanEffect < -0.5 ? "decrease" : "mixed";

  return {
    phenotype: phenotype.label,
    phenotype_id: phenotype.id,
    total_studies: studyCount,
    agreement_score: parseFloat((1 - stdDev / 2).toFixed(2)),
    consensus_direction: consensusDirection,
    effect_sizes: effectSizes,
    outliers: effectSizes
      .filter((e) => Math.abs(e.magnitude - meanEffect) > stdDev * 2)
      .map((e) => e.pmcid),
    statistics: {
      mean_effect: parseFloat(meanEffect.toFixed(2)),
      median_effect: parseFloat(medianEffect.toFixed(2)),
      std_dev: parseFloat(stdDev.toFixed(2)),
    },
  };
}

// Generate knowledge graph
export function generateKnowledgeGraph(centerNodeId?: string): KGGraph {
  const nodes: KGNode[] = [];
  const edges: KGEdge[] = [];

  // Create paper nodes
  const paperCount = 10;
  for (let i = 1; i <= paperCount; i++) {
    const pmcid = `PMC${4000000 + i * 13787}`;
    nodes.push({
      id: pmcid,
      label: `Study ${i}`,
      type: "Paper",
      properties: {
        year: String(2014 + (i % 11)),
        journal: randomItem(["PLoS ONE", "Nature", "Science"]),
        pmcid,
      },
    });
  }

  // Create phenotype nodes
  phenotypes.forEach((phenotype) => {
    nodes.push({
      id: phenotype.id,
      label: phenotype.label,
      type: "Phenotype",
      properties: { source_obo: phenotype.source_obo },
    });
  });

  // Create organism nodes
  organisms.forEach((organism) => {
    nodes.push({
      id: organism.id,
      label: organism.label,
      type: "Organism",
      properties: { source_obo: organism.source_obo },
    });
  });

  // Create tissue nodes
  tissues.slice(0, 5).forEach((tissue) => {
    nodes.push({
      id: tissue.id,
      label: tissue.label,
      type: "Tissue",
      properties: { source_obo: tissue.source_obo },
    });
  });

  // Create edges
  let edgeId = 1;
  nodes.filter((n) => n.type === "Paper").forEach((paperNode) => {
    // Papers report phenotypes
    const phenotypeCount = randomInt(1, 3);
    for (let i = 0; i < phenotypeCount; i++) {
      const phenotype = randomItem(phenotypes);
      edges.push({
        id: `edge_${edgeId++}`,
        source: paperNode.id,
        target: phenotype.id,
        type: "REPORTS",
        properties: {
          evidence_strength: parseFloat((Math.random() * 0.3 + 0.7).toFixed(2)),
        },
      });
    }

    // Papers study organisms
    const organism = randomItem(organisms);
    edges.push({
      id: `edge_${edgeId++}`,
      source: paperNode.id,
      target: organism.id,
      type: "STUDIES",
      properties: {},
    });

    // Papers investigate tissues
    if (Math.random() > 0.3) {
      const tissue = randomItem(tissues.slice(0, 5));
      edges.push({
        id: `edge_${edgeId++}`,
        source: paperNode.id,
        target: tissue.id,
        type: "INVESTIGATES",
        properties: {},
      });
    }
  });

  return { nodes, edges };
}

// Generate search results
export function generateSearchResults(query: string): SearchResult {
  return {
    query,
    answer: `Based on multiple studies in the space biology literature, ${query.toLowerCase()} has been extensively studied. The evidence suggests significant effects across multiple biological systems, with consistent findings in microgravity and radiation exposure conditions.`,
    citations: [
      {
        pmcid: "PMC4136787",
        title: "Effects of Microgravity on Biological Systems",
        section: "results",
        quote: "We observed significant changes in the measured parameters compared to ground controls.",
        relevance_score: 0.92,
      },
      {
        pmcid: "PMC4150574",
        title: "Space Radiation Biology Research",
        section: "discussion",
        quote: "Our findings align with previous studies showing similar effects.",
        relevance_score: 0.87,
      },
      {
        pmcid: "PMC4164361",
        title: "Long-Duration Spaceflight Effects",
        section: "results",
        quote: "The experimental group showed statistically significant differences.",
        relevance_score: 0.83,
      },
    ],
  };
}

// Generate external content (NASA news, explainers, etc.)
export function generateExternalContent(): ExternalContent[] {
  return [
    {
      type: "news",
      source_url: "https://science.nasa.gov/biological-physical/news/space-biology-research-update-2024",
      title: "NASA's Space Biology Research Advances Understanding of Life in Space",
      summary: "Recent studies aboard the International Space Station reveal new insights into how plants and microorganisms adapt to microgravity, paving the way for sustainable long-duration missions.",
      published_at: "2024-03-15T00:00:00Z",
      authors: ["NASA Science Team"],
      tags: ["microgravity", "ISS", "plant biology", "microorganisms"],
      body_text: "Full article content would be here...",
      referenced_urls: [],
      provenance: {
        parser_path: "parsers.nasa_news",
        fetched_at: new Date().toISOString(),
      },
    },
    {
      type: "news",
      source_url: "https://science.nasa.gov/biological-physical/news/radiation-protection-breakthrough",
      title: "Breakthrough in Understanding Space Radiation Effects on DNA",
      summary: "A collaborative study between NASA and international partners identifies key molecular mechanisms that protect cells from cosmic radiation damage.",
      published_at: "2024-02-28T00:00:00Z",
      authors: ["NASA Radiation Biology Team"],
      tags: ["radiation", "DNA damage", "cosmic rays", "cell biology"],
      body_text: "Full article content would be here...",
      referenced_urls: [],
      provenance: {
        parser_path: "parsers.nasa_news",
        fetched_at: new Date().toISOString(),
      },
    },
    {
      type: "explainer",
      source_url: "https://science.nasa.gov/biological-physical/explainers/what-is-microgravity",
      title: "What is Microgravity and How Does it Affect Biology?",
      summary: "An in-depth explanation of microgravity conditions in space and their fundamental effects on living organisms, from cellular processes to whole-body physiology.",
      published_at: "2023-11-10T00:00:00Z",
      authors: ["NASA Education Team"],
      tags: ["microgravity", "education", "physiology", "space environment"],
      body_text: "Full explainer content would be here...",
      referenced_urls: [],
      provenance: {
        parser_path: "parsers.nasa_explainers",
        fetched_at: new Date().toISOString(),
      },
    },
    {
      type: "explainer",
      source_url: "https://science.nasa.gov/biological-physical/explainers/bone-loss-in-space",
      title: "Understanding Bone Loss During Spaceflight",
      summary: "Learn how and why astronauts experience bone density loss in space, and what countermeasures are being developed to protect skeletal health on long missions.",
      published_at: "2023-09-22T00:00:00Z",
      authors: ["NASA Human Research Program"],
      tags: ["bone density", "astronaut health", "countermeasures", "long-duration missions"],
      body_text: "Full explainer content would be here...",
      referenced_urls: [],
      provenance: {
        parser_path: "parsers.nasa_explainers",
        fetched_at: new Date().toISOString(),
      },
    },
    {
      type: "newsletter",
      source_url: "https://science.nasa.gov/biological-physical/newsletters/2024-q1",
      title: "Space Biology Quarterly: Q1 2024 Research Highlights",
      summary: "This quarter's newsletter features recent publications on muscle atrophy, immune system changes, and novel omics approaches in spaceflight research.",
      published_at: "2024-04-01T00:00:00Z",
      authors: ["NASA Space Biology Program"],
      tags: ["newsletter", "research highlights", "omics", "muscle", "immune system"],
      body_text: "Full newsletter content would be here...",
      referenced_urls: [],
      provenance: {
        parser_path: "parsers.nasa_newsletters",
        fetched_at: new Date().toISOString(),
      },
    },
    {
      type: "newsletter",
      source_url: "https://science.nasa.gov/biological-physical/newsletters/2023-q4",
      title: "Space Biology Quarterly: Q4 2023 Mission Updates",
      summary: "Updates on active experiments aboard ISS, upcoming rodent research missions, and collaboration opportunities with international space agencies.",
      published_at: "2024-01-15T00:00:00Z",
      authors: ["NASA Space Biology Program"],
      tags: ["newsletter", "ISS experiments", "rodent research", "international collaboration"],
      body_text: "Full newsletter content would be here...",
      referenced_urls: [],
      provenance: {
        parser_path: "parsers.nasa_newsletters",
        fetched_at: new Date().toISOString(),
      },
    },
  ];
}

// Export commonly used mock data
export const mockPapers = generateMockPapers(20);
export const mockFindings = generateMockFindings(50);
export const mockGapAnalysis = generateGapAnalysis();
export const mockConsensus = generateConsensusData();
export const mockKnowledgeGraph = generateKnowledgeGraph();
