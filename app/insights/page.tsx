"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TrendingUp, AlertTriangle, Target, Clock, ChevronLeft, ChevronRight, BarChart3, ExternalLink, BookOpen } from "lucide-react";
import type { InsightsData } from "@/lib/api/insights";

interface PaperDetail {
  pmcid: string;
  title: string;
  year: number;
  journal: string;
  authors: string[];
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [topAreasPage, setTopAreasPage] = useState(0);
  const [gapsPage, setGapsPage] = useState(0);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogPapers, setDialogPapers] = useState<PaperDetail[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(false);

  const itemsPerPage = 5;

  useEffect(() => {
    fetch('/api/insights')
      .then(res => res.json())
      .then(data => {
        setInsights(data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching insights:', error);
        setIsLoading(false);
      });
  }, []);

  // Function to handle "Read More" button click
  const handleReadMore = async (pmcids: string[], title: string) => {
    setDialogTitle(title);
    setDialogOpen(true);
    setLoadingPapers(true);
    setDialogPapers([]);

    try {
      const response = await fetch('/api/papers-by-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pmcids })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch papers');
      }

      const data = await response.json();
      setDialogPapers(data.papers || []);
    } catch (error) {
      console.error('Error fetching papers:', error);
      setDialogPapers([]);
    } finally {
      setLoadingPapers(false);
    }
  };

  if (isLoading || !insights) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading insights...</div>
      </div>
    );
  }

  // Pagination logic
  const topAreasTotal = Math.min(insights.topAreas.length, 20);
  const gapsTotal = Math.min(insights.researchGaps.length, 20);
  const topAreasPages = Math.ceil(topAreasTotal / itemsPerPage);
  const gapsPages = Math.ceil(gapsTotal / itemsPerPage);

  const currentTopAreas = insights.topAreas.slice(
    topAreasPage * itemsPerPage,
    (topAreasPage + 1) * itemsPerPage
  );

  const currentGaps = insights.researchGaps.slice(
    gapsPage * itemsPerPage,
    (gapsPage + 1) * itemsPerPage
  );
  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Insights & Recommendations</h1>
      </div>

      {/* Top Research Areas */}
      <Card className="mb-8 border-2 border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,0.95)] shadow-[0_0_30px_rgba(0,180,216,0.1)]">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold tracking-wider flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-[var(--earth-blue)]" />
            <span className="text-[var(--earth-blue)]">TOP RESEARCH</span>
            <span className="text-white">AREAS</span>
          </CardTitle>
          <CardDescription className="text-[var(--lunar-gray)]">
            Most studied combinations (3+ papers) - Top {topAreasTotal} areas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {currentTopAreas.map((area, idx) => (
              <div
                key={idx}
                className="border border-[rgba(0,180,216,0.3)] rounded-lg p-4 bg-[rgba(0,180,216,0.05)] hover:bg-[rgba(0,180,216,0.1)] transition-all cursor-pointer hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-[var(--earth-blue)]">
                        #{topAreasPage * itemsPerPage + idx + 1}
                      </span>
                      <h3 className="text-base font-bold text-white">
                        {area.combination}
                      </h3>
                    </div>
                    <p className="text-sm text-[var(--lunar-gray)]">
                      {area.study_count} studies • Avg year: {area.avg_year}
                    </p>
                    {area.recent_papers > 0 && (
                      <p className="text-sm text-[var(--lunar-gray)] mt-2">
                        {area.recent_papers} papers published in the last 2 years
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`rounded px-3 py-1 text-xs font-bold tracking-wider ${
                        area.priority === "High"
                          ? "bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white"
                          : area.priority === "Medium"
                          ? "bg-[rgba(0,180,216,0.3)] text-[var(--earth-blue)]"
                          : "bg-[rgba(255,255,255,0.1)] text-[var(--lunar-gray)]"
                      }`}
                    >
                      {area.priority}
                    </span>
                    {area.pmcids && area.pmcids.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReadMore(area.pmcids, area.combination)}
                        className="mt-1 border-[var(--earth-blue)] text-[var(--earth-blue)] hover:bg-[var(--earth-blue)] hover:text-white transition-all"
                      >
                        <BookOpen className="h-4 w-4 mr-1" />
                        Read More
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {topAreasPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-[rgba(0,180,216,0.2)]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTopAreasPage(p => Math.max(0, p - 1))}
                disabled={topAreasPage === 0}
                className="border-[var(--earth-blue)] text-[var(--earth-blue)] hover:bg-[var(--earth-blue)] hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {Array.from({ length: topAreasPages }, (_, i) => (
                <Button
                  key={i}
                  variant={topAreasPage === i ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTopAreasPage(i)}
                  className={topAreasPage === i
                    ? "bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white"
                    : "border-[rgba(0,180,216,0.3)] text-[var(--lunar-gray)] hover:bg-[rgba(0,180,216,0.15)]"
                  }
                >
                  {i + 1}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setTopAreasPage(p => Math.min(topAreasPages - 1, p + 1))}
                disabled={topAreasPage === topAreasPages - 1}
                className="border-[var(--earth-blue)] text-[var(--earth-blue)] hover:bg-[var(--earth-blue)] hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Research Gaps */}
      <Card className="mb-8 border-2 border-[rgba(255,107,107,0.3)] bg-gradient-to-b from-[rgba(19,11,11,0.98)] to-[rgba(16,6,6,0.95)] shadow-[0_0_30px_rgba(255,107,107,0.1)]">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold tracking-wider flex items-center gap-3">
            <Target className="h-6 w-6 text-red-400" />
            <span className="text-red-400">PRIORITY RESEARCH</span>
            <span className="text-white">GAPS</span>
          </CardTitle>
          <CardDescription className="text-[var(--lunar-gray)]">
            Understudied combinations (1-2 papers) - Top {gapsTotal} gaps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {currentGaps.map((gap, idx) => (
              <div
                key={idx}
                className="border border-[rgba(255,107,107,0.3)] rounded-lg p-4 bg-[rgba(255,107,107,0.05)] hover:bg-[rgba(255,107,107,0.1)] transition-all cursor-pointer hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-red-400">
                        #{gapsPage * itemsPerPage + idx + 1}
                      </span>
                      <h3 className="text-base font-bold text-white">
                        {gap.combination}
                      </h3>
                    </div>
                    <p className="text-sm text-[var(--lunar-gray)]">
                      {gap.study_count} existing {gap.study_count === 1 ? 'study' : 'studies'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`rounded px-3 py-1 text-xs font-bold tracking-wider ${
                        gap.priority === "High"
                          ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
                          : "bg-[rgba(255,193,7,0.3)] text-yellow-400"
                      }`}
                    >
                      {gap.priority}
                    </span>
                    {gap.pmcids && gap.pmcids.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReadMore(gap.pmcids, gap.combination)}
                        className="mt-1 border-red-400 text-red-400 hover:bg-red-400 hover:text-white transition-all"
                      >
                        <BookOpen className="h-4 w-4 mr-1" />
                        Read More
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {gapsPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-[rgba(255,107,107,0.2)]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGapsPage(p => Math.max(0, p - 1))}
                disabled={gapsPage === 0}
                className="border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {Array.from({ length: gapsPages }, (_, i) => (
                <Button
                  key={i}
                  variant={gapsPage === i ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGapsPage(i)}
                  className={gapsPage === i
                    ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
                    : "border-[rgba(255,107,107,0.3)] text-[var(--lunar-gray)] hover:bg-[rgba(255,107,107,0.15)]"
                  }
                >
                  {i + 1}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setGapsPage(p => Math.min(gapsPages - 1, p + 1))}
                disabled={gapsPage === gapsPages - 1}
                className="border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emerging Trends */}
      <Card className="mb-8 border-2 border-[rgba(255,193,7,0.3)] bg-gradient-to-b from-[rgba(19,17,11,0.98)] to-[rgba(16,14,6,0.95)] shadow-[0_0_30px_rgba(255,193,7,0.1)]">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold tracking-wider flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-[var(--solar-gold)]" />
            <span className="text-[var(--solar-gold)]">EMERGING</span>
            <span className="text-white">TRENDS</span>
          </CardTitle>
          <CardDescription className="text-[var(--lunar-gray)]">
            Study methodologies gaining traction (5+ years ago vs. recent 2 years)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {insights.emergingTrends.map((trend, idx) => (
              <div
                key={idx}
                className="border border-[rgba(255,193,7,0.3)] rounded-lg p-5 bg-[rgba(255,193,7,0.05)] hover:bg-[rgba(255,193,7,0.1)] transition-all cursor-pointer hover:shadow-lg"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white mb-1">{trend.topic}</h3>
                  <span className="inline-block px-3 py-1 rounded text-xs font-bold bg-[rgba(255,193,7,0.2)] text-[var(--solar-gold)]">
                    {trend.trend}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--lunar-gray)]">Older (5+ yrs)</span>
                    <span className="font-mono font-bold text-white">{trend.papers_old}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--lunar-gray)]">Recent (2 yrs)</span>
                    <span className="font-mono font-bold text-[var(--solar-gold)]">{trend.papers_recent}</span>
                  </div>
                </div>

                <div className="mb-3 p-2 rounded text-center font-bold text-sm bg-gradient-to-r from-[rgba(255,193,7,0.2)] to-[rgba(255,193,7,0.3)] text-[var(--solar-gold)]">
                  {trend.growth}
                </div>

                <p className="text-xs text-[var(--lunar-gray)] leading-relaxed">
                  {trend.implication}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline Analysis */}
      <Card className="border-2 border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,0.95)] shadow-[0_0_30px_rgba(0,180,216,0.1)]">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold tracking-wider flex items-center gap-3">
            <Clock className="h-6 w-6 text-[var(--earth-blue)]" />
            <span className="text-[var(--earth-blue)]">PUBLICATION</span>
            <span className="text-white">TIMELINE</span>
          </CardTitle>
          <CardDescription className="text-[var(--lunar-gray)]">
            Papers published per year in space biology database ({insights.timeline.length} years tracked)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex h-80 items-end gap-1 bg-[rgba(0,0,0,0.3)] rounded-lg p-6">
            {insights.timeline.map((data) => {
              const maxCount = Math.max(...insights.timeline.map(t => t.count));
              const heightPercent = (data.count / maxCount) * 100;
              return (
                <div key={data.year} className="flex flex-1 flex-col items-center gap-2 min-w-0">
                  <div className="relative group w-full cursor-pointer">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-[var(--earth-blue)] to-[var(--nasa-blue)] transition-all hover:from-[var(--nasa-blue)] hover:to-[var(--earth-blue)] shadow-lg hover:shadow-[0_0_20px_rgba(0,180,216,0.5)] hover:scale-110"
                      style={{
                        height: `${Math.max(heightPercent * 2.8, 20)}px`,
                        minWidth: '8px'
                      }}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block bg-[rgba(0,180,216,0.95)] text-white px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap shadow-xl border-2 border-[var(--earth-blue)] z-10">
                      <div className="text-center">
                        <div className="text-[var(--solar-gold)]">{data.year}</div>
                        <div>{data.count} papers</div>
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[var(--earth-blue)]"></div>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--lunar-gray)] font-mono transform -rotate-45 origin-top-left mt-2">
                    {data.year}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-4 rounded bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)]"></div>
              <span className="text-[var(--lunar-gray)]">Publication volume</span>
            </div>
            <div className="text-[var(--lunar-gray)]">•</div>
            <div className="text-[var(--lunar-gray)]">
              Total: <span className="font-bold text-white">{insights.totalPapers}</span> papers
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Papers Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-7 w-7" />
              Papers
            </DialogTitle>
            <DialogDescription className="text-base">
              {dialogTitle}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto pr-2">
            {loadingPapers ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-[var(--lunar-gray)]">Loading papers...</div>
              </div>
            ) : dialogPapers.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-[var(--lunar-gray)]">No papers found</div>
              </div>
            ) : (
              <div className="space-y-4">
                {dialogPapers.map((paper, idx) => (
                  <div
                    key={paper.pmcid}
                    className="border border-[rgba(0,180,216,0.3)] rounded-lg p-4 bg-[rgba(0,180,216,0.05)] hover:bg-[rgba(0,180,216,0.1)] transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-mono text-[var(--earth-blue)] shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-white mb-2 leading-snug">
                          {paper.title}
                        </h3>
                        <div className="space-y-1 text-sm text-[var(--lunar-gray)]">
                          <div>
                            <span className="font-medium">Authors:</span> {paper.authors.join(', ')}
                            {paper.authors.length >= 3 && ' et al.'}
                          </div>
                          <div>
                            <span className="font-medium">Journal:</span> {paper.journal} ({paper.year})
                          </div>
                        </div>
                        <a
                          href={`https://www.ncbi.nlm.nih.gov/pmc/articles/${paper.pmcid}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 text-sm font-medium text-[var(--earth-blue)] border border-[var(--earth-blue)] rounded hover:bg-[var(--earth-blue)] hover:text-white transition-all"
                        >
                          View on PubMed Central
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
