import {
  CoveragePriorityMap,
  CoverageTile,
  GapROI,
  GapROIResponse,
  RedundancyCluster,
  RedundancyResponse,
  PortfolioItem,
  PortfolioSolution,
  DecisionDossier,
  Paper
} from '@/lib/types';
import { getPapers } from './data';
import { getGapAnalysis } from './gap-finder';
import { getInsights } from './insights';
import { extractOrganisms, extractTissues, extractExposures } from './parameters';

// NASA strategic priorities mapping
const NASA_PRIORITIES = [
  "Bone Loss",
  "Muscle Atrophy",
  "Immune Dysregulation",
  "Vision Changes",
  "Cardiovascular",
  "Radiation Effects",
  "Behavioral Health"
];

const EXPOSURE_DOMAINS = [
  "Microgravity",
  "Radiation",
  "Combined",
  "Analog"
];

/**
 * Get Coverage × Priority heatmap data
 */
export async function getCoveragePriorityMap(filters?: {
  yearRange?: [number, number];
}): Promise<CoveragePriorityMap> {
  const papers = await getPapers();

  // Create a map to track coverage for each priority × domain combination
  const coverageMap = new Map<string, {
    priority: string;
    domain: string;
    pmcids: Set<string>;
    years: number[];
  }>();

  // Initialize all combinations
  NASA_PRIORITIES.forEach(priority => {
    EXPOSURE_DOMAINS.forEach(domain => {
      const key = `${priority}|${domain}`;
      coverageMap.set(key, {
        priority,
        domain,
        pmcids: new Set(),
        years: []
      });
    });
  });

  // Map priority keywords to exposure patterns
  const priorityKeywords: Record<string, RegExp> = {
    "Bone Loss": /\bbone\b.*\b(loss|density|mineral|osteo|calcium)\b|\bosteo/gi,
    "Muscle Atrophy": /\bmuscle\b.*\b(atrophy|mass|wasting|sarcopenia)\b|\bsarcopenia/gi,
    "Immune Dysregulation": /\bimmune\b|\bimmunity\b|\blymphocyte\b|\bcytokine\b/gi,
    "Vision Changes": /\bvision\b|\beye\b|\bretina\b|\bocular\b|\bvisual\b/gi,
    "Cardiovascular": /\bcardio\w*\b|\bheart\b|\bvascular\b|\bblood\s+pressure\b/gi,
    "Radiation Effects": /\bradiation\b|\bcosmic\s+ray\b|\bDNA\s+damage\b/gi,
    "Behavioral Health": /\bbehavior\w*\b|\bpsych\w*\b|\bmood\b|\bstress\b|\banxiety\b/gi
  };

  const domainKeywords: Record<string, RegExp> = {
    "Microgravity": /\bmicrogravity\b|\bweightless\b|\b0g\b|\bzero\s+gravity\b/gi,
    "Radiation": /\bradiation\b|\bcosmic\s+ray\b|\birradiat/gi,
    "Combined": /\bcombined\b|\bmultiple\s+stressor\b|\bmicrogravity\b.*\bradiation\b|\bradiation\b.*\bmicrogravity\b/gi,
    "Analog": /\banalog\b|\bclinostat\b|\bhindlimb\b|\bbed\s+rest\b|\bsimulated\b/gi
  };

  // Process papers
  papers.forEach(paper => {
    const text = `${paper.title} ${paper.sections.abstract}`.toLowerCase();
    const year = parseInt(paper.year);

    if (filters?.yearRange) {
      if (year < filters.yearRange[0] || year > filters.yearRange[1]) {
        return;
      }
    }

    // Find which priorities and domains this paper covers
    const matchedPriorities: string[] = [];
    const matchedDomains: string[] = [];

    Object.entries(priorityKeywords).forEach(([priority, pattern]) => {
      if (pattern.test(text)) {
        matchedPriorities.push(priority);
      }
    });

    Object.entries(domainKeywords).forEach(([domain, pattern]) => {
      if (pattern.test(text)) {
        matchedDomains.push(domain);
      }
    });

    // Add to coverage map
    matchedPriorities.forEach(priority => {
      matchedDomains.forEach(domain => {
        const key = `${priority}|${domain}`;
        const entry = coverageMap.get(key);
        if (entry) {
          entry.pmcids.add(paper.pmcid);
          if (!isNaN(year)) {
            entry.years.push(year);
          }
        }
      });
    });
  });

  // Convert to tiles with trend calculation
  const currentYear = new Date().getFullYear();
  const tiles: CoverageTile[] = [];

  coverageMap.forEach(entry => {
    const studyCount = entry.pmcids.size;

    // Calculate coverage (normalized by max studies in any cell)
    const coverage = Math.min((studyCount / 50) * 100, 100); // 50+ studies = 100% coverage

    // Calculate trend based on recent years
    const recentYears = entry.years.filter(y => y >= currentYear - 3);
    const olderYears = entry.years.filter(y => y < currentYear - 3);

    let trend: "↑" | "→" | "↓" = "→";
    if (recentYears.length > olderYears.length * 1.5) {
      trend = "↑";
    } else if (olderYears.length > recentYears.length * 1.5) {
      trend = "↓";
    }

    tiles.push({
      priority: entry.priority,
      domain: entry.domain,
      coverage: Math.round(coverage),
      trend,
      studyCount,
      pmcids: Array.from(entry.pmcids)
    });
  });

  // Calculate metadata
  const totalCoverage = tiles.reduce((sum, t) => sum + t.coverage, 0);
  const avgCoverage = tiles.length > 0 ? totalCoverage / tiles.length : 0;

  return {
    tiles,
    priorities: NASA_PRIORITIES,
    domains: EXPOSURE_DOMAINS,
    metadata: {
      totalCoverage: Math.round(totalCoverage),
      avgCoverage: Math.round(avgCoverage)
    }
  };
}

/**
 * Calculate impact score for a gap
 */
function calculateImpact(organism: string, tissue: string, exposure: string): number {
  let score = 5.0; // Base score

  // Human relevance
  if (organism === 'Homo sapiens') score += 2.5;
  else if (['Mus musculus', 'Rattus norvegicus'].includes(organism)) score += 1.5;

  // Physiological system importance
  const criticalTissues = ['Brain', 'Heart', 'Bone', 'Muscle', 'Blood', 'Immune system'];
  if (criticalTissues.some(t => tissue.includes(t))) score += 1.5;

  // Mission criticality
  if (exposure.includes('Spaceflight') || exposure.includes('Radiation')) score += 1.5;
  if (exposure.includes('Combined')) score += 0.5;

  return Math.min(score, 10);
}

/**
 * Calculate feasibility score for a gap
 */
function calculateFeasibility(organism: string, tissue: string, studyCount: number): number {
  let score = 5.0; // Base score

  // Model availability
  if (['Mus musculus', 'Drosophila melanogaster', 'Caenorhabditis elegans'].includes(organism)) {
    score += 2.0;
  } else if (organism === 'Homo sapiens') {
    score += 0.5; // Harder to study
  }

  // Existing methodology (based on study count)
  if (studyCount > 0 && studyCount <= 2) {
    score += 1.5; // Some precedent exists
  } else if (studyCount === 0) {
    score -= 1.0; // No precedent
  }

  // Tissue accessibility
  const accessibleTissues = ['Blood', 'Muscle', 'Skin'];
  if (accessibleTissues.some(t => tissue.includes(t))) score += 1.0;

  return Math.max(1, Math.min(score, 10));
}

/**
 * Calculate cost estimate for a gap
 */
function calculateCost(organism: string, exposure: string, studyCount: number): number {
  let cost = 100000; // Base cost in dollars

  // Organism complexity
  if (organism === 'Homo sapiens') cost *= 5;
  else if (['Mus musculus', 'Rattus norvegicus'].includes(organism)) cost *= 2;
  else cost *= 1.2;

  // Exposure complexity
  if (exposure.includes('Spaceflight')) cost *= 10;
  else if (exposure.includes('Combined')) cost *= 3;
  else if (exposure.includes('Radiation')) cost *= 2;

  // Novelty factor
  if (studyCount === 0) cost *= 1.5;

  return Math.round(cost);
}

/**
 * Get Gap ROI rankings
 */
export async function getGapROIRankings(filters?: {
  minImpact?: number;
  maxCost?: number;
}): Promise<GapROIResponse> {
  const papers = await getPapers();
  const insights = await getInsights();

  // Use research gaps from insights
  const gaps: GapROI[] = insights.researchGaps.map((gap, index) => {
    const impact = calculateImpact(gap.organism, gap.tissue, gap.exposure);
    const feasibility = calculateFeasibility(gap.organism, gap.tissue, gap.study_count);
    const cost = calculateCost(gap.organism, gap.exposure, gap.study_count);

    // ROI formula: (w1 * Impact + w2 * Feasibility - w3 * log(Cost))
    const w1 = 0.5, w2 = 0.3, w3 = 0.2;
    const normalizedCost = Math.log10(cost) / 6; // Normalize log scale
    const roi = w1 * impact + w2 * feasibility - w3 * normalizedCost * 10;

    // Determine urgency based on impact and study count
    let urgency: "High" | "Medium" | "Low" = "Medium";
    if (impact > 8 && gap.study_count <= 1) urgency = "High";
    else if (impact < 6 || gap.study_count > 1) urgency = "Low";

    return {
      id: `gap-${index}`,
      title: gap.combination,
      organism: gap.organism,
      tissue: gap.tissue,
      exposure: gap.exposure,
      impact: parseFloat(impact.toFixed(1)),
      feasibility: parseFloat(feasibility.toFixed(1)),
      cost,
      urgency,
      roi: parseFloat(roi.toFixed(1)),
      rationale: gap.rationale,
      pmcids: gap.pmcids
    };
  });

  // Apply filters
  let filteredGaps = gaps;
  if (filters?.minImpact) {
    filteredGaps = filteredGaps.filter(g => g.impact >= filters.minImpact!);
  }
  if (filters?.maxCost) {
    filteredGaps = filteredGaps.filter(g => g.cost <= filters.maxCost!);
  }

  // Sort by ROI descending
  filteredGaps.sort((a, b) => b.roi - a.roi);

  // Calculate metadata
  const avgROI = filteredGaps.length > 0
    ? filteredGaps.reduce((sum, g) => sum + g.roi, 0) / filteredGaps.length
    : 0;
  const highPriorityCount = filteredGaps.filter(g => g.urgency === "High").length;

  return {
    gaps: filteredGaps,
    metadata: {
      totalGaps: filteredGaps.length,
      avgROI: parseFloat(avgROI.toFixed(1)),
      highPriorityCount
    }
  };
}

/**
 * Calculate text similarity using simple word overlap
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Detect redundancy and synergy opportunities
 */
export async function detectRedundancy(filters?: {
  minSimilarity?: number;
}): Promise<RedundancyResponse> {
  const papers = await getPapers();
  const minSim = filters?.minSimilarity || 0.7;

  // Group papers by organism/tissue/exposure combination
  const groups = new Map<string, Paper[]>();

  papers.forEach(paper => {
    const text = `${paper.title} ${paper.sections.abstract}`;
    const organisms = extractOrganisms(text);
    const tissues = extractTissues(text);
    const exposures = extractExposures(text);

    if (organisms.length > 0 && tissues.length > 0 && exposures.length > 0) {
      const key = `${organisms[0]}|${tissues[0]}|${exposures[0]}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(paper);
    }
  });

  // Find clusters within groups
  const clusters: RedundancyCluster[] = [];
  let clusterId = 0;

  groups.forEach((groupPapers, key) => {
    if (groupPapers.length < 2) return; // Need at least 2 papers

    // Check similarity within group
    for (let i = 0; i < groupPapers.length; i++) {
      for (let j = i + 1; j < groupPapers.length; j++) {
        const paper1 = groupPapers[i];
        const paper2 = groupPapers[j];

        const text1 = `${paper1.title} ${paper1.sections.abstract}`;
        const text2 = `${paper2.title} ${paper2.sections.abstract}`;

        const similarity = calculateSimilarity(text1, text2);

        if (similarity >= minSim) {
          // Found a similar pair - create or extend cluster
          const [organism, tissue, exposure] = key.split('|');

          clusters.push({
            id: `cluster-${clusterId++}`,
            studies: [
              { pmcid: paper1.pmcid, title: paper1.title, year: paper1.year },
              { pmcid: paper2.pmcid, title: paper2.title, year: paper2.year }
            ],
            similarity: parseFloat((similarity * 100).toFixed(0)) / 100,
            description: `${organism} ${tissue} under ${exposure}`,
            organism,
            tissue,
            exposure,
            suggestion: similarity > 0.85 ? "merge" : "differentiate"
          });
        }
      }
    }
  });

  // Calculate redundancy index (mean similarity of all clusters)
  const redundancyIndex = clusters.length > 0
    ? clusters.reduce((sum, c) => sum + c.similarity, 0) / clusters.length
    : 0;

  return {
    clusters: clusters.slice(0, 20), // Top 20 clusters
    metadata: {
      totalClusters: clusters.length,
      redundancyIndex: parseFloat(redundancyIndex.toFixed(2))
    }
  };
}

/**
 * Solve portfolio optimization (greedy algorithm for simplicity)
 */
export async function solvePortfolio(request: {
  gapIds: string[];
  budget: number;
  constraints?: {
    maxPerDomain?: number;
    minCoverage?: number;
  };
}): Promise<PortfolioSolution> {
  const roiData = await getGapROIRankings();

  // Filter gaps by requested IDs or use all
  const availableGaps = request.gapIds.length > 0
    ? roiData.gaps.filter(g => request.gapIds.includes(g.id))
    : roiData.gaps;

  // Greedy algorithm: sort by ROI and select until budget exhausted
  const sortedGaps = [...availableGaps].sort((a, b) => b.roi - a.roi);

  const selected: PortfolioItem[] = [];
  let totalCost = 0;
  let totalROI = 0;

  for (const gap of sortedGaps) {
    if (totalCost + gap.cost <= request.budget) {
      selected.push({
        gapId: gap.id,
        title: gap.title,
        cost: gap.cost,
        roi: gap.roi,
        priority: gap.urgency
      });
      totalCost += gap.cost;
      totalROI += gap.roi;
    }
  }

  // Calculate coverage lift and risk reduction (estimated)
  const coverageLift = selected.length > 0
    ? (selected.length / availableGaps.length) * 20 // ~20% max lift
    : 0;

  const riskReduction = selected.reduce((sum, item) => {
    const gap = roiData.gaps.find(g => g.id === item.gapId);
    return sum + (gap ? gap.impact : 0);
  }, 0);

  return {
    selectedGaps: selected,
    totalCost,
    totalROI: parseFloat(totalROI.toFixed(1)),
    coverageLift: parseFloat(coverageLift.toFixed(1)),
    riskReduction: parseFloat(riskReduction.toFixed(1)),
    optimizationStatus: selected.length < 200 ? "optimal" : "greedy"
  };
}

/**
 * Generate decision dossier for a gap
 */
export async function getDecisionDossier(gapId: string): Promise<DecisionDossier> {
  const roiData = await getGapROIRankings();
  const papers = await getPapers();

  const gap = roiData.gaps.find(g => g.id === gapId);
  if (!gap) {
    throw new Error(`Gap ${gapId} not found`);
  }

  // Get relevant papers
  const relevantPapers = papers.filter(p => gap.pmcids.includes(p.pmcid));

  // Extract citations
  const citations = relevantPapers.slice(0, 5).map(paper => ({
    pmcid: paper.pmcid,
    title: paper.title,
    year: paper.year,
    relevantSpan: paper.sections.abstract.slice(0, 200) + '...'
  }));

  // Generate expected outcomes
  const expectedOutcomes = [
    `Establish baseline data for ${gap.organism} ${gap.tissue} responses to ${gap.exposure}`,
    `Identify key biomarkers and mechanisms of adaptation`,
    `Inform countermeasure development and risk assessment`,
    `Enable cross-species comparison and translational insights`
  ];

  // Identify risks
  const risks = [
    gap.feasibility < 5 ? 'Technical feasibility challenges may extend timeline' : null,
    gap.cost > 500000 ? 'High cost may require multi-year funding commitment' : null,
    gap.pmcids.length === 0 ? 'No prior studies - exploratory nature increases uncertainty' : null,
    'Regulatory or ethical considerations may apply'
  ].filter(Boolean) as string[];

  // Estimate resources
  const duration = gap.cost > 1000000 ? '24-36 months' : gap.cost > 500000 ? '12-24 months' : '6-12 months';
  const hardware = gap.exposure.includes('Spaceflight') ? 'ISS access required' :
                   gap.exposure.includes('Radiation') ? 'Radiation facility' : 'Ground-based simulation';
  const team = gap.organism === 'Homo sapiens' ? '5-8 researchers + clinical staff' : '3-5 researchers';

  return {
    gap,
    rationale: gap.rationale,
    citations,
    expectedOutcomes,
    risks,
    requiredResources: {
      duration,
      hardware,
      team,
      estimatedCost: gap.cost
    }
  };
}
