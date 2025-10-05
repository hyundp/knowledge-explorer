import { NextResponse } from 'next/server';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

export async function GET(
  request: Request,
  { params }: { params: { pmcid: string } }
) {
  try {
    const { pmcid } = params;

    // Call FastAPI backend
    const url = `${FASTAPI_URL}/papers/${pmcid}`;
    console.log('Fetching paper from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({
          error: 'Paper not found',
          pmcid,
        }, { status: 404 });
      }

      if (response.status === 503) {
        return NextResponse.json({
          error: 'Neo4j not connected',
          details: 'The knowledge graph database is not available.',
        }, { status: 503 });
      }

      const errorText = await response.text();
      throw new Error(`FastAPI returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching paper:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json({
      error: 'Failed to fetch paper',
      details: errorMessage,
    }, { status: 500 });
  }
}
