import { NextResponse } from 'next/server';
import { getGapROIRankings } from '@/lib/api/manager';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters
    const minImpact = searchParams.get('minImpact');
    const maxCost = searchParams.get('maxCost');

    const gapROI = await getGapROIRankings({
      minImpact: minImpact ? parseFloat(minImpact) : undefined,
      maxCost: maxCost ? parseFloat(maxCost) : undefined
    });

    return NextResponse.json(gapROI);
  } catch (error) {
    console.error('Error fetching gap ROI rankings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Failed to fetch gap ROI rankings',
      details: errorMessage
    }, { status: 500 });
  }
}
