"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Grid, Network, BarChart3, Lightbulb, Filter, ChevronDown, ChevronUp, RotateCcw, Satellite, Activity, Microscope, PieChart, Rocket } from "lucide-react";
import { useState, useEffect } from "react";
import { useFilterStore } from "@/lib/store/filterStore";
import { usePersona } from "@/lib/hooks/usePersona";
import { Slider } from "./ui/slider";
import { PersonaSelector } from "./persona/PersonaSelector";

const baseNavigation = [
  { name: "MAIN HUB", code: "MH-01", href: "/", icon: Home },
  { name: "GAP FINDER", code: "GF-02", href: "/gap-finder", icon: Grid },
  { name: "KG EXPLORER", code: "KE-03", href: "/kg-explorer", icon: Network },
  { name: "CONSENSUS", code: "CN-04", href: "/consensus", icon: BarChart3 },
  { name: "INSIGHTS", code: "IN-05", href: "/insights", icon: Lightbulb },
];

const personaPages = {
  scientist: { name: "SCIENTIST LAB", code: "SL-00", href: "/scientist", icon: Microscope },
  manager: { name: "MANAGER DASHBOARD", code: "MD-00", href: "/manager", icon: PieChart },
  architect: { name: "MISSION PLANNER", code: "MP-00", href: "/architect", icon: Rocket },
};

export function Sidebar() {
  const pathname = usePathname();
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [paperCount, setPaperCount] = useState<number>(0);
  const { currentPersona } = usePersona();
  const showFilters = pathname === "/kg-explorer" || pathname === "/consensus" || pathname === "/gap-finder";

  // Build dynamic navigation based on persona
  const navigation = currentPersona !== 'default'
    ? [personaPages[currentPersona as keyof typeof personaPages], ...baseNavigation]
    : baseNavigation;

  const {
    yearRange,
    minSampleSize,
    minEvidenceStrength,
    setYearRange,
    setMinSampleSize,
    setMinEvidenceStrength,
    resetFilters,
  } = useFilterStore();

  const activeFiltersCount =
    (minSampleSize > 0 ? 1 : 0) +
    (minEvidenceStrength > 0 ? 1 : 0);

  useEffect(() => {
    // Set initial time on client mount
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch actual paper count
  useEffect(() => {
    fetch('/api/papers')
      .then(res => res.json())
      .then(papers => setPaperCount(papers.length))
      .catch(error => console.error('Error fetching paper count:', error));
  }, []);

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,1)] relative overflow-hidden">
      {/* Scan line effect */}
      <div className="scanner-line" />

      {/* Mission Control Header */}
      <div className="border-b border-[rgba(0,180,216,0.3)] px-4 py-3 relative">
        <div className="flex items-center gap-2 mb-2">
          <Satellite className="h-5 w-5 text-[var(--earth-blue)]" />
          <h1 className="text-sm font-bold tracking-[0.2em] text-[var(--earth-blue)]">
            KNOWLEDGE EXPLORER
          </h1>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono text-muted-foreground">
            SYSTEM: ONLINE
          </div>
          <div className="flex gap-1">
            <span className="led-status active" />
            <span className="led-status active" />
            <span className="led-status active" />
          </div>
        </div>
        <div className="text-xs font-mono text-[var(--solar-gold)] mt-1">
          {currentTime?.toLocaleTimeString('en-US', { hour12: false }) || '--:--:--'}
        </div>
      </div>

      {/* Persona Selector */}
      <PersonaSelector />

      {/* Navigation */}
      <nav className="space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "mission-nav-item relative flex items-center gap-3 rounded px-3 py-2.5 text-xs font-mono transition-all",
                isActive
                  ? "bg-gradient-to-r from-[rgba(0,180,216,0.2)] to-[rgba(11,61,145,0.3)] border-l-2 border-[var(--earth-blue)] text-white"
                  : "text-muted-foreground hover:bg-[rgba(0,180,216,0.1)] hover:text-[var(--earth-blue)]"
              )}
            >
              <div className="flex items-center gap-3 relative z-10">
                <Icon className="h-4 w-4" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-[var(--solar-gold)] opacity-60">{item.code}</span>
                  <span className="font-semibold tracking-wider">{item.name}</span>
                </div>
              </div>
              {isActive && (
                <>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <span className="led-status active" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[rgba(0,180,216,0.1)] opacity-50" />
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Filters Section - Only show on KG Explorer and Consensus pages */}
      {showFilters && (
        <div className="flex-1 overflow-y-auto border-t border-[rgba(0,180,216,0.2)]">
          <div className="p-3">
            {/* Filter Header */}
            <div className="mb-3">
              <button
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-mono hover:bg-[rgba(0,180,216,0.1)] transition-all"
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-[var(--earth-blue)]" />
                  <span className="text-[var(--earth-blue)] tracking-wider">FILTER CONTROL</span>
                  {activeFiltersCount > 0 && (
                    <span className="rounded-full bg-[var(--mars-red)] px-1.5 py-0.5 text-xs text-white">
                      {activeFiltersCount}
                    </span>
                  )}
                </div>
                {filtersExpanded ? <ChevronUp className="h-4 w-4 text-[var(--earth-blue)]" /> : <ChevronDown className="h-4 w-4 text-[var(--earth-blue)]" />}
              </button>
              {activeFiltersCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="mission-button mt-1 h-7 w-full text-xs flex items-center justify-center"
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  RESET FILTERS
                </button>
              )}
            </div>

            {/* Filter Content */}
            {filtersExpanded && (
              <div className="space-y-4">
                {/* Compact Sliders */}
                {pathname === "/gap-finder" && (
                  <>
                    <div>
                      <label className="mb-1 text-xs font-medium text-muted-foreground">
                        Min Evidence: {(minEvidenceStrength * 100).toFixed(0)}%
                      </label>
                      <Slider
                        min={0}
                        max={1}
                        step={0.05}
                        value={[minEvidenceStrength]}
                        onValueChange={(value) => setMinEvidenceStrength(value[0])}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="mb-1 text-xs font-medium text-muted-foreground">
                        Min Sample Size: {minSampleSize}
                      </label>
                      <Slider
                        min={0}
                        max={20}
                        step={1}
                        value={[minSampleSize]}
                        onValueChange={(value) => setMinSampleSize(value[0])}
                        className="mt-1"
                      />
                    </div>
                  </>
                )}

                {pathname === "/consensus" && (
                  <>
                    <div>
                      <label className="mb-1 text-xs font-medium text-muted-foreground">
                        Year: {yearRange[0]}-{yearRange[1]}
                      </label>
                      <Slider
                        min={2014}
                        max={2024}
                        step={1}
                        value={yearRange}
                        onValueChange={(value) => setYearRange(value as [number, number])}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="mb-1 text-xs font-medium text-muted-foreground">
                        Min Sample Size: {minSampleSize}
                      </label>
                      <Slider
                        min={0}
                        max={20}
                        step={1}
                        value={[minSampleSize]}
                        onValueChange={(value) => setMinSampleSize(value[0])}
                        className="mt-1"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer - Mission Status */}
      <div className="mt-auto border-t border-[rgba(0,180,216,0.2)] p-4 bg-[rgba(11,14,19,0.98)]">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[var(--earth-blue)]">DATABASE STATUS</span>
            <div className="flex items-center gap-1">
              <span className="led-status active" />
              <span className="text-[var(--solar-gold)]">OPERATIONAL</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">DOCUMENTS</span>
            <span className="text-white data-display">{paperCount || '...'}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">LAST SYNC</span>
            <span className="text-[var(--solar-gold)]">REAL-TIME</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-[rgba(0,180,216,0.1)]">
          <p className="text-[10px] font-mono text-[var(--lunar-gray)] tracking-wider">
            NASA SPACE BIOLOGY
          </p>
          <p className="text-[10px] font-mono text-[var(--lunar-gray)] opacity-60">
            KNOWLEDGE EXPLORER v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
