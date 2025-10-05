import { NextResponse } from 'next/server';
import { getPaperById } from '@/lib/api/data';

export async function POST(request: Request) {
  try {
    const { pmcids } = await request.json();

    if (!pmcids || !Array.isArray(pmcids)) {
      return NextResponse.json({
        error: 'Invalid request: pmcids array is required'
      }, { status: 400 });
    }

    // Fetch all papers by their PMCIDs
    const papers = await Promise.all(
      pmcids.map(async (pmcid: string) => {
        const paper = await getPaperById(pmcid);
        if (!paper) return null;
        return {
          pmcid: paper.pmcid,
          title: paper.title,
          year: paper.year,
          journal: paper.journal,
          authors: paper.authors.slice(0, 3) // First 3 authors only
        };
      })
    );

    // Filter out any failed fetches
    const validPapers = papers.filter(p => p !== null);

    return NextResponse.json({ papers: validPapers });
  } catch (error) {
    console.error('Error fetching papers by IDs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Failed to fetch papers',
      details: errorMessage
    }, { status: 500 });
  }
}
