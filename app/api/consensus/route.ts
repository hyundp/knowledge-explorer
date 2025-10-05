import { NextResponse } from 'next/server';
import { getConsensus } from '@/lib/api/consensus';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organism = searchParams.get('organism');
    const tissue = searchParams.get('tissue');
    const exposure = searchParams.get('exposure');
    const studyType = searchParams.get('studyType');
    const mission = searchParams.get('mission');
    const duration = searchParams.get('duration');

    // Build filters object
    const filters: Record<string, string[]> = {};
    if (organism) filters.organisms = [organism];
    if (tissue) filters.tissues = [tissue];
    if (exposure) filters.exposures = [exposure];
    if (studyType) filters.studyTypes = [studyType];
    if (mission) filters.missions = [mission];
    if (duration) filters.durations = [duration];

    // Generate consensus for all phenotypes or the most relevant one based on filters
    const consensus = await getConsensus(filters);
    return NextResponse.json(consensus);
  } catch (error) {
    console.error('Error fetching consensus:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Failed to fetch consensus data',
      details: errorMessage
    }, { status: 500 });
  }
}