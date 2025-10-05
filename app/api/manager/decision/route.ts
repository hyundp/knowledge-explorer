import { NextResponse } from 'next/server';
import { getDecisionDossier } from '@/lib/api/manager';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gapId = searchParams.get('gapId');

    if (!gapId) {
      return NextResponse.json({
        error: 'Missing required parameter: gapId'
      }, { status: 400 });
    }

    const dossier = await getDecisionDossier(gapId);

    return NextResponse.json(dossier);
  } catch (error) {
    console.error('Error generating decision dossier:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Failed to generate decision dossier',
      details: errorMessage
    }, { status: 500 });
  }
}
