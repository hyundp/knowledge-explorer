import { NextResponse } from 'next/server';
import { getExternalContent } from '@/lib/api/data';

export async function GET() {
  try {
    const content = await getExternalContent();
    return NextResponse.json(content);
  } catch (error) {
    console.error('Error fetching external content - detailed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Failed to fetch external content',
      details: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}