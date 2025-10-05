/**
 * Static Data API Client
 *
 * Loads data from static JSON files instead of calling a backend API.
 * Perfect for Vercel deployment without needing a separate backend server.
 */

import type { KGGraph, KGNode, Paper } from '../types';

const BASE_PATH = '/data/neo4j';

/**
 * Fetch static JSON file
 */
async function fetchJSON<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_PATH}/${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get knowledge graph overview
 */
export async function getKnowledgeGraphStatic(params?: {
  centerNode?: string;
  depth?: number;
  limit?: number;
}): Promise<KGGraph> {
  try {
    // If center node specified, load that subgraph
    if (params?.centerNode) {
      const pmcid = params.centerNode.toUpperCase();
      try {
        const subgraph = await fetchJSON<KGGraph>(`subgraphs/${pmcid}.json`);
        return {
          nodes: subgraph.nodes || [],
          edges: subgraph.edges || []
        };
      } catch (e) {
        console.warn(`Subgraph not found for ${pmcid}, loading overview`);
        // Fall through to overview
      }
    }

    // Load full overview
    const overview = await fetchJSON<KGGraph>('graph_overview.json');

    // Apply limit to Paper nodes only (default: 7 papers)
    const paperLimit = params?.limit || 7;

    // Separate papers and other nodes
    const paperNodes = (overview.nodes || []).filter(n => n.type === 'Paper');
    const otherNodes = (overview.nodes || []).filter(n => n.type !== 'Paper');

    // Limit papers
    const limitedPapers = paperNodes.slice(0, paperLimit);
    const paperIds = new Set(limitedPapers.map(n => n.id));

    // Find all edges connected to these papers
    const connectedEdges = (overview.edges || []).filter(e =>
      paperIds.has(e.source) || paperIds.has(e.target)
    );

    // Find all nodes connected to these papers (Phenotypes, etc.)
    const connectedNodeIds = new Set<string>();
    connectedEdges.forEach(e => {
      connectedNodeIds.add(e.source);
      connectedNodeIds.add(e.target);
    });

    // Get all connected nodes
    const connectedNodes = otherNodes.filter(n => connectedNodeIds.has(n.id));

    // Combine papers and connected nodes
    const finalNodes = [...limitedPapers, ...connectedNodes];

    return {
      nodes: finalNodes,
      edges: connectedEdges
    };
  } catch (error) {
    console.error('Failed to load graph data:', error);
    return { nodes: [], edges: [] };
  }
}

/**
 * Get all papers
 */
export async function getPapersStatic(): Promise<Record<string, Paper>> {
  try {
    return await fetchJSON<Record<string, Paper>>('papers.json');
  } catch (error) {
    console.error('Failed to load papers:', error);
    return {};
  }
}

/**
 * Get single paper by PMCID
 */
export async function getPaperStatic(pmcid: string): Promise<Paper | null> {
  try {
    const papers = await getPapersStatic();
    return papers[pmcid.toUpperCase()] || null;
  } catch (error) {
    console.error(`Failed to load paper ${pmcid}:`, error);
    return null;
  }
}

/**
 * Get consensus data
 */
export async function getConsensusStatic(): Promise<any[]> {
  try {
    return await fetchJSON<any[]>('consensus.json');
  } catch (error) {
    console.error('Failed to load consensus data:', error);
    return [];
  }
}

/**
 * Get database statistics
 */
export async function getStatisticsStatic(): Promise<{
  node_counts: Record<string, number>;
  relationship_counts: Record<string, number>;
  total_nodes: number;
  total_relationships: number;
}> {
  try {
    return await fetchJSON('statistics.json');
  } catch (error) {
    console.error('Failed to load statistics:', error);
    return {
      node_counts: {},
      relationship_counts: {},
      total_nodes: 0,
      total_relationships: 0
    };
  }
}

/**
 * Static API Client (drop-in replacement for apiClient)
 */
export const staticAPI = {
  getKnowledgeGraph: getKnowledgeGraphStatic,
  getPapers: getPapersStatic,
  getPaper: getPaperStatic,
  getConsensus: getConsensusStatic,
  getStatistics: getStatisticsStatic,
};

export default staticAPI;
