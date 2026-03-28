import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const PROMPT = `Identify this luxury item. Extract brand, model, and name.
Return ONLY a JSON object (no markdown, no explanation):
{
  "name": "Full product name e.g. Rolex Submariner Date 41mm",
  "brand": "Brand name e.g. Rolex",
  "model": "Model reference e.g. 126610LN",
  "searchQuery": "Optimized search query e.g. Rolex Submariner 126610LN",
  "description": "Brief description e.g. Black dial, Oystersteel, 2023"
}`;

const TEXT_PROMPT = (text: string) =>
  `Extract luxury item details from this query: "${text}"
Return ONLY a JSON object (no markdown, no explanation):
{
  "name": "Full product name",
  "brand": "Brand name",
  "model": "Model reference if known, else empty string",
  "searchQuery": "Optimized search query for resale platforms",
  "description": "Brief description"
}`;

export async function POST(req: NextRequest) {
  try {
    const { image, mediaType, text } = await req.json();

    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let result;
    if (image) {
      result = await model.generateContent([
        { inlineData: { data: image, mimeType: mediaType ?? 'image/jpeg' } },
        PROMPT,
      ]);
    } else {
      result = await model.generateContent(TEXT_PROMPT(text));
    }

    const raw = result.response.text();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: 'Could not parse Gemini response' }, { status: 500 });
    }

    return Response.json(JSON.parse(jsonMatch[0]));
  } catch (err: any) {
    console.error('Identify error:', err);
    return Response.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
  }
}
