"use client";

import { useEffect, useRef } from "react";
import cytoscape, { Core } from "cytoscape";
import cola from "cytoscape-cola";
import type { KGGraph, KGNode } from "@/lib/types";

// Register layout
if (typeof cytoscape !== "undefined") {
  cytoscape.use(cola);
}

interface KnowledgeGraphProps {
  data: KGGraph;
  onNodeClick?: (node: KGNode) => void;
}

export function KnowledgeGraph({ data, onNodeClick }: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data) return;

    // Filter out Finding nodes and create direct Paper -> Phenotype connections
    const findingNodes = new Set(data.nodes.filter(n => n.type === 'Finding').map(n => n.id));
    const filteredNodes = data.nodes.filter(n => n.type !== 'Finding');

    // Build a map of Paper -> Finding -> Phenotype connections
    const paperToFindingMap = new Map<string, string[]>();
    const findingToPhenotypeMap = new Map<string, string[]>();

    data.edges.forEach(edge => {
      if (edge.type === 'REPORTS') {
        // Paper -> Finding
        if (!paperToFindingMap.has(edge.source)) {
          paperToFindingMap.set(edge.source, []);
        }
        paperToFindingMap.get(edge.source)!.push(edge.target);
      } else if (edge.type === 'AFFECTS') {
        // Finding -> Phenotype
        if (!findingToPhenotypeMap.has(edge.source)) {
          findingToPhenotypeMap.set(edge.source, []);
        }
        findingToPhenotypeMap.get(edge.source)!.push(edge.target);
      }
    });

    // Create direct Paper -> Phenotype edges
    const directEdges: Array<{id: string, source: string, target: string, type: string}> = [];
    paperToFindingMap.forEach((findings, paperId) => {
      findings.forEach(findingId => {
        const phenotypes = findingToPhenotypeMap.get(findingId) || [];
        phenotypes.forEach(phenotypeId => {
          directEdges.push({
            id: `${paperId}-${phenotypeId}`,
            source: paperId,
            target: phenotypeId,
            type: 'REPORTS'
          });
        });
      });
    });

    // Keep only non-Finding edges (for other node types like Organism, Tissue, etc.)
    const filteredEdges = [
      ...directEdges,
      ...data.edges.filter(e =>
        !findingNodes.has(e.source) &&
        !findingNodes.has(e.target)
      )
    ];

    // Node colors by type - Brighter NASA color scheme for visibility
    const nodeColors: Record<string, string> = {
      Paper: "#00D9FF", // Bright Cyan - primary data
      Phenotype: "#FF6B4A", // Bright Coral - critical findings
      Organism: "#FFD700", // Bright Gold - living entities
      Tissue: "#4A90E2", // Bright Blue - biological samples
      Exposure: "#C0C0C0", // Bright Silver - environmental factors
      Assay: "#00FF9F", // Bright Mint - measurements
      Finding: "#FF4444", // Bright Red
      CellType: "#FFA500", // Bright Orange
      Platform: "#6366F1", // Bright Indigo
      Mission: "#00E5FF", // Bright Aqua
    };

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...filteredNodes.map((node) => {
          // Get the full label from properties or fullLabel field
          const fullLabel = node.properties?.label || (node as any).fullLabel || node.label;
          // Truncate to 30 characters for display on node
          const displayLabel = fullLabel.length > 30 ? fullLabel.substring(0, 27) + '...' : fullLabel;

          return {
            data: {
              id: node.id,
              ...node.properties,
              label: displayLabel, // Truncated to 30 chars for node display
              fullLabel: fullLabel, // Full text for tooltips and details
              type: node.type
            },
          };
        }),
        ...filteredEdges.map((edge) => ({
          data: { id: edge.id, source: edge.source, target: edge.target, label: edge.type },
        })),
      ],
      style: [
        {
          selector: "node",
          style: {
            "background-color": (ele) => nodeColors[ele.data("type")] || "#00D9FF",
            "background-opacity": 1,
            label: "data(label)",
            color: "#FFFFFF",
            "text-valign": "center",
            "text-halign": "center",
            "font-size": "12px",
            "font-family": "Space Mono, monospace",
            "font-weight": "bold",
            "text-wrap": "wrap",
            "text-max-width": "110px",
            "text-outline-width": 3,
            "text-outline-color": "#000000",
            width: 120,
            height: 120,
            "border-width": 3,
            "border-color": "#FFFFFF",
            "border-opacity": 0.4,
            "overlay-opacity": 0,
          },
        },
        {
          selector: "node:active",
          style: {
            "overlay-color": "#FFFFFF",
            "overlay-opacity": 0.3,
            "overlay-padding": 10,
          },
        },
        {
          selector: "edge",
          style: {
            width: 2.5,
            "line-color": "#4A90E2",
            "line-opacity": 0.6,
            "target-arrow-color": "#4A90E2",
            "target-arrow-shape": "triangle",
            "target-arrow-opacity": 0.8,
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": "10px",
            "font-family": "Space Mono, monospace",
            "font-weight": "bold",
            color: "#FFFFFF",
            "text-rotation": "autorotate",
            "text-outline-width": 2,
            "text-outline-color": "#000000",
            "overlay-opacity": 0,
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 4,
            "border-color": "#FFD700",
            "border-opacity": 1,
            "background-blacken": -0.2,
            width: 140,
            height: 140,
            "box-shadow": "0 0 20px #FFD700",
          },
        },
        {
          selector: "edge:selected",
          style: {
            "line-color": "#FFD700",
            "line-opacity": 1,
            width: 4,
            "target-arrow-color": "#FFD700",
          },
        },
      ],
      layout: {
        name: "cola",
        animate: true,
        randomize: false,
        maxSimulationTime: 2000,
        nodeSpacing: 50,
        edgeLength: 100,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      minZoom: 0.3,
      maxZoom: 3,
    });

    cyRef.current = cy;

    // Handle node clicks
    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      const nodeData = filteredNodes.find((n) => n.id === node.id());
      if (nodeData) {
        // Include fullLabel from cytoscape data
        const fullLabel = node.data("fullLabel");
        onNodeClick?.({
          ...nodeData,
          label: fullLabel || nodeData.label, // Use full label for details panel
          properties: {
            ...nodeData.properties
          }
        });
      }
    });

    // Show full label on hover
    let tooltipTimeout: NodeJS.Timeout;
    cy.on("mouseover", "node", (evt) => {
      const node = evt.target;
      const label = node.data("label");
      const fullLabel = node.data("fullLabel");

      // Only show tooltip if fullLabel exists and is different from label (i.e., was truncated)
      if (fullLabel && fullLabel !== label && fullLabel.length > 20) {
        tooltipTimeout = setTimeout(() => {
          // Create tooltip element
          const tooltip = document.createElement("div");
          tooltip.id = "cytoscape-tooltip";
          tooltip.className = "fixed z-50 max-w-md p-3 rounded-md border border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,1)] shadow-lg text-white text-sm font-mono";
          tooltip.textContent = fullLabel;
          tooltip.style.pointerEvents = "none";

          // Position tooltip
          const renderedPosition = node.renderedPosition();
          const container = containerRef.current?.getBoundingClientRect();
          if (container) {
            tooltip.style.left = `${container.left + renderedPosition.x + 10}px`;
            tooltip.style.top = `${container.top + renderedPosition.y - 30}px`;
          }

          document.body.appendChild(tooltip);
        }, 500); // 0.5s delay
      }
    });

    cy.on("mouseout", "node", () => {
      clearTimeout(tooltipTimeout);
      const tooltip = document.getElementById("cytoscape-tooltip");
      if (tooltip) {
        tooltip.remove();
      }
    });

    // Cleanup
    return () => {
      clearTimeout(tooltipTimeout);
      const tooltip = document.getElementById("cytoscape-tooltip");
      if (tooltip) {
        tooltip.remove();
      }
      cy.destroy();
    };
  }, [data, onNodeClick]);

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50);
    }
  };

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full rounded-md border border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,1)] shadow-[inset_0_0_50px_rgba(0,180,216,0.05)]"
      />

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="mission-button h-10 w-10 flex items-center justify-center text-lg font-bold"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="mission-button h-10 w-10 flex items-center justify-center text-lg font-bold"
        >
          −
        </button>
        <button
          onClick={handleFit}
          className="mission-button h-10 w-10 flex items-center justify-center text-xs font-mono"
        >
          FIT
        </button>
      </div>

      {/* Legend */}
      <div className="absolute left-4 top-4 rounded-md border border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,0.95)] p-3 shadow-lg max-w-[200px]">
        <h3 className="mb-2 text-xs font-mono font-bold text-[#00D9FF] tracking-wider">ENTITY TYPES</h3>
        <div className="space-y-1">
          {[
            { type: "Paper", color: "#00D9FF" },
            { type: "Phenotype", color: "#FF6B4A" },
            { type: "Organism", color: "#FFD700" },
            { type: "Tissue", color: "#4A90E2" },
            { type: "Exposure", color: "#C0C0C0" },
            { type: "Assay", color: "#00FF9F" },
          ].map(({ type, color }) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 6px ${color}`,
                  border: "1px solid rgba(255,255,255,0.3)"
                }}
              />
              <span className="text-[10px] font-mono text-white uppercase tracking-wide">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
