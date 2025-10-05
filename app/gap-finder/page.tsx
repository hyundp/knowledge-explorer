"use client";

import { useEffect, useState, useMemo } from "react";
import { GapHeatmap } from "@/components/GapHeatmap";
import { ComparisonMode } from "@/components/ComparisonMode";
import type { GapAnalysis, GapCell } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileJson, ArrowLeftRight, ChevronDown, ChevronUp, X, Dna, Heart, Radiation, Microscope, Rocket, BookOpen } from "lucide-react";
import { exportGapToCSV, exportToJSON } from "@/lib/export";
import { useFilterStore } from "@/lib/store/filterStore";

interface PaperDetail {
  pmcid: string;
  title: string;
  year: number;
  journal: string;
  authors: string[];
}

export default function GapFinderPage() {
  const [gapData, setGapData] = useState<GapAnalysis | null>(null);
  const [selectedCell, setSelectedCell] = useState<GapCell | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('organism');

  // Paper details states
  const [paperDetails, setPaperDetails] = useState<PaperDetail[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(false);

  // Available filter options
  const [organismOptions, setOrganismOptions] = useState<string[]>([]);
  const [tissueOptions, setTissueOptions] = useState<string[]>([]);
  const [exposureOptions, setExposureOptions] = useState<string[]>([]);
  const [studyTypeOptions, setStudyTypeOptions] = useState<string[]>([]);
  const [missionOptions, setMissionOptions] = useState<string[]>([]);

  const {
    yearRange,
    minSampleSize,
  } = useFilterStore();

  // Fetch available parameters
  useEffect(() => {
    fetch('/api/parameters?counts=true')
      .then(res => res.json())
      .then(data => {
        if (data.parameters) {
          setOrganismOptions(data.parameters.organisms || []);
          setTissueOptions(data.parameters.tissues || []);
          setExposureOptions(data.parameters.exposures || []);
          setStudyTypeOptions(data.parameters.studyTypes || []);
          setMissionOptions(data.parameters.missions || []);
        }
      })
      .catch(error => console.error('Error fetching parameters:', error));
  }, []);

  // Fetch gap data based on active tab
  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/gap-finder?type=${activeTab}`)
      .then(res => res.json())
      .then(setGapData)
      .catch(error => console.error('Error fetching gap analysis:', error))
      .finally(() => setIsLoading(false));
  }, [activeTab]);

  // Apply filters to gap data
  const filteredCells = useMemo(() => {
    if (!gapData) return [];

    return gapData.cells.filter((cell) => {
      if (cell.study_count < minSampleSize) return false;
      return true;
    });
  }, [gapData, minSampleSize]);

  const handleCellClick = async (cell: GapCell) => {
    setSelectedCell(cell);
    setIsDrawerOpen(true);
    setPaperDetails([]);
    setLoadingPapers(true);

    try {
      const response = await fetch('/api/papers-by-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pmcids: cell.pmcids.slice(0, 10) }) // First 10 papers
      });

      if (!response.ok) {
        throw new Error('Failed to fetch papers');
      }

      const data = await response.json();
      setPaperDetails(data.papers || []);
    } catch (error) {
      console.error('Error fetching papers:', error);
      setPaperDetails([]);
    } finally {
      setLoadingPapers(false);
    }
  };

  const handleReadMore = (paper: PaperDetail) => {
    // Open paper directly in new tab
    window.open(`https://www.ncbi.nlm.nih.gov/pmc/articles/${paper.pmcid}`, '_blank');
  };

  if (isLoading || !gapData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading gap analysis...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Gap Finder</h1>
        </div>

        {/* Tabs with integrated content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-14 mb-6 p-1 bg-[rgba(0,180,216,0.1)] border border-[rgba(0,180,216,0.3)]">
            <TabsTrigger
              value="organism"
              className="flex items-center justify-center gap-2 text-xs font-bold tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--earth-blue)] data-[state=active]:to-[var(--nasa-blue)] data-[state=active]:text-white cursor-pointer"
            >
              <Dna className="h-4 w-4" />
              <span>ORGANISM ({organismOptions.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="tissue"
              className="flex items-center justify-center gap-2 text-xs font-bold tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--earth-blue)] data-[state=active]:to-[var(--nasa-blue)] data-[state=active]:text-white cursor-pointer"
            >
              <Heart className="h-4 w-4" />
              <span>TISSUE ({tissueOptions.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="exposure"
              className="flex items-center justify-center gap-2 text-xs font-bold tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--earth-blue)] data-[state=active]:to-[var(--nasa-blue)] data-[state=active]:text-white cursor-pointer"
            >
              <Radiation className="h-4 w-4" />
              <span>EXPOSURE ({exposureOptions.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="study"
              className="flex items-center justify-center gap-2 text-xs font-bold tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--earth-blue)] data-[state=active]:to-[var(--nasa-blue)] data-[state=active]:text-white cursor-pointer"
            >
              <Microscope className="h-4 w-4" />
              <span>STUDY TYPE ({studyTypeOptions.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="mission"
              className="flex items-center justify-center gap-2 text-xs font-bold tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--earth-blue)] data-[state=active]:to-[var(--nasa-blue)] data-[state=active]:text-white cursor-pointer"
            >
              <Rocket className="h-4 w-4" />
              <span>MISSION ({missionOptions.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Organism Tab */}
          <TabsContent value="organism" className="mt-0">
            <GapHeatmap cells={filteredCells} onCellClick={handleCellClick} categoryLabel="Organism" />
          </TabsContent>

          {/* Tissue Tab */}
          <TabsContent value="tissue" className="mt-0">
            <GapHeatmap cells={filteredCells} onCellClick={handleCellClick} categoryLabel="Tissue" />
          </TabsContent>

          {/* Exposure Tab */}
          <TabsContent value="exposure" className="mt-0">
            <GapHeatmap cells={filteredCells} onCellClick={handleCellClick} categoryLabel="Exposure" />
          </TabsContent>

          {/* Study Type Tab */}
          <TabsContent value="study" className="mt-0">
            <GapHeatmap cells={filteredCells} onCellClick={handleCellClick} categoryLabel="Study Type" />
          </TabsContent>

          {/* Mission Tab */}
          <TabsContent value="mission" className="mt-0">
            <GapHeatmap cells={filteredCells} onCellClick={handleCellClick} categoryLabel="Mission / Platform" />
          </TabsContent>
        </Tabs>

        {/* Details Drawer */}
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Research Details</SheetTitle>
            </SheetHeader>
            {selectedCell && (
              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Exposure</h3>
                  <p className="mt-1 text-lg font-semibold">{selectedCell.exposure}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Duration</h3>
                  <p className="mt-1 text-lg font-semibold">{selectedCell.duration}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Study Count</h3>
                  <p className="mt-1 text-lg font-semibold">{selectedCell.study_count}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Papers ({selectedCell.pmcids.length})
                  </h3>
                  {loadingPapers ? (
                    <div className="text-sm text-muted-foreground">Loading papers...</div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {paperDetails.map((paper) => (
                        <div
                          key={paper.pmcid}
                          className="rounded border border-[rgba(0,180,216,0.3)] bg-[rgba(0,180,216,0.05)] p-3 space-y-2"
                        >
                          <h4 className="text-sm font-semibold leading-snug">
                            {paper.title}
                          </h4>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {paper.journal} ({paper.year})
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReadMore(paper)}
                              className="h-7 text-xs border-[var(--earth-blue)] text-[var(--earth-blue)] hover:bg-[var(--earth-blue)] hover:text-white"
                            >
                              <BookOpen className="h-3 w-3 mr-1" />
                              Read More
                            </Button>
                          </div>
                        </div>
                      ))}
                      {selectedCell.pmcids.length > 10 && (
                        <p className="text-sm text-muted-foreground pt-2">
                          +{selectedCell.pmcids.length - 10} more papers
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Comparison Mode */}
        {isComparisonMode && gapData && (
          <ComparisonMode
            allCells={gapData.cells}
            onClose={() => setIsComparisonMode(false)}
          />
        )}
    </div>
  );
}
