"use client";

import { useEffect, useState, useMemo } from "react";
import { ForestPlot } from "@/components/ForestPlot";
import type { Consensus, EffectSize } from "@/lib/types";
// Using real data from API routes instead of mock
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus, Download, FileJson, ChevronDown, ChevronUp, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportConsensusToCSV, exportToJSON } from "@/lib/export";
import { useFilterStore } from "@/lib/store/filterStore";

export default function ConsensusPage() {
  const [consensus, setConsensus] = useState<Consensus | null>(null);
  const [selectedOrganisms, setSelectedOrganisms] = useState<string[]>([]);
  const [selectedTissues, setSelectedTissues] = useState<string[]>([]);
  const [selectedExposures, setSelectedExposures] = useState<string[]>([]);
  const [selectedStudyTypes, setSelectedStudyTypes] = useState<string[]>([]);
  const [selectedMissions, setSelectedMissions] = useState<string[]>([]);
  const [selectedDurations, setSelectedDurations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [parametersExpanded, setParametersExpanded] = useState(true);

  // Real data parameters
  const [organismOptions, setOrganismOptions] = useState<string[]>([]);
  const [tissueOptions, setTissueOptions] = useState<string[]>([]);
  const [exposureOptions, setExposureOptions] = useState<string[]>([]);
  const [studyTypeOptions, setStudyTypeOptions] = useState<string[]>([]);
  const [missionOptions, setMissionOptions] = useState<string[]>([]);
  const [durationOptions, setDurationOptions] = useState<string[]>([]);
  const [parameterCounts, setParameterCounts] = useState<any>(null);

  const {
    yearRange,
    minSampleSize,
  } = useFilterStore();

  // Fetch available parameters from real data
  useEffect(() => {
    fetch('/api/parameters?counts=true')
      .then(res => res.json())
      .then(data => {
        if (data.parameters) {
          // Filter out "All" option
          const organisms = data.parameters.organisms?.filter((o: string) => o !== "All") || [];
          const tissues = data.parameters.tissues?.filter((t: string) => t !== "All") || [];
          const exposures = data.parameters.exposures?.filter((e: string) => e !== "All") || [];
          const studyTypes = data.parameters.studyTypes?.filter((s: string) => s !== "All") || [];
          const missions = data.parameters.missions?.filter((m: string) => m !== "All") || [];
          const durations = data.parameters.durations?.filter((d: string) => d !== "All") || [];

          setOrganismOptions(organisms);
          setTissueOptions(tissues);
          setExposureOptions(exposures);
          setStudyTypeOptions(studyTypes);
          setMissionOptions(missions);
          setDurationOptions(durations);
          setParameterCounts(data.counts);

          // Don't set any initial selection - let user choose
        }
      })
      .catch(error => console.error('Error fetching parameters:', error));
  }, []);

  // Check if any filters are active
  const hasActiveFilters = selectedOrganisms.length > 0 || selectedTissues.length > 0 ||
    selectedExposures.length > 0 || selectedStudyTypes.length > 0 ||
    selectedMissions.length > 0 || selectedDurations.length > 0;

  useEffect(() => {
    if (!hasActiveFilters) return;

    setIsLoading(true);
    // Build query params - only first value for now since API expects single values
    const params = new URLSearchParams();

    if (selectedOrganisms.length > 0) params.append("organism", selectedOrganisms[0]);
    if (selectedTissues.length > 0) params.append("tissue", selectedTissues[0]);
    if (selectedExposures.length > 0) params.append("exposure", selectedExposures[0]);
    if (selectedStudyTypes.length > 0) params.append("studyType", selectedStudyTypes[0]);
    if (selectedMissions.length > 0) params.append("mission", selectedMissions[0]);
    if (selectedDurations.length > 0) params.append("duration", selectedDurations[0]);

    // Fetch consensus data from real API
    fetch(`/api/consensus?${params}`)
      .then(res => res.json())
      .then(setConsensus)
      .catch(error => console.error('Error fetching consensus:', error))
      .finally(() => setIsLoading(false));
  }, [selectedOrganisms, selectedTissues, selectedExposures, selectedStudyTypes, selectedMissions, selectedDurations]);

  // Apply filters and recalculate statistics
  const filteredConsensus = useMemo(() => {
    if (!consensus) return null;

    // Filter effect sizes based on year and sample size
    const filteredEffects = consensus.effect_sizes.filter((effect) => {
      const year = parseInt(effect.year);
      if (year < yearRange[0] || year > yearRange[1]) return false;
      if (effect.sample_size < minSampleSize) return false;
      return true;
    });

    // Recalculate statistics based on filtered data
    if (filteredEffects.length === 0) {
      return {
        ...consensus,
        effect_sizes: [],
        total_studies: 0,
        outliers: [],
        statistics: {
          mean_effect: 0,
          median_effect: 0,
          std_dev: 0,
        },
      };
    }

    const magnitudes = filteredEffects.map(e => e.magnitude);
    const mean = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
    const sortedMags = [...magnitudes].sort((a, b) => a - b);
    const median = sortedMags[Math.floor(sortedMags.length / 2)];
    const variance = magnitudes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / magnitudes.length;
    const stdDev = Math.sqrt(variance);

    // Identify outliers (more than 2 std devs from mean)
    const outliers = filteredEffects
      .filter(e => Math.abs(e.magnitude - mean) > 2 * stdDev)
      .map(e => e.pmcid);

    // Calculate agreement score based on direction consistency
    const directionCounts = filteredEffects.reduce((acc, e) => {
      acc[e.direction] = (acc[e.direction] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const maxCount = Math.max(...Object.values(directionCounts));
    const agreementScore = maxCount / filteredEffects.length;

    // Determine consensus direction
    const consensusDirection = Object.entries(directionCounts).reduce((a, b) =>
      b[1] > (a[1] || 0) ? b : a
    )[0] as "increase" | "decrease" | "no_change" | "mixed";

    return {
      ...consensus,
      effect_sizes: filteredEffects,
      total_studies: filteredEffects.length,
      agreement_score: agreementScore,
      consensus_direction: consensusDirection,
      outliers,
      statistics: {
        mean_effect: mean,
        median_effect: median,
        std_dev: stdDev,
      },
    };
  }, [consensus, yearRange, minSampleSize]);

  // Helper functions for toggling selections
  const toggleOrganism = (org: string) => {
    setSelectedOrganisms(prev =>
      prev.includes(org) ? prev.filter(o => o !== org) : [...prev, org]
    );
  };

  const toggleTissue = (tissue: string) => {
    setSelectedTissues(prev =>
      prev.includes(tissue) ? prev.filter(t => t !== tissue) : [...prev, tissue]
    );
  };

  const toggleExposure = (exposure: string) => {
    setSelectedExposures(prev =>
      prev.includes(exposure) ? prev.filter(e => e !== exposure) : [...prev, exposure]
    );
  };

  const toggleStudyType = (studyType: string) => {
    setSelectedStudyTypes(prev =>
      prev.includes(studyType) ? prev.filter(s => s !== studyType) : [...prev, studyType]
    );
  };

  const toggleMission = (mission: string) => {
    setSelectedMissions(prev =>
      prev.includes(mission) ? prev.filter(m => m !== mission) : [...prev, mission]
    );
  };

  const toggleDuration = (duration: string) => {
    setSelectedDurations(prev =>
      prev.includes(duration) ? prev.filter(d => d !== duration) : [...prev, duration]
    );
  };

  const removeFilter = (type: string, value: string) => {
    switch(type) {
      case 'organism': setSelectedOrganisms(prev => prev.filter(o => o !== value)); break;
      case 'tissue': setSelectedTissues(prev => prev.filter(t => t !== value)); break;
      case 'exposure': setSelectedExposures(prev => prev.filter(e => e !== value)); break;
      case 'studyType': setSelectedStudyTypes(prev => prev.filter(s => s !== value)); break;
      case 'mission': setSelectedMissions(prev => prev.filter(m => m !== value)); break;
      case 'duration': setSelectedDurations(prev => prev.filter(d => d !== value)); break;
    }
  };

  const clearAllFilters = () => {
    setSelectedOrganisms([]);
    setSelectedTissues([]);
    setSelectedExposures([]);
    setSelectedStudyTypes([]);
    setSelectedMissions([]);
    setSelectedDurations([]);
  };

  if (!hasActiveFilters && !isLoading) {
    return (
      <div className="h-full overflow-y-auto p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Consensus Analysis</h1>
        </div>

        {/* Selection Controls Card with NASA theme - Expandable */}
        <Card className="mb-6 border-2 border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,0.95)] shadow-[0_0_30px_rgba(0,180,216,0.1)]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="cursor-pointer flex-1" onClick={() => setParametersExpanded(!parametersExpanded)}>
                <CardTitle className="text-xl font-bold tracking-wider flex items-center gap-2">
                  <span className="text-[var(--earth-blue)]">CONSENSUS</span>
                  <span className="text-white">PARAMETERS</span>
                </CardTitle>
                <CardDescription className="text-[var(--lunar-gray)] text-xs">
                  Configure analysis parameters to explore consensus across different conditions
                </CardDescription>
                {hasActiveFilters && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[var(--earth-blue)]">ACTIVE FILTERS:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearAllFilters();
                        }}
                        className="text-xs text-[var(--lunar-gray)] hover:text-white transition-colors underline"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedOrganisms.map(org => (
                        <div key={org} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[rgba(0,180,216,0.15)] border border-[rgba(0,180,216,0.4)]">
                          <span className="text-xs font-mono text-[var(--earth-blue)]">Organism:</span>
                          <span className="text-xs font-mono font-bold text-[var(--solar-gold)]">{org}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFilter('organism', org);
                            }}
                            className="text-[var(--lunar-gray)] hover:text-white transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {selectedTissues.map(tissue => (
                        <div key={tissue} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[rgba(0,180,216,0.15)] border border-[rgba(0,180,216,0.4)]">
                          <span className="text-xs font-mono text-[var(--earth-blue)]">Tissue:</span>
                          <span className="text-xs font-mono font-bold text-[var(--solar-gold)]">{tissue}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFilter('tissue', tissue);
                            }}
                            className="text-[var(--lunar-gray)] hover:text-white transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {selectedExposures.map(exposure => (
                        <div key={exposure} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[rgba(0,180,216,0.15)] border border-[rgba(0,180,216,0.4)]">
                          <span className="text-xs font-mono text-[var(--earth-blue)]">Exposure:</span>
                          <span className="text-xs font-mono font-bold text-[var(--solar-gold)]">{exposure}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFilter('exposure', exposure);
                            }}
                            className="text-[var(--lunar-gray)] hover:text-white transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {selectedStudyTypes.map(studyType => (
                        <div key={studyType} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[rgba(0,180,216,0.15)] border border-[rgba(0,180,216,0.4)]">
                          <span className="text-xs font-mono text-[var(--earth-blue)]">Study:</span>
                          <span className="text-xs font-mono font-bold text-[var(--solar-gold)]">{studyType}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFilter('studyType', studyType);
                            }}
                            className="text-[var(--lunar-gray)] hover:text-white transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {selectedMissions.map(mission => (
                        <div key={mission} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[rgba(0,180,216,0.15)] border border-[rgba(0,180,216,0.4)]">
                          <span className="text-xs font-mono text-[var(--earth-blue)]">Mission:</span>
                          <span className="text-xs font-mono font-bold text-[var(--solar-gold)]">{mission}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFilter('mission', mission);
                            }}
                            className="text-[var(--lunar-gray)] hover:text-white transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {selectedDurations.map(duration => (
                        <div key={duration} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[rgba(0,180,216,0.15)] border border-[rgba(0,180,216,0.4)]">
                          <span className="text-xs font-mono text-[var(--earth-blue)]">Duration:</span>
                          <span className="text-xs font-mono font-bold text-[var(--solar-gold)]">{duration}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFilter('duration', duration);
                            }}
                            className="text-[var(--lunar-gray)] hover:text-white transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button
                onClick={() => setParametersExpanded(!parametersExpanded)}
                className="h-12 w-40 px-4 bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white shadow-xl font-bold text-sm tracking-wider flex items-center justify-center gap-2 border-2 border-[rgba(0,180,216,0.5)]"
              >
                {parametersExpanded ? (
                  <>
                    <ChevronUp className="h-6 w-6" />
                    <span>COLLAPSE</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-6 w-6" />
                    <span>EXPAND</span>
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {parametersExpanded && (
            <CardContent className="space-y-4">

            {/* Organism Selection */}
            <div>
              <label className="mb-2 block text-xs font-bold tracking-wider text-[var(--earth-blue)]">ORGANISM</label>
              <div className="flex flex-wrap gap-1.5">
                {organismOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => toggleOrganism(option)}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer ${
                      selectedOrganisms.includes(option)
                        ? "bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white shadow-md"
                        : "bg-[rgba(0,180,216,0.1)] text-[var(--lunar-gray)] hover:bg-[rgba(0,180,216,0.2)] border border-[rgba(0,180,216,0.3)]"
                    }`}
                    title={parameterCounts?.organisms?.[option] ? `Found in ${parameterCounts.organisms[option]} papers` : undefined}
                  >
                    {option.toUpperCase()}
                    {parameterCounts?.organisms?.[option] && (
                      <span className="ml-1 opacity-70">({parameterCounts.organisms[option]})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tissue Selection */}
            <div>
              <label className="mb-2 block text-xs font-bold tracking-wider text-[var(--earth-blue)]">TISSUE</label>
              <div className="flex flex-wrap gap-1.5">
                {tissueOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => toggleTissue(option)}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer ${
                      selectedTissues.includes(option)
                        ? "bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white shadow-md"
                        : "bg-[rgba(0,180,216,0.1)] text-[var(--lunar-gray)] hover:bg-[rgba(0,180,216,0.2)] border border-[rgba(0,180,216,0.3)]"
                    }`}
                    title={parameterCounts?.tissues?.[option] ? `Found in ${parameterCounts.tissues[option]} papers` : undefined}
                  >
                    {option.toUpperCase()}
                    {parameterCounts?.tissues?.[option] && (
                      <span className="ml-1 opacity-70">({parameterCounts.tissues[option]})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Exposure Selection */}
            <div>
              <label className="mb-2 block text-xs font-bold tracking-wider text-[var(--earth-blue)]">EXPOSURE TYPE</label>
              <div className="flex flex-wrap gap-1.5">
                {exposureOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => toggleExposure(option)}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer ${
                      selectedExposures.includes(option)
                        ? "bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white shadow-md"
                        : "bg-[rgba(0,180,216,0.1)] text-[var(--lunar-gray)] hover:bg-[rgba(0,180,216,0.2)] border border-[rgba(0,180,216,0.3)]"
                    }`}
                    title={parameterCounts?.exposures?.[option] ? `Found in ${parameterCounts.exposures[option]} papers` : undefined}
                  >
                    {option.toUpperCase()}
                    {parameterCounts?.exposures?.[option] && (
                      <span className="ml-1 opacity-70">({parameterCounts.exposures[option]})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Study Type Selection */}
            <div>
              <label className="mb-2 block text-xs font-bold tracking-wider text-[var(--earth-blue)]">STUDY TYPE</label>
              <div className="flex flex-wrap gap-1.5">
                {studyTypeOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => toggleStudyType(option)}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer ${
                      selectedStudyTypes.includes(option)
                        ? "bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white shadow-md"
                        : "bg-[rgba(0,180,216,0.1)] text-[var(--lunar-gray)] hover:bg-[rgba(0,180,216,0.2)] border border-[rgba(0,180,216,0.3)]"
                    }`}
                    title={parameterCounts?.studyTypes?.[option] ? `Found in ${parameterCounts.studyTypes[option]} papers` : undefined}
                  >
                    {option.toUpperCase()}
                    {parameterCounts?.studyTypes?.[option] && (
                      <span className="ml-1 opacity-70">({parameterCounts.studyTypes[option]})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Mission Selection */}
            <div>
              <label className="mb-2 block text-xs font-bold tracking-wider text-[var(--earth-blue)]">MISSION / PLATFORM</label>
              <div className="flex flex-wrap gap-1.5">
                {missionOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => toggleMission(option)}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer ${
                      selectedMissions.includes(option)
                        ? "bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white shadow-md"
                        : "bg-[rgba(0,180,216,0.1)] text-[var(--lunar-gray)] hover:bg-[rgba(0,180,216,0.2)] border border-[rgba(0,180,216,0.3)]"
                    }`}
                    title={parameterCounts?.missions?.[option] ? `Found in ${parameterCounts.missions[option]} papers` : undefined}
                  >
                    {option.toUpperCase()}
                    {parameterCounts?.missions?.[option] && (
                      <span className="ml-1 opacity-70">({parameterCounts.missions[option]})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Selection */}
            <div>
              <label className="mb-2 block text-xs font-bold tracking-wider text-[var(--earth-blue)]">DURATION</label>
              <div className="flex flex-wrap gap-1.5">
                {durationOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => toggleDuration(option)}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer ${
                      selectedDurations.includes(option)
                        ? "bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white shadow-md"
                        : "bg-[rgba(0,180,216,0.1)] text-[var(--lunar-gray)] hover:bg-[rgba(0,180,216,0.2)] border border-[rgba(0,180,216,0.3)]"
                    }`}
                    title={parameterCounts?.durations?.[option] ? `Found in ${parameterCounts.durations[option]} papers` : undefined}
                  >
                    {option.toUpperCase()}
                    {parameterCounts?.durations?.[option] && (
                      <span className="ml-1 opacity-70">({parameterCounts.durations[option]})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            </CardContent>
          )}
        </Card>

        {/* Prompt to select a parameter */}
        <Card className="border-2 border-[rgba(0,180,216,0.2)] bg-gradient-to-b from-[rgba(11,14,19,0.95)] to-[rgba(6,8,16,0.95)]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-[var(--earth-blue)]">SELECT A PARAMETER TO BEGIN</h2>
              <p className="text-[var(--lunar-gray)] max-w-md">
                Choose an organism, tissue, or exposure type from the parameters above to analyze consensus across related studies.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !consensus || !filteredConsensus) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-muted-foreground">
          Loading consensus data...
        </div>
      </div>
    );
  }

  const getDirectionIcon = () => {
    switch (filteredConsensus.consensus_direction) {
      case "increase":
        return <ArrowUp className="h-6 w-6 text-secondary" />;
      case "decrease":
        return <ArrowDown className="h-6 w-6 text-primary" />;
      default:
        return <Minus className="h-6 w-6 text-muted-foreground" />;
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Consensus Analysis</h1>
      </div>

      {/* Selection Controls Card with NASA theme - Expandable */}
      <Card className="mb-6 border-2 border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,0.95)] shadow-[0_0_30px_rgba(0,180,216,0.1)]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="cursor-pointer flex-1" onClick={() => setParametersExpanded(!parametersExpanded)}>
              <CardTitle className="text-xl font-bold tracking-wider flex items-center gap-2">
                <span className="text-[var(--earth-blue)]">CONSENSUS</span>
                <span className="text-white">PARAMETERS</span>
              </CardTitle>
              <CardDescription className="text-[var(--lunar-gray)] text-xs">
                Configure analysis parameters to explore consensus across different conditions
              </CardDescription>
              {hasActiveFilters && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[var(--earth-blue)]">ACTIVE FILTERS:</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearAllFilters();
                      }}
                      className="text-xs text-[var(--lunar-gray)] hover:text-white transition-colors underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOrganisms.map(org => (
                      <div key={org} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[rgba(0,180,216,0.15)] border border-[rgba(0,180,216,0.4)]">
                        <span className="text-xs font-mono text-[var(--earth-blue)]">Organism:</span>
                        <span className="text-xs font-mono font-bold text-[var(--solar-gold)]">{org}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFilter('organism', org);
                          }}
                          className="text-[var(--lunar-gray)] hover:text-white transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {selectedTissues.map(tissue => (
                      <div key={tissue} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[rgba(0,180,216,0.15)] border border-[rgba(0,180,216,0.4)]">
                        <span className="text-xs font-mono text-[var(--earth-blue)]">Tissue:</span>
                        <span className="text-xs font-mono font-bold text-[var(--solar-gold)]">{tissue}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFilter('tissue', tissue);
                          }}
                          className="text-[var(--lunar-gray)] hover:text-white transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {selectedExposures.map(exposure => (
                      <div key={exposure} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[rgba(0,180,216,0.15)] border border-[rgba(0,180,216,0.4)]">
                        <span className="text-xs font-mono text-[var(--earth-blue)]">Exposure:</span>
                        <span className="text-xs font-mono font-bold text-[var(--solar-gold)]">{exposure}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFilter('exposure', exposure);
                          }}
                          className="text-[var(--lunar-gray)] hover:text-white transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {selectedStudyTypes.map(studyType => (
                      <div key={studyType} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[rgba(0,180,216,0.15)] border border-[rgba(0,180,216,0.4)]">
                        <span className="text-xs font-mono text-[var(--earth-blue)]">Study:</span>
                        <span className="text-xs font-mono font-bold text-[var(--solar-gold)]">{studyType}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFilter('studyType', studyType);
                          }}
                          className="text-[var(--lunar-gray)] hover:text-white transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {selectedMissions.map(mission => (
                      <div key={mission} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[rgba(0,180,216,0.15)] border border-[rgba(0,180,216,0.4)]">
                        <span className="text-xs font-mono text-[var(--earth-blue)]">Mission:</span>
                        <span className="text-xs font-mono font-bold text-[var(--solar-gold)]">{mission}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFilter('mission', mission);
                          }}
                          className="text-[var(--lunar-gray)] hover:text-white transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {selectedDurations.map(duration => (
                      <div key={duration} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[rgba(0,180,216,0.15)] border border-[rgba(0,180,216,0.4)]">
                        <span className="text-xs font-mono text-[var(--earth-blue)]">Duration:</span>
                        <span className="text-xs font-mono font-bold text-[var(--solar-gold)]">{duration}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFilter('duration', duration);
                          }}
                          className="text-[var(--lunar-gray)] hover:text-white transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Button
              onClick={() => setParametersExpanded(!parametersExpanded)}
              className="h-12 w-40 px-4 bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white shadow-xl font-bold text-sm tracking-wider flex items-center justify-center gap-2 border-2 border-[rgba(0,180,216,0.5)]"
            >
              {parametersExpanded ? (
                <>
                  <ChevronUp className="h-6 w-6" />
                  <span>COLLAPSE</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-6 w-6" />
                  <span>EXPAND</span>
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {parametersExpanded && (
          <CardContent className="space-y-4">

          {/* Organism Selection */}
          <div>
            <label className="mb-2 block text-xs font-bold tracking-wider text-[var(--earth-blue)]">ORGANISM</label>
            <div className="flex flex-wrap gap-1.5">
              {organismOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => toggleOrganism(option)}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wide transition-all ${
                    selectedOrganisms.includes(option)
                      ? "bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white shadow-md"
                      : "bg-[rgba(0,180,216,0.1)] text-[var(--lunar-gray)] hover:bg-[rgba(0,180,216,0.2)] border border-[rgba(0,180,216,0.3)]"
                  }`}
                  title={parameterCounts?.organisms?.[option] ? `Found in ${parameterCounts.organisms[option]} papers` : undefined}
                >
                  {option.toUpperCase()}
                  {parameterCounts?.organisms?.[option] && (
                    <span className="ml-1 opacity-70">({parameterCounts.organisms[option]})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tissue Selection */}
          <div>
            <label className="mb-2 block text-xs font-bold tracking-wider text-[var(--earth-blue)]">TISSUE</label>
            <div className="flex flex-wrap gap-1.5">
              {tissueOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => toggleTissue(option)}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wide transition-all ${
                    selectedTissues.includes(option)
                      ? "bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white shadow-md"
                      : "bg-[rgba(0,180,216,0.1)] text-[var(--lunar-gray)] hover:bg-[rgba(0,180,216,0.2)] border border-[rgba(0,180,216,0.3)]"
                  }`}
                  title={parameterCounts?.tissues?.[option] ? `Found in ${parameterCounts.tissues[option]} papers` : undefined}
                >
                  {option.toUpperCase()}
                  {parameterCounts?.tissues?.[option] && (
                    <span className="ml-1 opacity-70">({parameterCounts.tissues[option]})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Exposure Selection */}
          <div>
            <label className="mb-2 block text-xs font-bold tracking-wider text-[var(--earth-blue)]">EXPOSURE TYPE</label>
            <div className="flex flex-wrap gap-1.5">
              {exposureOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => toggleExposure(option)}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wide transition-all ${
                    selectedExposures.includes(option)
                      ? "bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white shadow-md"
                      : "bg-[rgba(0,180,216,0.1)] text-[var(--lunar-gray)] hover:bg-[rgba(0,180,216,0.2)] border border-[rgba(0,180,216,0.3)]"
                  }`}
                  title={parameterCounts?.exposures?.[option] ? `Found in ${parameterCounts.exposures[option]} papers` : undefined}
                >
                  {option.toUpperCase()}
                  {parameterCounts?.exposures?.[option] && (
                    <span className="ml-1 opacity-70">({parameterCounts.exposures[option]})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Study Type Selection */}
          <div>
            <label className="mb-2 block text-xs font-bold tracking-wider text-[var(--earth-blue)]">STUDY TYPE</label>
            <div className="flex flex-wrap gap-1.5">
              {studyTypeOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => toggleStudyType(option)}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wide transition-all ${
                    selectedStudyTypes.includes(option)
                      ? "bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white shadow-md"
                      : "bg-[rgba(0,180,216,0.1)] text-[var(--lunar-gray)] hover:bg-[rgba(0,180,216,0.2)] border border-[rgba(0,180,216,0.3)]"
                  }`}
                  title={parameterCounts?.studyTypes?.[option] ? `Found in ${parameterCounts.studyTypes[option]} papers` : undefined}
                >
                  {option.toUpperCase()}
                  {parameterCounts?.studyTypes?.[option] && (
                    <span className="ml-1 opacity-70">({parameterCounts.studyTypes[option]})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Mission Selection */}
          <div>
            <label className="mb-2 block text-xs font-bold tracking-wider text-[var(--earth-blue)]">MISSION / PLATFORM</label>
            <div className="flex flex-wrap gap-1.5">
              {missionOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => toggleMission(option)}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wide transition-all ${
                    selectedMissions.includes(option)
                      ? "bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white shadow-md"
                      : "bg-[rgba(0,180,216,0.1)] text-[var(--lunar-gray)] hover:bg-[rgba(0,180,216,0.2)] border border-[rgba(0,180,216,0.3)]"
                  }`}
                  title={parameterCounts?.missions?.[option] ? `Found in ${parameterCounts.missions[option]} papers` : undefined}
                >
                  {option.toUpperCase()}
                  {parameterCounts?.missions?.[option] && (
                    <span className="ml-1 opacity-70">({parameterCounts.missions[option]})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Selection */}
          <div>
            <label className="mb-2 block text-xs font-bold tracking-wider text-[var(--earth-blue)]">DURATION</label>
            <div className="flex flex-wrap gap-1.5">
              {durationOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => toggleDuration(option)}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wide transition-all ${
                    selectedDurations.includes(option)
                      ? "bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white shadow-md"
                      : "bg-[rgba(0,180,216,0.1)] text-[var(--lunar-gray)] hover:bg-[rgba(0,180,216,0.2)] border border-[rgba(0,180,216,0.3)]"
                  }`}
                  title={parameterCounts?.durations?.[option] ? `Found in ${parameterCounts.durations[option]} papers` : undefined}
                >
                  {option.toUpperCase()}
                  {parameterCounts?.durations?.[option] && (
                    <span className="ml-1 opacity-70">({parameterCounts.durations[option]})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2 pt-3 border-t border-[rgba(0,180,216,0.2)]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportConsensusToCSV(filteredConsensus)}
              className="border-[var(--earth-blue)] text-[var(--earth-blue)] hover:bg-[var(--earth-blue)] hover:text-white h-8 text-xs"
            >
              <Download className="mr-2 h-3 w-3" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToJSON(filteredConsensus, "consensus-analysis.json")}
              className="border-[var(--earth-blue)] text-[var(--earth-blue)] hover:bg-[var(--earth-blue)] hover:text-white h-8 text-xs"
            >
              <FileJson className="mr-2 h-3 w-3" />
              Export JSON
            </Button>
          </div>
          </CardContent>
        )}
      </Card>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Studies</CardDescription>
            <CardTitle>{filteredConsensus.total_studies}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              of {consensus.total_studies} total
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Agreement Score</CardDescription>
            <CardTitle>{(filteredConsensus.agreement_score * 100).toFixed(0)}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardDescription>Consensus Direction</CardDescription>
              <CardTitle className="capitalize">{filteredConsensus.consensus_direction}</CardTitle>
            </div>
            {getDirectionIcon()}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Outlier Studies</CardDescription>
            <CardTitle>{filteredConsensus.outliers.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Statistics */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Statistical Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Mean Effect</p>
                <p className="text-2xl font-bold">{filteredConsensus.statistics.mean_effect.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Median Effect</p>
                <p className="text-2xl font-bold">{filteredConsensus.statistics.median_effect.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Std. Deviation</p>
                <p className="text-2xl font-bold">{filteredConsensus.statistics.std_dev.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forest Plot */}
      <ForestPlot
        effectSizes={filteredConsensus.effect_sizes}
        meanEffect={filteredConsensus.statistics.mean_effect}
      />

      {/* Outliers */}
      {filteredConsensus.outliers.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Outlier Studies</CardTitle>
              <CardDescription>
                Studies with effect sizes more than 2 standard deviations from the mean
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredConsensus.outliers.map((pmcid) => {
                  const study = filteredConsensus.effect_sizes.find((e) => e.pmcid === pmcid);
                  return (
                    <div
                      key={pmcid}
                      className="flex items-center justify-between rounded border border-border bg-muted/50 p-3"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{pmcid}</p>
                        <p className="text-sm text-muted-foreground">{study?.title}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-mono text-lg font-bold">{study?.magnitude.toFixed(2)}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/`, "_blank")}
                          className="h-8 px-2"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span className="ml-1 text-xs">Read</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
