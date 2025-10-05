"use client";

import { useState, useEffect, useMemo } from "react";
import { Network, Database, Target, Zap, AlertTriangle, TrendingUp, Layers, GitBranch, Activity, Dna, Heart, Radiation, Microscope, Rocket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CoveragePriorityMap, GapROIResponse, RedundancyResponse } from "@/lib/types";

interface GapCell {
  organism: string;
  tissue: string;
  exposure: string;
  duration: string;
  study_count: number;
  avg_evidence_strength: number;
  pmcids: string[];
}

interface ParameterCounts {
  organisms: { [key: string]: number };
  tissues: { [key: string]: number };
  exposures: { [key: string]: number };
  phenotypes: { [key: string]: number };
}

interface ConsensusData {
  phenotype: string;
  phenotype_id: string;
  total_studies: number;
  agreement_score: number;
  consensus_direction: "increase" | "decrease" | "no_change" | "mixed";
}

export default function ArchitectDashboard() {
  const [gapData, setGapData] = useState<GapCell[]>([]);
  const [parameterCounts, setParameterCounts] = useState<ParameterCounts | null>(null);
  const [consensusData, setConsensusData] = useState<ConsensusData[]>([]);
  const [coveragePriorityData, setCoveragePriorityData] = useState<CoveragePriorityMap | null>(null);
  const [gapROIData, setGapROIData] = useState<GapROIResponse | null>(null);
  const [redundancyData, setRedundancyData] = useState<RedundancyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<"organism" | "tissue" | "exposure" | "study" | "mission">("organism");
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("organism");

  // Available filter options
  const [organismOptions, setOrganismOptions] = useState<string[]>([]);
  const [tissueOptions, setTissueOptions] = useState<string[]>([]);
  const [exposureOptions, setExposureOptions] = useState<string[]>([]);
  const [studyTypeOptions, setStudyTypeOptions] = useState<string[]>([]);
  const [missionOptions, setMissionOptions] = useState<string[]>([]);

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
        if (data.counts) {
          setParameterCounts(data.counts);
        }
      })
      .catch(error => console.error('Error fetching parameters:', error));
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Load existing data sources
        const gapRes = await fetch(`/api/gap-finder?type=${activeTab}`);
        const gapJson = await gapRes.json();
        setGapData(gapJson.cells || []);

        const consensusRes = await fetch('/api/consensus');
        const consensusJson = await consensusRes.json();
        const consensusArray = Array.isArray(consensusJson)
          ? consensusJson
          : (consensusJson.consensus || consensusJson.data || []);
        setConsensusData(consensusArray.slice(0, 10));

        // Load manager API integrations for architectural insights
        const coverageRes = await fetch('/api/manager/coverage-priority');
        const coverageJson = await coverageRes.json();
        setCoveragePriorityData(coverageJson);

        const roiRes = await fetch('/api/manager/gap-roi');
        const roiJson = await roiRes.json();
        setGapROIData(roiJson);

        const redundancyRes = await fetch('/api/manager/redundancy');
        const redundancyJson = await redundancyRes.json();
        setRedundancyData(redundancyJson);
      } catch (error) {
        console.error('Error loading architect data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [activeTab]);

  const architectureMetrics = useMemo(() => {
    const criticalGaps = gapData.filter(c => c.study_count === 0).length;
    const totalCells = gapData.length;
    const totalStudies = gapData.reduce((sum, c) => sum + c.study_count, 0);
    const knowledgeDensity = totalCells > 0 ? (totalStudies / totalCells).toFixed(1) : "0";
    const fragmentedOrganisms = parameterCounts?.organisms
      ? Object.values(parameterCounts.organisms).filter(count => count < 5).length
      : 0;
    const strongConsensus = consensusData.filter(c => c.agreement_score > 0.8).length;
    const coveredCells = gapData.filter(c => c.study_count > 0).length;
    const structuralIntegrity = totalCells > 0 ? ((coveredCells / totalCells) * 100).toFixed(1) : "0";

    // Advanced metrics from manager APIs
    const avgCoverage = coveragePriorityData?.metadata.avgCoverage || 0;
    const redundancyIndex = redundancyData?.metadata.redundancyIndex || 0;
    const highPriorityGaps = gapROIData?.metadata.highPriorityCount || 0;
    const avgROI = gapROIData?.metadata.avgROI || 0;

    return {
      criticalGaps,
      knowledgeDensity,
      fragmentedOrganisms,
      strongConsensus,
      structuralIntegrity,
      avgCoverage,
      redundancyIndex,
      highPriorityGaps,
      avgROI
    };
  }, [gapData, parameterCounts, consensusData, coveragePriorityData, redundancyData, gapROIData]);

  const filterOptions = useMemo(() => {
    if (!gapData.length) return [];

    const counts: { [key: string]: number } = {};

    gapData.forEach(gap => {
      let key = "";
      // For study and mission types, the API returns the value in organism/tissue/exposure fields
      // We use organism field as it's populated for all types
      if (activeTab === "organism") key = gap.organism;
      else if (activeTab === "tissue") key = gap.tissue;
      else if (activeTab === "exposure") key = gap.exposure;
      else if (activeTab === "study") key = gap.organism; // Study type is in organism field
      else if (activeTab === "mission") key = gap.organism; // Mission is in organism field

      if (key) {
        counts[key] = (counts[key] || 0) + gap.study_count;
      }
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1]);
  }, [activeTab, gapData]);

  const filteredGaps = useMemo(() => {
    if (!selectedFilter) return gapData;

    return gapData.filter(gap => {
      if (activeTab === "organism") return gap.organism === selectedFilter;
      if (activeTab === "tissue") return gap.tissue === selectedFilter;
      if (activeTab === "exposure") return gap.exposure === selectedFilter;
      if (activeTab === "study") return gap.organism === selectedFilter; // Study type is in organism field
      if (activeTab === "mission") return gap.organism === selectedFilter; // Mission is in organism field
      return true;
    });
  }, [gapData, selectedFilter, activeTab]);

  const coverageMatrix = useMemo(() => {
    const matrix = filteredGaps.reduce((acc, gap) => {
      const key = `${gap.organism}-${gap.exposure}`;
      if (!acc[key]) {
        acc[key] = { organism: gap.organism, exposure: gap.exposure, count: 0, evidence: 0 };
      }
      acc[key].count += gap.study_count;
      acc[key].evidence = Math.max(acc[key].evidence, gap.avg_evidence_strength);
      return acc;
    }, {} as { [key: string]: { organism: string; exposure: string; count: number; evidence: number } });

    return Object.values(matrix).sort((a, b) => b.count - a.count);
  }, [filteredGaps]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,1)]">
        <div className="text-[var(--earth-blue)] text-lg">Loading architecture dashboard...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,1)]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Network className="h-10 w-10 text-[var(--earth-blue)]" />
            <h1 className="text-4xl font-bold tracking-wider">
              <span className="text-[var(--earth-blue)]">MISSION</span>{" "}
              <span className="text-white">ARCHITECT</span>
            </h1>
          </div>
        </div>

        {/* Enhanced Metrics Grid */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <Card className="border-2 border-[rgba(220,38,38,0.4)] bg-gradient-to-b from-[rgba(19,11,11,0.98)] to-[rgba(16,6,6,0.95)] hover:border-red-400 transition-all cursor-pointer group">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-400 group-hover:scale-110 transition-transform" />
                <p className="text-sm text-[var(--lunar-gray)] mb-1">Critical Gaps</p>
                <p className="text-3xl font-bold text-white group-hover:text-red-400 transition-colors">
                  {architectureMetrics.criticalGaps}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-[rgba(6,182,212,0.4)] bg-gradient-to-b from-[rgba(11,17,19,0.98)] to-[rgba(6,12,16,0.95)] hover:border-cyan-400 transition-all cursor-pointer group">
            <CardContent className="pt-6">
              <div className="text-center">
                <Zap className="h-8 w-8 mx-auto mb-2 text-cyan-400 group-hover:scale-110 transition-transform" />
                <p className="text-sm text-[var(--lunar-gray)] mb-1">Knowledge Density</p>
                <p className="text-3xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                  {architectureMetrics.knowledgeDensity}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-[rgba(251,146,60,0.4)] bg-gradient-to-b from-[rgba(19,15,11,0.98)] to-[rgba(16,12,6,0.95)] hover:border-orange-400 transition-all cursor-pointer group">
            <CardContent className="pt-6">
              <div className="text-center">
                <Network className="h-8 w-8 mx-auto mb-2 text-orange-400 group-hover:scale-110 transition-transform" />
                <p className="text-sm text-[var(--lunar-gray)] mb-1">Fragmented Areas</p>
                <p className="text-3xl font-bold text-white group-hover:text-orange-400 transition-colors">
                  {architectureMetrics.fragmentedOrganisms}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-[rgba(16,185,129,0.4)] bg-gradient-to-b from-[rgba(11,19,14,0.98)] to-[rgba(6,16,10,0.95)] hover:border-emerald-400 transition-all cursor-pointer group">
            <CardContent className="pt-6">
              <div className="text-center">
                <Target className="h-8 w-8 mx-auto mb-2 text-emerald-400 group-hover:scale-110 transition-transform" />
                <p className="text-sm text-[var(--lunar-gray)] mb-1">Strong Consensus</p>
                <p className="text-3xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                  {architectureMetrics.strongConsensus}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-[rgba(168,85,247,0.4)] bg-gradient-to-b from-[rgba(16,11,19,0.98)] to-[rgba(12,6,16,0.95)] hover:border-purple-400 transition-all cursor-pointer group">
            <CardContent className="pt-6">
              <div className="text-center">
                <Database className="h-8 w-8 mx-auto mb-2 text-purple-400 group-hover:scale-110 transition-transform" />
                <p className="text-sm text-[var(--lunar-gray)] mb-1">Structural Integrity</p>
                <p className="text-3xl font-bold text-white group-hover:text-purple-400 transition-colors">
                  {architectureMetrics.structuralIntegrity}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Tabs with integrated content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
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

          {/* All Tabs Content */}
          <TabsContent value={activeTab} className="mt-0">

            <div className="grid grid-cols-3 gap-6">
              <Card className="border-2 border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,0.95)]">
                <CardHeader>
                  <CardTitle className="text-lg font-bold tracking-wider text-[var(--earth-blue)]">
                    {activeTab.toUpperCase()} DISTRIBUTION
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {filterOptions.map(([name, count]) => (
                      <button
                        key={name}
                        onClick={() => setSelectedFilter(selectedFilter === name ? null : name)}
                        className={`w-full text-left p-3 rounded border transition-all ${
                          selectedFilter === name
                            ? 'border-[var(--earth-blue)] bg-[rgba(0,180,216,0.2)]'
                            : 'border-[rgba(0,180,216,0.3)] bg-[rgba(0,180,216,0.05)] hover:bg-[rgba(0,180,216,0.1)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white truncate">{name}</span>
                          <span className="text-xs text-[var(--earth-blue)] font-mono ml-2">{count}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-2 border-2 border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,0.95)]">
                <CardHeader>
                  <CardTitle className="text-lg font-bold tracking-wider text-[var(--earth-blue)]">
                    COVERAGE HEATMAP
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {coverageMatrix.slice(0, 20).map((cell, idx) => {
                      let bgColor, borderColor, textColor;

                      if (cell.count === 0) {
                        bgColor = 'rgba(220,38,38,0.2)';
                        borderColor = 'rgba(220,38,38,0.6)';
                        textColor = 'rgb(252,165,165)';
                      } else if (cell.count < 3) {
                        bgColor = 'rgba(251,146,60,0.2)';
                        borderColor = 'rgba(251,146,60,0.6)';
                        textColor = 'rgb(253,186,116)';
                      } else if (cell.count < 8) {
                        bgColor = 'rgba(234,179,8,0.2)';
                        borderColor = 'rgba(234,179,8,0.6)';
                        textColor = 'rgb(250,204,21)';
                      } else if (cell.count < 15) {
                        bgColor = 'rgba(6,182,212,0.2)';
                        borderColor = 'rgba(6,182,212,0.6)';
                        textColor = 'rgb(103,232,249)';
                      } else {
                        bgColor = 'rgba(16,185,129,0.2)';
                        borderColor = 'rgba(16,185,129,0.6)';
                        textColor = 'rgb(110,231,183)';
                      }

                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-4 rounded-lg border-2 hover:scale-[1.02] transition-all cursor-pointer"
                          style={{ backgroundColor: bgColor, borderColor: borderColor }}
                        >
                          <div className="flex-1">
                            <div className="text-sm font-bold text-white mb-0.5">{cell.organism}</div>
                            <div className="text-xs" style={{ color: textColor }}>{cell.exposure}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold" style={{ color: textColor }}>
                              {cell.count}
                            </div>
                            <div className="text-[10px] text-[var(--lunar-gray)] uppercase tracking-wider">
                              studies
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                            cell.count === 0 ? 'bg-red-500 text-white' :
                            cell.count < 3 ? 'bg-orange-500 text-white' :
                            cell.count < 8 ? 'bg-yellow-500 text-black' :
                            cell.count < 15 ? 'bg-cyan-500 text-white' :
                            'bg-emerald-500 text-white'
                          }`}>
                            {cell.count === 0 ? 'GAP' :
                             cell.count < 3 ? 'LOW' :
                             cell.count < 8 ? 'MED' :
                             cell.count < 15 ? 'GOOD' : 'HIGH'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
