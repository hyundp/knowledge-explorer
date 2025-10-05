import { getPapers } from './data';

interface ConsensusParameters {
  organisms: string[];
  tissues: string[];
  exposures: string[];
  studyTypes: string[];
  missions: string[];
  durations: string[];
}

// Common organisms found in space biology research - based on actual paper analysis
const organismPatterns = [
  { pattern: /\bhomo\s+sapiens\b|\bhuman\b|\bpatient\b|\bparticipant\b|\bastronaut\b/gi, name: 'Homo sapiens' },
  { pattern: /\bmus\s+musculus\b|\bmice\b|\bmouse\b|\bmurine\b/gi, name: 'Mus musculus' },
  { pattern: /\bbacteria\b|\bbacterial\b|\bmicrob\b/gi, name: 'Bacteria (general)' },
  { pattern: /\barabidopsis\s+thaliana\b|\barabidopsis\b|\ba\.\s?thaliana\b/gi, name: 'Arabidopsis thaliana' },
  { pattern: /\bfung(i|al|us)\b/gi, name: 'Fungi (general)' },
  { pattern: /\brattus\s+norvegicus\b|\brats?\b|\brattus\b/gi, name: 'Rattus norvegicus' },
  { pattern: /\bc\.\s?elegans\b|\bcaenorhabditis\s+elegans\b|\bcaenorhabditis\b|\bnematode\b/gi, name: 'Caenorhabditis elegans' },
  { pattern: /\bdrosophila\s+melanogaster\b|\bdrosophila\b|\bfruit\s+fl(y|ies)\b/gi, name: 'Drosophila melanogaster' },
  { pattern: /\bsaccharomyces\s+cerevisiae\b|\byeast\b|\bs\.\s?cerevisiae\b|\bsaccharomyces\b/gi, name: 'Saccharomyces cerevisiae' },
  { pattern: /\bpseudomon\w+\b/gi, name: 'Pseudomonas' },
  { pattern: /\bstaphylococcus\b|\bs\.\s?aureus\b/gi, name: 'Staphylococcus' },
  { pattern: /\bsalmonella\b/gi, name: 'Salmonella' },
  { pattern: /\bbacillus\s+subtilis\b|\bb\.\s?subtilis\b/gi, name: 'Bacillus subtilis' },
  { pattern: /\be\.\s?coli\b|\bescherichia\s+coli\b/gi, name: 'Escherichia coli' },
  { pattern: /\bdanio\s+rerio\b|\bzebrafish\b/gi, name: 'Danio rerio' },
  { pattern: /\bchlamydomonas\b/gi, name: 'Chlamydomonas' },
  { pattern: /\balgae\b|\balga\b/gi, name: 'Algae' }
];

// Common tissues in space biology research - based on actual paper analysis
const tissuePatterns = [
  { pattern: /\bblood\b|\bplasma\b|\bserum\b/gi, name: 'Blood' },
  { pattern: /\bbone\b(?!\s+marrow)/gi, name: 'Bone' },
  { pattern: /\bmuscle\b|\bmuscular\b|\bskeletal\s+muscle\b/gi, name: 'Muscle' },
  { pattern: /\broot\b|\brootlet\b/gi, name: 'Root' },
  { pattern: /\bstem\b|\bshoot\b/gi, name: 'Stem' },
  { pattern: /\bbrain\b|\bcerebral\b|\bneural\b|\bneuronal\b/gi, name: 'Brain' },
  { pattern: /\bheart\b|\bcardiac\b|\bcardiovascular\b/gi, name: 'Heart' },
  { pattern: /\bbone\s+marrow\b/gi, name: 'Bone marrow' },
  { pattern: /\bliver\b|\bhepatic\b/gi, name: 'Liver' },
  { pattern: /\bintestin\w+\b|\bgut\b|\bcolon\b|\bintestinal\b/gi, name: 'Intestine/Gut' },
  { pattern: /\beye\b|\bretina\b|\bocular\b|\bvisual\b/gi, name: 'Eye/Retina' },
  { pattern: /\bskin\b|\bdermis\b|\bepidermis\b/gi, name: 'Skin' },
  { pattern: /\bspleen\b|\bsplenic\b/gi, name: 'Spleen' },
  { pattern: /\blung\b|\bpulmonary\b/gi, name: 'Lung' },
  { pattern: /\bleaf\b|\bleaves\b|\bfoliar\b/gi, name: 'Leaf' },
  { pattern: /\bseedling\b/gi, name: 'Seedling' },
  { pattern: /\bkidney\b|\brenal\b/gi, name: 'Kidney' },
  { pattern: /\bthymus\b|\bthymic\b/gi, name: 'Thymus' },
  { pattern: /\blymph\s+node\b|\blymphatic\b/gi, name: 'Lymph node' }
];

// Common exposure types in space biology - based on actual paper analysis
const exposurePatterns = [
  { pattern: /\bspaceflight\b|\bspace\s+flight\b|\bspace\s+mission\b/gi, name: 'Spaceflight' },
  { pattern: /\bmicrogravity\b|\bweightlessness\b|\b0g\b|\bzero\s+gravity\b|\bzero-g\b/gi, name: 'Microgravity' },
  { pattern: /\bradiation\b|\bcosmic\s+ray\b|\bgalactic\s+cosmic\b|\bsolar\s+particle\b|\birradiat/gi, name: 'Radiation' },
  { pattern: /\bsimulated\s+microgravity\b|\bclinostat\b|\brandom\s+positioning\b|\bhindlimb\s+unloading\b|\bhls\b|\bbed\s+rest\b/gi, name: 'Simulated microgravity' },
  { pattern: /\bisolation\b|\bconfinement\b|\bclosed\s+environment\b/gi, name: 'Isolation/Confinement' },
  { pattern: /\bhypoxia\b|\bhyperoxia\b|\blow\s+oxygen\b|\bhigh\s+oxygen\b|\bCO2\b|\bcarbon\s+dioxide\b/gi, name: 'Altered atmosphere' },
  { pattern: /\bhypergravity\b|\bcentrifuge\b|\b[2-9]g\b|\bhigh\s+gravity\b/gi, name: 'Hypergravity' },
  { pattern: /\bvibration\b|\bmechanical\s+stress\b/gi, name: 'Vibration' }
];

// Study type/methodology patterns
const studyTypePatterns = [
  { pattern: /\bhistolog\w+\b|\bimmunohistochemistry\b|\bmicroscop\w+\b|\bimaging\b/gi, name: 'Histology/Imaging' },
  { pattern: /\btranscriptom\w+\b|\brna.?seq\b|\bgene\s+expression\s+profil\w+\b|\bmicroarray\b/gi, name: 'Transcriptomics/RNA-seq' },
  { pattern: /\bgenomics\b|\bwhole\s+genome\s+sequenc\w+\b|\bgenome.?wide\b/gi, name: 'Genomics/Sequencing' },
  { pattern: /\bcell\s+culture\b|\bin\s+vitro\b|\bcultured\s+cells\b/gi, name: 'Cell culture' },
  { pattern: /\bproteom\w+\b|\bprotein\s+profil\w+\b|\bmass\s+spectrometry\b/gi, name: 'Proteomics' },
  { pattern: /\bin\s+vivo\b|\banimal\s+stud\w+\b/gi, name: 'In vivo' },
  { pattern: /\bmetabolom\w+\b|\bmetabolit\w+\s+profil\w+\b/gi, name: 'Metabolomics' },
  { pattern: /\bbehavior\w*\s+(test|stud|analys|assessment)\b|\bopen\s+field\b|\bwater\s+maze\b|\belevated\s+plus\s+maze\b/gi, name: 'Behavioral study' }
];

// Mission/Platform patterns
const missionPatterns = [
  { pattern: /\biss\b|\binternational\s+space\s+station\b/gi, name: 'ISS (International Space Station)' },
  { pattern: /\bclinostat\b|\brandom\s+positioning\b|\bhindlimb\s+unload\w+\b|\bbed\s+rest\b|\bhead.?down\s+tilt\b/gi, name: 'Ground-based analog' },
  { pattern: /\bspace\s+shuttle\b|\bsts.?\d+\b/gi, name: 'Space Shuttle' },
  { pattern: /\bsounding\s+rocket\b|\bsuborbital\b/gi, name: 'Sounding rocket' },
  { pattern: /\bparabolic\s+flight\b|\bzero.?g\s+aircraft\b/gi, name: 'Parabolic flight' }
];

// Duration patterns
const durationPatterns = [
  { pattern: /\b\d+\s*(h|hr|hour)s?\b|\bacute\b/gi, name: 'Acute (hours)' },
  { pattern: /\b\d+\s*(d|day)s?\b/gi, name: 'Short-term (days)' },
  { pattern: /\b\d+\s*(m|mo|month)s?\b|\blong.?term\b|\bchronic\b/gi, name: 'Long-term (months+)' },
  { pattern: /\b\d+\s*(w|wk|week)s?\b/gi, name: 'Medium-term (weeks)' }
];

/**
 * Helper functions to extract parameters from text
 */
export function extractOrganisms(text: string): string[] {
  const found: string[] = [];
  organismPatterns.forEach(({ pattern, name }) => {
    if (pattern.test(text)) {
      found.push(name);
    }
  });
  return found;
}

export function extractTissues(text: string): string[] {
  const found: string[] = [];
  tissuePatterns.forEach(({ pattern, name }) => {
    if (pattern.test(text)) {
      found.push(name);
    }
  });
  return found;
}

export function extractExposures(text: string): string[] {
  const found: string[] = [];
  exposurePatterns.forEach(({ pattern, name }) => {
    if (pattern.test(text)) {
      found.push(name);
    }
  });
  return found;
}

export function extractStudyTypes(text: string): string[] {
  const found: string[] = [];
  studyTypePatterns.forEach(({ pattern, name }) => {
    if (pattern.test(text)) {
      found.push(name);
    }
  });
  return found;
}

export function extractMissions(text: string): string[] {
  const found: string[] = [];
  missionPatterns.forEach(({ pattern, name }) => {
    if (pattern.test(text)) {
      found.push(name);
    }
  });
  return found;
}

/**
 * Extract unique parameters from papers
 */
export async function getAvailableParameters(): Promise<ConsensusParameters> {
  const papers = await getPapers();

  const organismsSet = new Set<string>();
  const tissuesSet = new Set<string>();
  const exposuresSet = new Set<string>();
  const studyTypesSet = new Set<string>();
  const missionsSet = new Set<string>();
  const durationsSet = new Set<string>();

  papers.forEach(paper => {
    const text = `${paper.title} ${paper.sections.abstract}`;

    // Extract organisms
    organismPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(text)) {
        organismsSet.add(name);
      }
    });

    // Extract tissues
    tissuePatterns.forEach(({ pattern, name }) => {
      if (pattern.test(text)) {
        tissuesSet.add(name);
      }
    });

    // Extract exposures
    exposurePatterns.forEach(({ pattern, name }) => {
      if (pattern.test(text)) {
        exposuresSet.add(name);
      }
    });

    // Extract study types
    studyTypePatterns.forEach(({ pattern, name }) => {
      if (pattern.test(text)) {
        studyTypesSet.add(name);
      }
    });

    // Extract missions
    missionPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(text)) {
        missionsSet.add(name);
      }
    });

    // Extract durations
    durationPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(text)) {
        durationsSet.add(name);
      }
    });
  });

  // Convert sets to sorted arrays
  const organisms = Array.from(organismsSet).sort();
  const tissues = Array.from(tissuesSet).sort();
  const exposures = Array.from(exposuresSet).sort();
  const studyTypes = Array.from(studyTypesSet).sort();
  const missions = Array.from(missionsSet).sort();
  const durations = Array.from(durationsSet).sort();

  return {
    organisms,
    tissues,
    exposures,
    studyTypes,
    missions,
    durations
  };
}

/**
 * Get counts for each parameter
 */
export async function getParameterCounts(): Promise<{
  organisms: Record<string, number>;
  tissues: Record<string, number>;
  exposures: Record<string, number>;
  studyTypes: Record<string, number>;
  missions: Record<string, number>;
  durations: Record<string, number>;
}> {
  const papers = await getPapers();

  const organismCounts: Record<string, number> = {};
  const tissueCounts: Record<string, number> = {};
  const exposureCounts: Record<string, number> = {};
  const studyTypeCounts: Record<string, number> = {};
  const missionCounts: Record<string, number> = {};
  const durationCounts: Record<string, number> = {};

  papers.forEach(paper => {
    const text = `${paper.title} ${paper.sections.abstract}`;

    // Count organisms
    organismPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(text)) {
        organismCounts[name] = (organismCounts[name] || 0) + 1;
      }
    });

    // Count tissues
    tissuePatterns.forEach(({ pattern, name }) => {
      if (pattern.test(text)) {
        tissueCounts[name] = (tissueCounts[name] || 0) + 1;
      }
    });

    // Count exposures
    exposurePatterns.forEach(({ pattern, name }) => {
      if (pattern.test(text)) {
        exposureCounts[name] = (exposureCounts[name] || 0) + 1;
      }
    });

    // Count study types
    studyTypePatterns.forEach(({ pattern, name }) => {
      if (pattern.test(text)) {
        studyTypeCounts[name] = (studyTypeCounts[name] || 0) + 1;
      }
    });

    // Count missions
    missionPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(text)) {
        missionCounts[name] = (missionCounts[name] || 0) + 1;
      }
    });

    // Count durations
    durationPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(text)) {
        durationCounts[name] = (durationCounts[name] || 0) + 1;
      }
    });
  });

  return {
    organisms: organismCounts,
    tissues: tissueCounts,
    exposures: exposureCounts,
    studyTypes: studyTypeCounts,
    missions: missionCounts,
    durations: durationCounts
  };
}