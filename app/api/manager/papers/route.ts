import { NextResponse } from 'next/server';
import { getPapers } from '@/lib/api/data';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';

    // Get all papers
    const allPapers = await getPapers();

    // Filter by search if provided
    let filteredPapers = allPapers;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredPapers = allPapers.filter(paper =>
        paper.title.toLowerCase().includes(searchLower) ||
        paper.authors.some(author => author.toLowerCase().includes(searchLower)) ||
        paper.journal.toLowerCase().includes(searchLower) ||
        paper.pmcid.toLowerCase().includes(searchLower)
      );
    }

    // Calculate pagination
    const total = filteredPapers.length;
    const totalPages = Math.ceil(total / limit);
    const start = page * limit;
    const end = start + limit;
    const paginatedPapers = filteredPapers.slice(start, end);

    // Simplify paper data for list view
    const simplifiedPapers = paginatedPapers.map(paper => ({
      pmcid: paper.pmcid,
      title: paper.title,
      authors: paper.authors,
      year: paper.year,
      journal: paper.journal,
      abstract: paper.sections.abstract?.slice(0, 300) + '...' || ''
    }));

    return NextResponse.json({
      papers: simplifiedPapers,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching papers for manager:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Failed to fetch papers',
      details: errorMessage
    }, { status: 500 });
  }
}
