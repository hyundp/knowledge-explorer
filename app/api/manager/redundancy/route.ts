import { NextResponse } from 'next/server';
import { detectRedundancy } from '@/lib/api/manager';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters
    const minSimilarity = searchParams.get('minSimilarity');

    const redundancy = await detectRedundancy({
      minSimilarity: minSimilarity ? parseFloat(minSimilarity) : undefined
    });

    return NextResponse.json(redundancy);
  } catch (error) {
    console.error('Error detecting redundancy:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Failed to detect redundancy',
      details: errorMessage
    }, { status: 500 });
  }
}
