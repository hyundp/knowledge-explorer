import { NextResponse } from 'next/server';
import { getPapers, searchPapers } from '@/lib/api/data';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const limit = searchParams.get('limit');

    if (query) {
      const papers = await searchPapers(query);
      return NextResponse.json(papers);
    }

    const papers = await getPapers(limit ? parseInt(limit) : undefined);
    return NextResponse.json(papers);
  } catch (error) {
    console.error('Error fetching papers - detailed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Failed to fetch papers',
      details: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}