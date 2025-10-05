"use client";

import { useMemo } from "react";
import type { GapCell } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { cn } from "@/lib/utils";

interface GapHeatmapProps {
  cells: GapCell[];
  onCellClick?: (cell: GapCell) => void;
  categoryLabel?: string;
}

export function GapHeatmap({ cells, onCellClick, categoryLabel = 'Category' }: GapHeatmapProps) {
  // Extract unique values from already filtered cells
  const tissues = useMemo(
    () => Array.from(new Set(cells.map((c) => c.tissue))),
    [cells]
  );

  // Define duration order
  const durationOrder = ['0-4 weeks', '1-6 months', '6-12 months', '1-3 years', '3+ years'];

  const durations = useMemo(
    () => {
      const uniqueDurations = Array.from(new Set(cells.map((c) => c.duration)));
      return uniqueDurations.sort((a, b) => {
        const indexA = durationOrder.indexOf(a);
        const indexB = durationOrder.indexOf(b);
        return indexA - indexB;
      });
    },
    [cells]
  );

  // Get cell data
  const getCellData = (tissue: string, duration: string) => {
    return cells.find((c) => c.tissue === tissue && c.duration === duration);
  };

  // Color scale
  const getColorClass = (studyCount?: number) => {
    if (!studyCount) return "bg-muted/20";
    if (studyCount >= 10) return "bg-primary";
    if (studyCount >= 7) return "bg-primary/80";
    if (studyCount >= 4) return "bg-primary/60";
    if (studyCount >= 2) return "bg-primary/40";
    return "bg-primary/20";
  };

  return (
    <div className="space-y-6">
      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Research Gap Analysis</CardTitle>
          <CardDescription>
            Study count by {categoryLabel.toLowerCase()} and publication age. Lighter colors indicate more studies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-card p-2 text-left text-sm font-medium">
                      {categoryLabel}
                    </th>
                    {durations.map((duration) => (
                      <th
                        key={duration}
                        className="p-2 text-center text-sm font-medium whitespace-nowrap"
                      >
                        {duration}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tissues.map((tissue) => (
                    <tr key={tissue} className="border-t border-border">
                      <td className="sticky left-0 bg-card p-2 text-sm font-medium">
                        {tissue}
                      </td>
                      {durations.map((duration) => {
                        const cellData = getCellData(tissue, duration);
                        return (
                          <td key={duration} className="p-1">
                            <button
                              onClick={() => cellData && onCellClick?.(cellData)}
                              className={cn(
                                "h-16 w-full rounded border border-border transition-all hover:scale-105 hover:border-primary hover:shadow-lg",
                                getColorClass(cellData?.study_count),
                                cellData && "cursor-pointer"
                              )}
                              disabled={!cellData}
                            >
                              {cellData && (
                                <div className="flex flex-col items-center justify-center">
                                  <span className="text-sm font-bold">
                                    {cellData.study_count}
                                  </span>
                                  <span className="text-xs opacity-80">
                                    {(cellData.avg_evidence_strength * 100).toFixed(0)}%
                                  </span>
                                </div>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-4">
            <span className="text-sm font-medium">Study Count:</span>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-primary/20" />
              <span className="text-xs">1-1</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-primary/40" />
              <span className="text-xs">2-3</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-primary/60" />
              <span className="text-xs">4-6</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-primary/80" />
              <span className="text-xs">7-9</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-primary" />
              <span className="text-xs">10+</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
