"use client";

import { useState, useEffect } from "react";
import { Microscope, ChevronLeft, ChevronRight, Award, TestTube2 } from "lucide-react";
import { useFilterStore } from "@/lib/store/filterStore";
import { PaperCard } from "@/components/PaperCard";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Paper } from "@/lib/types";

interface AssayStats {
  assay: string;
  count: number;
  percentage: number;
  avgYear: number;
}

export default function ScientistLab() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [assayStats, setAssayStats] = useState<AssayStats[]>([]);
  const [selectedAssay, setSelectedAssay] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentAssayPage, setCurrentAssayPage] = useState(1);
  const papersPerPage = 5;
  const assaysPerPage = 5;

  const { assays, organisms, tissues, exposures } = useFilterStore();

  // Fetch papers and calculate statistics
  useEffect(() => {
    fetch('/api/papers')
      .then(res => res.json())
      .then(data => {
        setPapers(data);

        // Calculate assay statistics with year info
        const assayCount: Record<string, { count: number; years: number[] }> = {};
        const totalPapers = data.length;

        data.forEach((paper: Paper) => {
          const methods = paper.sections.methods?.toLowerCase() || '';

          // Count assay mentions (15 types)
          if (methods.includes('rna-seq') || methods.includes('rnaseq') || methods.includes('transcriptom')) {
            assayCount['RNA-seq'] = assayCount['RNA-seq'] || { count: 0, years: [] };
            assayCount['RNA-seq'].count++;
            assayCount['RNA-seq'].years.push(paper.year);
          }
          if (methods.includes('qpcr') || methods.includes('rt-pcr') || methods.includes('real-time pcr')) {
            assayCount['qPCR'] = assayCount['qPCR'] || { count: 0, years: [] };
            assayCount['qPCR'].count++;
            assayCount['qPCR'].years.push(paper.year);
          }
          if (methods.includes('western blot') || methods.includes('immunoblot')) {
            assayCount['Western Blot'] = assayCount['Western Blot'] || { count: 0, years: [] };
            assayCount['Western Blot'].count++;
            assayCount['Western Blot'].years.push(paper.year);
          }
          if (methods.includes('microarray')) {
            assayCount['Microarray'] = assayCount['Microarray'] || { count: 0, years: [] };
            assayCount['Microarray'].count++;
            assayCount['Microarray'].years.push(paper.year);
          }
          if (methods.includes('proteomics') || methods.includes('proteom') || methods.includes('protein profil')) {
            assayCount['Proteomics'] = assayCount['Proteomics'] || { count: 0, years: [] };
            assayCount['Proteomics'].count++;
            assayCount['Proteomics'].years.push(paper.year);
          }
          if (methods.includes('histolog') || methods.includes('immunohistochemistry')) {
            assayCount['Histology'] = assayCount['Histology'] || { count: 0, years: [] };
            assayCount['Histology'].count++;
            assayCount['Histology'].years.push(paper.year);
          }
          if (methods.includes('imaging') || methods.includes('microscop')) {
            assayCount['Microscopy'] = assayCount['Microscopy'] || { count: 0, years: [] };
            assayCount['Microscopy'].count++;
            assayCount['Microscopy'].years.push(paper.year);
          }
          if (methods.includes('sequencing') || methods.includes('whole genome')) {
            assayCount['Sequencing'] = assayCount['Sequencing'] || { count: 0, years: [] };
            assayCount['Sequencing'].count++;
            assayCount['Sequencing'].years.push(paper.year);
          }
          if (methods.includes('cell culture') || methods.includes('in vitro')) {
            assayCount['Cell Culture'] = assayCount['Cell Culture'] || { count: 0, years: [] };
            assayCount['Cell Culture'].count++;
            assayCount['Cell Culture'].years.push(paper.year);
          }
          if (methods.includes('in vivo') || methods.includes('animal')) {
            assayCount['In Vivo'] = assayCount['In Vivo'] || { count: 0, years: [] };
            assayCount['In Vivo'].count++;
            assayCount['In Vivo'].years.push(paper.year);
          }
          if (methods.includes('metabolom')) {
            assayCount['Metabolomics'] = assayCount['Metabolomics'] || { count: 0, years: [] };
            assayCount['Metabolomics'].count++;
            assayCount['Metabolomics'].years.push(paper.year);
          }
          if (methods.includes('elisa')) {
            assayCount['ELISA'] = assayCount['ELISA'] || { count: 0, years: [] };
            assayCount['ELISA'].count++;
            assayCount['ELISA'].years.push(paper.year);
          }
          if (methods.includes('flow cytometry') || methods.includes('facs')) {
            assayCount['Flow Cytometry'] = assayCount['Flow Cytometry'] || { count: 0, years: [] };
            assayCount['Flow Cytometry'].count++;
            assayCount['Flow Cytometry'].years.push(paper.year);
          }
          if (methods.includes('mass spectrometry')) {
            assayCount['Mass Spectrometry'] = assayCount['Mass Spectrometry'] || { count: 0, years: [] };
            assayCount['Mass Spectrometry'].count++;
            assayCount['Mass Spectrometry'].years.push(paper.year);
          }
          if (methods.includes('immunofluorescence') || methods.includes('immunostain')) {
            assayCount['Immunofluorescence'] = assayCount['Immunofluorescence'] || { count: 0, years: [] };
            assayCount['Immunofluorescence'].count++;
            assayCount['Immunofluorescence'].years.push(paper.year);
          }
        });

        const stats = Object.entries(assayCount)
          .map(([assay, assayData]) => ({
            assay,
            count: assayData.count,
            percentage: (assayData.count / totalPapers) * 100,
            avgYear: assayData.years.reduce((a, b) => a + b, 0) / assayData.years.length
          }))
          .filter(stat => stat.count > 0)
          .sort((a, b) => b.count - a.count);

        setAssayStats(stats);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching papers:', error);
        setLoading(false);
      });
  }, []);

  // Filter papers by selected assay
  const filteredPapers = selectedAssay
    ? papers.filter(paper => {
        const methods = paper.sections.methods?.toLowerCase() || '';

        // Match the same patterns used for counting
        if (selectedAssay === 'RNA-seq') {
          return methods.includes('rna-seq') || methods.includes('rnaseq') || methods.includes('transcriptom');
        }
        if (selectedAssay === 'qPCR') {
          return methods.includes('qpcr') || methods.includes('rt-pcr') || methods.includes('real-time pcr');
        }
        if (selectedAssay === 'Western Blot') {
          return methods.includes('western blot') || methods.includes('immunoblot');
        }
        if (selectedAssay === 'Microarray') {
          return methods.includes('microarray');
        }
        if (selectedAssay === 'Proteomics') {
          return methods.includes('proteomics') || methods.includes('proteom') || methods.includes('protein profil');
        }
        if (selectedAssay === 'Histology') {
          return methods.includes('histolog') || methods.includes('immunohistochemistry');
        }
        if (selectedAssay === 'Microscopy') {
          return methods.includes('imaging') || methods.includes('microscop');
        }
        if (selectedAssay === 'Sequencing') {
          return methods.includes('sequencing') || methods.includes('whole genome');
        }
        if (selectedAssay === 'Cell Culture') {
          return methods.includes('cell culture') || methods.includes('in vitro');
        }
        if (selectedAssay === 'In Vivo') {
          return methods.includes('in vivo') || methods.includes('animal');
        }
        if (selectedAssay === 'Metabolomics') {
          return methods.includes('metabolom');
        }
        if (selectedAssay === 'ELISA') {
          return methods.includes('elisa');
        }
        if (selectedAssay === 'Flow Cytometry') {
          return methods.includes('flow cytometry') || methods.includes('facs');
        }
        if (selectedAssay === 'Mass Spectrometry') {
          return methods.includes('mass spectrometry');
        }
        if (selectedAssay === 'Immunofluorescence') {
          return methods.includes('immunofluorescence') || methods.includes('immunostain');
        }

        return false;
      })
    : papers;

  // Publication quality metrics (filtered by assay)
  const journalCounts: Record<string, number> = {};
  const yearCounts: Record<number, number> = {};

  filteredPapers.forEach(paper => {
    journalCounts[paper.journal] = (journalCounts[paper.journal] || 0) + 1;
    yearCounts[paper.year] = (yearCounts[paper.year] || 0) + 1;
  });

  const topJournals = Object.entries(journalCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const yearDistribution = Object.entries(yearCounts)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

  // Find max percentage across ALL assays to normalize bar widths
  const maxPercentage = assayStats.length > 0
    ? Math.max(...assayStats.map(a => a.percentage))
    : 100;

  // Assay Pagination
  const totalAssayPages = Math.ceil(assayStats.length / assaysPerPage);
  const indexOfLastAssay = currentAssayPage * assaysPerPage;
  const indexOfFirstAssay = indexOfLastAssay - assaysPerPage;
  const currentAssays = assayStats.slice(indexOfFirstAssay, indexOfLastAssay);

  // Papers Pagination
  const totalPages = Math.ceil(filteredPapers.length / papersPerPage);
  const indexOfLastPaper = currentPage * papersPerPage;
  const indexOfFirstPaper = indexOfLastPaper - papersPerPage;
  const currentPapers = filteredPapers.slice(indexOfFirstPaper, indexOfLastPaper);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAssayPageChange = (page: number) => {
    setCurrentAssayPage(page);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAssay]);

  if (loading) {
    return (
      <div className="h-full overflow-y-auto bg-gradient-to-br from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,1)] flex items-center justify-center">
        <div className="text-[var(--earth-blue)] text-lg">Loading scientist lab...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,1)]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Microscope className="h-10 w-10 text-[var(--earth-blue)]" />
            <h1 className="text-4xl font-bold tracking-wider">
              <span className="text-[var(--earth-blue)]">SCIENTIST</span>{" "}
              <span className="text-white">LAB</span>
            </h1>
          </div>
        </div>

        {/* Assay-Specific Analysis Tools */}
        <Card className="mb-8 border-2 border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,0.95)] shadow-[0_0_30px_rgba(0,180,216,0.1)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold tracking-wider flex items-center gap-3">
              <TestTube2 className="h-6 w-6 text-[var(--earth-blue)]" />
              <span className="text-[var(--earth-blue)]">ASSAY-SPECIFIC</span>
              <span className="text-white">ANALYSIS</span>
            </CardTitle>
            <CardDescription className="text-[var(--lunar-gray)]">
              Methodological breakdown and temporal trends across {papers.length} studies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentAssays.map((stat) => (
                <div key={stat.assay} className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="w-32 text-sm text-muted-foreground font-mono">{stat.assay}</div>
                    <div
                      className="flex-1 h-12 bg-[rgba(0,180,216,0.1)] rounded relative overflow-hidden cursor-pointer hover:bg-[rgba(0,180,216,0.15)] transition-all"
                      onClick={() => setSelectedAssay(selectedAssay === stat.assay ? null : stat.assay)}
                    >
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-[var(--earth-blue)] to-[rgba(0,180,216,0.5)]"
                        style={{ width: `${(stat.percentage / maxPercentage) * 100}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-between px-4">
                        <div className="text-xs text-white font-mono z-10">
                          {stat.percentage.toFixed(1)}%
                        </div>
                        <div className="text-xs text-[var(--earth-blue)] font-mono z-10 flex items-center gap-3">
                          <span>n={stat.count}</span>
                          <span className="text-[var(--solar-gold)]">avg: {stat.avgYear.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Assay Pagination */}
            {totalAssayPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleAssayPageChange(currentAssayPage - 1)}
                  disabled={currentAssayPage === 1}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex gap-1 items-center">
                  {(() => {
                    const pages = [];
                    const maxVisible = 5;

                    if (totalAssayPages <= maxVisible + 1) {
                      for (let i = 1; i <= totalAssayPages; i++) {
                        pages.push(
                          <Button
                            key={i}
                            variant={currentAssayPage === i ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleAssayPageChange(i)}
                            className="h-8 w-8 text-xs"
                          >
                            {i}
                          </Button>
                        );
                      }
                    } else {
                      if (currentAssayPage <= maxVisible - 1) {
                        for (let i = 1; i <= maxVisible; i++) {
                          pages.push(
                            <Button key={i} variant={currentAssayPage === i ? "default" : "outline"} size="sm" onClick={() => handleAssayPageChange(i)} className="h-8 w-8 text-xs">{i}</Button>
                          );
                        }
                        pages.push(<span key="ellipsis" className="px-2 text-[var(--lunar-gray)]">...</span>);
                      } else if (currentAssayPage >= totalAssayPages - 2) {
                        pages.push(<Button key={1} variant={currentAssayPage === 1 ? "default" : "outline"} size="sm" onClick={() => handleAssayPageChange(1)} className="h-8 w-8 text-xs">1</Button>);
                        pages.push(<span key="ellipsis" className="px-2 text-[var(--lunar-gray)]">...</span>);
                        for (let i = totalAssayPages - 3; i <= totalAssayPages; i++) {
                          pages.push(<Button key={i} variant={currentAssayPage === i ? "default" : "outline"} size="sm" onClick={() => handleAssayPageChange(i)} className="h-8 w-8 text-xs">{i}</Button>);
                        }
                      } else {
                        pages.push(<Button key={1} variant={currentAssayPage === 1 ? "default" : "outline"} size="sm" onClick={() => handleAssayPageChange(1)} className="h-8 w-8 text-xs">1</Button>);
                        pages.push(<span key="ellipsis-1" className="px-2 text-[var(--lunar-gray)]">...</span>);
                        for (let i = currentAssayPage - 1; i <= currentAssayPage + 1; i++) {
                          pages.push(<Button key={i} variant={currentAssayPage === i ? "default" : "outline"} size="sm" onClick={() => handleAssayPageChange(i)} className="h-8 w-8 text-xs">{i}</Button>);
                        }
                        pages.push(<span key="ellipsis-2" className="px-2 text-[var(--lunar-gray)]">...</span>);
                      }
                      pages.push(<Button key="end" variant={currentAssayPage === totalAssayPages ? "default" : "outline"} size="sm" onClick={() => handleAssayPageChange(totalAssayPages)} className="h-8 px-3 text-xs font-bold tracking-wider">END</Button>);
                    }
                    return pages;
                  })()}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleAssayPageChange(currentAssayPage + 1)}
                  disabled={currentAssayPage === totalAssayPages}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {selectedAssay && (
              <div className="mt-4 p-4 bg-[rgba(0,180,216,0.1)] border border-[rgba(0,180,216,0.3)] rounded">
                <div className="text-sm text-[var(--earth-blue)] font-semibold mb-2">
                  Filtered by: {selectedAssay}
                </div>
                <div className="text-xs text-muted-foreground">
                  Showing {filteredPapers.length} papers using {selectedAssay} methodology.
                  Click bar again to clear filter.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Research Papers */}
        <Card className="mb-8 border-2 border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,0.95)] shadow-[0_0_30px_rgba(0,180,216,0.1)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold tracking-wider flex items-center gap-3">
              <Microscope className="h-6 w-6 text-[var(--earth-blue)]" />
              <span className="text-[var(--earth-blue)]">
                {selectedAssay ? selectedAssay.toUpperCase() : 'ALL'}
              </span>
              <span className="text-white">STUDIES</span>
              <span className="text-sm font-normal text-[var(--lunar-gray)] ml-auto">
                ({filteredPapers.length} papers)
              </span>
            </CardTitle>
            <CardDescription className="text-[var(--lunar-gray)]">
              {selectedAssay
                ? `Browse papers using ${selectedAssay} methodology`
                : 'Browse all research papers across assay types'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              {currentPapers.map((paper) => (
                <PaperCard key={paper.pmcid} paper={paper} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex gap-1 items-center">
                  {(() => {
                    const pages = [];
                    const maxVisible = 5;

                    if (totalPages <= maxVisible + 1) {
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(
                          <Button
                            key={i}
                            variant={currentPage === i ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(i)}
                            className="h-8 w-8 text-xs"
                          >
                            {i}
                          </Button>
                        );
                      }
                    } else {
                      if (currentPage <= maxVisible - 1) {
                        for (let i = 1; i <= maxVisible; i++) {
                          pages.push(
                            <Button key={i} variant={currentPage === i ? "default" : "outline"} size="sm" onClick={() => handlePageChange(i)} className="h-8 w-8 text-xs">{i}</Button>
                          );
                        }
                        pages.push(<span key="ellipsis" className="px-2 text-[var(--lunar-gray)]">...</span>);
                      } else if (currentPage >= totalPages - 2) {
                        pages.push(<Button key={1} variant={currentPage === 1 ? "default" : "outline"} size="sm" onClick={() => handlePageChange(1)} className="h-8 w-8 text-xs">1</Button>);
                        pages.push(<span key="ellipsis" className="px-2 text-[var(--lunar-gray)]">...</span>);
                        for (let i = totalPages - 3; i <= totalPages; i++) {
                          pages.push(<Button key={i} variant={currentPage === i ? "default" : "outline"} size="sm" onClick={() => handlePageChange(i)} className="h-8 w-8 text-xs">{i}</Button>);
                        }
                      } else {
                        pages.push(<Button key={1} variant={currentPage === 1 ? "default" : "outline"} size="sm" onClick={() => handlePageChange(1)} className="h-8 w-8 text-xs">1</Button>);
                        pages.push(<span key="ellipsis-1" className="px-2 text-[var(--lunar-gray)]">...</span>);
                        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                          pages.push(<Button key={i} variant={currentPage === i ? "default" : "outline"} size="sm" onClick={() => handlePageChange(i)} className="h-8 w-8 text-xs">{i}</Button>);
                        }
                        pages.push(<span key="ellipsis-2" className="px-2 text-[var(--lunar-gray)]">...</span>);
                      }
                      pages.push(<Button key="end" variant={currentPage === totalPages ? "default" : "outline"} size="sm" onClick={() => handlePageChange(totalPages)} className="h-8 px-3 text-xs font-bold tracking-wider">END</Button>);
                    }
                    return pages;
                  })()}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Publication Quality Metrics */}
        <Card className="mb-8 border-2 border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,0.95)] shadow-[0_0_30px_rgba(0,180,216,0.1)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold tracking-wider flex items-center gap-3">
              <Award className="h-6 w-6 text-[var(--earth-blue)]" />
              <span className="text-[var(--earth-blue)]">PUBLICATION</span>
              <span className="text-white">METRICS</span>
            </CardTitle>
            <CardDescription className="text-[var(--lunar-gray)]">
              Journal distribution and temporal publication trends
              {selectedAssay && ` (${selectedAssay} studies)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="journals" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="journals">Top Journals</TabsTrigger>
                <TabsTrigger value="timeline">Publication Timeline</TabsTrigger>
              </TabsList>

              <TabsContent value="journals">
                <div className="space-y-3">
                  {topJournals.map(([journal, count], idx) => (
                    <div key={journal} className="flex items-center gap-3">
                      <div className="text-sm text-[var(--solar-gold)] font-bold w-6">#{idx + 1}</div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-white truncate">{journal}</span>
                          <span className="text-sm text-[var(--earth-blue)] font-mono ml-2">{count}</span>
                        </div>
                        <div className="h-2 bg-[rgba(0,180,216,0.1)] rounded overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[var(--earth-blue)] to-[rgba(0,180,216,0.5)]"
                            style={{ width: `${(count / filteredPapers.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="timeline">
                <div className="space-y-2">
                  {yearDistribution.map(([year, count]) => (
                    <div key={year} className="flex items-center gap-3">
                      <div className="w-12 text-sm text-muted-foreground font-mono">{year}</div>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-6 bg-[rgba(0,180,216,0.1)] rounded overflow-hidden">
                          <div
                            className="h-full bg-[var(--earth-blue)]"
                            style={{ width: `${(count / Math.max(...Object.values(yearCounts))) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-[var(--earth-blue)] font-mono w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
