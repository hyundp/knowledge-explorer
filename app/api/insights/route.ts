import { NextResponse } from 'next/server';
import { getInsights } from '@/lib/api/insights';

export async function GET() {
  try {
    const insights = await getInsights();
    return NextResponse.json(insights);
  } catch (error) {
    console.error('Error fetching insights:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Failed to fetch insights data',
      details: errorMessage
    }, { status: 500 });
  }
}
