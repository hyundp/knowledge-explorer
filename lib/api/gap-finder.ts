import { GapAnalysis, GapCell, Paper } from '@/lib/types';
import { getPapers } from './data';

// Pattern definitions for extraction
const organismPatterns: Record<string, RegExp> = {
  'Homo sapiens': /\bhomo\s+sapiens\b|\bhuman\b|\bpatient\b|\bparticipant\b|\bastronaut\b/gi,
  'Mus musculus': /\bmus\s+musculus\b|\bmice\b|\bmouse\b|\bmurine\b/gi,
  'Bacteria (general)': /\bbacteria\b|\bbacterial\b|\bmicrob\b/gi,
  'Arabidopsis thaliana': /\barabidopsis\s+thaliana\b|\barabidopsis\b|\ba\.\s?thaliana\b/gi,
  'Rattus norvegicus': /\brattus\s+norvegicus\b|\brats?\b|\brattus\b/gi,
  'Caenorhabditis elegans': /\bc\.\s?elegans\b|\bcaenorhabditis\s+elegans\b|\bcaenorhabditis\b|\bnematode\b/gi,
  'Drosophila melanogaster': /\bdrosophila\s+melanogaster\b|\bdrosophila\b|\bfruit\s+fl(y|ies)\b/gi,
  'Saccharomyces cerevisiae': /\bsaccharomyces\s+cerevisiae\b|\byeast\b|\bs\.\s?cerevisiae\b|\bsaccharomyces\b/gi,
  'Escherichia coli': /\be\.\s?coli\b|\bescherichia\s+coli\b/gi,
  'Danio rerio': /\bdanio\s+rerio\b|\bzebrafish\b/gi
};

const tissuePatterns: Record<string, RegExp> = {
  'Blood': /\bblood\b|\bplasma\b|\bserum\b/gi,
  'Bone': /\bbone\b(?!\s+marrow)/gi,
  'Muscle': /\bmuscle\b|\bmuscular\b|\bskeletal\s+muscle\b/gi,
  'Brain': /\bbrain\b|\bcerebral\b|\bneural\b|\bneuronal\b/gi,
  'Heart': /\bheart\b|\bcardiac\b|\bcardiovascular\b/gi,
  'Bone marrow': /\bbone\s+marrow\b/gi,
  'Liver': /\bliver\b|\bhepatic\b/gi,
  'Eye/Retina': /\beye\b|\bretina\b|\bocular\b|\bvisual\b/gi,
  'Skin': /\bskin\b|\bdermis\b|\bepidermis\b/gi,
  'Lung': /\blung\b|\bpulmonary\b/gi,
  'Kidney': /\bkidney\b|\brenal\b/gi
};

const exposurePatterns: Record<string, RegExp> = {
  'Spaceflight': /\bspaceflight\b|\bspace\s+flight\b|\biss\b|\binternational\s+space\s+station\b|\bspace\s+mission\b/gi,
  'Microgravity': /\bmicrogravity\b|\bweightlessness\b|\b0g\b|\bzero\s+gravity\b|\bzero-g\b/gi,
  'Radiation': /\bradiation\b|\bcosmic\s+ray\b|\bgalactic\s+cosmic\b|\bsolar\s+particle\b|\birradiat/gi,
  'Simulated microgravity': /\bsimulated\s+microgravity\b|\bclinostat\b|\brandom\s+positioning\b|\bhindlimb\s+unloading\b|\bhls\b|\bbed\s+rest\b/gi,
  'Hypergravity': /\bhypergravity\b|\bcentrifuge\b|\b[2-9]g\b|\bhigh\s+gravity\b/gi
};

const studyTypePatterns: Record<string, RegExp> = {
  'Histology/Imaging': /\bhistolog\w+\b|\bimmunohistochemistry\b|\bmicroscop\w+\b|\bimaging\b/gi,
  'Transcriptomics/RNA-seq': /\btranscriptom\w+\b|\brna.?seq\b|\bgene\s+expression\s+profil\w+\b|\bmicroarray\b/gi,
  'Genomics/Sequencing': /\bgenomics\b|\bwhole\s+genome\s+sequenc\w+\b|\bgenome.?wide\b/gi,
  'Cell culture': /\bcell\s+culture\b|\bin\s+vitro\b|\bcultured\s+cells\b/gi,
  'Proteomics': /\bproteom\w+\b|\bprotein\s+profil\w+\b|\bmass\s+spectrometry\b/gi,
  'In vivo': /\bin\s+vivo\b|\banimal\s+stud\w+\b/gi,
  'Metabolomics': /\bmetabolom\w+\b|\bmetabolit\w+\s+profil\w+\b/gi,
  'Behavioral study': /\bbehavior\w*\s+(test|stud|analys|assessment)\b|\bopen\s+field\b|\bwater\s+maze\b|\belevated\s+plus\s+maze\b/gi
};

const missionPatterns: Record<string, RegExp> = {
  'ISS (International Space Station)': /\biss\b|\binternational\s+space\s+station\b/gi,
  'Ground-based analog': /\bclinostat\b|\brandom\s+positioning\b|\bhindlimb\s+unload\w+\b|\bbed\s+rest\b|\bhead.?down\s+tilt\b/gi,
  'Space Shuttle': /\bspace\s+shuttle\b|\bsts.?\d+\b/gi,
  'Sounding rocket': /\bsounding\s+rocket\b|\bsuborbital\b/gi,
  'Parabolic flight': /\bparabolic\s+flight\b|\bzero.?g\s+aircraft\b/gi
};

/**
 * Extract the primary organism from paper text (only one)
 */
function extractPrimaryOrganism(text: string): string | null {
  for (const [organism, pattern] of Object.entries(organismPatterns)) {
    if (pattern.test(text)) {
      return organism;
    }
  }
  return null;
}

/**
 * Extract the primary tissue from paper text (only one)
 */
function extractPrimaryTissue(text: string): string | null {
  for (const [tissue, pattern] of Object.entries(tissuePatterns)) {
    if (pattern.test(text)) {
      return tissue;
    }
  }
  return null;
}

/**
 * Extract the primary exposure from paper text (only one)
 */
function extractPrimaryExposure(text: string): string | null {
  for (const [exposure, pattern] of Object.entries(exposurePatterns)) {
    if (pattern.test(text)) {
      return exposure;
    }
  }
  return null;
}

/**
 * Calculate publication age category based on paper year
 */
function calculatePublicationAge(paper: Paper): string {
  const currentYear = new Date().getFullYear();
  const paperYear = parseInt(paper.year);
  const yearsSincePublication = currentYear - paperYear;

  // Year-based categorization (since we only have year, not exact date)
  if (yearsSincePublication === 0) {
    // Same year - could be 0-11 months, put in 1-6 months category
    return '1-6 months';
  } else if (yearsSincePublication === 1) {
    // 1 year ago - 6-12 months or 1-3 years, put in 6-12 months
    return '6-12 months';
  } else if (yearsSincePublication >= 2 && yearsSincePublication <= 3) {
    return '1-3 years';
  } else {
    return '3+ years';
  }
}

/**
 * Extract the primary study type from paper text (only one)
 */
function extractPrimaryStudyType(text: string): string | null {
  for (const [studyType, pattern] of Object.entries(studyTypePatterns)) {
    if (pattern.test(text)) {
      return studyType;
    }
  }
  return null;
}

/**
 * Extract the primary mission from paper text (only one)
 */
function extractPrimaryMission(text: string): string | null {
  for (const [mission, pattern] of Object.entries(missionPatterns)) {
    if (pattern.test(text)) {
      return mission;
    }
  }
  return null;
}

/**
 * Calculate evidence strength for a paper
 */
function calculateEvidenceStrength(paper: Paper): number {
  const text = `${paper.title} ${paper.sections.abstract}`.toLowerCase();

  let score = 0.5; // Base score

  // Increase score for certain keywords
  if (text.includes('randomized') || text.includes('controlled trial')) score += 0.3;
  if (text.includes('meta-analysis') || text.includes('systematic review')) score += 0.4;
  if (text.includes('longitudinal') || text.includes('prospective')) score += 0.2;
  if (text.includes('placebo')) score += 0.1;

  // Check for statistical significance
  if (text.includes('p <') || text.includes('p<') || text.includes('p =')) score += 0.1;
  if (text.includes('significant')) score += 0.1;

  // Cap at 1.0
  return Math.min(score, 1.0);
}

/**
 * Get gap analysis with optional filters
 */
export async function getGapAnalysis(
  filters?: {
    organism?: string;
    tissue?: string;
    exposure?: string;
    duration?: string;
    studyType?: string;
    mission?: string;
    type?: string; // Type determines which dimension to show (organism, tissue, exposure, study, mission)
  }
): Promise<GapAnalysis> {
  const papers = await getPapers();
  const type = filters?.type || 'organism'; // Default to organism

  // Create a map to store combinations
  const cellMap = new Map<string, {
    organism: string;
    tissue: string;
    exposure: string;
    duration: string;
    pmcids: string[];
    evidence_scores: number[];
  }>();

  // Process each paper - extract only ONE primary combination per paper
  for (const paper of papers) {
    const text = `${paper.title} ${paper.sections.abstract}`;

    const organism = extractPrimaryOrganism(text);
    const tissue = extractPrimaryTissue(text);
    const exposure = extractPrimaryExposure(text);
    const studyType = extractPrimaryStudyType(text);
    const mission = extractPrimaryMission(text);
    const publicationAge = calculatePublicationAge(paper);
    const evidenceScore = calculateEvidenceStrength(paper);

    // Determine what value to show based on type
    let primaryValue: string | null = null;
    switch (type) {
      case 'organism':
        primaryValue = organism;
        break;
      case 'tissue':
        primaryValue = tissue;
        break;
      case 'exposure':
        primaryValue = exposure;
        break;
      case 'study':
        primaryValue = studyType;
        break;
      case 'mission':
        primaryValue = mission;
        break;
      default:
        primaryValue = organism;
    }

    // Skip papers that don't have the primary value
    if (!primaryValue) {
      continue;
    }

    // Create key for this combination (primaryValue x publicationAge)
    const key = `${primaryValue}|${publicationAge}`;

    if (!cellMap.has(key)) {
      cellMap.set(key, {
        organism: primaryValue,
        tissue: primaryValue,
        exposure: primaryValue,
        duration: publicationAge,
        pmcids: [],
        evidence_scores: []
      });
    }

    const cell = cellMap.get(key)!;
    if (!cell.pmcids.includes(paper.pmcid)) {
      cell.pmcids.push(paper.pmcid);
      cell.evidence_scores.push(evidenceScore);
    }
  }

  // Convert map to array
  let cells: GapCell[] = Array.from(cellMap.values()).map(cell => ({
    organism: cell.organism,
    tissue: cell.tissue,
    exposure: cell.exposure,
    duration: cell.duration,
    study_count: cell.pmcids.length,
    avg_evidence_strength: cell.evidence_scores.reduce((a, b) => a + b, 0) / cell.evidence_scores.length,
    pmcids: cell.pmcids
  }));

  // Calculate total cells before filtering
  const totalCells = cellMap.size;

  return {
    cells,
    metadata: {
      total_cells: totalCells,
      coverage: totalCells > 0 ? cells.length / totalCells : 0
    }
  };
}
