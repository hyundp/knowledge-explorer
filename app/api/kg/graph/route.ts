import { NextResponse } from 'next/server';

// FastAPI backend URL - defaults to localhost:8000
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Build query params
    const params = new URLSearchParams();
    if (searchParams.has('center_node')) {
      params.append('center_node', searchParams.get('center_node')!);
    }
    if (searchParams.has('depth')) {
      params.append('depth', searchParams.get('depth')!);
    }
    if (searchParams.has('limit')) {
      params.append('limit', searchParams.get('limit')!);
    }

    // Call FastAPI backend
    const url = `${FASTAPI_URL}/kg/graph${params.toString() ? `?${params.toString()}` : ''}`;
    console.log('Fetching knowledge graph from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Disable caching for fresh data
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FastAPI error:', response.status, errorText);

      // Handle specific error cases
      if (response.status === 503) {
        return NextResponse.json({
          error: 'Neo4j not connected',
          details: 'The knowledge graph database is not available. Please ensure Neo4j is running.',
        }, { status: 503 });
      }

      throw new Error(`FastAPI returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching knowledge graph:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json({
      error: 'Failed to fetch knowledge graph',
      details: errorMessage,
      fallback: {
        nodes: [],
        edges: [],
        num_nodes: 0,
        num_edges: 0,
      }
    }, { status: 500 });
  }
}
