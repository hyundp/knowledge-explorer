"use client";

import { useEffect, useState } from "react";
import { PaperCard } from "@/components/PaperCard";
import { ExternalContextPanel } from "@/components/ExternalContextPanel";
import type { Paper, SearchResult } from "@/lib/types";
// Using real data from API routes
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Sparkles, ChevronLeft, ChevronRight, Globe, FileText, Database } from "lucide-react";

export default function MainHubPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchResultPage, setSearchResultPage] = useState(1);
  const papersPerPage = 5;
  const searchResultsPerPage = 3;

  useEffect(() => {
    // Fetch all papers from real data API (no limit)
    fetch('/api/papers')
      .then(res => res.json())
      .then(setPapers)
      .catch(error => console.error('Error fetching papers:', error));
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResultPage(1); // Reset to first page

    try {
      // Search in papers using the API
      const response = await fetch(`/api/papers?query=${encodeURIComponent(searchQuery)}`);
      const searchedPapers = await response.json();

      // For now, create a simple search result from the filtered papers
      if (searchedPapers.length > 0) {
        const result: SearchResult = {
          query: searchQuery,
          answer: `Found ${searchedPapers.length} papers related to "${searchQuery}"`,
          citations: searchedPapers.map((paper: Paper) => ({
            pmcid: paper.pmcid,
            title: paper.title,
            section: 'Abstract',
            quote: paper.sections.abstract.substring(0, 200) + '...',
            relevance_score: 0.8 + Math.random() * 0.2 // Random score for now
          }))
        };
        setSearchResult(result);
      } else {
        setSearchResult({
          query: searchQuery,
          answer: `No papers found for "${searchQuery}"`,
          citations: []
        });
      }
    } catch (error) {
      console.error('Error searching papers:', error);
      setSearchResult({
        query: searchQuery,
        answer: 'An error occurred while searching. Please try again.',
        citations: []
      });
    }

    setIsSearching(false);
  };

  const handleViewDetails = (paper: Paper) => {
    setSelectedPaper(paper);
    setIsDrawerOpen(true);
  };

  // Pagination calculations
  const totalPages = Math.ceil(papers.length / papersPerPage);
  const startIndex = (currentPage - 1) * papersPerPage;
  const endIndex = startIndex + papersPerPage;
  const currentPapers = papers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Main Hub</h1>
        </div>

      {/* Search */}
      <Card className="mb-8 border-2 border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,0.95)] shadow-[0_0_30px_rgba(0,180,216,0.1)]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-wider flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-[var(--earth-blue)]" />
            <span className="text-[var(--earth-blue)]">AI-POWERED</span>
            <span className="text-white">SEARCH</span>
          </CardTitle>
          <CardDescription className="text-[var(--lunar-gray)]">
            Enter topics to get relevant papers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., What are the effects of microgravity on bone density?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              <Search className="mr-2 h-4 w-4" />
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>

          {/* Search Results */}
          {searchResult && (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-[var(--lunar-gray)]">{searchResult.answer}</p>

              {searchResult.citations.length > 0 && (
                <>
                  <div className="space-y-3">
                    {searchResult.citations
                      .slice(
                        (searchResultPage - 1) * searchResultsPerPage,
                        searchResultPage * searchResultsPerPage
                      )
                      .map((citation) => {
                        const paper = papers.find(p => p.pmcid === citation.pmcid);
                        if (!paper) return null;

                        const keywords = ["microgravity", "spaceflight", "radiation", "bone loss", "muscle atrophy"];
                        const foundKeywords = keywords.filter(keyword =>
                          paper.sections.abstract.toLowerCase().includes(keyword)
                        ).slice(0, 3);

                        return (
                          <div
                            key={citation.pmcid}
                            onClick={() => window.open(paper.provenance.url, "_blank")}
                            className="rounded-lg border border-[rgba(0,180,216,0.3)] bg-[rgba(11,14,19,0.95)] p-3 transition-all hover:border-[var(--earth-blue)] hover:shadow-[0_0_15px_rgba(0,180,216,0.2)] cursor-pointer"
                          >
                            <div className="mb-2 flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-[var(--solar-gold)] px-2 py-0.5 text-xs font-bold text-black uppercase tracking-wider">
                                  {paper.pmcid}
                                </span>
                                <span className="rounded bg-[var(--nasa-blue)] px-2 py-0.5 text-xs font-bold text-white uppercase">
                                  {paper.provenance.source_type}
                                </span>
                              </div>
                              <span className="text-xs text-[var(--lunar-gray)]">
                                {paper.year}
                              </span>
                            </div>

                            <h4 className="mb-2 font-semibold leading-tight text-white line-clamp-2">{paper.title}</h4>

                            <p className="mb-2 text-xs text-[var(--lunar-gray)]">
                              {paper.authors.slice(0, 3).join(", ")}
                              {paper.authors.length > 3 && " et al."} • {paper.journal}
                            </p>

                            <p className="mb-3 text-sm text-[var(--lunar-gray)] line-clamp-3">
                              {paper.sections.abstract}
                            </p>

                            {foundKeywords.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {foundKeywords.map((keyword) => (
                                  <span
                                    key={keyword}
                                    className="rounded-full bg-[var(--nasa-blue)] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider border border-[rgba(11,61,145,0.5)]"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Pagination for search results */}
                  {searchResult.citations.length > searchResultsPerPage && (() => {
                    const totalPages = Math.ceil(searchResult.citations.length / searchResultsPerPage);
                    return (
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setSearchResultPage(p => Math.max(1, p - 1))}
                          disabled={searchResultPage === 1}
                          className="h-8 w-8"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex gap-1 items-center">
                          {(() => {
                            const pages = [];
                            const maxVisible = 5;

                            if (totalPages <= maxVisible + 1) {
                              // Show all pages if total is small
                              for (let i = 1; i <= totalPages; i++) {
                                pages.push(
                                  <Button
                                    key={i}
                                    variant={searchResultPage === i ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSearchResultPage(i)}
                                    className="h-8 w-8 text-xs"
                                  >
                                    {i}
                                  </Button>
                                );
                              }
                            } else {
                              // Complex pagination with ellipsis
                              if (searchResultPage <= maxVisible - 1) {
                                // Current page is in the beginning
                                for (let i = 1; i <= maxVisible; i++) {
                                  pages.push(
                                    <Button
                                      key={i}
                                      variant={searchResultPage === i ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setSearchResultPage(i)}
                                      className="h-8 w-8 text-xs"
                                    >
                                      {i}
                                    </Button>
                                  );
                                }
                                pages.push(
                                  <span key="ellipsis" className="px-2 text-[var(--lunar-gray)]">
                                    ...
                                  </span>
                                );
                              } else if (searchResultPage >= totalPages - 2) {
                                // Current page is near the end
                                pages.push(
                                  <Button
                                    key={1}
                                    variant={searchResultPage === 1 ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSearchResultPage(1)}
                                    className="h-8 w-8 text-xs"
                                  >
                                    1
                                  </Button>
                                );
                                pages.push(
                                  <span key="ellipsis" className="px-2 text-[var(--lunar-gray)]">
                                    ...
                                  </span>
                                );
                                for (let i = totalPages - 3; i <= totalPages; i++) {
                                  pages.push(
                                    <Button
                                      key={i}
                                      variant={searchResultPage === i ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setSearchResultPage(i)}
                                      className="h-8 w-8 text-xs"
                                    >
                                      {i}
                                    </Button>
                                  );
                                }
                              } else {
                                // Current page is in the middle
                                pages.push(
                                  <Button
                                    key={1}
                                    variant={searchResultPage === 1 ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSearchResultPage(1)}
                                    className="h-8 w-8 text-xs"
                                  >
                                    1
                                  </Button>
                                );
                                pages.push(
                                  <span key="ellipsis-1" className="px-2 text-[var(--lunar-gray)]">
                                    ...
                                  </span>
                                );
                                for (let i = searchResultPage - 1; i <= searchResultPage + 1; i++) {
                                  pages.push(
                                    <Button
                                      key={i}
                                      variant={searchResultPage === i ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setSearchResultPage(i)}
                                      className="h-8 w-8 text-xs"
                                    >
                                      {i}
                                    </Button>
                                  );
                                }
                                pages.push(
                                  <span key="ellipsis-2" className="px-2 text-[var(--lunar-gray)]">
                                    ...
                                  </span>
                                );
                              }

                              // Always add END button for last page
                              pages.push(
                                <Button
                                  key="end"
                                  variant={searchResultPage === totalPages ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setSearchResultPage(totalPages)}
                                  className="h-8 px-3 text-xs font-bold tracking-wider"
                                >
                                  END
                                </Button>
                              );
                            }

                            return pages;
                          })()}
                        </div>

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setSearchResultPage(p => Math.min(totalPages, p + 1))}
                          disabled={searchResultPage === totalPages}
                          className="h-8 w-8"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Combined Content Section */}
      <Card className="mb-8 border-2 border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,0.95)] shadow-[0_0_30px_rgba(0,180,216,0.1)]">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold tracking-wider flex items-center gap-3">
            <Database className="h-6 w-6 text-[var(--earth-blue)]" />
            <span className="text-[var(--earth-blue)]">CONTENT</span>
            <span className="text-white">HUB</span>
          </CardTitle>
          <CardDescription className="text-[var(--lunar-gray)]">
            Explore external NASA content and browse research papers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="external" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-14 mb-6 p-1 bg-[rgba(0,180,216,0.1)] border border-[rgba(0,180,216,0.3)]">
              <TabsTrigger
                value="external"
                className="flex items-center gap-2 text-sm font-bold tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--earth-blue)] data-[state=active]:to-[var(--nasa-blue)] data-[state=active]:text-white cursor-pointer"
              >
                <Globe className="h-5 w-5" />
                <span>EXTERNAL CONTEXT</span>
              </TabsTrigger>
              <TabsTrigger
                value="papers"
                className="flex items-center gap-2 text-sm font-bold tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--earth-blue)] data-[state=active]:to-[var(--nasa-blue)] data-[state=active]:text-white cursor-pointer"
              >
                <FileText className="h-5 w-5" />
                <span>BROWSE PAPERS ({papers.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* External Context Tab */}
            <TabsContent value="external" className="mt-4">
              <ExternalContextPanel />
            </TabsContent>

            {/* Papers Tab */}
            <TabsContent value="papers" className="mt-4">
              <div className="grid grid-cols-1 gap-4">
                {currentPapers.map((paper) => (
                  <PaperCard
                    key={paper.pmcid}
                    paper={paper}
                    onViewDetails={() => handleViewDetails(paper)}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
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
                      const maxVisible = 5; // Maximum visible page numbers

                      if (totalPages <= maxVisible + 1) {
                        // Show all pages if total is small
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
                        // Complex pagination with ellipsis
                        if (currentPage <= maxVisible - 1) {
                          // Current page is in the beginning
                          for (let i = 1; i <= maxVisible; i++) {
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
                          pages.push(
                            <span key="ellipsis" className="px-2 text-[var(--lunar-gray)]">
                              ...
                            </span>
                          );
                        } else if (currentPage >= totalPages - 2) {
                          // Current page is near the end
                          pages.push(
                            <Button
                              key={1}
                              variant={currentPage === 1 ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(1)}
                              className="h-8 w-8 text-xs"
                            >
                              1
                            </Button>
                          );
                          pages.push(
                            <span key="ellipsis" className="px-2 text-[var(--lunar-gray)]">
                              ...
                            </span>
                          );
                          for (let i = totalPages - 3; i <= totalPages; i++) {
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
                          // Current page is in the middle
                          pages.push(
                            <Button
                              key={1}
                              variant={currentPage === 1 ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(1)}
                              className="h-8 w-8 text-xs"
                            >
                              1
                            </Button>
                          );
                          pages.push(
                            <span key="ellipsis-1" className="px-2 text-[var(--lunar-gray)]">
                              ...
                            </span>
                          );
                          for (let i = currentPage - 1; i <= currentPage + 1; i++) {
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
                          pages.push(
                            <span key="ellipsis-2" className="px-2 text-[var(--lunar-gray)]">
                              ...
                            </span>
                          );
                        }

                        // Always add END button for last page
                        pages.push(
                          <Button
                            key="end"
                            variant={currentPage === totalPages ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(totalPages)}
                            className="h-8 px-3 text-xs font-bold tracking-wider"
                          >
                            END
                          </Button>
                        );
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>

      {/* Paper Detail Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedPaper && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedPaper.title}</SheetTitle>
                <SheetDescription>
                  {selectedPaper.authors.join(", ")}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">PMCID</h3>
                    <p className="mt-1 font-mono">{selectedPaper.pmcid}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">DOI</h3>
                    <p className="mt-1 font-mono text-sm">{selectedPaper.doi}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Journal</h3>
                    <p className="mt-1">{selectedPaper.journal}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Year</h3>
                    <p className="mt-1">{selectedPaper.year}</p>
                  </div>
                </div>

                {/* Sections */}
                <Tabs defaultValue="abstract">
                  <TabsList className="w-full">
                    <TabsTrigger value="abstract" className="cursor-pointer">Abstract</TabsTrigger>
                    <TabsTrigger value="methods" className="cursor-pointer">Methods</TabsTrigger>
                    <TabsTrigger value="results" className="cursor-pointer">Results</TabsTrigger>
                    <TabsTrigger value="discussion" className="cursor-pointer">Discussion</TabsTrigger>
                  </TabsList>
                  <TabsContent value="abstract" className="mt-4">
                    <p className="text-sm leading-relaxed">{selectedPaper.sections.abstract}</p>
                  </TabsContent>
                  <TabsContent value="methods" className="mt-4">
                    <p className="text-sm leading-relaxed">
                      {selectedPaper.sections.methods || "No methods section available"}
                    </p>
                  </TabsContent>
                  <TabsContent value="results" className="mt-4">
                    <p className="text-sm leading-relaxed">
                      {selectedPaper.sections.results || "No results section available"}
                    </p>
                  </TabsContent>
                  <TabsContent value="discussion" className="mt-4">
                    <p className="text-sm leading-relaxed">
                      {selectedPaper.sections.discussion || "No discussion section available"}
                    </p>
                  </TabsContent>
                </Tabs>

                {/* Provenance */}
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h3 className="mb-2 text-sm font-medium">Provenance</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Source Type:</span>{" "}
                      {selectedPaper.provenance.source_type.toUpperCase()}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Fetched:</span>{" "}
                      {new Date(selectedPaper.provenance.fetched_at).toLocaleDateString()}
                    </p>
                    <a
                      href={selectedPaper.provenance.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      View on PMC
                      <Search className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
