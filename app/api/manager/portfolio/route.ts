import { NextResponse } from 'next/server';
import { solvePortfolio } from '@/lib/api/manager';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { gapIds = [], budget = 5000000, constraints = {} } = body;

    const solution = await solvePortfolio({
      gapIds,
      budget,
      constraints
    });

    return NextResponse.json(solution);
  } catch (error) {
    console.error('Error solving portfolio:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Failed to solve portfolio',
      details: errorMessage
    }, { status: 500 });
  }
}
