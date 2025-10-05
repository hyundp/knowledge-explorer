import { NextResponse } from 'next/server';
import { Portfolio, PortfoliosData } from '@/lib/types';

// In-memory storage for serverless environments (data will be lost on restart)
// For production, use a database like Vercel KV, Postgres, or MongoDB
let portfoliosStore: PortfoliosData = { portfolios: [] };

// Read all portfolios
async function readPortfolios(): Promise<PortfoliosData> {
  return portfoliosStore;
}

// Write all portfolios
async function writePortfolios(data: PortfoliosData): Promise<void> {
  portfoliosStore = data;
}

// GET: Retrieve all portfolios
export async function GET() {
  try {
    const portfoliosData = await readPortfolios();
    return NextResponse.json(portfoliosData);
  } catch (error) {
    console.error('Error reading portfolios:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Failed to read portfolios',
      details: errorMessage
    }, { status: 500 });
  }
}

// POST: Create or update a portfolio
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { portfolioId, name, description, papers } = body;

    const portfoliosData = await readPortfolios();

    const existingIndex = portfoliosData.portfolios.findIndex(p => p.id === portfolioId);

    let totalBudget = 0;
    let totalROI = 0;
    const paperCount = Object.keys(papers).length;

    Object.values(papers).forEach((paper: any) => {
      totalBudget += paper.budget || 0;

      // NASA ROI calculation (same formula as frontend)
      const budgetInMillions = (paper.budget || 0) / 1000000;
      const impact = paper.impact || 0;
      const risk = paper.risk || 0;

      if (!impact || !risk || !paper.budget) {
        totalROI += 0;
        return;
      }

      // Exponential impact and risk factors
      const impactMultiplier = Math.pow(impact / 5, 2) * 0.9 + 0.1;
      const riskPenalty = Math.pow(1 - (risk / 10), 3);
      const costEfficiency = budgetInMillions > 0
        ? 5 / (Math.log10(budgetInMillions * 10 + 1) + 1)
        : 5;

      const roi = Math.max(0, Math.min(100, impactMultiplier * riskPenalty * costEfficiency * 20));

      totalROI += roi;
    });

    const avgROI = paperCount > 0 ? totalROI / paperCount : 0;

    const portfolio: Portfolio = {
      id: portfolioId || `portfolio-${Date.now()}`,
      name: name || 'Untitled Portfolio',
      description,
      papers,
      totalBudget,
      avgROI,
      createdAt: existingIndex >= 0 ? portfoliosData.portfolios[existingIndex].createdAt : new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      portfoliosData.portfolios[existingIndex] = portfolio;
    } else {
      portfoliosData.portfolios.push(portfolio);
    }

    await writePortfolios(portfoliosData);

    return NextResponse.json({
      success: true,
      portfolio
    });
  } catch (error) {
    console.error('Error saving portfolio:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Failed to save portfolio',
      details: errorMessage
    }, { status: 500 });
  }
}

// DELETE: Delete a portfolio
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('id');

    if (!portfolioId) {
      return NextResponse.json({
        error: 'Portfolio ID is required'
      }, { status: 400 });
    }

    const portfoliosData = await readPortfolios();
    portfoliosData.portfolios = portfoliosData.portfolios.filter(p => p.id !== portfolioId);
    await writePortfolios(portfoliosData);

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Error deleting portfolio:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Failed to delete portfolio',
      details: errorMessage
    }, { status: 500 });
  }
}
