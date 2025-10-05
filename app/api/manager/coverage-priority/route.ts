import { NextResponse } from 'next/server';
import { getCoveragePriorityMap } from '@/lib/api/manager';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters
    const yearRangeParam = searchParams.get('yearRange');
    let yearRange: [number, number] | undefined;
    if (yearRangeParam) {
      const [start, end] = yearRangeParam.split(',').map(Number);
      yearRange = [start, end];
    }

    const coverageMap = await getCoveragePriorityMap({
      yearRange
    });

    return NextResponse.json(coverageMap);
  } catch (error) {
    console.error('Error fetching coverage-priority map:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Failed to fetch coverage-priority map',
      details: errorMessage
    }, { status: 500 });
  }
}
