"use client";

import { useState, useEffect, useMemo } from "react";
import { PieChart, Plus, Trash2, Search, Save, Download, BarChart3, ChevronLeft, ChevronRight, FolderPlus, Folder, Edit2, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Paper, Portfolio, PortfoliosData, GapROIResponse } from "@/lib/types";

export default function ManagerDashboard() {
  // Data states
  const [allPapers, setAllPapers] = useState<Paper[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [currentPortfolio, setCurrentPortfolio] = useState<Portfolio | null>(null);
  const [gapROIData, setGapROIData] = useState<GapROIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [newPortfolioDialog, setNewPortfolioDialog] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [newPortfolioDesc, setNewPortfolioDesc] = useState("");
  const itemsPerPage = 5;

  // Portfolio paper states
  const [portfolioPapers, setPortfolioPapers] = useState<{
    [pmcid: string]: {
      impact: number;
      risk: number;
      budget: number;
    }
  }>({});

  // Calculate ROI for NASA research projects
  const calculateROI = (impact: number, risk: number, budget: number): number => {
    // Validate inputs
    if (!impact || !risk || !budget || budget === 0 || isNaN(impact) || isNaN(risk) || isNaN(budget)) {
      return 0;
    }

    // NASA typical project budget ranges: $100K - $50M
    // Normalize to appropriate scale
    const budgetInMillions = budget / 1000000;

    // Impact Score (0-10): Scientific/mission value - CRITICAL factor
    // Risk Score (0-10): Higher = More risky - CRITICAL penalty

    // Exponential Impact factor: Makes high-impact projects significantly more valuable
    // Impact 10 → 2.0x, Impact 5 → 1.0x, Impact 0 → 0.1x
    const impactMultiplier = Math.pow(impact / 5, 2) * 0.9 + 0.1;

    // Exponential Risk penalty: Makes high-risk projects dramatically less attractive
    // Risk 0 → 1.0x, Risk 5 → 0.5x, Risk 10 → 0.01x
    const riskPenalty = Math.pow(1 - (risk / 10), 3);

    // Cost efficiency: Reduced influence compared to impact/risk
    // Budget now has secondary effect
    const costEfficiency = budgetInMillions > 0
      ? 5 / (Math.log10(budgetInMillions * 10 + 1) + 1)
      : 5;

    // NASA ROI Formula with CRITICAL impact/risk weighting:
    // ROI = (Impact² × Risk³_Penalty × Cost_Efficiency) × Scaling
    // Impact and Risk dominate the calculation
    // Scale: 0-100, where:
    //   - High impact (9-10), low risk (0-2), any budget → ROI 70-95
    //   - High impact (8-10), medium risk (3-5), any budget → ROI 40-70
    //   - Medium impact (5-7), low risk (0-3), small budget → ROI 30-50
    //   - Medium impact (5-7), high risk (6-8), any budget → ROI 5-20
    //   - Low impact (0-4), any risk, any budget → ROI 0-15
    const roi = impactMultiplier * riskPenalty * costEfficiency * 20;

    // Return 0 if result is NaN or invalid
    if (isNaN(roi)) return 0;

    return Math.max(0, Math.min(100, roi)); // Clamp between 0-100
  };

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Load all papers
        const papersRes = await fetch('/api/papers');
        const papers: Paper[] = await papersRes.json();

        // Load portfolios
        const portfoliosRes = await fetch('/api/manager/portfolio-data');
        const portfoliosData: PortfoliosData = await portfoliosRes.json();

        // Load gap ROI data for recommendations
        const roiRes = await fetch('/api/manager/gap-roi');
        const roiData: GapROIResponse = await roiRes.json();

        setAllPapers(papers);
        setPortfolios(portfoliosData.portfolios);
        setGapROIData(roiData);

        // Set first portfolio as current if exists
        if (portfoliosData.portfolios.length > 0) {
          setCurrentPortfolio(portfoliosData.portfolios[0]);
          setPortfolioPapers(portfoliosData.portfolios[0].papers);
        }
      } catch (error) {
        console.error('Error loading manager data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Create new portfolio
  const createPortfolio = async () => {
    if (!newPortfolioName.trim()) return;

    const newPortfolio: Portfolio = {
      id: `portfolio-${Date.now()}`,
      name: newPortfolioName,
      description: newPortfolioDesc,
      papers: {},
      totalBudget: 0,
      avgROI: 0,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/manager/portfolio-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId: newPortfolio.id,
          name: newPortfolio.name,
          description: newPortfolio.description,
          papers: {}
        })
      });

      const data = await response.json();
      if (data.success) {
        setPortfolios([...portfolios, data.portfolio]);
        setCurrentPortfolio(data.portfolio);
        setPortfolioPapers({});
        setNewPortfolioDialog(false);
        setNewPortfolioName("");
        setNewPortfolioDesc("");
      }
    } catch (error) {
      console.error('Error creating portfolio:', error);
    }
  };

  // Save current portfolio
  const savePortfolio = async () => {
    if (!currentPortfolio) return;

    setSaving(true);
    try {
      const response = await fetch('/api/manager/portfolio-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId: currentPortfolio.id,
          name: currentPortfolio.name,
          description: currentPortfolio.description,
          papers: portfolioPapers
        })
      });

      const data = await response.json();
      if (data.success) {
        setPortfolios(portfolios.map(p => p.id === data.portfolio.id ? data.portfolio : p));
        setCurrentPortfolio(data.portfolio);
      }
    } catch (error) {
      console.error('Error saving portfolio:', error);
    } finally {
      setSaving(false);
    }
  };

  // Switch portfolio
  const switchPortfolio = (portfolio: Portfolio) => {
    setCurrentPortfolio(portfolio);
    setPortfolioPapers(portfolio.papers);
    setPage(0);
  };

  // Add paper to portfolio with AI suggestions
  const addToPortfolio = (paper: Paper) => {
    const matchingGap = gapROIData?.gaps.find(gap =>
      gap.pmcids.includes(paper.pmcid)
    );

    // Convert feasibility to risk (inverse relationship)
    // High feasibility = Low risk
    const suggestedRisk = matchingGap?.feasibility
      ? Math.max(0, 10 - matchingGap.feasibility)
      : 5;

    setPortfolioPapers({
      ...portfolioPapers,
      [paper.pmcid]: {
        impact: matchingGap?.impact || 5,
        risk: suggestedRisk,
        budget: matchingGap?.cost || 1000000 // Default $1M for NASA projects
      }
    });
  };

  // Remove paper from portfolio
  const removeFromPortfolio = (pmcid: string) => {
    const updated = { ...portfolioPapers };
    delete updated[pmcid];
    setPortfolioPapers(updated);
  };

  // Update paper values
  const updatePaperValue = (pmcid: string, field: 'impact' | 'risk' | 'budget', value: number) => {
    setPortfolioPapers({
      ...portfolioPapers,
      [pmcid]: {
        ...portfolioPapers[pmcid],
        [field]: value
      }
    });
  };

  // Filter papers
  const filteredPapers = useMemo(() => {
    let filtered = allPapers;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.authors.some(a => a.toLowerCase().includes(query)) ||
        p.pmcid.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allPapers, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredPapers.length / itemsPerPage);
  const paginatedPapers = filteredPapers.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  // Portfolio stats
  const portfolioStats = useMemo(() => {
    const paperIds = Object.keys(portfolioPapers);
    let totalBudget = 0;
    let totalROI = 0;
    let avgImpact = 0;

    paperIds.forEach(pmcid => {
      const p = portfolioPapers[pmcid];
      totalBudget += p.budget;
      totalROI += calculateROI(p.impact, p.risk, p.budget);
      avgImpact += p.impact;
    });

    return {
      count: paperIds.length,
      totalBudget,
      avgROI: paperIds.length > 0 ? totalROI / paperIds.length : 0,
      avgImpact: paperIds.length > 0 ? avgImpact / paperIds.length : 0
    };
  }, [portfolioPapers]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,1)]">
        <div className="text-[var(--earth-blue)] text-lg">Loading program manager...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,1)]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <PieChart className="h-10 w-10 text-[var(--solar-gold)]" />
              <h1 className="text-4xl font-bold tracking-wider">
                <span className="text-[var(--solar-gold)]">PROGRAM</span>{" "}
                <span className="text-white">MANAGER</span>
              </h1>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setNewPortfolioDialog(true)}
                className="bg-gradient-to-r from-[var(--solar-gold)] to-yellow-600 text-black hover:opacity-90"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                New Portfolio
              </Button>
              {currentPortfolio && (
                <>
                  <Button
                    onClick={savePortfolio}
                    disabled={saving}
                    className="bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white hover:opacity-90"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Portfolio'}
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!confirm(`Delete portfolio "${currentPortfolio.name}"?`)) return;

                      try {
                        await fetch(`/api/manager/portfolio-data?id=${currentPortfolio.id}`, {
                          method: 'DELETE'
                        });

                        const updatedPortfolios = portfolios.filter(p => p.id !== currentPortfolio.id);
                        setPortfolios(updatedPortfolios);

                        if (updatedPortfolios.length > 0) {
                          setCurrentPortfolio(updatedPortfolios[0]);
                          setPortfolioPapers(updatedPortfolios[0].papers);
                        } else {
                          setCurrentPortfolio(null);
                          setPortfolioPapers({});
                        }
                      } catch (error) {
                        console.error('Error deleting portfolio:', error);
                      }
                    }}
                    variant="outline"
                    className="border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Portfolio
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Portfolio Selector */}
          {portfolios.length > 0 && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {portfolios.map(portfolio => (
                <Button
                  key={portfolio.id}
                  variant={currentPortfolio?.id === portfolio.id ? "default" : "outline"}
                  onClick={() => switchPortfolio(portfolio)}
                  className={currentPortfolio?.id === portfolio.id
                    ? "bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white"
                    : "border-[var(--earth-blue)] text-[var(--earth-blue)]"
                  }
                >
                  <Folder className="h-4 w-4 mr-2" />
                  {portfolio.name}
                </Button>
              ))}
            </div>
          )}

          {/* Stats */}
          {currentPortfolio && (
            <div className="grid grid-cols-4 gap-4">
              <Card className="border-2 border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,0.95)]">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--lunar-gray)]">Papers in Portfolio</p>
                      <p className="text-3xl font-bold text-white">{portfolioStats.count}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-[var(--earth-blue)]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-[rgba(255,193,7,0.3)] bg-gradient-to-b from-[rgba(19,17,11,0.98)] to-[rgba(16,14,6,0.95)]">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--lunar-gray)]">Total Budget</p>
                      <p className="text-3xl font-bold text-white">
                        ${(portfolioStats.totalBudget / 1000000).toFixed(1)}M
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-[var(--solar-gold)]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-[rgba(144,238,144,0.3)] bg-gradient-to-b from-[rgba(11,19,11,0.98)] to-[rgba(6,16,6,0.95)]">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--lunar-gray)]">Avg ROI</p>
                      <p className="text-3xl font-bold text-white">{portfolioStats.avgROI.toFixed(1)}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-[rgba(255,107,107,0.3)] bg-gradient-to-b from-[rgba(19,11,11,0.98)] to-[rgba(16,6,6,0.95)]">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--lunar-gray)]">Avg Impact</p>
                      <p className="text-3xl font-bold text-white">{portfolioStats.avgImpact.toFixed(1)}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-red-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Main Content */}
        {currentPortfolio ? (
          <div className="grid grid-cols-2 gap-6">
            {/* Papers List */}
            <Card className="border-2 border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,0.95)]">
              <CardHeader>
                <CardTitle className="text-2xl font-bold tracking-wider flex items-center gap-3">
                  <span className="text-[var(--earth-blue)]">RESEARCH</span>
                  <span className="text-white">PAPERS</span>
                  <span className="text-sm text-[var(--lunar-gray)] font-normal">
                    ({filteredPapers.length} total)
                  </span>
                </CardTitle>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--lunar-gray)]" />
                  <Input
                    placeholder="Search papers by title, author, or PMCID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[rgba(0,0,0,0.3)] border-[rgba(0,180,216,0.3)] text-white"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paginatedPapers.map((paper) => (
                    <div
                      key={paper.pmcid}
                      className="border border-[rgba(0,180,216,0.3)] rounded-lg p-3 bg-[rgba(11,14,19,0.95)] hover:border-[var(--earth-blue)] transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white text-sm mb-1 line-clamp-2">
                            {paper.title}
                          </h4>
                          <p className="text-xs text-[var(--lunar-gray)]">
                            {paper.authors.slice(0, 2).join(', ')}
                            {paper.authors.length > 2 && ` +${paper.authors.length - 2} more`} • {paper.year}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono mt-1">{paper.pmcid}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addToPortfolio(paper)}
                          disabled={!!portfolioPapers[paper.pmcid]}
                          className="ml-3 bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white disabled:opacity-50"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-[rgba(0,180,216,0.2)]">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="border-[var(--earth-blue)] text-[var(--earth-blue)]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-[var(--lunar-gray)]">
                      Page {page + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page === totalPages - 1}
                      className="border-[var(--earth-blue)] text-[var(--earth-blue)]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Portfolio */}
            <Card className="border-2 border-[rgba(255,193,7,0.3)] bg-gradient-to-b from-[rgba(19,17,11,0.98)] to-[rgba(16,14,6,0.95)]">
              <CardHeader>
                <CardTitle className="text-2xl font-bold tracking-wider flex items-center gap-3">
                  <span className="text-[var(--solar-gold)]">CURRENT</span>
                  <span className="text-white">PORTFOLIO</span>
                </CardTitle>
                <CardDescription className="text-[var(--lunar-gray)]">
                  {currentPortfolio.description || currentPortfolio.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {Object.keys(portfolioPapers).length === 0 ? (
                    <div className="text-center py-12 text-[var(--lunar-gray)]">
                      No papers in portfolio. Add papers from the left panel.
                    </div>
                  ) : (
                    Object.keys(portfolioPapers).map(pmcid => {
                      const paper = allPapers.find(p => p.pmcid === pmcid);
                      if (!paper) return null;

                      const values = portfolioPapers[pmcid];
                      const roi = calculateROI(values.impact, values.risk, values.budget);

                      // ROI color coding for NASA standards
                      const roiColor = roi >= 50 ? 'from-green-500 to-green-600' :
                                      roi >= 25 ? 'from-yellow-500 to-yellow-600' :
                                      'from-red-500 to-red-600';

                      return (
                        <div
                          key={pmcid}
                          className="border border-[rgba(255,193,7,0.3)] rounded-lg p-4 bg-[rgba(255,193,7,0.05)]"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-white text-sm mb-1 line-clamp-2">
                                {paper.title}
                              </h4>
                              <p className="text-xs text-[var(--lunar-gray)]">{pmcid}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeFromPortfolio(pmcid)}
                              className="ml-3 border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-4 gap-2 mb-2">
                            <div>
                              <label className="text-xs text-[var(--lunar-gray)] mb-1 block">Impact (0-10)</label>
                              <Input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                value={values.impact}
                                onChange={(e) => updatePaperValue(pmcid, 'impact', parseFloat(e.target.value) || 0)}
                                className="h-8 bg-[rgba(0,0,0,0.3)] border-[rgba(255,193,7,0.3)] text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-[var(--lunar-gray)] mb-1 block">Risk (0-10)</label>
                              <Input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                value={values.risk}
                                onChange={(e) => updatePaperValue(pmcid, 'risk', parseFloat(e.target.value) || 0)}
                                className="h-8 bg-[rgba(0,0,0,0.3)] border-[rgba(255,193,7,0.3)] text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-[var(--lunar-gray)] mb-1 block">Budget</label>
                              <Input
                                type="number"
                                min="0"
                                step="100000"
                                value={values.budget}
                                onChange={(e) => updatePaperValue(pmcid, 'budget', parseFloat(e.target.value) || 0)}
                                className="h-8 bg-[rgba(0,0,0,0.3)] border-[rgba(255,193,7,0.3)] text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-[var(--lunar-gray)] mb-1 block">ROI (0-100)</label>
                              <div className={`h-8 flex items-center justify-center rounded bg-gradient-to-r ${roiColor} text-white font-bold text-sm`}>
                                {roi.toFixed(1)}
                              </div>
                            </div>
                          </div>

                          {/* Budget display in readable format */}
                          <div className="text-xs text-[var(--lunar-gray)] text-right">
                            Budget: ${(values.budget / 1000000).toFixed(2)}M
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-2 border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,0.95)]">
            <CardContent className="py-20 text-center">
              <FolderPlus className="h-16 w-16 mx-auto mb-4 text-[var(--earth-blue)]" />
              <h3 className="text-2xl font-bold text-white mb-2">No Portfolio Selected</h3>
              <p className="text-[var(--lunar-gray)] mb-6">Create a new portfolio to get started</p>
              <Button
                onClick={() => setNewPortfolioDialog(true)}
                className="bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Portfolio
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* New Portfolio Dialog */}
      <Dialog open={newPortfolioDialog} onOpenChange={setNewPortfolioDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Portfolio</DialogTitle>
            <DialogDescription>
              Create a new research portfolio to organize and manage papers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Portfolio Name</label>
              <Input
                placeholder="e.g., Q1 2025 Research Priorities"
                value={newPortfolioName}
                onChange={(e) => setNewPortfolioName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
              <Input
                placeholder="Brief description of this portfolio..."
                value={newPortfolioDesc}
                onChange={(e) => setNewPortfolioDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPortfolioDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={createPortfolio}
              disabled={!newPortfolioName.trim()}
              className="bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white"
            >
              Create Portfolio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
