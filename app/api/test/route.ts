import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  const cwd = process.cwd();
  const dataPath = path.resolve(cwd, '..', 'data');

  let dataExists = false;
  let normalizedExists = false;
  let externalExists = false;
  let paperCount = 0;

  try {
    dataExists = fs.existsSync(dataPath);
    normalizedExists = fs.existsSync(path.join(dataPath, 'normalized'));
    externalExists = fs.existsSync(path.join(dataPath, 'external'));

    if (normalizedExists) {
      const papers = fs.readdirSync(path.join(dataPath, 'normalized'));
      paperCount = papers.length;
    }
  } catch (error) {
    console.error('Error checking paths:', error);
  }

  return NextResponse.json({
    cwd,
    dataPath,
    dataExists,
    normalizedExists,
    externalExists,
    paperCount,
    env: process.env.NODE_ENV
  });
}