import type {
  Paper,
  Finding,
  GapAnalysis,
  Consensus,
  KGGraph,
  SearchResult,
  ExternalContent,
} from "../types";

/**
 * Real API client that calls the FastAPI backend through Next.js API routes
 */
export const apiClient = {
  /**
   * Get knowledge graph data from Neo4j
   */
  async getKnowledgeGraph(params?: {
    centerNode?: string;
    depth?: number;
    limit?: number;
  }): Promise<KGGraph> {
    const queryParams = new URLSearchParams();

    if (params?.centerNode) {
      queryParams.append('center_node', params.centerNode);
    }
    if (params?.depth) {
      queryParams.append('depth', params.depth.toString());
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }

    const url = `/api/kg/graph${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      console.error('API error:', error);

      // Return empty graph on error
      return {
        nodes: [],
        edges: [],
      };
    }

    const data = await response.json();

    // Transform backend response to match our KGGraph type
    return {
      nodes: data.nodes || [],
      edges: data.edges || [],
    };
  },

  /**
   * Get paper details by PMCID from Neo4j
   */
  async getPaper(pmcid: string): Promise<Paper | null> {
    const response = await fetch(`/api/papers/${pmcid}`);

    if (!response.ok) {
      return null;
    }

    return response.json();
  },

  /**
   * Get papers from normalized directory
   */
  async getPapers(limit: number = 20): Promise<Paper[]> {
    const response = await fetch(`/api/papers?limit=${limit}`);

    if (!response.ok) {
      return [];
    }

    return response.json();
  },

  /**
   * Search papers
   */
  async search(query: string, k: number = 10): Promise<SearchResult> {
    // This would call the FastAPI /search endpoint
    // For now, use the existing papers search
    const response = await fetch(`/api/papers?query=${encodeURIComponent(query)}`);

    if (!response.ok) {
      return {
        query,
        results: [],
        num_results: 0,
      };
    }

    const papers = await response.json();

    return {
      query,
      results: papers.map((paper: Paper) => ({
        pmcid: paper.pmcid,
        title: paper.title,
        text: paper.sections.abstract || '',
        score: 1.0,
        section: 'abstract' as const,
      })),
      num_results: papers.length,
    };
  },

  /**
   * Get gap analysis from Neo4j
   */
  async getGapAnalysis(params?: {
    organism?: string;
    exposure?: string;
    duration_min?: number;
    duration_max?: number;
  }): Promise<GapAnalysis> {
    const queryParams = new URLSearchParams();

    if (params?.organism) {
      queryParams.append('organism', params.organism);
    }
    if (params?.exposure) {
      queryParams.append('exposure', params.exposure);
    }

    const url = `/api/gap-finder${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url);

    if (!response.ok) {
      return {
        cells: [],
        metadata: {
          total_cells: 0,
          coverage: 0,
        },
      };
    }

    return response.json();
  },

  /**
   * Get consensus analysis from Neo4j
   */
  async getConsensus(phenotypeId: string): Promise<Consensus> {
    const response = await fetch(`/api/consensus?phenotype=${encodeURIComponent(phenotypeId)}`);

    if (!response.ok) {
      return {
        phenotype: phenotypeId,
        total_studies: 0,
        consensus_score: 0,
        dominant_direction: 'no_change',
        findings_by_direction: {},
      };
    }

    return response.json();
  },

  /**
   * Get external content
   */
  async getExternalContent(): Promise<ExternalContent[]> {
    const response = await fetch('/api/external');

    if (!response.ok) {
      return [];
    }

    return response.json();
  },

  /**
   * Get findings (from file system or Neo4j)
   */
  async getFindings(pmcid?: string): Promise<Finding[]> {
    // This would need to be implemented based on your data structure
    // For now, return empty array
    return [];
  },

  /**
   * Get node neighbors in knowledge graph
   */
  async getNodeNeighbors(nodeId: string): Promise<KGGraph> {
    return this.getKnowledgeGraph({
      centerNode: nodeId,
      depth: 2,
      limit: 50,
    });
  },
};

export default apiClient;
