"use client";

import { useEffect, useState, useMemo } from "react";
import { KnowledgeGraph } from "@/components/KnowledgeGraph";
import type { KGGraph, KGNode, KGEdge } from "@/lib/types";
// Toggle between static data (for Vercel) and API client (for full backend)
import staticAPI from "@/lib/api/static";
const apiClient = staticAPI; // Use static data for Vercel deployment
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, FileJson, RefreshCw, Search, X } from "lucide-react";
import { exportToJSON } from "@/lib/export";
import { useFilterStore } from "@/lib/store/filterStore";

export default function KGExplorerPage() {
  const [graphData, setGraphData] = useState<KGGraph | null>(null);
  const [selectedNode, setSelectedNode] = useState<KGNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [centerNode, setCenterNode] = useState<string | undefined>(undefined);
  const [nodeLimit, setNodeLimit] = useState<number>(7); // Number of papers to show

  const {
    yearRange,
    minSampleSize,
  } = useFilterStore();

  // Load knowledge graph from real API
  const loadGraph = async (centerNodeId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getKnowledgeGraph({
        centerNode: centerNodeId,
        limit: centerNodeId ? 50 : nodeLimit, // Use dynamic limit
        depth: 2,
      });
      setGraphData(data);
    } catch (err) {
      console.error('Error loading knowledge graph:', err);
      setError(err instanceof Error ? err.message : 'Failed to load graph');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGraph(centerNode);
  }, [centerNode, nodeLimit]);

  // Handle search
  const handleSearch = () => {
    const trimmed = searchQuery.trim().toUpperCase();
    if (trimmed) {
      // Ensure PMCID format (add PMC prefix if not present)
      const pmcid = trimmed.startsWith('PMC') ? trimmed : `PMC${trimmed}`;
      setCenterNode(pmcid);
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery("");
    setCenterNode(undefined);
  };

  // Handle Enter key in search input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Apply filters to graph data
  const filteredGraph = useMemo(() => {
    if (!graphData) return null;

    // For now, return all nodes and edges since we don't have specific filters
    // In the future, we could filter based on paper years if nodes have year metadata
    return {
      nodes: graphData.nodes,
      edges: graphData.edges,
    };
  }, [graphData]);

  const handleNodeClick = (node: KGNode) => {
    setSelectedNode(node);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--earth-blue)]" />
          <div className="mt-4 text-lg font-mono text-[var(--earth-blue)]">LOADING KNOWLEDGE GRAPH...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-mono text-red-400">ERROR LOADING GRAPH</div>
          <div className="mt-2 text-sm text-[var(--lunar-gray)]">{error}</div>
          <Button onClick={() => loadGraph(centerNode)} className="mt-4 mission-button">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!graphData || !filteredGraph || filteredGraph.nodes.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-mono text-[var(--lunar-gray)]">NO GRAPH DATA AVAILABLE</div>
          <div className="mt-2 text-sm text-[var(--lunar-gray)]">
            Ensure Neo4j is running and data has been loaded.
          </div>
          <Button onClick={() => loadGraph(centerNode)} className="mt-4 mission-button">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="mission-header text-3xl font-bold tracking-wider text-white">
              <span className="text-[var(--earth-blue)]">KNOWLEDGE GRAPH</span> EXPLORER
            </h1>
          </div>

          {/* Export and Refresh Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadGraph(centerNode)}
              className="mission-button"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToJSON(filteredGraph, "knowledge-graph.json")}
              className="mission-button"
            >
              <FileJson className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--lunar-gray)]" />
            <Input
              type="text"
              placeholder="Search by PMCID (e.g., PMC4494396 or 4494396)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 bg-[rgba(11,14,19,0.8)] border-[rgba(0,180,216,0.3)] text-white placeholder:text-[var(--lunar-gray)] focus:border-[var(--earth-blue)]"
            />
          </div>
          <Button
            onClick={handleSearch}
            className="mission-button"
            disabled={!searchQuery.trim()}
          >
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
          {!centerNode && nodeLimit < 50 && (
            <Button
              variant="outline"
              onClick={() => setNodeLimit(prev => Math.min(prev + 7, 50))}
              className="mission-button"
            >
              Load More Papers ({nodeLimit}/50)
            </Button>
          )}
          {centerNode && (
            <Button
              variant="outline"
              onClick={handleClearSearch}
              className="mission-button"
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Search indicator */}
        {centerNode && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-[var(--earth-blue)] font-mono">Showing graph for:</span>
            <span className="text-[var(--solar-gold)] font-mono font-bold">{centerNode}</span>
          </div>
        )}
      </div>

      {/* Graph Visualization */}
      <div className="mb-4 h-[600px] rounded-lg border-2 border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,1)] p-2 shadow-[0_0_30px_rgba(0,180,216,0.1)]">
        <KnowledgeGraph data={filteredGraph} onNodeClick={handleNodeClick} />
      </div>

      {/* Node Details and Stats Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Node Details Panel */}
        <div className="lg:col-span-2">
          <Card className="border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,1)] shadow-[0_0_20px_rgba(0,180,216,0.1)]">
            <CardHeader className="border-b border-[rgba(0,180,216,0.2)]">
              <CardTitle className="text-[var(--earth-blue)] font-mono tracking-wider">NODE DETAILS</CardTitle>
              <CardDescription className="text-[var(--solar-gold)]">
                {selectedNode ? `${selectedNode.type}: ${selectedNode.label}` : "Select a node to view details"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {selectedNode ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded border border-[rgba(0,180,216,0.2)] bg-[rgba(0,180,216,0.05)] p-3">
                      <h3 className="text-xs font-mono text-[var(--earth-blue)] tracking-wider">TYPE</h3>
                      <p className="mt-1 text-lg font-bold text-white">{selectedNode.type}</p>
                    </div>
                    <div className="rounded border border-[rgba(0,180,216,0.2)] bg-[rgba(0,180,216,0.05)] p-3">
                      <h3 className="text-xs font-mono text-[var(--earth-blue)] tracking-wider">LABEL</h3>
                      <p className="mt-1 text-lg font-bold text-white">{selectedNode.label}</p>
                    </div>
                  </div>
                  <div className="rounded border border-[rgba(0,180,216,0.2)] bg-[rgba(0,180,216,0.05)] p-3">
                    <h3 className="text-xs font-mono text-[var(--earth-blue)] tracking-wider">NODE ID</h3>
                    <p className="mt-1 font-mono text-sm text-[var(--solar-gold)]">{selectedNode.id}</p>
                  </div>
                  {Object.keys(selectedNode.properties).length > 0 && (
                    <div>
                      <h3 className="text-xs font-mono text-[var(--earth-blue)] tracking-wider mb-2">PROPERTIES</h3>
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        {Object.entries(selectedNode.properties).map(([key, value]) => (
                          <div key={key} className="rounded border border-[rgba(0,180,216,0.2)] bg-[rgba(11,61,145,0.1)] p-2">
                            <span className="text-xs font-mono text-[var(--earth-blue)]">{key}:</span>
                            <span className="ml-2 text-sm text-white font-semibold break-words">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm font-mono text-[var(--lunar-gray)] tracking-wider">
                    AWAITING NODE SELECTION
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="space-y-4">
          <Card className="terminal-display border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,1)]">
            <CardHeader>
              <CardDescription className="text-xs font-mono text-[var(--earth-blue)] tracking-wider">NODES</CardDescription>
              <CardTitle className="text-3xl font-bold text-[var(--solar-gold)] data-display">{filteredGraph.nodes.length}</CardTitle>
              <p className="mt-1 text-xs font-mono text-[var(--lunar-gray)]">
                OF {graphData.nodes.length} TOTAL
              </p>
            </CardHeader>
          </Card>
          <Card className="terminal-display border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,1)]">
            <CardHeader>
              <CardDescription className="text-xs font-mono text-[var(--earth-blue)] tracking-wider">EDGES</CardDescription>
              <CardTitle className="text-3xl font-bold text-[var(--solar-gold)] data-display">{filteredGraph.edges.length}</CardTitle>
              <p className="mt-1 text-xs font-mono text-[var(--lunar-gray)]">
                OF {graphData.edges.length} TOTAL
              </p>
            </CardHeader>
          </Card>
          <Card className="terminal-display border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,1)]">
            <CardHeader>
              <CardDescription className="text-xs font-mono text-[var(--earth-blue)] tracking-wider">COVERAGE</CardDescription>
              <CardTitle className="text-3xl font-bold text-[var(--solar-gold)] data-display">
                {((filteredGraph.nodes.length / graphData.nodes.length) * 100).toFixed(1)}%
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
