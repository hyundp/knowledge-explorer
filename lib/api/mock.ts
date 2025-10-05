import type {
  Paper,
  Finding,
  GapAnalysis,
  Consensus,
  KGGraph,
  SearchResult,
  ExternalContent,
} from "../types";
import {
  mockPapers,
  mockFindings,
  mockGapAnalysis,
  mockConsensus,
  mockKnowledgeGraph,
  generateSearchResults,
  generateConsensusData,
  generateKnowledgeGraph,
  generateExternalContent,
} from "../mockData";

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  // Paper endpoints
  async getPapers(limit: number = 20): Promise<Paper[]> {
    await delay(300);
    return mockPapers.slice(0, limit);
  },

  async getPaper(pmcid: string): Promise<Paper | null> {
    await delay(200);
    return mockPapers.find((p) => p.pmcid === pmcid) || null;
  },

  // Finding endpoints
  async getFindings(pmcid?: string): Promise<Finding[]> {
    await delay(300);
    if (pmcid) {
      return mockFindings.filter((f) => f.pmcid === pmcid);
    }
    return mockFindings;
  },

  async getFinding(findingId: string): Promise<Finding | null> {
    await delay(200);
    return mockFindings.find((f) => f.finding_id === findingId) || null;
  },

  // Gap analysis endpoint
  async getGapAnalysis(params?: {
    organism?: string;
    exposure?: string;
    duration_min?: number;
    duration_max?: number;
  }): Promise<GapAnalysis> {
    await delay(500);
    // In real implementation, this would filter based on params
    return mockGapAnalysis;
  },

  // Consensus endpoint
  async getConsensus(phenotypeId: string): Promise<Consensus> {
    await delay(400);
    return generateConsensusData(phenotypeId);
  },

  // Knowledge graph endpoints
  async getKnowledgeGraph(params?: {
    centerNode?: string;
    depth?: number;
    nodeTypes?: string[];
  }): Promise<KGGraph> {
    await delay(500);
    return generateKnowledgeGraph(params?.centerNode);
  },

  async getNodeNeighbors(nodeId: string): Promise<KGGraph> {
    await delay(300);
    return generateKnowledgeGraph(nodeId);
  },

  // Search & RAG endpoints
  async search(query: string, k: number = 10): Promise<SearchResult> {
    await delay(600);
    return generateSearchResults(query);
  },

  // External content endpoints
  async getExternalContent(): Promise<ExternalContent[]> {
    await delay(400);
    return generateExternalContent();
  },
};

export default api;
