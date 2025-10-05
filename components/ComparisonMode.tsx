"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GapHeatmap } from "@/components/GapHeatmap";
import { ArrowLeftRight, X } from "lucide-react";
import type { GapCell } from "@/lib/types";
import { useFilterStore } from "@/lib/store/filterStore";

interface ComparisonModeProps {
  allCells: GapCell[];
  onClose: () => void;
}

export function ComparisonMode({ allCells, onClose }: ComparisonModeProps) {
  const [leftFilters, setLeftFilters] = useState({
    yearRange: [2014, 2024] as [number, number],
    minSampleSize: 0,
  });

  const [rightFilters, setRightFilters] = useState({
    yearRange: [2014, 2024] as [number, number],
    minSampleSize: 0,
  });

  const currentFilters = useFilterStore();

  const captureLeftFilters = () => {
    setLeftFilters({
      yearRange: currentFilters.yearRange,
      minSampleSize: currentFilters.minSampleSize,
    });
  };

  const captureRightFilters = () => {
    setRightFilters({
      yearRange: currentFilters.yearRange,
      minSampleSize: currentFilters.minSampleSize,
    });
  };

  // Filter cells for left panel
  const leftCells = useMemo(() => {
    return allCells;
  }, [allCells]);

  // Filter cells for right panel
  const rightCells = useMemo(() => {
    return allCells;
  }, [allCells]);

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ArrowLeftRight className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-xl font-bold">Comparison Mode</h2>
                <p className="text-sm text-muted-foreground">
                  Compare two different filter configurations side by side
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Comparison Panels */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel */}
          <div className="flex flex-1 flex-col border-r border-border">
            <div className="border-b border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Configuration A</h3>
                  <p className="text-sm text-muted-foreground">
                    {leftCells.length} cells
                  </p>
                </div>
                <Button size="sm" onClick={captureLeftFilters}>
                  Capture Current Filters
                </Button>
              </div>
              <div className="mt-3 space-y-1 text-xs">
                <p><span className="font-medium">Year Range:</span> {leftFilters.yearRange[0]}-{leftFilters.yearRange[1]}</p>
                {leftFilters.minSampleSize > 0 && (
                  <p><span className="font-medium">Min Sample Size:</span> {leftFilters.minSampleSize}</p>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {leftCells.length > 0 ? (
                <GapHeatmap cells={leftCells} onCellClick={() => {}} />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Click &quot;Capture Current Filters&quot; to set Configuration A
                </div>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex flex-1 flex-col">
            <div className="border-b border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Configuration B</h3>
                  <p className="text-sm text-muted-foreground">
                    {rightCells.length} cells
                  </p>
                </div>
                <Button size="sm" onClick={captureRightFilters}>
                  Capture Current Filters
                </Button>
              </div>
              <div className="mt-3 space-y-1 text-xs">
                <p><span className="font-medium">Year Range:</span> {rightFilters.yearRange[0]}-{rightFilters.yearRange[1]}</p>
                {rightFilters.minSampleSize > 0 && (
                  <p><span className="font-medium">Min Sample Size:</span> {rightFilters.minSampleSize}</p>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {rightCells.length > 0 ? (
                <GapHeatmap cells={rightCells} onCellClick={() => {}} />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Click &quot;Capture Current Filters&quot; to set Configuration B
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="border-t border-border bg-card p-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardDescription>Configuration A</CardDescription>
                <CardTitle>{leftCells.length} cells</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Configuration B</CardDescription>
                <CardTitle>{rightCells.length} cells</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Difference</CardDescription>
                <CardTitle>
                  {Math.abs(leftCells.length - rightCells.length)} cells
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
