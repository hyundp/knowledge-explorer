import { NextResponse } from 'next/server';
import { getAvailableParameters, getParameterCounts } from '@/lib/api/parameters';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeCounts = searchParams.get('counts') === 'true';

    if (includeCounts) {
      const [parameters, counts] = await Promise.all([
        getAvailableParameters(),
        getParameterCounts()
      ]);

      return NextResponse.json({
        parameters,
        counts
      });
    }

    const parameters = await getAvailableParameters();
    return NextResponse.json(parameters);
  } catch (error) {
    console.error('Error fetching parameters:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Failed to fetch parameters',
      details: errorMessage
    }, { status: 500 });
  }
}