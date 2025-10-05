import { Paper, ExternalContent } from '@/lib/types';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);

// Base path to data directory - now in public/data for Vercel deployment
// This makes data accessible both at build time and runtime
const DATA_BASE_PATH = path.resolve(process.cwd(), 'public', 'data');

/**
 * Read NDJSON file and parse each line as JSON
 */
async function readNDJSON<T>(filePath: string): Promise<T[]> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    return lines.map(line => JSON.parse(line));
  } catch (error) {
    console.error(`Error reading NDJSON file ${filePath}:`, error);
    return [];
  }
}

/**
 * Get external content (news, explainers, newsletters)
 */
export async function getExternalContent(): Promise<ExternalContent[]> {
  const newsPath = path.join(DATA_BASE_PATH, 'external/news.ndjson');
  const explainersPath = path.join(DATA_BASE_PATH, 'external/explainers.ndjson');
  const newslettersPath = path.join(DATA_BASE_PATH, 'external/newsletters.ndjson');

  const [news, explainers, newsletters] = await Promise.all([
    readNDJSON<ExternalContent>(newsPath),
    readNDJSON<ExternalContent>(explainersPath),
    readNDJSON<ExternalContent>(newslettersPath),
  ]);

  // Combine all content and sort by date
  const allContent = [...news, ...explainers, ...newsletters];
  return allContent.sort((a, b) =>
    new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
}

/**
 * Get papers from normalized directory
 */
export async function getPapers(limit?: number): Promise<Paper[]> {
  const normalizedPath = path.join(DATA_BASE_PATH, 'normalized');

  try {
    // Get all PMCID directories
    const pmcids = await readdir(normalizedPath);

    // Read papers (with optional limit)
    const papersToRead = limit ? pmcids.slice(0, limit) : pmcids;

    const papers = await Promise.all(
      papersToRead.map(async (pmcid) => {
        const paperPath = path.join(normalizedPath, pmcid, 'normalized.json');
        try {
          const content = await readFile(paperPath, 'utf-8');
          const paperData = JSON.parse(content);

          // Transform to match Paper type structure
          return {
            pmcid: paperData.pmcid,
            title: paperData.title,
            authors: paperData.authors,
            year: Number(paperData.year),
            journal: paperData.journal,
            doi: paperData.doi,
            sections: paperData.sections,
            provenance: paperData.provenance,
          } as Paper;
        } catch (error) {
          console.error(`Error reading paper ${pmcid}:`, error);
          return null;
        }
      })
    );

    // Filter out any failed reads and sort by year
    return papers
      .filter((p): p is Paper => p !== null)
      .sort((a, b) => b.year - a.year);

  } catch (error) {
    console.error('Error reading papers:', error);
    return [];
  }
}

/**
 * Search papers using TF-IDF (Term Frequency-Inverse Document Frequency) algorithm
 */
export async function searchPapers(query: string): Promise<Paper[]> {
  const papers = await getPapers();

  // Common English stopwords (words that appear too frequently to be useful)
  const stopwords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'were', 'will', 'with', 'what', 'when', 'where', 'who',
    'which', 'why', 'how', 'can', 'could', 'do', 'does', 'did', 'have',
    'had', 'may', 'might', 'must', 'shall', 'should', 'would', 'this',
    'these', 'those', 'then', 'than', 'such', 'been', 'being', 'but',
    'not', 'only', 'own', 'same', 'so', 'some', 'or', 'other', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down',
    'out', 'off', 'over', 'under', 'again', 'further', 'once'
  ]);

  // Tokenize and clean query
  const tokens = query.toLowerCase()
    .split(/\s+/)
    .filter(t => t.length > 2) // Only keep words longer than 2 characters
    .filter(t => !stopwords.has(t)); // Remove stopwords

  if (tokens.length === 0) return [];

  // Calculate IDF (Inverse Document Frequency) for each token
  const idf: Record<string, number> = {};
  const totalDocs = papers.length;

  tokens.forEach(token => {
    // Count how many documents contain this token
    const docsWithToken = papers.filter(paper => {
      const searchableText = `
        ${paper.title}
        ${paper.authors.join(' ')}
        ${paper.sections.abstract}
        ${paper.journal}
      `.toLowerCase();

      return searchableText.includes(token);
    }).length;

    // IDF = log(total documents / documents containing token)
    // Higher IDF = rarer word = more important
    if (docsWithToken > 0) {
      idf[token] = Math.log(totalDocs / docsWithToken);
    } else {
      idf[token] = 0;
    }
  });

  // Calculate TF-IDF score for each paper
  const scoredPapers = papers.map(paper => {
    let score = 0;

    const searchableText = `
      ${paper.title}
      ${paper.authors.join(' ')}
      ${paper.sections.abstract}
      ${paper.journal}
    `.toLowerCase();

    // Also create version without spaces for compound word matching
    const searchableTextNoSpaces = searchableText.replace(/\s+/g, '');

    tokens.forEach(token => {
      // Calculate TF (Term Frequency) - how many times token appears
      const regex = new RegExp(token, 'gi');
      const matches = searchableText.match(regex);
      const tf = matches ? matches.length : 0;

      // TF-IDF = TF * IDF
      const tfidf = tf * (idf[token] || 0);

      // Boost score if token appears in title (more important)
      const titleBoost = paper.title.toLowerCase().includes(token) ? 2 : 1;

      score += tfidf * titleBoost;

      // Also check compound words (lower weight)
      const tokenNoSpaces = token.replace(/\s+/g, '');
      if (tokenNoSpaces.length > 2 && searchableTextNoSpaces.includes(tokenNoSpaces)) {
        score += 0.5 * (idf[token] || 0);
      }
    });

    return { paper, score };
  });

  // Calculate minimum score threshold (adaptive based on top scores)
  const scores = scoredPapers.map(p => p.score).filter(s => s > 0).sort((a, b) => b - a);

  // If no results, return empty
  if (scores.length === 0) return [];

  // Use 50% of the top score as minimum threshold, or at least require some relevance
  const topScore = scores[0];
  const minThreshold = Math.max(topScore * 0.5, 2.0);

  // Filter papers with meaningful scores and sort by relevance
  return scoredPapers
    .filter(({ score }) => score >= minThreshold)
    .sort((a, b) => b.score - a.score)
    .map(({ paper }) => paper);
}

/**
 * Get a single paper by PMCID
 */
export async function getPaperById(pmcid: string): Promise<Paper | null> {
  const paperPath = path.join(DATA_BASE_PATH, 'normalized', pmcid, 'normalized.json');

  try {
    const content = await readFile(paperPath, 'utf-8');
    const paperData = JSON.parse(content);

    return {
      pmcid: paperData.pmcid,
      title: paperData.title,
      authors: paperData.authors,
      year: Number(paperData.year),
      journal: paperData.journal,
      doi: paperData.doi,
      sections: paperData.sections,
      provenance: paperData.provenance,
    } as Paper;
  } catch (error) {
    console.error(`Error reading paper ${pmcid}:`, error);
    return null;
  }
}