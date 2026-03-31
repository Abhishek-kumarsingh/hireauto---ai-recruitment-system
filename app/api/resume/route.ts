import { NextResponse } from 'next/server';
import { parsePDF } from '@/lib/pdf-parser';
import { evaluateResume } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await parsePDF(buffer);
    const evaluation = await evaluateResume(text);

    return NextResponse.json(evaluation);
  } catch (error) {
    console.error('Resume API error:', error);
    return NextResponse.json({ error: 'Failed to process resume' }, { status: 500 });
  }
}
