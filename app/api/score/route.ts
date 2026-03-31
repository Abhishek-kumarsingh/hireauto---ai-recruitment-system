import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { experience, skills, projects, resumeQuality } = data;

    let score = 0;

    // Experience >= 2 years → +30
    if (experience >= 2) score += 30;

    // React skill → +25
    if (skills?.some((s: string) => s.toLowerCase().includes('react'))) score += 25;

    // JavaScript → +20
    if (skills?.some((s: string) => s.toLowerCase().includes('javascript') || s.toLowerCase().includes('js'))) score += 20;

    // Projects >= 2 → +15
    if (projects >= 2) score += 15;

    // Resume quality (AI-based) → +10
    if (resumeQuality) {
      // qualityScore is 1-10, so we scale it
      score += (resumeQuality / 10) * 10;
    }

    let status = 'Cold';
    if (score > 70) status = 'Hot';
    else if (score > 40) status = 'Warm';

    return NextResponse.json({ score: Math.min(score, 100), status });
  } catch (error) {
    console.error('Score API error:', error);
    return NextResponse.json({ error: 'Failed to calculate score' }, { status: 500 });
  }
}
