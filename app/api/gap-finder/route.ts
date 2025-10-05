import { NextResponse } from 'next/server';
import { getGapAnalysis } from '@/lib/api/gap-finder';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'organism';

    // Generate gap analysis based on type
    const gapAnalysis = await getGapAnalysis({ type });
    return NextResponse.json(gapAnalysis);
  } catch (error) {
    console.error('Error fetching gap analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Failed to fetch gap analysis data',
      details: errorMessage
    }, { status: 500 });
  }
}
