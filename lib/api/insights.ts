import { Paper } from '@/lib/types';
import { getPapers } from './data';

// Import extraction functions from parameters
import { extractOrganisms, extractTissues, extractExposures, extractStudyTypes, extractMissions } from './parameters';

export interface TopResearchArea {
  combination: string;
  organism: string;
  tissue: string;
  exposure: string;
  study_count: number;
  avg_year: number;
  recent_papers: number; // Papers from last 2 years
  priority: string;
  pmcids: string[];
}

export interface ResearchGap {
  combination: string;
  organism: string;
  tissue: string;
  exposure: string;
  study_count: number;
  priority: string;
  rationale: string;
  pmcids: string[];
}

export interface EmergingTrend {
  topic: string;
  trend: string;
  papers_old: number;
  papers_recent: number;
  growth: string;
  implication: string;
}

export interface PublicationTimeline {
  year: number;
  count: number;
}

export interface InsightsData {
  topAreas: TopResearchArea[];
  researchGaps: ResearchGap[];
  emergingTrends: EmergingTrend[];
  timeline: PublicationTimeline[];
  totalPapers: number;
}

/**
 * Calculate insights from papers
 */
export async function getInsights(): Promise<InsightsData> {
  const papers = await getPapers();
  const currentYear = new Date().getFullYear();

  // Calculate publication timeline
  const timelineMap = new Map<number, number>();
  papers.forEach(paper => {
    const year = parseInt(paper.year);
    if (!isNaN(year)) {
      timelineMap.set(year, (timelineMap.get(year) || 0) + 1);
    }
  });

  const timeline: PublicationTimeline[] = Array.from(timelineMap.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);

  // Calculate top research areas (most studied combinations)
  const areaMap = new Map<string, {
    organism: string;
    tissue: string;
    exposure: string;
    years: number[];
    count: number;
    pmcids: string[];
  }>();

  papers.forEach(paper => {
    const text = `${paper.title} ${paper.sections.abstract}`;
    const organisms = extractOrganisms(text);
    const tissues = extractTissues(text);
    const exposures = extractExposures(text);
    const year = parseInt(paper.year);

    organisms.forEach(organism => {
      tissues.forEach(tissue => {
        exposures.forEach(exposure => {
          const key = `${organism}|${tissue}|${exposure}`;
          if (!areaMap.has(key)) {
            areaMap.set(key, {
              organism,
              tissue,
              exposure,
              years: [],
              count: 0,
              pmcids: []
            });
          }
          const area = areaMap.get(key)!;
          area.count++;
          if (!area.pmcids.includes(paper.pmcid)) {
            area.pmcids.push(paper.pmcid);
          }
          if (!isNaN(year)) {
            area.years.push(year);
          }
        });
      });
    });
  });

  const topAreas: TopResearchArea[] = Array.from(areaMap.entries())
    .filter(([_, area]) => area.count >= 3) // At least 3 studies
    .map(([key, area]) => {
      const avgYear = area.years.length > 0
        ? area.years.reduce((a, b) => a + b, 0) / area.years.length
        : 2020;
      const recentPapers = area.years.filter(y => y >= currentYear - 2).length;

      return {
        combination: `${area.organism} × ${area.tissue} × ${area.exposure}`,
        organism: area.organism,
        tissue: area.tissue,
        exposure: area.exposure,
        study_count: area.count,
        avg_year: Math.round(avgYear),
        recent_papers: recentPapers,
        priority: area.count >= 10 ? 'High' : area.count >= 5 ? 'Medium' : 'Low',
        pmcids: area.pmcids
      };
    })
    .sort((a, b) => b.study_count - a.study_count)
    .slice(0, 20); // Top 20

  // Calculate research gaps (understudied combinations)
  const researchGaps: ResearchGap[] = Array.from(areaMap.entries())
    .filter(([_, area]) => area.count > 0 && area.count <= 2) // 1-2 studies only
    .map(([key, area]) => ({
      combination: `${area.organism} × ${area.tissue} × ${area.exposure}`,
      organism: area.organism,
      tissue: area.tissue,
      exposure: area.exposure,
      study_count: area.count,
      priority: area.count === 1 ? 'High' : 'Medium',
      rationale: area.count === 1
        ? 'Only one study exists - needs validation and replication.'
        : 'Limited data available - more research needed for conclusive findings.',
      pmcids: area.pmcids
    }))
    .sort((a, b) => a.study_count - b.study_count)
    .slice(0, 20); // Top 20

  // Calculate emerging trends (study types growth)
  const studyTypesByYear = new Map<string, { old: number; recent: number }>();
  const oldYearThreshold = currentYear - 5; // 5+ years ago
  const recentYearThreshold = currentYear - 2; // Last 2 years

  papers.forEach(paper => {
    const text = `${paper.title} ${paper.sections.abstract}`;
    const studyTypes = extractStudyTypes(text);
    const year = parseInt(paper.year);

    if (!isNaN(year)) {
      studyTypes.forEach(type => {
        if (!studyTypesByYear.has(type)) {
          studyTypesByYear.set(type, { old: 0, recent: 0 });
        }
        const data = studyTypesByYear.get(type)!;
        if (year < oldYearThreshold) {
          data.old++;
        } else if (year >= recentYearThreshold) {
          data.recent++;
        }
      });
    }
  });

  const emergingTrends: EmergingTrend[] = Array.from(studyTypesByYear.entries())
    .filter(([_, data]) => data.recent > 0)
    .map(([type, data]) => {
      let growth = '';
      let trend = '';

      if (data.old === 0 && data.recent > 0) {
        growth = 'New';
        trend = 'Emerging';
      } else if (data.old > 0) {
        const growthPercent = ((data.recent - data.old) / data.old) * 100;
        growth = growthPercent > 0 ? `+${growthPercent.toFixed(0)}%` : `${growthPercent.toFixed(0)}%`;
        trend = growthPercent > 50 ? 'Increasing' : growthPercent > 0 ? 'Growing' : 'Stable';
      } else {
        growth = 'N/A';
        trend = 'New';
      }

      return {
        topic: type,
        trend,
        papers_old: data.old,
        papers_recent: data.recent,
        growth,
        implication: `${data.recent} recent papers using ${type.toLowerCase()} methodology.`
      };
    })
    .sort((a, b) => b.papers_recent - a.papers_recent)
    .slice(0, 6);

  return {
    topAreas,
    researchGaps,
    emergingTrends,
    timeline,
    totalPapers: papers.length
  };
}
